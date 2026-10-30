// Карточка «Калькулятор ИМТ»: расчёт по полным данным пользователя —
// пол, возраст, рост, вес и уровень активности. Считает живо при вводе,
// кнопка «Сохранить в профиль» переносит данные в профиль и историю веса.
//
// Формулы: ИМТ — ВОЗ; базовый обмен — Миффлин — Сан Жеор;
// идеальный вес — Девайн; % жира — оценка Дёренберга; TDEE = BMR × коэффициент.

import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Calculator } from 'lucide-react-native'
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

  function handleSave() {
    if (!valid) return
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
    <View accessibilityLabel="Калькулятор ИМТ" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center gap-2">
        <Calculator size={18} color="#A5AECB" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Калькулятор ИМТ
        </Text>
      </View>
      <Text className="mt-0.5 font-sans text-[11px] text-bear-dim">
        Пол, возраст, рост, вес и активность — расчёт по полным данным
      </Text>

      {/* Пол */}
      <Text className="mt-4 font-medium text-xs text-bear-sub">Пол</Text>
      <View className="mt-1.5 flex-row gap-2">
        {[['female', 'Женский'], ['male', 'Мужской']].map(([id, label]) => {
          const active = sex === id
          return (
            <Pressable
              key={id}
              onPress={() => setSex(id)}
              accessibilityLabel={label}
              className={`min-w-0 flex-1 overflow-hidden rounded-2xl border ${
                active ? 'border-white/0' : 'border-white/10'
              }`}
              style={active ? { borderColor: ACTIVE_BORDER } : undefined}
            >
              {active ? (
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={CHIP_GRAD}>
                  <Text className="py-3 text-center font-semibold text-[13px] text-white">
                    {label}
                  </Text>
                </LinearGradient>
              ) : (
                <View className="bg-white/5">
                  <Text className="py-3 text-center font-medium text-[13px] text-bear-sub">
                    {label}
                  </Text>
                </View>
              )}
            </Pressable>
          )
        })}
      </View>

      {/* Возраст / Рост / Вес */}
      <View className="mt-3 flex-row gap-2">
        <NumField label="Возраст, лет" value={age} onChange={setAge} />
        <NumField label="Рост, см" value={height} onChange={setHeight} />
        <NumField label="Вес, кг" value={weight} onChange={setWeight} decimal />
      </View>

      {/* Активность */}
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

      {/* Результат */}
      {valid ? (
        <View className="mt-4 rounded-2xl bg-white/[0.04] p-4">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="font-medium text-xs text-bear-sub">Ваш ИМТ</Text>
            <Text className="font-semibold text-xs" style={{ color: cat.color }}>
              {cat.label} · {cat.range}
            </Text>
          </View>
          <Text className="mt-1 font-extrabold text-[32px] leading-tight tracking-tight text-bear-text">
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
            <Text className="font-bold text-[13px] text-bear-text">
              ≈ {fmtDecimal(fatPct)} %
            </Text>
          </View>
        </View>
      ) : (
        <Text className="mt-4 font-sans text-[12px] leading-relaxed text-bear-dim">
          Проверьте данные: возраст 10–90 лет, рост 80–250 см, вес 25–300 кг.
        </Text>
      )}

      {/* Сохранение в профиль */}
      <Pressable
        onPress={handleSave}
        disabled={!valid}
        accessibilityLabel="Сохранить данные в профиль"
        className={`mt-4 overflow-hidden rounded-2xl ${!valid ? 'opacity-50' : ''}`}
      >
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={GRAD}>
          <Text className="py-3.5 text-center font-bold text-sm text-white">
            Сохранить в профиль
          </Text>
        </LinearGradient>
      </Pressable>

      <Text className="mt-3 font-sans text-[10px] leading-relaxed text-bear-dim">
        Формулы: базовый обмен — Миффлин — Сан Жеор, идеальный вес — Девайн,
        жир — оценка Дёренберга, суточная норма — обмен × коэффициент активности.
        Расчёт ориентировочный и не заменяет консультацию врача.
      </Text>
    </View>
  )
}

function NumField({ label, value, onChange, decimal }) {
  return (
    <View className="min-w-0 flex-1">
      <Text className="font-medium text-[11px] text-bear-sub">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        textAlign="center"
        placeholder="—"
        placeholderTextColor="#8B96B8"
        className="mt-1.5 rounded-xl border border-white/10 bg-white/5 px-1 py-2.5 font-semibold text-[14px] text-white"
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
