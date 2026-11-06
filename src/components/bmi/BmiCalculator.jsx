// Карточка «Калькулятор ИМТ» в стиле макета: фиолетовый чип-иконка,
// подзаголовок, пилюли пола с символами ♀/♂, три поля (возраст, рост,
// вес), градиентная кнопка «Рассчитать» и неоновый силуэт справа.
// По умолчанию карточка СВЁРНУТА (запрос пользователя): видна только
// шапка с шевроном — тап по шапке раскрывает поля; состояние живёт до
// перезагрузки экрана. Результаты («Рассчитать») живут внутри развёрнутой
// карточки: сворачивание шапкой прячет и их — калькулятор можно закрыть
// после ввода данных (решение пользователя). Строка «Жир в организме»
// красится по уровню жира: норма — зелёным, предожирение — оранжевым,
// ожирение — красным (строка и цифры, bodyFatLevel). Подсказка с
// перечислением формул убрана по решению пользователя.
//
// Формулы: ИМТ — ВОЗ; базовый обмен — Миффлин — Сан Жеор;
// идеальный вес — Девайн; % жира — оценка Дёренберга; TDEE = BMR × коэффициент.

import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Calculator, ChevronDown, ChevronUp } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useProfileStore } from '@/store/useProfileStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useToast } from '../ui/Toast'
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
} from '@/lib/data/bmi'

const GRAD = ['#4D7CFE', '#8B5CF6', '#A45BFF']
const ACTIVE_BORDER = 'rgba(108,140,255,0.6)'
const CHIP_GRAD = ['rgba(108,140,255,0.20)', 'rgba(108,140,255,0.08)']

// «72,5» → 72.5 (русская запятая — тоже десятичный разделитель)
const parseNum = (v) => Number(String(v).trim().replace(',', '.'))

export function BmiCalculator() {
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
    <View accessibilityLabel="Калькулятор ИМТ" className="rounded-3xl border p-4" style={CARD_STYLE}>
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
          style={{ backgroundColor: 'rgba(139,92,246,0.22)', borderColor: 'rgba(139,92,246,0.35)' }}
        >
          <Calculator size={19} color="#C4B5FD" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[20.5px] tracking-tight text-white">
            Калькулятор ИМТ
          </Text>
          <Text maxFontSizeMultiplier={1.2} className="font-sans text-[15px] text-bear-dim">
            Узнай свой индекс массы тела
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-white/[0.06] p-1.5">
          {open ? (
            <ChevronUp size={18} color="#C4B5FD" />
          ) : (
            <ChevronDown size={18} color="#C4B5FD" />
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
                  style={{ borderColor: active ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.10)' }}
                >
                  {active ? (
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#6D5AE6', '#8B5CF6']}>
                      <View className="flex-row items-center justify-center gap-1.5 py-2.5">
                        <Text className="text-[17.5px]">{glyph}</Text>
                        <Text className="font-bold text-[17px] text-white">{label}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View className="flex-row items-center justify-center gap-1.5 bg-white/[0.05] py-2.5">
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
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['#4D7CFE', '#8B5CF6']}>
              <View className="flex-row items-center justify-center gap-2 py-3.5">
                <Calculator size={18} color="#FFFFFF" />
                <Text className="font-bold text-[19px] text-white">Рассчитать</Text>
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
        <View className="-mx-4 mt-3 border-t border-white/10 px-4 pt-3">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-medium text-[16px] text-bear-sub">Ваш ИМТ</Text>
            <Text className="font-semibold text-[16px]" style={{ color: cat.color }}>
              {cat.label} · {cat.range}
            </Text>
          </View>
          <Text maxFontSizeMultiplier={1.15} className="mt-1 font-extrabold text-[32px] leading-tight tracking-tight text-white">
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
          <View className="mt-2 flex-row items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
            <Text className="font-medium text-[16.5px]" style={{ color: fatLevel.color }}>
              Жир в организме (оценка)
            </Text>
            <Text className="font-bold text-[17.5px]" style={{ color: fatLevel.color }}>
              ≈ {fmtDecimal(fatPct)} %
            </Text>
          </View>

          {/* Уровень активности — участвует в суточной норме */}
          <Text className="mt-3 font-medium text-[16px] text-bear-sub">Уровень активности</Text>
          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {TDEE_LEVELS.map((l) => {
              const active = activityId === l.id
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setActivityId(l.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={l.label}
                  className="overflow-hidden rounded-full border"
                  style={{ borderColor: active ? ACTIVE_BORDER : 'rgba(255,255,255,0.10)' }}
                >
                  {active ? (
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={CHIP_GRAD}>
                      <Text className="px-3.5 py-2 font-semibold text-[16.5px] text-white">{l.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View className="bg-white/5">
                      <Text className="px-3.5 py-2 font-medium text-[16.5px] text-bear-sub">{l.label}</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>
        </View>
      )}
    </View>
  )
}

// Та же поверхность, что у остальных карточек вкладки (bodyCard +
// bodyLine) — калькулятор больше не выбивается из единого стиля
const CARD_STYLE = {
  backgroundColor: 'rgba(29,18,64,0.82)',
  borderColor: 'rgba(168,85,247,0.30)',
}

function NumField({ label, value, onChange, decimal }) {
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
        placeholderTextColor="#8B96B8"
        accessibilityLabel={label}
        className="mt-1 rounded-xl border border-white/10 bg-white/[0.06] px-1 py-2.5 font-semibold text-[19px] text-white"
      />
    </View>
  )
}

function Stat({ label, value, accent }) {
  return (
    <View className="min-w-0 flex-1 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <Text className="font-medium text-[15px] text-bear-sub2">{label}</Text>
      <Text
        maxFontSizeMultiplier={1.2}
        className="mt-0.5 font-bold text-[19px]"
        style={{ color: accent ? '#6C8CFF' : '#EEF2FB' }}
      >
        {value}
      </Text>
    </View>
  )
}
