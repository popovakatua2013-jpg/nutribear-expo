// Вкладка «Тренировки» (нижняя панель, на месте прежнего «Организма»).
// Модуль по референсу Кати (workouts-tab-code): каталог тренировок с
// поиском/фильтрами и экран «Прогресс» (серия, неделя, календарь,
// достижения) — переключаются сегментом внутри одной вкладки.
// Тап по тренировке открывает плеер по референсу (фазы «Приготовьтесь /
// Упражнение / Отдых», пауза, пропуск, «+20 сек»): движение по фазам —
// в чистом движке player/engine.js, экран — screens/player/PlayerScreen.
// Когда план пройден или выход подтверждён, плеер один раз вызывает
// onFinish: сессия пишется в журнал вкладки, завершённая — ещё и в
// дневник тренировок приложения (сожжённые калории дня — сводка,
// отчёты, опыт); поверх остаётся экран итогов, «Готово» закрывает окно.
// В конце каталога — строка «Своя тренировка»: прежняя запись вручную
// (выбор, время, ккал) переехала сюда с главной (отзыв Кати:
// «тренировки с главного экрана — убрать»).

import { useCallback, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { ChevronDown } from 'lucide-react-native'
import { WorkoutsScreen } from '@/features/workouts/screens/WorkoutsScreen'
import { ProgressScreen } from '@/features/workouts/screens/ProgressScreen'
import { PlayerScreen } from '@/features/workouts/screens/player/PlayerScreen'
import { PressableScale } from '@/features/workouts/components/PressableScale'
import {
  useSessionsStore,
  usePrefsStore,
} from '@/features/workouts/store/useWorkoutsStore'
import { TYPE_EMOJI } from '@/features/workouts/data/mockWorkouts'
import { colors, spacing, F } from '@/features/workouts/theme'
import { useExerciseStore, syncHistoryBurned } from '@/store/useExerciseStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { formatNum } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'
import { ExerciseSection } from '@/components/activity/ExerciseSection'

export default function WorkoutsTab() {
  const { toast } = useToast()
  const [screen, setScreen] = useState('catalog') // 'catalog' | 'progress'
  // Идущая тренировка: { session, workout } — окно плеера
  const [player, setPlayer] = useState(null)
  // Итог только что закончившейся сессии: тост показываем после закрытия
  // плеера — под Modal он всё равно не виден
  const finishedRef = useRef(null)

  const lang = usePrefsStore((s) => s.lang)

  // Тап по карточке каталога: создать сессию и открыть экран занятия
  const startWorkout = useCallback((workout) => {
    const id = useSessionsStore.getState().startSession(workout)
    const session = useSessionsStore
      .getState()
      .sessions.find((s) => s.id === id)
    if (session) setPlayer({ session, workout })
  }, [])

  // «Продолжить» — открываем ИДУЩУЮ сессию как есть: таймер продолжает
  // считать от её старта, без сброса
  const resumeWorkout = useCallback((workout, session) => {
    setPlayer({ session: session, workout })
  }, [])

  // Плеер дошёл до конца (или выход подтверждён): журнал сессий + дневник
  // тренировок приложения. Окно НЕ закрываем — остаётся экран итогов.
  const handleFinish = useCallback(
    (result) => {
      const { session, workout } = player
      useSessionsStore.getState().finishSession(session.id, result)
      finishedRef.current = { workout, result }
      if (result.completed) {
        // Запись за сегодня — в общую копилку сожжённого: сводка, отчёты,
        // опыт дня считают её наравне с записями вручную
        useExerciseStore.getState().addLog(dayKeyOf(), {
          exId: workout.id,
          name: workout.title.ru,
          emoji: TYPE_EMOJI[workout.type] || '🏋️',
          minutes: result.durationMin,
          kcal: result.kcal,
        })
        syncHistoryBurned(dayKeyOf())
      }
    },
    [player],
  )

  // «Готово» на экране итогов (или тихий выход без активных секунд)
  const handleClose = useCallback(() => {
    const fin = finishedRef.current
    finishedRef.current = null
    setPlayer(null)
    if (fin?.result.completed) {
      toast({
        title: '🔥 Тренировка завершена!',
        description: `${fin.workout.title.ru} · ${fin.result.durationMin} мин · ${formatNum(fin.result.kcal)} ккал`,
      })
    }
  }, [toast])

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      {/* Сегменты «Каталог / Прогресс» — один таб, два экрана референса */}
      <View style={styles.segWrap}>
        {[
          ['catalog', lang === 'ru' ? 'Каталог' : 'Catalog'],
          ['progress', lang === 'ru' ? 'Прогресс' : 'Progress'],
        ].map(([id, label]) => {
          const active = screen === id
          return (
            <PressableScale
              key={id}
              onPress={() => setScreen(id)}
              style={[styles.seg, active && styles.segActive]}
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segText, active && styles.segTextActive]}>
                {label}
              </Text>
            </PressableScale>
          )
        })}
      </View>

      {screen === 'catalog' ? (
        <WorkoutsScreen
          onStartWorkout={startWorkout}
          onResumeWorkout={resumeWorkout}
          footer={<ManualEntry />}
        />
      ) : (
        <ProgressScreen onGoCatalog={() => setScreen('catalog')} />
      )}

      {/* Экран идущей тренировки */}
      {player && (
        <PlayerScreen
          workout={player.workout}
          onClose={handleClose}
          onFinish={handleFinish}
        />
      )}
    </View>
  )
}

/* Своя тренировка — запись вручную (переехала с главного экрана) */
function ManualEntry() {
  const [open, setOpen] = useState(false)
  // Уход со вкладки сворачивает форму — как на главной раньше
  useFocusEffect(useCallback(() => () => setOpen(false), []))

  if (open) {
    return (
      <View style={{ marginTop: spacing.xxl }}>
        <View className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4">
          <ExerciseSection flat />
        </View>
      </View>
    )
  }

  return (
    <Pressable
      onPress={() => setOpen(true)}
      accessibilityRole="button"
      accessibilityLabel="Записать тренировку вручную"
      style={styles.manual}
    >
      <View style={styles.manualIcon}>
        <Text style={{ fontSize: 20 }}>📝</Text>
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.manualTitle}>Своя тренировка</Text>
        <Text style={styles.manualMeta} numberOfLines={1}>
          Записать вручную: вид, время и калории
        </Text>
      </View>
      <ChevronDown size={18} color={colors.text3} />
    </Pressable>
  )
}

const styles = {
  segWrap: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 999,
    padding: 4,
    marginHorizontal: spacing.xl,
    marginTop: 10,
  },
  seg: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 999,
    alignItems: 'center',
  },
  segActive: { backgroundColor: colors.accent },
  segText: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  segTextActive: { color: colors.accentInk },
  manual: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginTop: 10,
    minHeight: 44,
  },
  manualIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualTitle: { color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 14.5 },
  manualMeta: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: colors.text2, marginTop: 3 },
}
