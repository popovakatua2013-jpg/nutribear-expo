// Карточка «Калькулятор ИМТ» в стиле макета: фиолетовый чип-иконка,
// подзаголовок, пилюли пола с символами ♀/♂, три поля (возраст, рост,
// вес), градиентная кнопка «Рассчитать» и неоновый силуэт справа.
// По умолчанию карточка СВЁРНУТА (запрос пользователя): видна только
// шапка с шевроном — тап по шапке раскрывает поля; состояние живёт до
// перезагрузки экрана. Результаты («Рассчитать») живут внутри развёрнутой
// карточки: сворачивание шапкой прячет и их — калькулятор можно закрыть
// после ввода данных (решение пользователя). Строка «Жир в организме»
// красится по уровню жира: норма — зелёным, предожирение — оранжевым,
// ожирение — красным (строка и цифры, bodyFatLevel).
// Уровень активности — ВЫПАДАЮЩИЙ СПИСОК (запрос Кати): вместо чипов —
// поле с текущим уровнем, тап открывает шторку со всеми уровнями
// (полная подпись + подсказка + коэффициент, галочка у выбранного).
// Подсказка «как считается норма» — СВЁРНУТА ПО УМОЛЧАНИЮ (запрос Кати):
// строка со значком-лампочкой и шевроном, тап раскрывает живые цифры
// (это НЕ возвращение подсказки-перечисления формул — её убрали в
// 4d225ae: имена формул не называем).
//
// Формулы: ИМТ — ВОЗ; базовый обмен — Миффлин — Сан Жеор;
// идеальный вес — Девайн; % жира — оценка Дёренберга; TDEE = BMR × коэффициент.

import { useEffect, useRef, useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Calculator, Check, ChevronDown, ChevronUp, Lightbulb, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useProfileStore } from '@/store/useProfileStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useToast } from '../ui/Toast'
import { NeonCard } from '../ui/NeonCard'
import {
  calcBmi,
  bmiCategory,
  healthyRange,
  fmtDecimal,
  TDEE_LEVELS,
  tdeeMult,
  bmrMifflin,
  tdeeKcal,
  idealWeightDevine,
  bodyFatPercent,
  bodyFatLevel,
  tdeeExplainer,
} from '@/lib/data/bmi'
import { useThemeColors } from '@/lib/use-theme'


// «72,5» → 72.5 (русская запятая — тоже десятичный разделитель)
const parseNum = (v) => Number(String(v).trim().replace(',', '.'))

