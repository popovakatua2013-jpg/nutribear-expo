// Секция «Отчёты»: дисциплина периода, карточки итогов с Δ% и рекордом,
// нутриенты из журнала питания и окно истории показателя. Период (7/30/90)
// выбирается пилюлями в шапке секции — им живут карточки, дисциплина и
// нутриенты. Тап по карточке показателя ОТКРЫВАЕТ ОКНО ИСТОРИИ
// (MetricHistoryModal) — теперь у ВСЕХ шести карточек, включая «Вес»
// (отзыв Кати: «делаем историю для всех карточек, 7/30/90 дней одинаково
// оформить»); у окна свой период (открывается с периода секции), внутри —
// среднее за день, столбики по дням, лучшие дни и точки недели; сводка дня
// открывается тапом по дню внутри окна. Кнопка
// «Итоги» — шеринговая PNG-карточка периода (медведь + цифры + сравнение).

import { useEffect, useMemo, useRef, useState } from 'react'
import { DeviceEventEmitter, Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { Share2 } from 'lucide-react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'
import { WeightTrendCard } from './WeightTrendCard'
import { DisciplineCard } from './DisciplineCard'
import { MetricHistoryModal } from './MetricHistoryModal'
import { NutrientsCard } from './NutrientsCard'
import { SleepModal } from './SleepModal'
import { WeeklyShareCard } from './WeeklyShareCard'
import { DayShareCard } from './DayShareCard'
import { Pills } from '../../ui/Pills'
import { periodTotals, diaryAgeDays } from '@/lib/data/reports'
import { history, RANGES } from '@/lib/data/activity'
import { consumeOpenSleepModal, requestScrollToWeight } from '@/lib/navEvents'
import { useHistoryStore } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'

export function ReportsSection({
  today,
  days,
  rangeId = '7d',
  onRangeChange = () => {},
}) {
  const [shareOpen, setShareOpen] = useState(false)
  const [dayShareOpen, setDayShareOpen] = useState(false)
  // Окно «Записать сон» (лёг/встал): открывается тапом по пустой карточке
  // «Сон» и кнопкой «Записать» в шапке окна истории сна
  const [sleepOpen, setSleepOpen] = useState(false)
  // Окно истории: какой показатель открыт (null — закрыто).
  // Панель, разворачивавшаяся под карточками, заменена окном
  const [historyMetric, setHistoryMetric] = useState(null)
  const savedDays = useHistoryStore((s) => s.days) // карта истории: { 'ГГГГ-ММ-ДД': … } — для стрика
  const streak = streakOf(savedDays)

  // Разблокировка периодов (отзыв Кати: «зачем динамика за 90 дней,
  // если он ещё только на 7 дне»): 30 дней открываются на 30-й день
  // ведения дневника, 90 — на 90-й. До этого — серые пилюли с замком
  const diaryAge = useMemo(() => diaryAgeDays(savedDays), [savedDays])
  // Подсказка по тапу на закрытый период: на 4 секунды, потом сама гаснет
  const [lockHint, setLockHint] = useState(null)
  const hintTimer = useRef(null)
  useEffect(() => () => clearTimeout(hintTimer.current), [])
  const showLockHint = (days) => {
    setLockHint(
      days === 30
        ? 'Период 30 дней откроется на 30-й день ведения дневника'
        : `Период ${days} дней откроется на ${days}-й день ведения дневника`
    )
    clearTimeout(hintTimer.current)
    hintTimer.current = setTimeout(() => setLockHint(null), 4000)
  }
  const rangeItems = useMemo(
    () => RANGES.map((r) => ({ id: r.id, label: r.label, disabled: r.days > diaryAge })),
    [diaryAge]
  )
  const changeRange = (id) => {
    const r = RANGES.find((x) => x.id === id)
    if (r && r.days > diaryAge) {
      showLockHint(r.days)
      return
    }
    setLockHint(null)
    onRangeChange(id)
  }
  // Если выбранный период оказался заблокирован (например, история
  // очищена в «Ещё») — тихо возвращаемся на неделю
  useEffect(() => {
    const cur = RANGES.find((r) => r.id === rangeId)
    if (cur && cur.days > diaryAge) onRangeChange('7d')
  }, [diaryAge, rangeId, onRangeChange])

  // Тап по вечернему пинку «пора спать» ведёт сюда и открывает окно
  // записи сна: живое событие (секция уже смонтирована) + отложенный
  // флаг первым маунтом (вкладка Активности ленивая) — как у окна веса
  useEffect(() => {
    if (consumeOpenSleepModal()) setSleepOpen(true)
    const sub = DeviceEventEmitter.addListener('nutribear/open-sleep', () => setSleepOpen(true))
    return () => sub.remove()
  }, [])

  // Дневные строки периода — один обход истории на все блоки секции:
  // дисциплина, рекорды карточек, панель истории читают одни и те же rows
  const rows = useMemo(() => history(days, today), [days, today])
  // Итоги периода для шеринга: текущий и прошлый (для Δ на карточке)
  const totals = useMemo(() => periodTotals(days, 0, today), [days, today])
  const prev = useMemo(() => periodTotals(days, days), [days])
  // Сколько дней периода велся дневник — для шерингового чипа
  const recorded = rows.filter((r) => r.steps || r.kcal || r.waterMl || r.burned || r.sleepMin).length

  // Тап по карточке-итогу: открываем окно истории этого показателя —
  // теперь у всех шести карточек, включая «Вес» (отзыв Кати:
  // «делаем историю для всех карточек»)
  function handleSelectMetric(id) {
    setHistoryMetric(id)
  }

  // «Записать» из окна истории веса — на вкладку «Тело», к журналу
  // взвешиваний (запись веса живёт там)
  function openWeightScreen() {
    router.navigate('/bmi')
    requestScrollToWeight()
  }

  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[20px] tracking-tight text-bear-text">
            Отчёты
          </Text>
        </View>
        <Pressable
          onPress={() => setShareOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Поделиться итогами периода"
          className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 active:opacity-70"
        >
          <Share2 size={15} color="#8DABFF" />
          <Text className="font-semibold text-[16px] text-[#8DABFF]">Итоги</Text>
        </Pressable>
        {/* «День» — слепок сегодняшнего дня картинкой: вместо серии
            скриншотов тренеру (отзыв из Google Play) */}
        <Pressable
          onPress={() => setDayShareOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Поделиться итогами дня"
          className="shrink-0 flex-row items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 active:opacity-70"
        >
          <Share2 size={15} color="#F9A8D4" />
          <Text className="font-semibold text-[16px] text-[#F9A8D4]">День</Text>
        </Pressable>
      </View>

      {/* Период — единственный переключатель на вкладке: управляет
        // карточками, дисциплиной, нутриентами, историей и шеринговым «Итогами».
        // 30/90 — с замком, пока дневник не дожил до этих дней (отзыв Кати) */}
      <View>
        <Pills
          items={rangeItems}
          value={rangeId}
          onChange={changeRange}
          accessibilityLabel="Период"
        />
        {lockHint && (
          <Text
            maxFontSizeMultiplier={1.2}
            accessibilityLiveRegion="polite"
            className="mt-1.5 font-sans text-[13px] leading-snug text-bear-dim"
          >
            🔒 {lockHint}
          </Text>
        )}
      </View>

      <GoalCelebration />

      <DisciplineCard rows={rows} />

      <ReportCards
        today={today}
        days={days}
        rows={rows}
        onSelectMetric={handleSelectMetric}
        onAddSleep={() => setSleepOpen(true)}
      />

      {/* График веса — своя карточка с переключателем 7/30/90, как на референсе */}
      <WeightTrendCard />

      <NutrientsCard days={days} />

      <WeeklyShareCard
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        totals={totals}
        prev={prev}
        recorded={recorded}
        streak={streak}
        days={days}
      />

      <DayShareCard open={dayShareOpen} onClose={() => setDayShareOpen(false)} />

      {/* Окно истории показателя: монтируется только открытым — каждый
          раз стартует с периода секции и живёт своим переключателем;
          сводка дня — тапом по дню внутри окна */}
      {historyMetric && (
        <MetricHistoryModal
          open
          onClose={() => setHistoryMetric(null)}
          metricId={historyMetric}
          initialRangeId={rangeId}
          today={today}
          // Кнопка «Записать» в шапке окна: у сна — окно «лёг/встал»,
          // у веса — экран веса на «Теле»; окно истории остаётся снизу
          onAdd={
            historyMetric === 'sleepMin'
              ? () => setSleepOpen(true)
              : historyMetric === 'weight'
                ? openWeightScreen
                : undefined
          }
        />
      )}

      {/* Окно «Записать сон»: карточка «Сон» и окно истории открывают его
          поверх; после сохранения история видит новую ночь сама (стор) */}
      <SleepModal open={sleepOpen} onClose={() => setSleepOpen(false)} />
    </View>
  )
}
