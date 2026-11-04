// Карточка «Калькулятор ИМТ» в стиле макета: фиолетовый чип-иконка,
// подзаголовок, пилюли пола с символами ♀/♂, три поля (возраст, рост,
// вес), градиентная кнопка «Рассчитать» и неоновый силуэт справа.
// По умолчанию карточка СВЁРНУТА (запрос пользователя): видна только
// шапка с шевроном — тап раскрывает поля; состояние живёт до перезагрузки
// экрана. Расчёт по полным данным пользователя — пол, возраст, рост, вес
// и уровень активности. Кнопка сохраняет данные в профиль и раскрывает
// подробные результаты (норма веса, обмен, суточная норма, жир).
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
          <Calculator size={17} color="#C4B5FD" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15.5px] tracking-tight text-white">
            Калькулятор ИМТ
          </Text>
          <Text maxFontSizeMultiplier={1.2} className="font-sans text-[11px] text-bear-dim">
            Узнай свой индекс массы тела
          </Text>
        </View>
        <View className="shrink-0 rounded-full bg-white/[0.06] p-1.5">
          {open ? (
            <ChevronUp size={16} color="#C4B5FD" />
          ) : (
            <ChevronDown size={16} color="#C4B5FD" />
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
                  accessibilityLabel={label}
                  className="min-w-0 flex-1 overflow-hidden rounded-full border"
                  style={{ borderColor: active ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.10)' }}
                >
                  {active ? (
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#6D5AE6', '#8B5CF6']}>
                      <View className="flex-row items-center justify-center gap-1.5 py-2.5">
                        <Text className="text-[13px]">{glyph}</Text>
                        <Text className="font-bold text-[12.5px] text-white">{label}</Text>
                      </View>
                    </LinearGradient>
                  ) : (
                    <View className="flex-row items-center justify-center gap-1.5 bg-white/[0.05] py-2.5">
                      <Text className="text-[13px] text-bear-sub">{glyph}</Text>
                      <Text className="font-medium text-[12.5px] text-bear-sub">{label}</Text>
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
                <Calculator size={16} color="#FFFFFF" />
                <Text className="font-bold text-[14px] text-white">Рассчитать</Text>
              </View>
            </LinearGradient>
          </Pressable>
      </View>
      )}

      {/* Подробные результаты — раскрываются кнопкой «Рассчитать» */}
      {showResult && valid && (
        <View className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-medium text-xs text-bear-sub">Ваш ИМТ</Text>
            <Text className="font-semibold text-xs" style={{ color: cat.color }}>
              {cat.label} · {cat.range}
            </Text>
          </View>
          <Text className="mt-1 font-extrabold text-[30px] leading-tight tracking-tight text-white">
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

          <View className="mt-2 flex-row items-center justify-between rounded-xl bg-white/[0.03] px-3 py-2.5">
            <Text className="font-medium text-[12px] text-bear-soft">
              Жир в организме (оценка)
            </Text>
            <Text className="font-bold text-[13px] text-white">
              ≈ {fmtDecimal(fatPct)} %
            </Text>
          </View>

          {/* Уровень активности — участвует в суточной норме */}
          <Text className="mt-3 font-medium text-xs text-bear-sub">Уровень активности</Text>
          <View className="mt-1.5 flex-row flex-wrap gap-2">
            {TDEE_LEVELS.map((l) => {
              const active = activityId === l.id
              return (
                <Pressable
                  key={l.id}
                  onPress={() => setActivityId(l.id)}
                  accessibilityLabel={l.label}
                  className="overflow-hidden rounded-full border"
                  style={{ borderColor: active ? ACTIVE_BORDER : 'rgba(255,255,255,0.10)' }}
                >
                  {active ? (
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={CHIP_GRAD}>
                      <Text className="px-3.5 py-2 font-semibold text-[12px] text-white">{l.label}</Text>
                    </LinearGradient>
                  ) : (
                    <View className="bg-white/5">
                      <Text className="px-3.5 py-2 font-medium text-[12px] text-bear-sub">{l.label}</Text>
                    </View>
                  )}
                </Pressable>
              )
            })}
          </View>

          <Text className="mt-3 font-sans text-[10px] leading-relaxed text-bear-dim">
            Формулы: базовый обмен — Миффлин — Сан Жеор, идеальный вес — Девайн,
            жир — оценка Дёренберга, суточная норма — обмен × коэффициент активности.
            Расчёт ориентировочный и не заменяет консультацию врача.
          </Text>
        </View>
      )}
    </View>
  )
}

const CARD_STYLE = {
  backgroundColor: '#181031',
  borderColor: 'rgba(168,85,247,0.20)',
}

function NumField({ label, value, onChange, decimal }) {
  return (
    <View className="min-w-0 flex-1">
      <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-medium text-[10.5px] text-bear-sub">
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
        className="mt-1 rounded-xl border border-white/10 bg-white/[0.06] px-1 py-2.5 font-semibold text-[14px] text-white"
      />
    </View>
  )
}

function Stat({ label, value, accent }) {
  return (
    <View className="min-w-0 flex-1 rounded-xl bg-white/[0.03] px-3 py-2.5">
      <Text className="font-medium text-[10px] text-bear-sub2">{label}</Text>
      <Text
        className="mt-0.5 font-bold text-[14px]"
        style={{ color: accent ? '#6C8CFF' : '#EEF2FB' }}
      >
        {value}
      </Text>
    </View>
  )
}
