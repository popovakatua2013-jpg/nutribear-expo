// Управление данными: начать новый день и стереть все данные (с подтверждением)

import { Alert, Pressable, Text, View } from 'react-native'
import { Sunrise, Trash2 } from 'lucide-react-native'
import { useFoodStore } from '@/store/useFoodStore'
import { totalConsumed } from '@/lib/data/diary'
import { useActivityStore, DEFAULT_VESSELS } from '@/store/useActivityStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useToast } from '../ui/Toast'
import { formatNum } from '@/lib/format'

export function DataActions() {
  const { toast } = useToast()
  const entries = useFoodStore((s) => s.entries)
  const resetDay = useFoodStore((s) => s.resetDay)
  const resetToday = useActivityStore((s) => s.resetToday)

  const kcal = totalConsumed(entries)

  function newDay() {
    resetDay()
    resetToday()
    toast({
      title: '🌅 Новый день начат!',
      description: 'Дневник питания, вода и шаги обнулены.',
    })
  }

  function wipeAll() {
    useFoodStore.setState({ goal: 'maintain', entries: { breakfast: [], lunch: [], dinner: [], snack: [] }, customMeals: [], history: [], dayKey: dayKeyOf() })
    useActivityStore.setState({ waterMl: 0, extraSteps: 0, lastWaterAt: 0, waterLog: [], vessels: DEFAULT_VESSELS, dayKey: dayKeyOf() })
    // GDPR: пол, возраст, активность и цель по весу — тоже персональные
    // данные, стираем вместе с остальным профилем
    useProfileStore.setState({
      name: '',
      sex: 'female',
      age: 30,
      heightCm: 175,
      weightKg: 75,
      activityId: 'light',
      hasBio: false,
      goalWeightKg: null,
      goalReachedAt: null,
      weights: [],
    })
    useGoalsStore.getState().reset()
    useExerciseStore.setState({ logs: {} })
    useFastingStore.setState({ windowStart: 10, windowHours: 8, fastHours: null, startedAt: null, laps: [] })
    useRecipesStore.setState({ items: [] })
    // История отчётов (шаги/ккал/вода/тренировки по дням) тоже под GDPR
    useHistoryStore.setState({ days: {} })
    // GDPR-удаление: онбординг начнётся заново (корневой макет переключится сам)
    useOnboardingStore.getState().reset()
    toast({
      title: '🗑 Данные стёрты',
      description: 'Все данные удалены. Начнём с онбординга!',
    })
  }

  function confirmWipe() {
    Alert.alert(
      'Стереть все данные?',
      'Полное удаление по GDPR: дневник, история, профиль, план онбординга. Данные будут стёрты безвозвратно — приложение предложит пройти онбординг заново.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Да, стереть', style: 'destructive', onPress: wipeAll },
      ]
    )
  }

  return (
    <View accessibilityLabel="Данные" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <Text className="font-bold text-[15px] tracking-tight text-bear-text">Данные</Text>

      <View className="mt-3 gap-2">
        <Pressable
          onPress={newDay}
          className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 active:opacity-80"
        >
          <Sunrise size={18} color="#fbbf24" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[13px] text-bear-text">Начать новый день</Text>
            <Text className="font-sans text-[11px] text-bear-sub2">
              {kcal > 0
                ? `Обнулит дневник (${formatNum(kcal)} ккал), воду и шаги`
                : 'Обнулит дневник, воду и шаги'}
            </Text>
          </View>
        </Pressable>

        <Pressable
          onPress={confirmWipe}
          className="flex-row items-center gap-3 rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] px-4 py-3.5 active:opacity-80"
        >
          <Trash2 size={18} color="#fb7185" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[13px] text-rose-300">Стереть все данные</Text>
            <Text className="font-sans text-[11px] text-bear-sub2">
              Полное удаление по GDPR: профиль, дневник, онбординг
            </Text>
          </View>
        </Pressable>
      </View>
    </View>
  )
}
