// Празднование цели по весу в «Отчётах». Вес у цели — золотая карточка
// с датой достижения и «стриком» удержания результата; если вес давно
// не фиксировался — мягкое напоминание взвешиваться раз в неделю;
// если после достижения вес снова ушёл — карточка «Возвращаемся
// к результату». Без цели карточка не показывается вовсе.
// Живой переход «не достиг → достиг» — поп-анимация и бurst эмодзи.

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Text, View } from 'react-native'
import { PartyPopper, Target } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, shortDate } from '@/lib/data/bmi'
import { daysSince, isAtGoal, WEIGH_NUDGE_DAYS } from '@/lib/goal'
import { pluralDays } from '@/lib/format'

// Карточка достижения — style-объект, чтобы анимировать Animated.View
// (rounded-2xl, золотая рамка и подложка, p-4)
const GOLD_CARD = {
  borderRadius: 16,
  borderWidth: 1,
  borderColor: 'rgba(251,191,36,0.25)',
  backgroundColor: 'rgba(251,191,36,0.08)',
  padding: 16,
}

// Частицы праздничного бurst: эмодзи разлетаются из иконки и тают
function makeParticles() {
  return ['🎉', '✨', '⭐️', '🎊', '✨', '🎉'].map((emoji, i) => ({
    emoji,
    dx: (i % 2 === 0 ? -1 : 1) * (14 + Math.random() * 30),
    dy: -(46 + Math.random() * 42),
    delay: i * 45,
    dur: 620 + Math.random() * 330,
    size: 13 + Math.random() * 9,
  }))
}

export function GoalCelebration() {
  const weightKg = useProfileStore((s) => s.weightKg)
  const goalWeightKg = useProfileStore((s) => s.goalWeightKg)
  const goalReachedAt = useProfileStore((s) => s.goalReachedAt)
  const weights = useProfileStore((s) => s.weights)

  const reached = goalWeightKg != null && isAtGoal(weightKg, goalWeightKg)

  // Анимация — только при живом переходе «не достиг → достиг»;
  // карточка, сразу открытая достигнутой, появляется без эффектов
  const pop = useRef(new Animated.Value(1)).current
  const wasReachedRef = useRef(reached)
  const [burst, setBurst] = useState(null)

  useEffect(() => {
    if (reached && !wasReachedRef.current) {
      wasReachedRef.current = true
      pop.setValue(0)
      Animated.spring(pop, {
        toValue: 1,
        friction: 5,
        tension: 130,
        useNativeDriver: true,
      }).start()
      setBurst(makeParticles().map((p) => ({ ...p, anim: new Animated.Value(0) })))
    }
    if (!reached) wasReachedRef.current = false
  }, [reached, pop])

  // Прогоняем частицы и убираем, когда все долетели
  useEffect(() => {
    if (!burst) return
    Animated.parallel(
      burst.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          delay: p.delay,
          duration: p.dur,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start(({ finished }) => {
      if (finished) setBurst(null)
    })
  }, [burst])

  if (goalWeightKg == null) return null

  // Цель достигнута: дата награды, сколько дней держим и честность стрика
  if (reached) {
    const heldDays = goalReachedAt ? daysSince(goalReachedAt) : 0
    const lastWeighDays = weights[0]?.date ? daysSince(weights[0].date) : Infinity
    const overdue = lastWeighDays > WEIGH_NUDGE_DAYS
    return (
      <Animated.View
        accessibilityLabel="Цель по весу достигнута"
        style={[
          GOLD_CARD,
          {
            opacity: pop,
            transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          },
        ]}
      >
        {burst && (
          <View pointerEvents="none" style={{ position: 'absolute', left: 30, top: 30 }}>
            {burst.map((p, i) => (
              <Animated.Text
                key={i}
                style={{
                  position: 'absolute',
                  fontSize: p.size,
                  opacity: p.anim.interpolate({
                    inputRange: [0, 0.75, 1],
                    outputRange: [1, 0.85, 0],
                  }),
                  transform: [
                    { translateX: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dx] }) },
                    { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0, p.dy] }) },
                    { scale: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) },
                  ],
                }}
              >
                {p.emoji}
              </Animated.Text>
            ))}
          </View>
        )}

        <View className="flex-row items-center gap-2.5">
          <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#fbbf24]/15">
            <PartyPopper size={20} color="#fbbf24" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[14px] leading-snug text-[#fbbf24]">
              Цель по весу достигнута!
            </Text>
            <Text className="mt-0.5 font-sans text-[11.5px] leading-snug text-bear-sub">
              Вес {fmtDecimal(weightKg)} кг
              {goalReachedAt ? ` · достигнута ${shortDate(new Date(goalReachedAt))}` : ''}
            </Text>
          </View>
        </View>
        <Text className="mt-2.5 font-sans text-[11.5px] leading-snug text-bear-sub">
          {heldDays >= 1
            ? `🏅 Результат держится: ${heldDays} ${pluralDays(heldDays)}. `
            : '🏅 Результат взят — с этого дня держим его. '}
          Дальше — удержание: взвешивайся раз в неделю и держи норму калорий.
        </Text>
        {overdue && (
          <Text className="mt-1.5 font-sans text-[11px] leading-snug text-[#d9b96a]">
            {Number.isFinite(lastWeighDays)
              ? `📅 Последнее взвешивание было ${lastWeighDays} ${pluralDays(lastWeighDays)} назад — запишите вес, стрик должен быть честным.`
              : '📅 Запишите вес во вкладке ИМТ — взвешивание раз в неделю держит стрик честным.'}
          </Text>
        )}
      </Animated.View>
    )
  }

  // Цель когда-то была достигнута, но вес снова ушёл — зовём вернуться
  if (goalReachedAt) {
    const diff = Math.round((weightKg - goalWeightKg) * 10) / 10
    return (
      <View
        accessibilityLabel="Цель по весу была достигнута"
        className="flex-row items-center gap-2.5 rounded-2xl border border-white/5 bg-bear-card p-4"
      >
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8DABFF]/15">
          <Target size={20} color="#8DABFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[14px] leading-snug text-bear-text">
            Возвращаемся к результату
          </Text>
          <Text className="mt-0.5 font-sans text-[11.5px] leading-snug text-bear-sub">
            Цель {fmtDecimal(goalWeightKg)} кг была достигнута{' '}
            {shortDate(new Date(goalReachedAt))} · до неё {diff > 0 ? '−' : '+'}
            {fmtDecimal(Math.abs(diff))} кг
          </Text>
        </View>
      </View>
    )
  }

  // Цель есть, но до неё ещё идти — прогресс виден на плашке во вкладке ИМТ
  return null
}