export function BmiCalculator() {
  const themeColors = useThemeColors()
  const profileSex = useProfileStore((s) => s.sex)
  const profileAge = useProfileStore((s) => s.age)
  const profileHeight = useProfileStore((s) => s.heightCm)
  const profileWeight = useProfileStore((s) => s.weightKg)
  const profileActivity = useProfileStore((s) => s.activityId)
  const setProfile = useProfileStore((s) => s.setProfile)
  const addWeight = useProfileStore((s) => s.addWeight)
  const { toast } = useToast()

  const [sex, setSex] = useState(profileSex)
  const [age, setAge] = useState(String(profileAge))
  const [height, setHeight] = useState(String(profileHeight))
  const [weight, setWeight] = useState(String(profileWeight))
  const [activityId, setActivityId] = useState(profileActivity)
  const [showResult, setShowResult] = useState(false)
  // Свёрнут по умолчанию: тап по шапке раскрывает поля калькулятора
  const [open, setOpen] = useState(false)
  // Шторка выпадающего списка уровней активности (запрос Кати)
  const [actOpen, setActOpen] = useState(false)
  // Подсказка про норму — свёрнута по умолчанию (запрос Кати):
  // видна строка-шапка с лампочкой, цифры раскрываются тапом
  const [hintOpen, setHintOpen] = useState(false)
  const haptics = useUiPrefsStore((s) => s.haptics)
  const insets = useSafeAreaInsets()

  // Выбранный уровень — для поля выпадающего списка
  const currentLevel = TDEE_LEVELS.find((l) => l.id === activityId) || null

  // Тап по уровню в шторке: выбираем, закрываем, лёгкая вибрация
  function pickActivity(id) {
    setActivityId(id)
    setActOpen(false)
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
  }

  // Один раз подтягиваем биоданные из завершённого онбординга, если профиль
  // их ещё не получал (старые пользователи без sex/age в хранилище)
  const synced = useRef(false)
  useEffect(() => {
    if (synced.current) return
    const trySync = () => {
      if (synced.current) return
      if (!useProfileStore.persist.hasHydrated()) return
      if (!useOnboardingStore.persist.hasHydrated()) return
      synced.current = true
      const p = useProfileStore.getState()
      if (p.hasBio) return
      const ob = useOnboardingStore.getState()
      if (ob.status !== 'done') return
      const a = ob.answers || {}
      const patch = { hasBio: true }
      if (a.sex === 'female' || a.sex === 'male') patch.sex = a.sex
      const ageNum = Number(a.age)
      if (Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 90) patch.age = ageNum
      if (TDEE_LEVELS.some((l) => l.id === a.activity)) patch.activityId = a.activity
      p.setProfile(patch)
    }
    const unsubs = [
      useProfileStore.persist.onFinishHydration(trySync),
      useOnboardingStore.persist.onFinishHydration(trySync),
    ]
    trySync()
    return () => unsubs.forEach((u) => u())
  }, [])

  // Профиль обновился (сохранение, онбординг, запись веса) — зеркалим в поля
  useEffect(() => {
    setSex(profileSex)
    setAge(String(profileAge))
    setHeight(String(profileHeight))
    setWeight(String(profileWeight))
    setActivityId(profileActivity)
  }, [profileSex, profileAge, profileHeight, profileWeight, profileActivity])

  const ageNum = Math.round(parseNum(age))
  const hNum = parseNum(height)
  const wNum = Math.round(parseNum(weight) * 10) / 10
  const valid =
    Number.isFinite(ageNum) && ageNum >= 10 && ageNum <= 90 &&
    Number.isFinite(hNum) && hNum >= 80 && hNum <= 250 &&
    Number.isFinite(wNum) && wNum >= 25 && wNum <= 300

  // Живой расчёт по введённым данным (не по сохранённому профилю)
  const bmi = valid ? calcBmi(wNum, hNum) : 0
  const cat = bmiCategory(bmi || 0)
  const hr = healthyRange(hNum)
  const ideal = idealWeightDevine(sex, hNum)
  const bmr = bmrMifflin(sex, ageNum, hNum, wNum)
  const tdee = tdeeKcal(bmr, tdeeMult(activityId))
  const fatPct = bodyFatPercent(bmi, ageNum, sex)
  // Цвет строки «Жир в организме»: норма — зелёный, предожирение —
  // оранжевый, ожирение — красный (пороги по полу)
  const fatLevel = bodyFatLevel(fatPct, sex)

  function handleCalc() {
    if (!valid) {
      toast({
        title: '⚠️ Проверьте данные',
        description: 'Возраст 10–90 лет, рост 80–250 см, вес 25–300 кг',
      })
      return
    }
    setShowResult(true)
    const weightChanged = wNum !== profileWeight
    if (weightChanged) addWeight(wNum)
    setProfile({ sex, age: ageNum, heightCm: Math.round(hNum), activityId, hasBio: true })
    toast(
      weightChanged
        ? {
            title: '✅ Данные сохранены',
            description: `${fmtDecimal(wNum)} кг · ИМТ обновлён`,
          }
        : { title: '✅ Данные сохранены', description: 'Профиль обновлён — ИМТ пересчитан' }
    )
  }

  return (
    // Правка Кати 25.11 (четвёртый круг: «тело ИМТ — блоки по оформлению
    // не такие, сделать одинаково как на главной»): NeonCard вместо
    // плоской bodyCard — градиентная кайма и градиентная поверхность,
    // как у блоков «Главной»
    <NeonCard accessibilityLabel="Калькулятор ИМТ" className="p-4">
      {/* Шапка: чип-иконка + заголовок + подзаголовок + шеврон.
          По умолчанию свёрнут — тап по шапке раскрывает/скрывает поля */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Свернуть калькулятор ИМТ' : 'Развернуть калькулятор ИМТ'}
        className="flex-row items-center gap-2.5 active:opacity-80"
      >
        <View
          className="h-9 w-9 items-center justify-center rounded-xl border"
          style={{ backgroundColor: themeColors.accentFaint, borderColor: themeColors.accentBorder }}
        >
          <Calculator size={19} color={themeColors.accentSoft} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[20.5px] tracking-tight text-bear-text">
            Калькулятор ИМТ
          </Text>
          <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-dim">
            Узнай свой индекс массы тела
          </Text>
        </View>
        <View className="shrink-0 rounded-full p-1.5" style={{ backgroundColor: themeColors.accentFaint }}>
          {open ? (
            <ChevronUp size={18} color={themeColors.accentSoft} />
          ) : (
            <ChevronDown size={18} color={themeColors.accentSoft} />
          )}
        </View>
      </Pressable>

      {/* Пол, данные, кнопка — на всю ширину (силуэт теперь в блоке выше);
          показываются только в развёрнутом состоянии */}
      {open && (
      <View className="mt-3">
        {/* Пол */}
          <View className="flex-row gap-2">
            {[['female', '♀', 'Женский'], ['male', '♂', 'Мужской']].map(([id, glyph, label]) => {
              const active = sex === id
              return (
                <Pressable
                  key={id}
                  onPress={() => setSex(id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                  className="min-w-0 flex-1 overflow-hidden rounded-full border"
                  style={{ borderColor: active ? 'rgba(255,255,255,0)' : themeColors.line }}
                >
                  {active ? (
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}>
                      <View className="flex-row items-center justify-center gap-1.5 py-2.5">
                        <Text className="text-[17.5px]" style={{ color: themeColors.accentOn }}>{glyph}</Text>
                        <Text className="font-bold text-[17px]" style={{ color: themeColors.accentOn }}>{label}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View className="flex-row items-center justify-center gap-1.5 bg-bear-card2 py-2.5">
                      <Text className="text-[17.5px] text-bear-sub">{glyph}</Text>
                      <Text className="font-medium text-[17px] text-bear-sub">{label}</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>

          {/* Возраст / Рост / Вес */}
          <View className="mt-2.5 flex-row gap-2">
            <NumField label="Возраст, лет" value={age} onChange={setAge} />
            <NumField label="Рост, см" value={height} onChange={setHeight} />
            <NumField label="Вес, кг" value={weight} onChange={setWeight} decimal />
          </View>

          {/* Кнопка «Рассчитать» */}
          <Pressable
            onPress={handleCalc}
            accessibilityLabel="Рассчитать и сохранить индекс массы тела"
            className="mt-3 overflow-hidden rounded-2xl"
          >
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}>
              <View className="flex-row items-center justify-center gap-2 py-3.5">
                <Calculator size={18} color={themeColors.accentOn} />
                <Text className="font-bold text-[19px]" style={{ color: themeColors.accentOn }}>Рассчитать</Text>
              </View>
            </LinearGradient>
          </Pressable>
      </View>
      )}

      {/* Подробные результаты — раскрываются кнопкой «Рассчитать»;
          живут внутри развёрнутой карточки: шапка сворачивает и их,
          иначе после ввода данных калькулятор нельзя закрыть.
          Аудит — на ВСЮ ширину карточки (отзыв Кати: блоки разной
          ширины): раньше панель результатов была внутренней карточкой
          в карточке и была уже, чем карточки «Динамики веса», на два
          паддинга. Теперь секция отделена линией и по ширине совпадает
          с остальными блоками вкладки */}
      {open && showResult && valid && (
        <View className="-mx-4 mt-3 border-t border-bear-line px-4 pt-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-medium text-[16px] text-bear-sub">Ваш ИМТ</Text>
            <Text className="font-semibold text-[16px]" style={{ color: cat.color }}>
              {cat.label} · {cat.range}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.15} className="mt-1 font-extrabold text-[32px] leading-tight tracking-tight text-bear-text">
            {fmtDecimal(bmi)}
          </Text>

          <View className="mt-3 gap-2">
            <View className="flex-row gap-2">
              <Stat label="Норма веса" value={`${hr.min}–${hr.max} кг`} />
              <Stat label="Идеальный вес" value={`${fmtDecimal(ideal)} кг`} />
            </View>
            <View className="flex-row gap-2">
              <Stat label="Базовый обмен" value={`${bmr} ккал`} />
              <Stat label="Суточная норма" value={`${tdee} ккал`} accent />
            </View>
          </View>

          {/* Жир в организме: строка и цифры в цвете уровня жира —
              норма зелёным, предожирение оранжевым, ожирение красным */}
          <View className="mt-2 flex-row items-center justify-between rounded-xl px-3 py-2.5" style={{ backgroundColor: themeColors.accentFaint }}>
            <Text className="font-medium text-[16.5px]" style={{ color: fatLevel.color }}>
              Жир в организме (оценка)
            </Text>
            <Text className="font-bold text-[17.5px]" style={{ color: fatLevel.color }}>
              ≈ {fmtDecimal(fatPct)} %
            </Text>
          </View>

          {/* Уровень активности — выпадающий список (запрос Кати):
              поле с текущим уровнем, тап открывает шторку со всеми
              уровнями; выбор применяется кнопкой «Рассчитать» */}
          <Text className="mt-3 font-medium text-[16px] text-bear-sub">Уровень активности</Text>
          <Pressable
            onPress={() => setActOpen(true)}
            accessibilityRole="button"
            accessibilityState={{ expanded: actOpen }}
            accessibilityLabel={
              currentLevel
                ? `Уровень активности: ${currentLevel.label}. Открыть список`
                : 'Уровень активности — выбрать'
            }
            className="mt-1.5 flex-row items-center justify-between gap-2 rounded-xl border px-3 py-2.5 active:opacity-80"
            style={{ borderColor: themeColors.line, backgroundColor: themeColors.accentFaint }}
          >
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              className="min-w-0 flex-1 font-semibold text-[16px] text-bear-text"
            >
              {currentLevel ? currentLevel.label : 'Выберите…'}
            </Text>
            <ChevronDown size={18} color={themeColors.accentSoft} />
          </Pressable>

          {/* Подсказка «как считается норма» — СВЁРНУТА по умолчанию
              (запрос Кати): значок-лампочка перед подсказкой, шеврон
              справа; тап раскрывает живые цифры калькулятора — базовый
              обмен × коэффициент ≈ суточная норма и связь с целью в
              «Моей цели». Без имён формул — ту подсказку убирали в
              4d225ae, сюда вернули только суть про активность */}
          <Pressable
            onPress={() => setHintOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: hintOpen }}
            accessibilityLabel={
              hintOpen
                ? 'Свернуть подсказку: как считается суточная норма'
                : 'Развернуть подсказку: как считается суточная норма'
            }
            className="mt-2.5 flex-row items-center gap-2 rounded-xl px-3 py-2.5 active:opacity-80"
            style={{ backgroundColor: themeColors.accentFaint }}
          >
            <Lightbulb size={16} color={themeColors.warn} />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              className="min-w-0 flex-1 font-semibold text-[14px] text-bear-soft"
            >
              Как считается суточная норма?
            </Text>
            {hintOpen ? (
              <ChevronUp size={16} color={themeColors.dim} />
            ) : (
              <ChevronDown size={16} color={themeColors.dim} />
            )}
          </Pressable>
          {hintOpen && (
            <Text
              accessibilityLabel="Пояснение: как активность участвует в суточной норме и как от неё считается цель"
              maxFontSizeMultiplier={1.25}
              className="mt-1.5 px-1 font-sans text-[13.5px] leading-snug text-bear-sub"
            >
              {tdeeExplainer(sex, bmr, tdeeMult(activityId), tdee)}
            </Text>
          )}
        </View>
      )}

      {/* Шторка выпадающего списка уровней активности: тёмная панель
          снизу в стиле окон приложения (#150F2D, фиолетовая кромка),
          у каждого уровня — полная подпись, подсказка и коэффициент,
          галочка у выбранного. Выбор закрывает шторку и живо обновляет
          подсказку и «Суточную норму» (профиль сохранит «Рассчитать») */}
      <Modal visible={actOpen} transparent animationType="fade" onRequestClose={() => setActOpen(false)}>
        <Pressable
          accessibilityLabel="Закрыть список уровней активности"
          className="flex-1 justify-end bg-black/60"
          onPress={() => setActOpen(false)}
        >
          <Pressable
            className="overflow-hidden rounded-t-[28px] border-t px-2 pb-2"
            style={{ backgroundColor: themeColors.deep, borderColor: themeColors.bodyLine }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Ручка-полоска */}
            <View className="items-center pt-2.5">
              <View className="h-1 w-10 rounded-full" style={{ backgroundColor: themeColors.accentBorder }} />
            </View>
            <View className="flex-row items-center gap-2 px-3 pb-1 pt-2">
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} maxFontSizeMultiplier={1.15} className="font-bold text-[19px] tracking-tight text-bear-text">
                  Уровень активности
                </Text>
                <Text maxFontSizeMultiplier={1.2} className="font-sans text-[13.5px] text-bear-dim">
                  Умножает базовый обмен в суточной норме
                </Text>
              </View>
              <Pressable
                onPress={() => setActOpen(false)}
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                className="shrink-0 rounded-full p-1.5 active:opacity-70"
                style={{ backgroundColor: themeColors.accentFaint }}
              >
                <X size={18} color={themeColors.accentSoft} />
              </Pressable>
            </View>
            {TDEE_LEVELS.map((l) => {
              const active = l.id === activityId
              return (
                <Pressable
                  key={l.id}
                  onPress={() => pickActivity(l.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${l.label}, коэффициент ${String(l.mult).replace('.', ',')}`}
                  className="flex-row items-center gap-3 rounded-2xl px-3 py-3 active:opacity-80"
                  style={active ? { backgroundColor: themeColors.accentFaint2 } : null}
                >
                  <View
                    className="h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                    style={
                      active
                        ? { backgroundColor: themeColors.accent, borderColor: themeColors.accent }
                        : { borderColor: themeColors.line }
                    }
                  >
                    {active && <Check size={15} color={themeColors.accentOn} />}
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.15} className="font-semibold text-[16px] text-bear-text">
                      {l.label}
                    </Text>
                    {l.hint ? (
                      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[12.5px] text-bear-dim">
                        {l.hint}
                      </Text>
                    ) : null}
                  </View>
                  <Text maxFontSizeMultiplier={1.1} className="shrink-0 font-bold text-[14px] text-bear-accentSoft">
                    {`×${String(l.mult).replace('.', ',')}`}
                  </Text>
                </Pressable>
              )
            })}
            {/* Отступ под системную жестовую полосу */}
            <View style={{ height: Math.max(12, insets.bottom) }} />
          </Pressable>
        </Pressable>
      </Modal>
    </NeonCard>
  )
}

function NumField({ label, value, onChange, decimal }) {
  const themeColors = useThemeColors()
  return (
    <View className="min-w-0 flex-1">
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-medium text-[15px] text-bear-sub">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        textAlign="center"
        placeholder="—"
        placeholderTextColor={themeColors.dim}
        accessibilityLabel={label}
        className="mt-1 rounded-xl border bg-bear-card2 px-1 py-2.5 font-semibold text-[19px] text-bear-text"
        style={{ borderColor: themeColors.line }}
      />
    </View>
  )
}

function Stat({ label, value, accent }) {
  const themeColors = useThemeColors()
  return (
    <View className="min-w-0 flex-1 rounded-xl px-3 py-2.5" style={{ backgroundColor: themeColors.accentFaint }}>
      <Text className="font-medium text-[15px] text-bear-sub2">{label}</Text>
      <Text
        maxFontSizeMultiplier={1.2}
        className="mt-0.5 font-bold text-[19px]"
        style={{ color: accent ? themeColors.link : themeColors.text }}
      >
        {value}
      </Text>
    </View>
  )
}
