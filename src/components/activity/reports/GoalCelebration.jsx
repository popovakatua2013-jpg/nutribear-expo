// Празднование цели по весу в «Отчётах». Вес у цели — золотая карточка
// с датой достижения и «стриком» удержания результата; если вес давно
// не фиксировался — мягкое напоминание взвешиваться раз в неделю;
// если после достижения вес снова ушёл — карточка «Возвращаемся
// к результату». Без цели карточка не показывается вовсе.
// Живой переход «не достиг → достиг» — поп-анимация и бurst эмодзи.
// После достижения цель питания можно одним тапом перевести
// на поддержку — норма без дефицита по Миффлину (supportSwitchPlan),
// а кнопка «Поделиться» отправляет результат через системное меню.

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Share, Text, View } from 'react-native'
import { PartyPopper, Scale, Share2, Target } from 'lucide-react-native'
import { router } from 'expo-router'
import { useProfileStore } from '@/store/useProfileStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { fmtDecimal, shortDate } from '@/lib/data/bmi'
import { daysSince, isAtGoal, supportSwitchPlan, WEIGH_NUDGE_DAYS } from '@/lib/goal'
import { formatNum, pluralDays } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'
import { requestOpenWeightModal } from '@/lib/navEvents'

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
  const hasBio = useProfileStore((s) => s.hasBio)
  const sex = useProfileStore((s) => s.sex)
  const age = useProfileStore((s) => s.age)
  const heightCm = useProfileStore((s) => s.heightCm)
  const activityId = useProfileStore((s) => s.activityId)
  const goalId = useFoodStore((s) => s.goal)
  const setGoal = useFoodStore((s) => s.setGoal)
  const setGoals = useGoalsStore((s) => s.setGoals)
  const { toast } = useToast()

  const reached = goalWeightKg != null && isAtGoal(weightKg, goalWeightKg)

  // Кнопка перехода «на поддержку»: только когда вес у цели, а питание
  // ещё на дефиците/профиците; null — цели питания уже поддержка
  const plan = reached
    ? supportSwitchPlan({ goalId, hasBio, sex, age, heightCm, weightKg, activityId })
    : null

  // Открыть вкладку ИМТ сразу с окном записи веса
  function openWeightModal() {
    router.navigate('/bmi')
    requestOpenWeightModal()
  }

  // Один тап: цель питания «Поддержка» + норма без дефицита
  function switchToMaintain() {
    if (!plan) return
    setGoal('maintain')
    setGoals({ kcal: plan.kcal })
    toast({
      title: '🎯 Цель питания — поддержка',
      description: plan.personal
        ? `Норма по вашим данным: ${formatNum(plan.kcal)} ккал в день — вес теперь держим без дефицита`
        : `Средняя норма поддержки: ${formatNum(plan.kcal)} ккал в день. Заполните биоданные — пересчитаем под вас`,
    })
  }

  // Системный шеринг результата — стандартное меню телефона
  async function shareResult() {
    const heldDays = goalReachedAt ? daysSince(goalReachedAt) : 0
    const text =
      heldDays >= 1
        ? `Мой вес ${fmtDecimal(weightKg)} кг — цель достигнута! 🐻🎉 Результат держится ${heldDays} ${pluralDays(heldDays)}.`
        : `Цель по весу достигнута — ${fmtDecimal(weightKg)} кг! 🐻🎉`
    try {
      await Share.share({ message: text })
    } catch {}
  }

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

        {/* Цель питания ещё на дефиците — один тап переводит её на поддержку */}
        {plan && (
          <Pressable
            onPress={switchToMaintain}
            accessibilityRole="button"
            accessibilityLabel={`Перейти на поддержку, норма ${formatNum(plan.kcal)} килокалорий в день`}
            className="mt-3 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#fbbf24]/15 py-2.5 active:opacity-80"
          >
            <Scale size={15} color="#fbbf24" />
            <Text className="font-semibold text-[12.5px] text-[#fbbf24]">
              {`Перейти на поддержку · ${formatNum(plan.kcal)} ккал`}
            </Text>
          </Pressable>
        )}

        {/* Похвастаться результатом — системное меню «Поделиться» */}
        <Pressable
          onPress={shareResult}
          accessibilityRole="button"
          accessibilityLabel="Поделиться результатом"
          className={`flex-row items-center justify-center gap-1.5 rounded-xl border border-[#fbbf24]/30 py-2.5 active:opacity-80 ${
            plan ? 'mt-1.5' : 'mt-3'
          }`}
        >
          <Share2 size={14} color="#fbbf24" />
          <Text className="font-semibold text-[12.5px] text-[#fbbf24]">Поделиться</Text>
        </Pressable>

        {overdue && (
          <Pressable
            onPress={openWeightModal}
            accessibilityRole="button"
            accessibilityLabel="Записать вес во вкладке ИМТ"
            className="mt-1.5 active:opacity-70"
          >
            <Text className="font-sans text-[11px] leading-snug text-[#d9b96a]">
              {Number.isFinite(lastWeighDays)
                ? `📅 Последнее взвешивание было ${lastWeighDays} ${pluralDays(lastWeighDays)} назад — запишите вес, стрик должен быть честным. Записать вес →`
                : '📅 Записать вес во вкладке ИМТ — взвешивание раз в неделю держит стрик честным →'}
            </Text>
          </Pressable>
        )}
      </Animated.View>
    )
  }

  // Цель когда-то была достигнута, но вес снова ушёл — зовём вернуться:
  // тап открывает вкладку ИМТ сразу с окном записи веса
  if (goalReachedAt) {
    const diff = Math.round((weightKg - goalWeightKg) * 10) / 10
    return (
      <Pressable
        onPress={openWeightModal}
        accessibilityRole="button"
        accessibilityLabel="Возвращаемся к результату — записать вес"
        className="flex-row items-center gap-2.5 rounded-2xl border border-white/5 bg-bear-card p-4 active:opacity-80"
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
      </Pressable>
    )
  }

  // Цель есть, но до неё ещё идти — прогресс виден на плашке во вкладке ИМТ
  return null
}
