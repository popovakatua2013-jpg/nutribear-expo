// Главный экран: 4 карточки показателей дня (шаги, калории, активность,
// вода), сводка «Съедено за сегодня», тренировки (перенесены с вкладки
// «Дневник»), приёмы пищи и рейтинг питания (клетчатка, сахар,
// нутриенты — за день и месяц). Блоки «Голодание» и «Ваши цели» удалены
// по запросу. Модалки: еда (хаб), все приёмы. Шапка экрана — с мягкой
// неоновой дымкой, как на вкладке «Тело» (единый стиль страниц).
// Показатели дня пишутся в историю — для отчётов.
// «Главная» — только сегодня (по запросу пользователя): карточки
// показателей открывают свои быстрые действия (тап «Шаги» — записать
// шаги вручную, тап «Вода» — изменить стаканы, «Активность» — скролл
// к тренировкам), тапы по кольцам и строке «Итог» убраны — история
// по дням теперь живёт во вкладке «Дневник»: тап по карточке-итогу
// в «Отчётах» открывает окно истории (MetricHistoryModal).
// История за вчера и старше — там, за сегодня — здесь.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DeviceEventEmitter, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useFocusEffect } from 'expo-router'
import Notifications from '@/lib/notifs'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import { ActivityStats } from '@/components/activity/ActivityStats'
import { ExerciseSection } from '@/components/activity/ExerciseSection'
import { WaterModal } from '@/components/home/WaterModal'
import { DailySummary } from '@/components/home/DailySummary'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { Greeting } from '@/components/home/Greeting'
import { EveningNudge } from '@/components/home/EveningNudge'
import { MealPlanCard } from '@/components/home/MealPlanCard'
import { NutritionRating } from '@/components/home/NutritionRating'
import { QuoteCard } from '@/components/home/QuoteCard'
import { AllMealsModal } from '@/components/home/AllMealsModal'
import { AddFoodModal } from '@/components/food/AddFoodModal'
import { AiChat } from '@/components/home/AiChat'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useExerciseStore, totalBurned } from '@/store/useExerciseStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'
import { totalConsumed, dayBju } from '@/lib/data/diary'
import { WATER_GLASS, xpForDay } from '@/lib/data/activity'
import { formatNum } from '@/lib/format'
import { useToast } from '@/components/ui/Toast'

