// Окно «показатель · история» — открывается тапом по любой карточке-итогу
// «Отчётов»: шаги, калории, вода, сон, СОЖЖЕНО и ВЕС (отзыв Кати:
// «делаем историю для всех карточек, 7/30/90 дней одинаково оформить»).
// Оформление — по макету пользователя (скрин «Калории · история»):
// фиолетовое свечение по контуру окна, градиентная плитка показателя
// в шапке, пилюли периода (7/30/90) в цвете показателя, совмещённая
// стеклянная карточка «В среднем за день | По дням» — РЯДОМ с чертой
// ВО ВСЕХ периодах (отзыв Кати: «статистика за 30/90 должна выглядеть
// так же, как за 7»; на 30/90 столбики тоньше — компактнее и выше,
// и «Закрыть» не уезжает за экран). Подписи дней — ЧИСЛОВЫЕ даты
// «7.11» вместо «1 ноя», которое в узких колонках обрезалось до
// «1 …» / «…» (отзыв Кати). Два блока в ряд — «Лучшие дни» (чип
// значения + дата под ним — раньше дата выдавливалась чипом) и
// «По дням недели» (точки Пн…Вс), легенда — только уровни, которые
// реально встречаются в периоде. Тап по столбику (7/30 дней) и по
// строке лучших дней открывает сводку дня. Период у окна свой:
// открывается с периода секции и дальше меняется независимо. Совсем
// пустой период — спокойное уведомление с мишкой по центру.
//
// «Вес» — особый показатель: данные из журнала взвешиваний
// (useProfileStore.weights → weightByDay), поэтому в окне не «среднее
// за день», а «Текущий вес» с Δ за период (тон — движение к здоровому
// диапазону, как в карточке веса); столбики масштабируются между
// минимумом и максимумом периода (иначе все столбики равной высоты
// и динамика не видна), подписан последний замер; блок дней — «Последние
// взвешивания»; точки недели — есть взвешивание/нет. Кнопка «Записать»
// в шапке ведёт на экран веса (вкладка «Тело»).

import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowDownRight, ArrowUpRight, Plus, X } from 'lucide-react-native'
import { RANGES, dotDateFromKey, history, shortWeekday } from '@/lib/data/activity'
import { METRICS, WEIGHT_METRIC } from '@/lib/data/metrics'
import {
  bestDay,
  bestDays,
  changePct,
  closestToGoal,
  dailyAverage,
  dayHasRecords,
  dayLevel,
  deltaTone,
  prevLabel,
  weekdayAverages,
  weightByDay,
} from '@/lib/data/reports'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { pluralDays } from '@/lib/format'
import { Pills } from '../../ui/Pills'
import { DayDetailsModal } from '../../home/DayDetailsModal'

// Ключ цели в useGoalsStore для каждого показателя реестра
const GOAL_KEY = { steps: 'steps', kcal: 'kcal', waterMl: 'waterMl', burned: 'burnKcal', sleepMin: 'sleepMin' }
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] // дни недели в блоке точек
const DOT = 12 // размер точки «по дням недели»
const WD_COL = 20 // ширина колонки точки — блок точек уже, «Лучшим дням» просторнее
const CHART_H = 84 // высота графика по дням (компактно: окно не растёт на 30/90)
const BUBBLE_H = 18 // запас сверху под подпись максимума
const STUB = 'rgba(255,255,255,0.09)' // пустой день: плоская площадка у нуля

// «Сб, 7.11» — подпись дня для строк «Лучших дней» и accessibility:
// коротко и всегда помещается (row.label «7 ноя» терялся в узкой строке)
function wdDateLabel(key) {
  const d = new Date(`${key}T00:00:00`)
  if (Number.isNaN(d.getTime())) return ''
  return `${shortWeekday(d)}, ${dotDateFromKey(key)}`
}

// Цвет точки/легенды по уровню дня (как в календаре-теплокарте)
function levelColor(metric, level) {
  if (level === 'met') return metric.color
  if (level === 'mid') return `${metric.color}99`
  if (level === 'low') return `${metric.color}40`
  if (level === 'over') return '#f87171'
  return STUB
}

