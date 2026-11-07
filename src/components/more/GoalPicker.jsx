// «Мои цели» на «Ещё» (редизайн по шаблону Катиного референса: заголовок
// с мишенью, строка текущей цели с полосой прогресса и нормой калорий).
// Выбор цели: Похудение / Поддержка / Набор веса — управляет дневной
// нормой калорий (общие данные с разделом «Питание»). Полоса прогресса —
// движение веса к цели по весу (если она поставлена во вкладке «Тело»).
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — сводка цели и выбор цели встраиваются в строку меню «Мои цели».

import { Alert, Pressable, Text, View } from 'react-native'
import { useState } from 'react'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronDown, Target } from 'lucide-react-native'
import { BodyChip } from '../ui/BodyChip'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { GOALS, getDailyTarget } from '@/lib/data/goals'
import { applyGoalChoice } from '@/lib/data/goals-apply'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { recommendedKcal } from '@/lib/goal'
import { formatNum } from '@/lib/format'

export function GoalPicker({ embedded = false }) {
  const goal = useFoodStore((s) => s.goal)
  const weightKg = useProfileStore((s) => s.weightKg)
  const goalWeightKg = useProfileStore((s) => s.goalWeightKg)
  const weights = useProfileStore((s) => s.weights)
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  function pick(id) {
    if (id === goal) return
    // id пресета и норма калорий меняются всегда вместе (единая точка)
    applyGoalChoice(id)
    const g = GOALS.find((x) => x.id === id)
    let description = `Дневная норма — ${formatNum(getDailyTarget(id))} ккал`
    // Мягкая подсказка: при похудении с лишним весом стоит поставить
    // и цель по весу (во вкладке Тело) — без навязчивости
    if (id === 'lose') {
      const { weightKg, heightCm, goalWeightKg } = useProfileStore.getState()
      if (goalWeightKg == null && weightKg > healthyRange(heightCm).max) {
        description += ' · поставьте и цель по весу во вкладке Тело'
      }
    }
    toast({
      title: `${g.emoji} Цель: ${g.label}`,
      description,
    })

    // Личный расчёт: пресеты — средние цифры, по вашим данным точнее.
    // Спрашиваем, только если расходятся заметно (≥ 10 ккал)
    const prof = useProfileStore.getState()
    if (prof.hasBio) {
      const target = recommendedKcal({
        sex: prof.sex,
        age: prof.age,
        heightCm: prof.heightCm,
        weightKg: prof.weightKg,
        activityId: prof.activityId,
        goalId: id,
      })
      const current = useGoalsStore.getState().goals.kcal
      if (Math.abs(current - target) >= 10) {
        Alert.alert(
          'Пересчитать под вас?',
          `Пресет — средняя цифра. По вашим данным (рост, вес, возраст, активность) при цели «${g.label}» рекомендуем ≈ ${formatNum(target)} ккал в день. Сейчас в целях ${formatNum(current)} ккал.`,
          [
            { text: 'Оставить', style: 'cancel' },
            {
              text: 'Пересчитать',
              onPress: () => useGoalsStore.getState().setGoals({ kcal: target }),
            },
          ]
        )
      }
    }
  }

  // Текущая цель — строка-сводка как на шаблоне
  const currentGoal = GOALS.find((x) => x.id === goal)

  // Полоса прогресса: движение веса к цели по весу (в кг), если она есть.
  // Старт — самая ранняя запись журнала веса (weights хранит новые сверху).
  // Над полосой — «сейчас → цель», в подписи — сколько уже пройдено
  // (скрин Кати: голая полоса без цифр ни о чём не говорила)
  let barPct = null
  let barCaption = null
  let barDone = null
  if (goalWeightKg != null) {
    const start = weights.length ? weights[weights.length - 1].kg : weightKg
    const total = Math.abs(start - goalWeightKg)
    const left = Math.abs(weightKg - goalWeightKg)
    barPct = total > 0 ? Math.max(0, Math.min(1, 1 - left / total)) : left < 0.05 ? 1 : 0
    barDone = Math.max(0, total - left)
    const doneLabel = goal === 'lose' ? 'Сброшено' : 'Пройдено'
    barCaption =
      left < 0.05
        ? 'Цель по весу достигнута! 🎉'
        : `${doneLabel}: ${fmtDecimal(barDone)} кг · Осталось: ${fmtDecimal(left)} кг`
  }

  // Сводка цели: строка с полосой — видна всегда, как на шаблоне
  const summaryBlock = currentGoal && (
    <View>
      <View className="flex-row items-center gap-2.5">
        <Text className="text-[22px]">{currentGoal.emoji}</Text>
        <Text className="min-w-0 flex-1 font-bold text-[17.5px] text-bear-text">
          {currentGoal.label}
        </Text>
        <Text className="shrink-0 font-bold text-[16.5px] text-bear-bright">
          {formatNum(getDailyTarget(goal))} ккал
        </Text>
      </View>

      {barPct != null ? (
        <View className="mt-2.5">
          {/* Метки «сейчас → цель» по краям полосы */}
          <View className="mb-1 flex-row items-center justify-between">
            <Text
              maxFontSizeMultiplier={1.15}
              className="font-sans text-[12.5px] text-bear-dim"
            >
              {`${fmtDecimal(weightKg)} кг сейчас`}
            </Text>
            <Text
              maxFontSizeMultiplier={1.15}
              className="font-sans text-[12.5px] text-bear-dim"
            >
              {`цель ${fmtDecimal(goalWeightKg)} кг`}
            </Text>
          </View>
          {/* Полоса прогресса к цели по весу */}
          <View className="h-[7px] overflow-hidden rounded-full bg-white/[0.08]">
            <View
              className="h-full rounded-full"
              style={{
                width: `${Math.round(barPct * 100)}%`,
                backgroundColor: '#A78BFA',
              }}
            />
          </View>
          <Text
            maxFontSizeMultiplier={1.2}
            className="mt-1.5 font-sans text-[13px] text-bear-dim"
          >
            {barCaption}
          </Text>
        </View>
      ) : (
        <Text
          maxFontSizeMultiplier={1.2}
          className="mt-1.5 font-sans text-[13px] text-bear-dim"
        >
          {currentGoal.hint} · норма на день
        </Text>
      )}
    </View>
  )

  // Выбор цели: Похудение / Поддержка / Набор веса
  const choicesBlock = (
    <View className="gap-2" accessibilityLabel="Цель питания">
      {GOALS.map((g) => {
        const active = goal === g.id
        const body = (
          <>
            <Text className="text-[26px]">{g.emoji}</Text>
            <View className="min-w-0 flex-1">
              <Text className={`font-bold text-[17.5px] ${active ? 'text-white' : 'text-bear-text'}`}>
                {g.label}
              </Text>
              <Text className={`font-sans text-[15px] leading-snug ${active ? 'text-white/75' : 'text-bear-sub2'}`}>
                {g.hint}
              </Text>
            </View>
            <Text className={`font-bold text-[16.5px] ${active ? 'text-white' : 'text-bear-sub'}`}>
              {formatNum(getDailyTarget(g.id))} ккал
            </Text>
          </>
        )
        return (
          <Pressable
            key={g.id}
            onPress={() => pick(g.id)}
            accessibilityLabel={g.label}
            className="overflow-hidden rounded-2xl"
          >
            {active ? (
              <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                <View className="flex-row items-center gap-3 px-4 py-3">{body}</View>
              </LinearGradient>
            ) : (
              <View className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3">
                {body}
              </View>
            )}
          </Pressable>
        )
      })}
    </View>
  )

  // Встроено в строку меню: сводка + выбор цели всегда (раскрытие — на MenuRow)
  if (embedded) {
    return (
      <View accessibilityLabel="Мои цели" className="gap-3">
        {summaryBlock}
        {choicesBlock}
      </View>
    )
  }

  return (
    <View accessibilityLabel="Мои цели" className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard">
      {/* Шапка: чип-мишень + заголовок, тап раскрывает выбор цели */}
      <Pressable
        onPress={() => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? 'Свернуть выбор цели' : 'Выбрать цель питания'}
        className="flex-row items-center gap-2.5 px-4 py-3.5 active:opacity-70"
      >
        <BodyChip icon={<Target size={20} color="#C4B5FD" />} />
        <Text className="min-w-0 flex-1 font-extrabold text-[20px] tracking-tight text-bear-text">
          Мои цели
        </Text>
        <ChevronDown
          size={20}
          color="#A5AECB"
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {/* Строка цели с полосой — видна всегда, как на шаблоне */}
      {currentGoal && <View className="px-4 pb-4">{summaryBlock}</View>}

      {open && <View className="px-4 pb-4">{choicesBlock}</View>}
    </View>
  )
}