export default function HomeScreen() {
  const insets = useSafeAreaInsets()
  const { toast } = useToast()
  const scrollRef = useRef(null)
  // Скролл к блоку «Тренировки» (тап по карточке «Активность»):
  // y-координата блока запоминается в onLayout
  const exercisesY = useRef(0)
  const goToExercises = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, exercisesY.current - 8), animated: true })
  const [addOpen, setAddOpen] = useState(false)
  const [allOpen, setAllOpen] = useState(false)
  const [waterOpen, setWaterOpen] = useState(false)
  const [mealId, setMealId] = useState('breakfast')
  // Ручной ввод шагов (тап по карточке «Шаги»)
  const [stepsOpen, setStepsOpen] = useState(false)
  const [stepsVal, setStepsVal] = useState('')
  // Долгий тап по карточке «Вода»/«Активность»/кольцам — быстрый редактор цели
  const [goalEdit, setGoalEdit] = useState(null) // {field, title, unit, min, max}
  const [goalVal, setGoalVal] = useState('')

  function openGoalEdit(cfg) {
    setGoalEdit(cfg)
    setGoalVal('')
  }

  function saveGoal() {
    if (!goalEdit) return
    const n = Math.round(Number(String(goalVal).replace(',', '.')) || 0)
    if (n < goalEdit.min || n > goalEdit.max) {
      toast({
        title: '❗ Неверное значение',
        description: `От ${formatNum(goalEdit.min)} до ${formatNum(goalEdit.max)} ${goalEdit.unit}`,
      })
      return
    }
    setGoals({ [goalEdit.field]: n })
    toast({
      title: '🎯 Цель обновлена',
      description: `${goalEdit.title}: ${formatNum(n)} ${goalEdit.unit} в день`,
    })
    setGoalEdit(null)
  }

  const entries = useFoodStore((s) => s.entries)
  const removeEntry = useFoodStore((s) => s.removeEntry)
  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore(selectTotalSteps) // датчик + ручные
  const addWater = useActivityStore((s) => s.addWater)
  const addSteps = useActivityStore((s) => s.addSteps)
  const exLogs = useExerciseStore((s) => s.logs)
  const recordToday = useHistoryStore((s) => s.record)
  const historyDays = useHistoryStore((s) => s.days)
  // Стрик: сколько дней подряд ведётся дневник (чип с огоньком в сводке)
  const streak = useMemo(() => streakOf(historyDays), [historyDays])
  const goals = useGoalsStore((s) => s.goals)
  const setGoals = useGoalsStore((s) => s.setGoals)

  const consumed = totalConsumed(entries)
  const day = dayBju(entries)
  // Вся активность за сегодня: тренировки + шаги (≈0.04 ккал/шаг)
  const burned = totalBurned(exLogs, dayKeyOf(), extraSteps)
  const mealCount = Object.values(entries).flat().length
  // Опыт: шаги + стаканы воды + приёмы пищи + тренировки (общая формула)
  const xp = xpForDay({ steps: extraSteps, waterMl, mealCount, burned })
  const waterPct = Math.min(
    100,
    Math.round((waterMl / Math.max(1, goals.waterMl)) * 100)
  )
  // Активность (минуты): ~100 шагов ≈ 1 минута ходьбы (как в dashboard.js)
  const minutes = Math.round(extraSteps / 100)
  const minutesPct = Math.min(
    100,
    Math.round((minutes / Math.max(1, goals.minutes)) * 100)
  )

  // Съеденное, вода и шаги за сегодня — в дневную историю (для отчётов)
  useEffect(() => {
    recordToday(dayKeyOf(), { kcal: consumed, waterMl, steps: extraSteps, burned, xp })
  }, [consumed, waterMl, extraSteps, burned, xp, recordToday])

  function handleAddWater() {
    addWater(WATER_GLASS)
    toast({
      title: '💧 Стакан воды выпит!',
      description: `+${WATER_GLASS} мл · ${Math.min(
        100,
        Math.round(((waterMl + WATER_GLASS) / Math.max(1, goals.waterMl)) * 100)
      )}% нормы`,
    })
  }

  function handleAddSteps() {
    addSteps(1000)
    toast({
      title: '🚶 +1 000 шагов!',
      description: 'Маленькие шаги приводят к большим результатам',
    })
  }

  // Ручной ввод шагов с плитки «Шаги»: пишем в ту же копилку, что и «+»
  function saveSteps() {
    const n = Math.round(Number(String(stepsVal).replace(/\s/g, '').replace(',', '.')) || 0)
    if (!Number.isFinite(n) || n < 1 || n > 50000) {
      toast({
        title: '❗ Проверьте шаги',
        description: 'От 1 до 50 000 за раз, например 4 500',
      })
      return
    }
    addSteps(n)
    setStepsOpen(false)
    setStepsVal('')
    toast({
      title: '🚶 Шаги записаны!',
      description: `+${formatNum(n)} шагов к сегодняшнему результату`,
    })
  }

  // Активация онбординга: «Добавить свой завтрак» — окно открытия блюда
  const openBreakfast = useOnboardingStore((s) => s.openBreakfast)
  const consumeOpenBreakfast = useOnboardingStore((s) => s.consumeOpenBreakfast)
  useEffect(() => {
    if (openBreakfast) {
      consumeOpenBreakfast()
      setMealId('breakfast')
      setAddOpen(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Уход с экрана закрывает модалки (иначе они висят над другими вкладками)
  useFocusEffect(
    useCallback(
      () => () => {
        setAddOpen(false)
        setAllOpen(false)
        setWaterOpen(false)
        setStepsOpen(false)
      },
      []
    )
  )

  // Тап по уведомлению открывает нужное окно (напоминания о воде/еде).
  // Плюс холодный старт: приложение запустили тапом по уведомлению.
  useEffect(() => {
    const subWater = DeviceEventEmitter.addListener('nutribear/open-water', () =>
      setWaterOpen(true)
    )
    const subFood = DeviceEventEmitter.addListener('nutribear/open-food', (e) => {
      setMealId(e?.mealId || 'breakfast')
      setAddOpen(true)
    })
    // Библиотека может быть недоступна (lib/notifs.js) — тогда просто
    // слушаем события приложения, без тапов по уведомлениям
    Notifications?.getLastNotificationResponseAsync()
      ?.then((resp) => {
        const data = resp?.notification?.request?.content?.data
        if (data?.kind === 'water') setWaterOpen(true)
        else if (data?.kind === 'meal') {
          setMealId(data.mealId || 'breakfast')
          setAddOpen(true)
        }
      })
      ?.catch(() => {})
    return () => {
      subWater.remove()
      subFood.remove()
    }
  }, [])

  // Скролл к произвольному блоку по нативному тегу (например, тап по
  // баллу рейтинга питания — к раскрытому разделу «Подробнее»)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('nutribear/scroll-to-view', ({ tag }) => {
      try {
        const sc = scrollRef.current
        if (sc && typeof sc.scrollResponderScrollNativeHandleToKeyboard === 'function') {
          sc.scrollResponderScrollNativeHandleToKeyboard(tag, 90, true)
        }
      } catch {}
    })
    return () => sub.remove()
  }, [])

  function openAdd(id) {
    setMealId(id)
    setAddOpen(true)
  }

  return (
    <View className="flex-1 bg-bear-bg">
      {/* Неоновая дымка в шапке — единый стиль страниц (как на «Теле») */}
      <SoftGlow id="glowHomeTR" w={190} h={160} peak={0.3} color="#7C3AED" style={{ top: -26, right: -46 }} />
      <SoftGlow id="glowHomeL" w={120} h={150} peak={0.14} color="#4D7CFE" style={{ top: 60, left: -40 }} />
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 16, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Приветствие: мишка, время суток, статус дневника и дата */}
        <Greeting consumed={consumed} target={goals.kcal} />

        {/* Компактный ряд из 3 карточек в одну строку: шаги, вода,
            активность (кольцо цели сжигания, долгий тап — правка).
            Карточку «Калории» убрали — её данные уже в сводке
            «Съедено за сегодня» ниже. Тап по карточке — её быстрое
            действие (записать шаги / изменить стаканы / к тренировкам);
            история по дням — во вкладке «Дневник» */}
        <ActivityStats
          steps={extraSteps}
          burned={burned}
          minutes={minutes}
          minutesGoal={goals.minutes}
          minutesPct={minutesPct}
          waterPct={waterPct}
          waterMl={waterMl}
          stepsGoal={goals.steps}
          waterGoalMl={goals.waterMl}
          burnGoal={goals.burnKcal}
          onEditBurnGoal={() =>
            openGoalEdit({ field: 'burnKcal', title: 'Цель «сжечь за день»', unit: 'ккал', min: 50, max: 5000 })
          }
          onAddSteps={handleAddSteps}
          onAddWater={handleAddWater}
          onOpenWater={() => setWaterOpen(true)}
          onEditWaterGoal={() =>
            openGoalEdit({ field: 'waterMl', title: 'Цель по воде', unit: 'мл', min: 500, max: 6000 })
          }
          onOpenStepsInput={() => setStepsOpen(true)}
          onGoActivity={goToExercises}
        />

        {/* Вечерняя подсказка: с 19:00 догоняем воду/калории, если отстаём */}
        <EveningNudge
          waterPct={waterPct}
          waterMl={waterMl}
          waterGoalMl={goals.waterMl}
          kcal={consumed}
          kcalGoal={goals.kcal}
          onAddWater={handleAddWater}
          onAddFood={() => openAdd('dinner')}
        />

        {/* Съедено за сегодня — сводка над планом питания: кольца «съедено»
            и «сожжено», пилюля остатка и итог дня; долгий тап по половинам —
            правка соответствующей цели. История по дням — во вкладке
            «Дневник» (тап по карточке-итогу в «Отчётах») */}
        <DailySummary
          consumed={consumed}
          target={goals.kcal}
          bju={day}
          burned={burned}
          burnGoal={goals.burnKcal}
          streak={streak}
          onEditKcalGoal={() =>
            openGoalEdit({ field: 'kcal', title: 'Цель по калориям', unit: 'ккал', min: 800, max: 6000 })
          }
          onEditBurnGoal={() =>
            openGoalEdit({ field: 'burnKcal', title: 'Цель «сжечь за день»', unit: 'ккал', min: 50, max: 5000 })
          }
        />

        {/* Тренировки — перенесены с вкладки «Дневник» по запросу:
            сожжённое из сводки и кольца рядом с записью тренировок.
            Тап по карточке «Активность» плавно скроллит сюда */}
        <View
          onLayout={(e) => {
            exercisesY.current = e.nativeEvent.layout.y
          }}
        >
          <ExerciseSection />
        </View>

        {/* План питания: 4 приёма пищи */}
        <MealPlanCard
          onAdd={openAdd}
          onRemove={removeEntry}
          onViewAll={() => setAllOpen(true)}
        />

        {/* Рейтинг питания: клетчатка, сахар, нутриенты — день/месяц */}
        <NutritionRating />

        {/* Баннер-мотивация в конце экрана */}
        <QuoteCard />
      </ScrollView>

      {/* Плавающий ИИ-чат, как в веб-версии */}
      <AiChat />

      <AddFoodModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        mealId={mealId}
        onMealIdChange={setMealId}
      />

      <AllMealsModal
        open={allOpen}
        onClose={() => setAllOpen(false)}
        kcal={goals.kcal}
        onAddToMeal={(id) => {
          setAllOpen(false)
          openAdd(id)
        }}
      />

      {/* Вода: правка стаканов за день — тап по карточке «Вода» */}
      <WaterModal
        open={waterOpen}
        onClose={() => setWaterOpen(false)}
        goalMl={goals.waterMl}
        ml={waterMl}
      />

      {/* Ручной ввод шагов: та же копилка, что и «+»; открывается
          тапом по карточке «Шаги» */}
      <Modal
        visible={stepsOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setStepsOpen(false)}
      >
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
          <Pressable
            className="flex-1 items-center justify-center bg-black/60 px-8"
            onPress={() => setStepsOpen(false)}
          >
            <Pressable
              className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5"
              onPress={() => {}}
              accessibilityLabel="Записать шаги вручную"
            >
              <View className="flex-row items-center justify-between">
                <Text className="font-bold text-[15px] text-bear-text">🚶 Записать шаги</Text>
                <Pressable
                  onPress={() => setStepsOpen(false)}
                  accessibilityLabel="Закрыть"
                  className="p-1"
                >
                  <X size={20} color="#A5AECB" />
                </Pressable>
              </View>
              <Text className="mt-1 font-sans text-[11px] text-bear-sub">
                Добавим к сегодняшним шагам — {formatNum(extraSteps)} уже есть
              </Text>
              <View className="mt-3 flex-row items-center gap-2">
                <TextInput
                  value={stepsVal}
                  onChangeText={setStepsVal}
                  keyboardType="number-pad"
                  maxLength={6}
                  placeholder="Например, 4500"
                  placeholderTextColor="#8B96B8"
                  accessibilityLabel="Количество шагов"
                  autoFocus
                  onSubmitEditing={saveSteps}
                  className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
                />
                <Text className="shrink-0 font-sans text-sm text-bear-sub">шагов</Text>
              </View>
              <Pressable
                onPress={saveSteps}
                accessibilityRole="button"
                accessibilityLabel="Сохранить шаги"
                className="mt-4 rounded-2xl py-3 active:opacity-80"
                style={{ backgroundColor: '#7B6CF6' }}
              >
                <Text className="text-center font-bold text-sm text-white">Записать</Text>
              </Pressable>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Быстрая правка цели с главной (долгий тап по карточке) */}
      <Modal
        visible={Boolean(goalEdit)}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setGoalEdit(null)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-8">
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[15px] text-bear-text">
                {goalEdit?.title}
              </Text>
              <Pressable
                onPress={() => setGoalEdit(null)}
                accessibilityLabel="Закрыть"
                className="p-1"
              >
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[11px] text-bear-sub">
              {`Сейчас: ${formatNum(goals[goalEdit?.field || 'kcal'])} ${goalEdit?.unit || ''} в день`}
            </Text>
            <View className="mt-3 flex-row items-center gap-2">
              <TextInput
                value={goalVal}
                onChangeText={setGoalVal}
                keyboardType="number-pad"
                maxLength={5}
                placeholder={String(goals[goalEdit?.field || 'kcal'] || '')}
                placeholderTextColor="#8B96B8"
                accessibilityLabel="Новое значение цели"
                autoFocus
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
              />
              <Text className="shrink-0 font-sans text-sm text-bear-sub">{goalEdit?.unit}</Text>
            </View>
            <Pressable
              onPress={saveGoal}
              accessibilityRole="button"
              accessibilityLabel="Сохранить цель"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text className="text-center font-bold text-sm text-white">Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}