// Легенда: у калорий «больше» не значит «лучше» — своя шкала;
// у веса — просто было взвешивание или нет
function legendOf(metric) {
  if (metric.key === 'kcal') {
    return [
      ['met', 'в норме'],
      ['mid', 'до +15%'],
      ['over', 'перебор'],
      ['none', 'нет записей'],
    ]
  }
  if (metric.key === 'weight') {
    return [
      ['met', 'есть взвешивание'],
      ['none', 'нет взвешиваний'],
    ]
  }
  return [
    ['met', 'цель'],
    ['mid', 'больше половины'],
    ['low', 'были записи'],
    ['none', 'нет записей'],
  ]
}

// Метки под столбиками: неделя — каждая дата, 30/90 — начало,
// середина и конец периода (отдельной строкой — метка не зажата
// в узкую колонку и не превращается в «…»)
function labelIndexes(len) {
  if (len <= 7) return null // каждая колонка подписана
  const mid = Math.floor((len - 1) / 2)
  return [0, mid, len - 1]
}

// ===== Кусочки оформления по макету =====

// Подпись-«капс»: серые буквы в разрядку, как «В СРЕДНЕМ ЗА ДЕНЬ»
function CapLabel({ children, style, lines = 1 }) {
  return (
    <Text
      numberOfLines={lines}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      maxFontSizeMultiplier={1.2}
      className="font-sans text-[12.5px] font-semibold text-bear-dim"
      style={[{ textTransform: 'uppercase', letterSpacing: 0.8 }, style]}
    >
      {children}
    </Text>
  )
}

// Стеклянная карточка макета: тёмное стекло с тонкой светлой обводкой
function Glass({ children, className = '', style }) {
  return (
    <View className={`rounded-2xl border border-white/10 bg-white/[0.05] ${className}`} style={style}>
      {children}
    </View>
  )
}

// Градиентная плитка показателя в шапке (в макете — фиолетовый квадрат
// с белой иконкой; здесь — цвет показателя, переходящий в фиолетовый)
function MetricTile({ metric }) {
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[metric.color, '#7C3AED']}
      style={{ width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}
    >
      <metric.Icon size={22} color="#FFFFFF" />
    </LinearGradient>
  )
}

// Кружок с иконкой рядом с большой цифрой среднего
function AvgBubble({ metric }) {
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[metric.color, `${metric.color}77`]}
      style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}
    >
      <metric.Icon size={19} color="#FFFFFF" />
    </LinearGradient>
  )
}

// Чип значения в градиенте показателя — «1725» у лучших дней
function ValueChip({ metric, value }) {
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[metric.color, `${metric.color}B3`]}
      style={{ borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, maxWidth: 100 }}
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1.1}
        className="font-bold text-[15.5px] text-white"
      >
        {value}
      </Text>
    </LinearGradient>
  )
}

// Кружок места в «Лучших днях» — градиент в цвет показателя
function RankBubble({ metric, n }) {
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[metric.color, `${metric.color}66`]}
      style={{ width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }}
    >
      <Text className="font-bold text-[13.5px] text-white">{n}</Text>
    </LinearGradient>
  )
}

