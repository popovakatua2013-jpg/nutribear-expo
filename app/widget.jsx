// Экран «Виджет дня» — крупные цифры калорий/воды/шагов для режима
// «телефон на столе». Это in-app виджет, который работает в Expo Go
// (нативный виджет рабочего стола требует EAS Build с expo-widget —
// см. README). Доступ: «Ещё → Виджет дня» (карточка-вход) или
// прямой роут /widget. Авто-обновление каждые 30 сек (если экран
// активен) — цифры не «застывают».
//
// Три кольца прогресса (как у Apple Activity): калории (синие),
// вода (голубые), шаги (зелёные). Внизу — прогресс к цели дня в %.

import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ArrowLeft, RefreshCw } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useExerciseStore, totalBurned } from '@/store/useExerciseStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { totalConsumed } from '@/lib/data/diary'

// Кольцо прогресса: SVG-подобный View с border + прозрачной серединой.
// Не тянем react-native-svg (лишняя зависимость) — рисуем дугу через
// поворот полукольца. Просто и достаточно для виджета.
function Ring({ progress, color, size = 110, label, value, sub }) {
  const pct = Math.max(0, Math.min(100, progress))
  return (
    <View className="items-center" style={{ width: size + 20 }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 8,
          borderColor: 'rgba(255,255,255,0.08)',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Заполненная дуга: поворот верхней половины кольца */}
        <View
          style={{
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: 'auto',
            height: (size + 8) / 2,
            borderTopLeftRadius: (size + 8) / 2,
            borderTopRightRadius: (size + 8) / 2,
            borderWidth: 8,
            borderBottomWidth: 0,
            borderColor: color,
            opacity: pct > 0 ? 1 : 0,
            // Половина кольца = 50%; сверх 50% «дорисовываем» нижнюю
            transform: [{ rotate: `${Math.min(180, (pct / 100) * 360)}deg` }],
          }}
        />
        <Text className="font-extrabold text-[22px] text-bear-text">{value}</Text>
        <Text className="mt-0.5 text-[12px] text-bear-sub2">{sub}</Text>
      </View>
      <Text className="mt-2 font-bold text-[14px] text-bear-sub2">{label}</Text>
    </View>
  )
}

export default function WidgetScreen() {
  const insets = useSafeAreaInsets()
  const entries = useFoodStore((s) => s.entries)
  const waterMl = useActivityStore((s) => s.waterMl)
  const steps = useActivityStore(selectTotalSteps)
  // Поле стора называется logs (регрессия 16.11: селектор s.exercises не
  // существует — exercises приходил undefined, и totalBurned ронял экран
  // красным «Cannot convert undefined value to object»)
  const exLogs = useExerciseStore((s) => s.logs)
  const goals = useGoalsStore((s) => s.goals)

  // Тики обновления — раз в 30 сек перерисовываем цифры (на случай,
  // если сторы поменялись из фоновой задачи — pedometer, health connect)
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  const eaten = totalConsumed(entries)
  // Вся активность за сегодня: тренировки за день + шаги — как на главной
  // и «Активности» (второй аргумент — ключ дня, без него расчёт неверен)
  const burned = totalBurned(exLogs, dayKeyOf(), steps)
  const kcalLeft = goals.kcal - eaten + burned

  const kcalPct = goals.kcal > 0 ? Math.round((eaten / goals.kcal) * 100) : 0
  const waterPct = goals.waterMl > 0 ? Math.round((waterMl / goals.waterMl) * 100) : 0
  const stepsPct = goals.steps > 0 ? Math.round((steps / goals.steps) * 100) : 0

  // Общий прогресс дня: среднее трёх колец (калории / вода / шаги)
  const overall = Math.round((kcalPct + waterPct + stepsPct) / 3)

  return (
    <View className="flex-1 bg-bear-bg" style={{ paddingTop: insets.top }}>
      {/* Шапка */}
      <View className="flex-row items-center justify-between border-b border-white/5 px-3 pb-3.5 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Назад"
          accessibilityRole="button"
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <ArrowLeft size={20} color="#AEB9D9" />
        </Pressable>
        <View className="min-w-0 flex-1 pl-2">
          <Text className="font-extrabold text-[21px] text-bear-text">Виджет дня</Text>
          <Text className="mt-0.5 text-[15px] text-[#8a94b3]">
            Общий прогресс: {overall}%
          </Text>
        </View>
        <Pressable
          onPress={() => setTick((t) => t + 1)}
          accessibilityLabel="Обновить"
          accessibilityRole="button"
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <RefreshCw size={18} color="#AEB9D9" />
        </Pressable>
      </View>

      <View
        className="flex-1 items-center justify-center px-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        {/* Три кольца */}
        <View className="flex-row items-center justify-center gap-3">
          <Ring
            progress={kcalPct}
            color="#4D7CFE"
            label="Калории"
            value={eaten}
            sub={`из ${goals.kcal}`}
          />
          <Ring
            progress={waterPct}
            color="#38BDF8"
            label="Вода"
            value={`${(waterMl / 1000).toFixed(1)}л`}
            sub={`из ${(goals.waterMl / 1000).toFixed(1)}л`}
          />
          <Ring
            progress={stepsPct}
            color="#4ade80"
            label="Шаги"
            value={steps}
            sub={`из ${goals.steps}`}
          />
        </View>

        {/* Крупная цифра остатка */}
        <View className="mt-8 items-center">
          <Text className="text-[15px] text-bear-sub2">Осталось съесть</Text>
          <Text
            className={`mt-1 font-extrabold text-[56px] ${
              kcalLeft < 0 ? 'text-amber-400' : 'text-bear-text'
            }`}
          >
            {kcalLeft > 0 ? kcalLeft : 0}
          </Text>
          <Text className="text-[14px] text-bear-sub2">ккал</Text>
          {kcalLeft < 0 ? (
            <Text className="mt-2 text-[14px] text-amber-400">
              Перебор на {-kcalLeft} ккал
            </Text>
          ) : null}
        </View>

        {/* Подсказка */}
        <View className="mt-8 rounded-2xl bg-white/[0.04] px-4 py-3">
          <Text className="text-center text-[14px] text-bear-sub2">
            Это in-app виджет — работает в Expo Go. Нативный виджет для
            рабочего стола телефона требует EAS Build (см. README
            архива).
          </Text>
        </View>
      </View>
    </View>
  )
}
