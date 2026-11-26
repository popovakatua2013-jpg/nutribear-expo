// Управление данными: начать новый день и стереть все данные (с подтверждением)
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — содержимое встраивается в строку меню «Сброс и удаление».

import { Alert, Pressable, Text, View } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Database, Sunrise, Trash2 } from 'lucide-react-native'
import { useFoodStore } from '@/store/useFoodStore'
import { totalConsumed } from '@/lib/data/diary'
import { useActivityStore, DEFAULT_VESSELS } from '@/store/useActivityStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { useCombosStore } from '@/store/useCombosStore'
import { useProgressPhotosStore } from '@/store/useProgressPhotosStore'
import { wipePhotoDir } from '@/lib/photos'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { useDayTypesStore } from '@/store/useDayTypesStore'
import { useCycleStore } from '@/store/useCycleStore'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'
import { formatNum } from '@/lib/format'
import { useThemeColors } from '@/lib/use-theme'


export function DataActions({ embedded = false, variant = null }) {
  const themeColors = useThemeColors()
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
      description: 'Приёмы пищи, вода и шаги обнулены.',
    })
  }

  function wipeAll() {
    useFoodStore.setState({ goal: 'maintain', entries: { breakfast: [], lunch: [], dinner: [], snack: [] }, customMeals: [], history: [], dayKey: dayKeyOf() })
    useActivityStore.setState({ waterMl: 0, extraSteps: 0, lastWaterAt: 0, waterLog: [], pedometerSteps: 0, vessels: DEFAULT_VESSELS, dayKey: dayKeyOf() })
    // GDPR: пол, возраст, активность и цель по весу — тоже персональные
    // данные, стираем вместе с остальным профилем. Замеры тела (грудь/
    // талия/живот/попа/бёдра + свои замеры и скрытые ключи) — тоже
    // персональные данные: раньше они переживали полное стирание
    // (отзыв Кати: «при стирании данных замеры остаются?») — исправлено
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
      measurements: {},
      customMeasurements: [],
      hiddenMeasurements: [],
      lastBmiCat: null,
    })
    useGoalsStore.getState().reset()
    useExerciseStore.setState({ logs: {} })
    useFastingStore.setState({ windowStart: 10, windowHours: 8, fastHours: null, startedAt: null, laps: [] })
    useRecipesStore.setState({ items: [] })
    // Свои продукты, комбо и фото прогресса — тоже персональные данные
    useUserFoodsStore.setState({ items: [] })
    useCombosStore.setState({ items: [] })
    useProgressPhotosStore.getState().clearPhotos()
    wipePhotoDir() // файлы снимков в папке приложения
    // История отчётов (шаги/ккал/вода/тренировки по дням) тоже под GDPR
    useHistoryStore.setState({ days: {} })
    // Планировщик: план питания и список покупок — персональные данные
    useMealPlanStore.setState({ plans: {} })
    useShoppingStore.setState({ items: [] })
    // Особые дни (метки и прибавки) и трекер цикла — тоже персональные
    useDayTypesStore.getState().resetAll()
    useCycleStore.setState({ enabled: false, lastStart: null, length: 28, bleed: 5, history: [] })
    // Журнал старого модуля тренировок стирается из хранилища напрямую
    // (ключи @app/workouts/*) — живого кода, читающего их, больше нет.
    // «Организм» и копилка монеток удалены из приложения — туда же их
    // старые ключи, оставшиеся от прежних версий
    AsyncStorage.multiRemove([
      'nutribear-shop-v1',
      'nutribear-organism-game-v1',
      '@app/workouts/sessions',
      '@app/workouts/prefs',
      'nutribear-meal-plan',
      'nutribear-shopping-list',
      'nutribear-daytypes-v1',
      'nutribear-cycle-v1',
    ])
    // Мелкие настройки интерфейса — к стартовым значениям
    useUiPrefsStore.setState({ expanded: {}, haptics: true, weighNudgeDays: 7 })
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
      'Полное удаление по GDPR: записи питания, история, профиль и замеры тела, план онбординга. Данные будут стёрты безвозвратно — приложение предложит пройти онбординг заново.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Да, стереть', style: 'destructive', onPress: wipeAll },
      ]
    )
  }

  // Вариант «только новый день» — для строки «Начать новый день»:
  // заголовок уже на строке меню, внутри — только компактная строка
  // действия с описанием (отзыв Кати 19.11: дубль заголовка и крупные
  // строки выглядели плохо)
  if (variant === 'newday') {
    return (
      <View accessibilityLabel="Начать новый день" className="mt-1">
        <Pressable
          onPress={newDay}
          className="flex-row items-center gap-2.5 rounded-2xl bg-bear-overlay px-3.5 py-2.5 active:opacity-80"
        >
          <Sunrise size={16} color={themeColors.warn} />
          <Text
            maxFontSizeMultiplier={1.1}
            className="min-w-0 flex-1 font-sans text-[14px] text-bear-sub2"
          >
            {kcal > 0
              ? `Обнулит приёмы пищи (${formatNum(kcal)} ккал), воду и шаги — тапните, чтобы начать`
              : 'Обнулит приёмы пищи, воду и шаги — тапните, чтобы начать'}
          </Text>
        </Pressable>
      </View>
    )
  }

  // Вариант «только стирание» — красная строка внизу блока «Документы»
  // в размере соседних строк списка (отзыв Кати 19.11: была «очень
  // крупно»); подробности — в диалоге подтверждения
  if (variant === 'wipe') {
    return (
      <View accessibilityLabel="Стереть все данные">
        <Pressable
          onPress={confirmWipe}
          className="flex-row items-center gap-2 rounded-2xl bg-rose-400/[0.06] px-3.5 py-2.5 active:opacity-80"
        >
          <Trash2 size={16} color={themeColors.bad} />
          <Text
            maxFontSizeMultiplier={1.1}
            className="min-w-0 flex-1 font-semibold text-[15px] text-rose-300"
          >
            Стереть все данные
          </Text>
        </Pressable>
      </View>
    )
  }

  const content = (
    <View className="mt-1 gap-2">
      <Pressable
        onPress={newDay}
        className="flex-row items-center gap-3 rounded-2xl border border-bear-line bg-bear-overlay px-4 py-3.5 active:opacity-80"
      >
        <Sunrise size={20} color={themeColors.warn} />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[17.5px] text-bear-text">Начать новый день</Text>
          <Text className="font-sans text-[15px] text-bear-sub2">
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
        <Trash2 size={20} color={themeColors.bad} />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[17.5px] text-rose-300">Стереть все данные</Text>
          <Text className="font-sans text-[15px] text-bear-sub2">
            Полное удаление по GDPR: профиль, дневник, онбординг
          </Text>
        </View>
      </Pressable>
    </View>
  )

  // Встроено в строку меню — только содержимое
  if (embedded) {
    return <View accessibilityLabel="Сброс и удаление">{content}</View>
  }

  return (
    <CollapsibleCard
      storageKey="data-actions"
      accessibilityLabel="Данные"
      icon={<Database size={20} color={themeColors.link} />}
      title="Данные"
      summary="новый день · стереть всё"
    >
      {content}
    </CollapsibleCard>
  )
}