export function MetricHistoryModal({
  open,
  onClose = () => {},
  metricId = 'steps',
  initialRangeId = '30d',
  today,
  onAdd, // опциональная кнопка «Записать» в шапке (у сна — «лёг/встал», у веса — экран веса)
}) {
  const goals = useGoalsStore((s) => s.goals)
  const savedDays = useHistoryStore((s) => s.days) // подписка: сводка дня живо видит записи
  const weights = useProfileStore((s) => s.weights)
  const heightCm = useProfileStore((s) => s.heightCm)
  const metric = metricId === 'weight' ? WEIGHT_METRIC : METRICS.find((m) => m.key === metricId) || METRICS[0]
  const isWeight = metric.key === 'weight'
  // Период окна: открывается с периода секции, дальше живёт своей жизнью
  const [rangeId, setRangeId] = useState(initialRangeId)
  const [dayKey, setDayKey] = useState(null) // сводка дня (тап по столбику/точке)
  // Ширина графика по дням — для плашки значения над выделенным столбиком
  const [chartW, setChartW] = useState(0)
  const days = RANGES.find((r) => r.id === rangeId)?.days || 30
  const todayKey = dayKeyOf()
  const todayWd = (new Date().getDay() + 6) % 7 // столбец «сегодня» в точках недели

  // Вес по дням: журнал взвешиваний → карта «ГГГГ-ММ-ДД» → кг
  const wByDay = useMemo(() => (isWeight ? weightByDay(weights) : null), [isWeight, weights])

  // rows текущего периода (последний день — сегодня) и прошлого (для Δ%):
  // один обход истории на двойной период, режем пополам. Весу значение
  // дня проставляем из журнала взвешиваний (день без замера — пусто).
  const { rows, prevRows } = useMemo(() => {
    const all = history(days * 2, today)
    const cut = { rows: all.slice(days), prevRows: all.slice(0, days) }
    if (!isWeight) return cut
    const put = (rs) => rs.map((r) => ({ ...r, [metric.key]: wByDay[r.key] || 0 }))
    return { rows: put(cut.rows), prevRows: cut.prevRows }
  }, [days, today, isWeight, wByDay, metric.key])

  // Дни периода с взвешиваниями — объявлены ДО hasData: гейт пустого
  // периода у веса смотрит на замеры, и ссылка «до объявления» давала
  // TDZ ReferenceError при открытии окна «Вес · история»
  const measured = isWeight ? rows.filter((r) => r.weight > 0) : []

  const hasAny = rows.some(dayHasRecords)
  // По конкретной метрике: если её не вели в периоде — показываем
  // медвежонка вместо «фальшивой аналитики» из нулей (среднее 0,
  // «0% к прошлому месяцу», пустые «Лучшие дни»). Для веса день
  // «только взвешивание» (без еды/шагов) — тоже день с данными,
  // поэтому гейт — по замерам, а не по dayHasRecords
  const hasMetric = rows.some((r) => (r?.[metric.key] || 0) > 0)
  const hasData = isWeight ? measured.length > 0 : hasAny && hasMetric
  const avg = isWeight ? 0 : dailyAverage(rows, metric.key)
  const prevAvg = isWeight ? 0 : dailyAverage(prevRows, metric.key)
  // Сравнение с прошлым периодом — только когда там есть данные:
  // «0% к прошлой неделе» без прошлого вводит в заблуждение (отзыв
  // Кати) — ждём, пока соберутся данные, и не показываем Δ вовсе
  const pct = isWeight || prevAvg <= 0 ? null : changePct(avg, prevAvg)
  const tone = pct == null ? '#8B96B8' : deltaTone(pct, metric.invert)
  const Arrow = pct != null && pct < 0 ? ArrowDownRight : ArrowUpRight

  // ===== Вес: текущий замер, Δ за период и шкала столбиков =====
  const lastMeasure = measured.length ? measured[measured.length - 1] : null
  // Δ веса за период: последний замер минус первый; тон — движение
  // к здоровому диапазону (та же логика, что у карточки «Вес»)
  const weightDelta =
    isWeight && measured.length >= 2
      ? Math.round((measured[measured.length - 1].weight - measured[0].weight) * 10) / 10
      : null
  const { min: rangeMin, max: rangeMax } = healthyRange(heightCm)
  const weightDeltaTone =
    weightDelta == null || weightDelta === 0
      ? '#8B96B8'
      : (weightDelta < 0 && lastMeasure?.weight >= rangeMin) || (weightDelta > 0 && lastMeasure?.weight <= rangeMax)
        ? '#4ADE80'
        : '#FB7185'

  // Шкала столбиков веса: не от нуля, а от минимума периода с запасом —
  // иначе 71 и 72 кг неразличимы (столбики одинаковой высоты)
  const wLo = measured.length ? Math.min(...measured.map((r) => r.weight)) : 0
  const wHi = measured.length ? Math.max(...measured.map((r) => r.weight)) : 1
  const wPad = Math.max((wHi - wLo) * 0.25, 0.5)
  const wScaleLo = wLo - wPad
  const wScaleHi = wHi + wPad
  // Последний замер — подписываем его, а не максимум (у веса максимум
  // не достижение)
  const latestIdx = isWeight ? rows.reduce((acc, r, i) => (r.weight > 0 ? i : acc), -1) : -1

  const maxVal = Math.max(bestDay(rows, metric.key), 1)
  // Лучшие дни: максимум показателя. Для калорий с целью — дни ближе
  // всего к цели (максимум калорий — перебор, а не достижение); для
  // веса — последние взвешивания (новые сверху)
  const top = useMemo(() => {
    if (isWeight) {
      return measured
        .slice(-3)
        .map((row) => ({ row, value: row.weight }))
        .reverse()
    }
    const goal = goals[GOAL_KEY[metric.key]] || 0
    if (metric.key === 'kcal' && goal > 0) return closestToGoal(rows, metric.key, goal, 3)
    return bestDays(rows, metric.key, 3)
  }, [rows, measured, isWeight, metric.key, goals])
  const topTitle = isWeight
    ? 'Взвешивания'
    : metric.key === 'kcal'
      ? (goals.kcal || 0) > 0
        ? 'Ближе к цели'
        : 'Больше всего'
      : 'Лучшие дни'
  // Точки «по дням недели»: среднее за этот день недели за период.
  // Для веса считаем по дням с взвешиваниями: день «только вес» не
  // попадает в dayHasRecords, но для веса он — день с данными
  const wd = useMemo(() => {
    if (isWeight) {
      const buckets = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }))
      for (const r of rows) {
        if (!(r.weight > 0)) continue
        const wdi = (new Date(`${r.key}T00:00:00`).getDay() + 6) % 7
        buckets[wdi].sum += r.weight
        buckets[wdi].n += 1
      }
      return buckets.map((b) => ({ avg: b.n ? Math.round(b.sum / b.n) : 0, recorded: b.n > 0 }))
    }
    return weekdayAverages(rows, metric.key)
  }, [rows, isWeight, metric.key])

  // Легенда — только уровни, которые реально встречаются в периоде:
  // лишние пункты разгоняют окно вверх и давят «Закрыть» вниз
  const legend = useMemo(() => {
    const present = new Set()
    for (const r of rows) {
      if (isWeight) {
        present.add(r.weight > 0 ? 'met' : 'none')
        continue
      }
      present.add(dayLevel(metric.key, r[metric.key] || 0, goals[GOAL_KEY[metric.key]] || 0))
    }
    return legendOf(metric).filter(([level]) => present.has(level))
  }, [rows, isWeight, metric, goals])

  // Высота столбика — одна для рисования и для плашки значения над ним
  const barH = (v) =>
    isWeight
      ? v > 0
        ? Math.max(6, Math.round(((v - wScaleLo) / Math.max(wScaleHi - wScaleLo, 0.1)) * CHART_H))
        : 3
      : v > 0
        ? Math.max(3, Math.round((v / maxVal) * CHART_H))
        : 3
  // Выделенный столбик (максимум / последний замер веса) — над ним
  // плашка значения. В колонку недели (~18px) «1 725» не помещается
  // (обрезалось до «1 …»), поэтому плашка — абсолютом над столбиком
  const hlIdx =
    days <= 7
      ? rows.findIndex((row, i) =>
          isWeight ? i === latestIdx : (row[metric.key] || 0) > 0 && row[metric.key] === maxVal
        )
      : -1
  const hlV = hlIdx >= 0 ? rows[hlIdx][metric.key] || 0 : 0
  const hlH = hlIdx >= 0 ? barH(hlV) : 0

  function pickRange(id) {
    setRangeId(id)
    setDayKey(null) // сводка дня от другого периода не нужна
  }

  return (
    <>
      <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          {/* Рамка-свечение: тонкий фиолетово-розовый градиентный ободок
              вокруг тёмного окна — как на макете */}
          <View className="max-h-[86%]">
            <LinearGradient
              start={{ x: 0, y: 0.1 }}
              end={{ x: 1, y: 0.9 }}
              colors={['#8B5CF6', '#D946EF', '#6D28D9']}
              // flexShrink: по умолчанию Yoga не сжимает детей — цепочка
              // «макс-высота → градиент → карточка → ScrollView» рвалась,
              // и «Закрыть» уезжала за экран на 30/90 днях (отзыв Кати)
              style={{ borderRadius: 30, padding: 1.6, flexShrink: 1 }}
            >
              <View className="overflow-hidden rounded-[28px] bg-[#150F2D]" style={{ flexShrink: 1 }}>
                {/* Шапка: плитка показателя + заголовок + крестик */}
                <View className="flex-row items-center gap-3 border-b border-bear-line px-4 pb-3.5 pt-4">
                  <MetricTile metric={metric} />
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.15} className="font-bold text-[21px] tracking-tight text-bear-text">
                      {`${metric.label} · история`}
                    </Text>
                    <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[14.5px] leading-snug text-bear-sub">
                      {`Динамика ${metric.gen} за ${days} ${pluralDays(days)}`}
                    </Text>
                  </View>
                  {/* «Записать» — быстрый вход из истории (у сна — «лёг/встал»,
                      у веса — экран веса); у остальных показателей записи
                      ведутся на других экранах, кнопка им не нужна */}
                  {onAdd ? (
                    <Pressable
                      onPress={onAdd}
                      accessibilityRole="button"
                      accessibilityLabel={`Записать: ${metric.label}`}
                      className="shrink-0 flex-row items-center gap-1 rounded-full px-3 py-2 active:opacity-70"
                      style={{ backgroundColor: `${metric.color}26`, borderWidth: 1, borderColor: `${metric.color}66` }}
                    >
                      <Plus size={15} color={metric.color} />
                      <Text maxFontSizeMultiplier={1.15} className="font-bold text-[14px]" style={{ color: metric.color }}>
                        Записать
                      </Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel={`Закрыть историю: ${metric.label}`}
                    className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 active:opacity-70"
                  >
                    <X hitSlop={10} size={20} color="#C7D2F0" />
                  </Pressable>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                  <View className="gap-3 px-4 pb-3.5 pt-3">
                    {/* Период — активная пилюля в цвете показателя */}
                    <Pills
                      size="md"
                      items={RANGES.map((r) => ({ id: r.id, label: r.label, color: metric.color }))}
                      value={rangeId}
                      onChange={pickRange}
                      accessibilityLabel="Период истории"
                    />

                    {hasData ? (
                      <>
                        {/* Совмещённая карточка макета: среднее за день и
                            график по дням РЯДОМ с чертой — во всех периодах
                            (отзыв Кати: «за 30/90 должна выглядеть так же,
                            как за 7»; на 30/90 столбики тоньше, зато окно
                            компактное и «Закрыть» всегда на виду) */}
                        <Glass className="p-3.5">
                          <View className="flex-row gap-3">
                              {/* Среднее за день (у веса — текущий вес);
                                  подпись может занять две строки */}
                              <View
                                accessibilityLabel={
                                  isWeight
                                    ? `Текущий вес: ${lastMeasure ? metric.fmt(lastMeasure.weight) : 'нет замеров'}`
                                    : `В среднем за день: ${metric.fmt(avg)}`
                                }
                                className="w-[40%]"
                              >
                                <CapLabel lines={2}>{isWeight ? 'Текущий вес' : 'В среднем за день'}</CapLabel>
                              <View className="mt-2.5 flex-row items-center gap-2.5">
                                <AvgBubble metric={metric} />
                                <Text
                                  numberOfLines={1}
                                  adjustsFontSizeToFit
                                  minimumFontScale={0.6}
                                  maxFontSizeMultiplier={1.15}
                                  className="min-w-0 flex-1 font-extrabold text-[30px] leading-none tracking-tight text-bear-text"
                                >
                                  {isWeight
                                    ? lastMeasure
                                      ? metric.fmt(lastMeasure.weight)
                                      : '—'
                                    : metric.fmt(avg)}
                                </Text>
                              </View>
                              {/* Δ: % к прошлому периоду / кг за период.
                                  Без данных прошлого периода Δ не показываем */}
                              {isWeight ? (
                                weightDelta != null ? (
                                  <View className="mt-2 flex-row items-center gap-1">
                                    {weightDelta !== 0 && (
                                      weightDelta < 0
                                        ? <ArrowDownRight size={14} color={weightDeltaTone} />
                                        : <ArrowUpRight size={14} color={weightDeltaTone} />
                                    )}
                                    <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-medium text-[13.5px]" style={{ color: weightDeltaTone }}>
                                      {`${weightDelta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(weightDelta))} кг · ${days} дн.`}
                                    </Text>
                                  </View>
                                ) : null
                              ) : (
                                pct != null && (
                                  <View className="mt-2 flex-row items-center gap-1">
                                    {pct !== 0 && <Arrow size={14} color={tone} />}
                                    <Text maxFontSizeMultiplier={1.2} className="font-medium text-[13.5px]" style={{ color: tone }}>
                                      {`${pct > 0 ? '+' : ''}${pct}% ${prevLabel(days)}`}
                                    </Text>
                                  </View>
                                )
                              )}
                            </View>

                            {/* Вертикальная черта между средним и графиком —
                                во всех периодах, как на макете */}
                            <View className="w-px self-stretch bg-white/10" />

                            {/* График по дням */}
                            <View className="min-w-0 flex-1">
                              <CapLabel>{`По дням · ${days} дн.`}</CapLabel>
                              <View
                                onLayout={(e) => setChartW(e.nativeEvent.layout.width)}
                                style={{
                                  height: BUBBLE_H + CHART_H,
                                  flexDirection: 'row',
                                  alignItems: 'flex-end',
                                  gap: days > 7 ? 1 : 2,
                                  marginTop: 8,
                                }}
                              >
                                {rows.map((row, i) => {
                                  const v = row[metric.key] || 0
                                  const highlight = isWeight ? i === latestIdx : v > 0 && v === maxVal
                                  const isToday = row.key === todayKey
                                  const h = barH(v)
                                  const bar =
                                    v > 0 && highlight ? (
                                      <LinearGradient
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 0, y: 1 }}
                                        colors={[metric.color, `${metric.color}AA`]}
                                        style={{ width: '100%', height: h, borderRadius: 4 }}
                                      />
                                    ) : (
                                      <View
                                        style={{
                                          width: '100%',
                                          height: h,
                                          borderRadius: 3,
                                          backgroundColor: v > 0 ? metric.color : STUB,
                                          opacity: v > 0 ? (isToday ? 0.9 : 0.6) : 1,
                                        }}
                                      />
                                    )
                                  return (
                                    <View key={row.key} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
                                      {days <= 30 ? (
                                        <Pressable
                                          onPress={() => setDayKey(row.key)}
                                          accessibilityRole="button"
                                          accessibilityLabel={`${wdDateLabel(row.key)}: ${v > 0 ? metric.fmt(v) : 'нет записей'}. Тап — сводка дня`}
                                          hitSlop={{ top: 2, bottom: 2, left: 1, right: 1 }}
                                          style={{ justifyContent: 'flex-end' }}
                                        >
                                          {bar}
                                        </Pressable>
                                      ) : (
                                        bar
                                      )}
                                    </View>
                                  )
                                })}
                                {/* Плашка значения над выделенным столбиком —
                                    абсолютом на всю ширину графика: в узкой
                                    колонке «1 725» обрезалось до «1 …» */}
                                {hlIdx >= 0 && chartW > 0 &&
                                  (() => {
                                    const bw = 68
                                    const col = chartW / rows.length
                                    const left = Math.min(Math.max(hlIdx * col + col / 2 - bw / 2, 0), Math.max(0, chartW - bw))
                                    return (
                                      <Text
                                        numberOfLines={1}
                                        className="absolute font-sans text-[12.5px] font-bold"
                                        style={{ color: metric.color, bottom: hlH + 3, left, width: bw, textAlign: 'center' }}
                                      >
                                        {metric.fmt(hlV)}
                                      </Text>
                                    )
                                  })()}
                              </View>
                              {/* Подписи дат «7.11» вместо «1 ноя», которое
                                  в узких колонках обрезалось до «1 …» (отзыв
                                  Кати): неделя — каждая дата, 30/90 — начало,
                                  середина и конец отдельной строкой, чтобы
                                  дата не зажималась в колонку столбика */}
                              {rows.length <= 7 ? (
                                <View style={{ flexDirection: 'row', gap: 2 }} className="mt-1.5">
                                  {rows.map((row) => (
                                    <Text
                                      key={row.key}
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.7}
                                      className={`flex-1 text-center font-sans text-[10px] ${
                                        row.key === todayKey ? 'font-bold text-[#A78BFA]' : 'text-bear-dim'
                                      }`}
                                    >
                                      {dotDateFromKey(row.key)}
                                    </Text>
                                  ))}
                                </View>
                              ) : (
                                <View className="mt-1.5 flex-row items-center justify-between">
                                  {labelIndexes(rows.length).map((idx) => {
                                    const row = rows[idx]
                                    const edge = idx === 0 ? 'text-left' : idx === rows.length - 1 ? 'text-right' : 'text-center'
                                    return (
                                      <Text
                                        key={row.key}
                                        numberOfLines={1}
                                        maxFontSizeMultiplier={1.1}
                                        className={`flex-1 font-sans text-[11px] ${edge} ${
                                          row.key === todayKey ? 'font-bold text-[#A78BFA]' : 'text-bear-dim'
                                        }`}
                                      >
                                        {dotDateFromKey(row.key)}
                                      </Text>
                                    )
                                  })}
                                </View>
                              )}
                            </View>
                          </View>
                        </Glass>

                        {/* Лучшие дни + по дням недели — два блока в ряд,
                            как на макете */}
                        <View className="flex-row gap-3">
                          {/* Лучшие дни (у веса — последние взвешивания,
                              у калорий с целью — дни ближе всего к цели) */}
                          <Glass className="min-w-0 flex-1 p-3.5">
                            <CapLabel>{topTitle}</CapLabel>
                            {top.length === 0 ? (
                              <Text maxFontSizeMultiplier={1.2} className="mt-2 font-sans text-[14px] text-bear-dim">
                                Пока нет данных
                              </Text>
                            ) : (
                              <View className="mt-2 gap-2.5">
                                {top.map(({ row, value, dev }, i) => (
                                  <Pressable
                                    key={row.key}
                                    onPress={() => setDayKey(row.key)}
                                    accessibilityRole="button"
                                    accessibilityLabel={
                                      isWeight
                                        ? `${wdDateLabel(row.key)}: ${metric.fmt(value)}. Тап — сводка дня`
                                        : dev != null
                                          ? `${wdDateLabel(row.key)}: ${metric.fmt(value)}, отклонение ${dev} ккал от цели. Тап — сводка дня`
                                          : `${wdDateLabel(row.key)}: ${metric.fmt(value)}. Тап — сводка дня`
                                    }
                                    className="active:opacity-70"
                                  >
                                    {/* Кружок места и чип значения в строку,
                                        дата — под ними на всю ширину: раньше
                                        дата выдавливалась чипом в ноль (отзыв
                                        Кати про «1725 выходит за рамки») */}
                                    <View className="flex-row items-center gap-2">
                                      <RankBubble metric={metric} n={i + 1} />
                                      <ValueChip metric={metric} value={metric.fmt(value)} />
                                    </View>
                                    <Text
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.8}
                                      maxFontSizeMultiplier={1.1}
                                      className="mt-1 font-sans text-[12px] text-bear-dim"
                                    >
                                      {wdDateLabel(row.key)}
                                    </Text>
                                  </Pressable>
                                ))}
                              </View>
                            )}
                          </Glass>

                          {/* По дням недели: строка точек Пн…Вс — цвет точки
                              это уровень среднего за день недели; у сегод-
                              няшнего дня недели обводка. Колонка уже (20px),
                              зато «Лучшим дням» достаётся ширина — подписи
                              и даты больше не обрезаются (отзыв Кати) */}
                          <Glass className="shrink-0 p-3" style={{ width: 7 * WD_COL + 24 }}>
                            <CapLabel>По дням недели</CapLabel>
                            <View className="mt-2.5 flex-row">
                              {WD.map((w, i) => {
                                const b = wd[i] || { avg: 0, recorded: false }
                                const color = isWeight
                                  ? b.recorded
                                    ? metric.color
                                    : STUB
                                  : levelColor(metric, dayLevel(metric.key, b.avg, goals[GOAL_KEY[metric.key]] || 0))
                                return (
                                  <View key={w} style={{ width: WD_COL, alignItems: 'center' }}>
                                    <Text
                                      numberOfLines={1}
                                      adjustsFontSizeToFit
                                      minimumFontScale={0.8}
                                      maxFontSizeMultiplier={1.1}
                                      className={`font-sans text-[10px] ${i === todayWd ? 'font-bold text-bear-text' : 'text-bear-dim'}`}
                                    >
                                      {w}
                                    </Text>
                                    <View
                                      accessibilityLabel={
                                        isWeight
                                          ? `${w}: ${b.recorded ? `в среднем ${metric.fmt(b.avg)}` : 'взвешиваний нет'}`
                                          : `${w}: ${b.recorded ? `в среднем ${metric.fmt(b.avg)}` : 'записей нет'}`
                                      }
                                      style={{
                                        marginTop: 6,
                                        width: DOT,
                                        height: DOT,
                                        borderRadius: 7,
                                        backgroundColor: color,
                                        borderWidth: i === todayWd ? 1 : 0,
                                        borderColor: 'rgba(255,255,255,0.35)',
                                      }}
                                    />
                                  </View>
                                )
                              })}
                            </View>
                          </Glass>
                        </View>

                        {/* Легенда — только уровни, которые реально
                            встречаются в периоде: меньше строк — окно ниже */}
                        <View className="flex-row flex-wrap items-center justify-center gap-x-3 gap-y-1">
                          {legend.map(([level, label]) => (
                            <View key={level} className="flex-row items-center gap-1.5">
                              <View
                                style={{
                                  width: 10,
                                  height: 10,
                                  borderRadius: 5,
                                  backgroundColor: levelColor(metric, level),
                                }}
                              />
                              <Text maxFontSizeMultiplier={1.1} className="font-sans text-[12.5px] text-bear-dim">{label}</Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : (
                      // Пустой период: спокойное уведомление по центру
                      <View
                        accessibilityLabel={`${metric.label}: за период нет записей`}
                        className="items-center justify-center px-4 py-7"
                      >
                        <Text className="text-[32px]">🐻</Text>
                        <Text maxFontSizeMultiplier={1.2} className="mt-2 font-bold text-[18px] text-bear-text">
                          Нет записей
                        </Text>
                        <Text
                          maxFontSizeMultiplier={1.25}
                          className="mt-1 text-center font-sans text-[15px] leading-snug text-bear-sub"
                        >
                          {isWeight
                            ? 'За выбранный период взвешиваний не было — запишите вес кнопкой «Записать» вверху, и здесь появится история'
                            : 'За выбранный период дневник ничего не фиксировал — запишите шаги, воду, еду или тренировку, и здесь появится история'}
                        </Text>
                      </View>
                    )}
                  </View>
                </ScrollView>

                {/* Закрыть — закреплено внизу: на небольшом экране кнопка
                    не уезжает за край вместе с содержимым */}
                <View className="px-4 pb-4 pt-3">
                  <Pressable
                    onPress={onClose}
                    accessibilityRole="button"
                    accessibilityLabel="Закрыть историю показателя"
                    className="overflow-hidden rounded-2xl active:opacity-80"
                  >
                    <LinearGradient
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      colors={['#B3A5F2', '#8A73E6']}
                      style={{ paddingVertical: 13, alignItems: 'center' }}
                    >
                      <Text className="font-extrabold text-[17.5px] text-[#231A47]">Закрыть</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Сводка дня поверх окна истории (тап по столбику или строке
          «Лучших дней») */}
      <DayDetailsModal
        open={Boolean(dayKey)}
        onClose={() => setDayKey(null)}
        dayKey={dayKey}
        history={savedDays}
        goals={goals}
        weights={weights}
      />
    </>
  )
}
