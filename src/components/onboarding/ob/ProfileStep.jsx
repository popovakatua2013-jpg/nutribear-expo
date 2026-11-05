// Этап 2. «Расскажи о себе» — анкета строками-карточками (по макету):
// тап по строке раскрывает редактирование прямо в ней. Сюда собрано
// всё, что раньше занимало три отдельных шага: данные (пол, возраст,
// рост, вес), целевой вес с темпом, активность с тренировками и
// особые состояния. «Пропустить» — продолжить без данных: мишка
// держит пресетную норму, точный расчёт можно сделать позже.

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  HeartPulse,
  Ruler,
  Scale,
  Target,
  User,
  Zap,
} from 'lucide-react-native'
import { ObShell } from './ObShell'
import { ChipMulti, OptionGrid, PillRow } from './ObOptions'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import {
  ACTIVITY_LEVELS,
  PACE_OPTIONS,
  SPECIAL_OPTIONS,
  WORKOUT_OPTIONS,
} from '@/lib/data/onboarding-options'
import { cmToIn, inToCm, kgToLb, lbToKg } from '@/lib/data/onboarding'

const num = (raw) => Number(String(raw).replace(',', '.'))

// «25 лет / 21 год / 22 года» — простая русская плюрализация
function yearsWord(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'год'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'года'
  return 'лет'
}

export function ProfileStep({ onNext, onBack }) {
  const a = useOnboardingStore((s) => s.answers)
  const patch = useOnboardingStore((s) => s.patchAnswers)
  const [open, setOpen] = useState(null) // какая строка раскрыта
  const imperial = a.units === 'imperial'

  const toggle = (key) => setOpen((cur) => (cur === key ? null : key))

  const show = (v, conv) => (v === '' || v == null ? '' : String(conv(v)))
  const setMetric = (key, raw, back) => {
    if (!raw) return patch({ [key]: '' })
    const v = num(raw)
    patch({ [key]: Number.isFinite(v) && v > 0 ? Math.round(back(v) * 10) / 10 : '' })
  }
  const setTarget = (raw) => {
    if (!raw) return patch({ targetWeightKg: '' })
    const v = num(raw)
    patch({ targetWeightKg: imperial ? Math.round((v / 2.20462) * 10) / 10 : v })
  }

  const ageShow = a.age === '' || a.age == null ? '' : String(a.age)
  const heightShow = show(a.heightCm, imperial ? cmToIn : (v) => v)
  const weightShow = show(a.weightKg, imperial ? kgToLb : (v) => v)
  const targetShow =
    a.targetWeightKg === '' || a.targetWeightKg == null
      ? ''
      : String(imperial ? kgToLb(a.targetWeightKg) : a.targetWeightKg)

  const ageVal = Number(a.age)
  const ok =
    ageVal >= 10 && ageVal <= 90 &&
    a.heightCm >= 120 && a.heightCm <= 230 &&
    a.weightKg >= 35 && a.weightKg <= 250

  const sexLabel = a.sex === 'male' ? 'Мужской' : 'Женский'
  const ageLabel = ageShow === '' ? '—' : `${ageShow} ${yearsWord(ageVal || 0)}`
  const heightLabel = heightShow === '' ? '—' : `${heightShow} ${imperial ? 'дюйм' : 'см'}`
  const weightLabel = weightShow === '' ? '—' : `${weightShow} ${imperial ? 'фунт' : 'кг'}`
  const targetLabel = targetShow === '' ? '—' : `${targetShow} ${imperial ? 'фунт' : 'кг'}`
  const workoutLabel = WORKOUT_OPTIONS.find((w) => w.value === a.workouts)?.label ?? '—'
  const activityLabel = ACTIVITY_LEVELS.find((l) => l.id === a.activity)?.label ?? 'Не выбрана'
  const specialLabel = a.special.length === 0 ? 'Нет' : `Отмечено: ${a.special.length}`

  const isGainLose = a.goalId === 'lose' || a.goalId === 'gain'

  return (
    <ObShell
      sub="Шаг 2 из 5"
      title="Расскажи о себе"
      onBack={onBack}
      footer={
        <View className="gap-0.5">
          <Pressable
            onPress={onNext}
            disabled={!ok}
            className={`overflow-hidden rounded-2xl ${ok ? '' : 'opacity-40'}`}
            accessibilityLabel="Далее"
          >
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
              <Text className="py-3.5 text-center font-bold text-[18px] text-white">Далее</Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onNext} className="py-2.5" accessibilityLabel="Пропустить">
            <Text className="text-center font-semibold text-[15.5px] text-bear-sub2">
              Пропустить
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-2.5">
        <Row
          icon={User}
          tint="#8dabff"
          label="Пол"
          value={sexLabel}
          open={open === 'sex'}
          onToggle={() => toggle('sex')}
        >
          <PillRow
            options={[['female', 'Женский'], ['male', 'Мужской']]}
            value={a.sex}
            onChange={(v) => patch({ sex: v })}
          />
        </Row>

        <Row
          icon={Calendar}
          tint="#fbbf24"
          label="Возраст"
          value={ageLabel}
          open={open === 'age'}
          onToggle={() => toggle('age')}
        >
          <NumInput
            value={ageShow}
            onChange={(raw) => patch({ age: num(raw) || '' })}
            suffix="лет"
            placeholder="25"
            keyboardType="number-pad"
          />
        </Row>

        <Row
          icon={Ruler}
          tint="#34d399"
          label="Рост"
          value={heightLabel}
          open={open === 'height'}
          onToggle={() => toggle('height')}
        >
          <NumInput
            value={heightShow}
            onChange={(raw) => setMetric('heightCm', raw, imperial ? inToCm : (v) => v)}
            suffix={imperial ? 'дюйм' : 'см'}
            placeholder={imperial ? '66' : '170'}
          />
        </Row>

        <Row
          icon={Scale}
          tint="#a78bfa"
          label="Текущий вес"
          value={weightLabel}
          open={open === 'weight'}
          onToggle={() => toggle('weight')}
        >
          <NumInput
            value={weightShow}
            onChange={(raw) => setMetric('weightKg', raw, imperial ? lbToKg : (v) => v)}
            suffix={imperial ? 'фунт' : 'кг'}
            placeholder={imperial ? '150' : '65'}
          />
        </Row>

        {isGainLose ? (
          <Row
            icon={Target}
            tint="#f87171"
            label="Желаемый вес"
            value={targetLabel}
            open={open === 'target'}
            onToggle={() => toggle('target')}
          >
            <NumInput
              value={targetShow}
              onChange={setTarget}
              suffix={imperial ? 'фунт' : 'кг'}
              placeholder={imperial ? '130' : '60'}
            />
          </Row>
        ) : null}

        <Row
          icon={Dumbbell}
          tint="#fb923c"
          label="Тренировки"
          value={workoutLabel}
          open={open === 'workouts'}
          onToggle={() => toggle('workouts')}
        >
          <PillRow options={WORKOUT_OPTIONS} value={a.workouts} onChange={(v) => patch({ workouts: v })} />
        </Row>

        <Row
          icon={Zap}
          tint="#facc15"
          label="Активность"
          value={activityLabel}
          open={open === 'activity'}
          onToggle={() => toggle('activity')}
        >
          <OptionGrid options={ACTIVITY_LEVELS} value={a.activity} onChange={(id) => patch({ activity: id })} />
        </Row>

        <Row
          icon={HeartPulse}
          tint="#f472b6"
          label="Особые состояния"
          value={specialLabel}
          open={open === 'special'}
          onToggle={() => toggle('special')}
        >
          <ChipMulti
            options={SPECIAL_OPTIONS}
            values={a.special}
            onToggle={(id) =>
              patch({
                special: a.special.includes(id)
                  ? a.special.filter((x) => x !== id)
                  : [...a.special, id],
              })
            }
          />
          <Text className="mt-2 font-sans text-[13px] leading-relaxed text-bear-dim">
            Отметьте, если что-то относится к вам: при беременности и ГВ мишка не
            снижает калории. Необязательно.
          </Text>
        </Row>

        {isGainLose ? (
          <View className="rounded-2xl border border-white/5 bg-bear-card/60 p-3.5">
            <PillRow
              label="Темп (влияет на норму калорий)"
              options={PACE_OPTIONS}
              value={a.pace}
              onChange={(v) => patch({ pace: v })}
            />
          </View>
        ) : null}

        <Text className="px-1 font-sans text-[13px] leading-relaxed text-bear-dim">
          {ok
            ? 'Готово — по этим данным мишка посчитает вашу норму калорий.'
            : 'Заполните возраст, рост и вес — или нажмите «Пропустить»: норма будет по среднему пресету, а точный расчёт можно сделать позже.'}
        </Text>
      </View>
    </ObShell>
  )
}

// Строка-карточка анкеты: иконка слева, подпись, значение справа,
// раскрытие редактирования внизу (по тапу — как на макете, но живое)
function Row({ icon: Icon, tint, label, value, open, onToggle, children }) {
  return (
    <View className="rounded-2xl border border-white/5 bg-bear-card">
      <Pressable
        onPress={onToggle}
        accessibilityLabel={label}
        accessibilityState={{ expanded: open }}
        className="flex-row items-center gap-3 p-3.5"
      >
        <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
          <Icon size={19} color={tint} />
        </View>
        <Text className="min-w-0 flex-1 font-bold text-[17px] text-bear-text" numberOfLines={1}>
          {label}
        </Text>
        <Text className="shrink-0 font-semibold text-[15.5px] text-bear-sub" numberOfLines={1}>
          {value}
        </Text>
        {open ? (
          <ChevronUp size={18} color="#8B96B8" />
        ) : (
          <ChevronDown size={18} color="#8B96B8" />
        )}
      </Pressable>
      {open ? <View className="px-3.5 pb-3.5">{children}</View> : null}
    </View>
  )
}

// Числовое поле внутри строки: ввод с суффиксом единицы справа
function NumInput({ value, onChange, suffix, placeholder, keyboardType = 'decimal-pad' }) {
  return (
    <View>
      <TextInput
        value={value === undefined || value === null ? '' : String(value)}
        onChangeText={onChange}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor="#8B96B8"
        className="rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pl-4 pr-14 font-sans text-[18px] text-white"
      />
      {suffix ? (
        <Text
          pointerEvents="none"
          className="absolute right-4 top-1/2 -translate-y-1/2 font-semibold text-[14.5px] text-bear-sub2"
        >
          {suffix}
        </Text>
      ) : null}
    </View>
  )
}
