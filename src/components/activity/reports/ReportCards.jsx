// Карточки «Отчётов»: сетка 3×2, как на референсе дневника —
// верхний ряд «Шаги / Калории / Вода» КОМПАКТНЫЙ, нижний
// «Сон / Вес / Сожжено» КРУПНЫЙ (отзыв Кати: «шаги, калории, вода —
// одного размера, оставить; сон, вес, сожжено — большего размера»).
//
// Значения шагов/калорий/воды/сожжённых — СРЕДНЕЕ ЗА ДЕНЬ с подписью
// «в среднем за день» (аудит по скрину Кати: сумма за неделю «15000»
// рядом с целью «7000/день» читалась как рекорд дня и путала; среднее
// честно сравнивается с дневной целью). Делится только на ведённые дни
// (dayHasRecords): простои среднее не топят — та же философия, что
// в окнах истории. Сон — среднее за ночь, вес — последний замер.
// Сравнение с прошлым периодом (Δ%) — тоже по средним и ТОЛЬКО когда
// по показателю есть данные прошлого периода (отзыв Кати: у новой
// недели не с чем сравнивать — «0% к прошлой неделе» вводит в
// заблуждение, ждём, пока соберутся данные).
//
// Футер цели — краткий «Цель: N/7 дн» (отзыв Кати: «Цель: 1 из 7 дней»
// обрезалось на узких экранах; у калорий — «В рамках: N/7 дн»; у
// сожжённых цель burnKcal теперь тоже считается — раньше футер был
// пуст). Тап по карточке ОТКРЫВАЕТ ОКНО ИСТОРИИ (MetricHistoryModal) —
// у всех шести карточек, включая «Вес»; шеврон в углу подсказывает
// тапабельность (аудит). Показатели и форматы — из реестра
// lib/data/metrics.js.
//
// «Сон» — полноценная карточка трекера сна (ввод «лёг/встал»): крупно
// средний сон за ночь по записанным дням, спарклайн ночей, футер
// «Цель: N/7 дн» (норма ≥ 7 ч). Пока ночей нет — приглашение
// «Записать первый сон →», тап по пустой карточке открывает окно
// записи, тап по карточке с данными — окно истории показателя.

import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowDownRight, ArrowUpRight, Calendar, ChevronRight, MoonStar, Scale } from 'lucide-react-native'
import { changePct, dailyAverage, deltaTone, discipline, prevLabel } from '@/lib/data/reports'
import { METRICS } from '@/lib/data/metrics'
import { fmtSleep, nightsInNorm, sleepAvg } from '@/lib/data/sleep'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal, healthyRange } from '@/lib/data/bmi'
import { history } from '@/lib/data/activity'
import { SvgAreaChart } from '../../ui/SvgAreaChart'

// Порядок карточек 3×2 — как на референсе: компактный ряд и крупный ряд
const COMPACT_ITEMS = [
  METRICS.find((m) => m.key === 'steps'),
  METRICS.find((m) => m.key === 'kcal'),
  METRICS.find((m) => m.key === 'waterMl'),
]
const LARGE_ITEMS = [
  METRICS.find((m) => m.key === 'sleepMin'),
  { key: 'weight' },
  METRICS.find((m) => m.key === 'burned'),
]

// Размеры двух вариантов карточек: компактная (верхний ряд) и крупная
// (нижний ряд — сон/вес/сожжено, отзыв Кати)
const SIZES = {
  compact: { pad: 10, tile: 26, icon: 15, label: 12.5, value: 19, cap: 10.5, sub: 10.5, spark: 24 },
  large: { pad: 14, tile: 32, icon: 17, label: 13.5, value: 24, cap: 11.5, sub: 11.5, spark: 30 },
}

// Спарклайн карточки: последние дни периода (до 14 точек — плотность
// как на референсе), значения по возрастанию дней (rows уже идут
// от старых к свежим)
function sparkOf(rows, key) {
  const tail = rows.slice(-14)
  return tail.map((r) => ({ label: r.label, value: Number(r[key]) || 0 }))
}

// Мини-спарклайн без осей: мягкая линия с заливкой в цвет метрики
// (spark-режим SvgAreaChart — без подписей, чистая линия как на референсе;
// min-w-0 — страховка, чтобы график не распирал узкую колонку).
// Линия рисуется ТОЛЬКО когда есть данные (отзыв Кати: после регистрации
// в отчётах шли цветные линии-заглушки — плоские нули): минимум два дня
// с ненулевыми значениями показателя, иначе карточка без графика
function Spark({ data, color, height = 24 }) {
  const meaningful = data ? data.filter((d) => d.value > 0).length : 0
  if (!data || meaningful < 2) return null
  return (
    <View className="mt-1 min-w-0">
      <SvgAreaChart spark dot={false} data={data} color={color} height={height} />
    </View>
  )
}

// Фон карточки «как на скрине-2»: у каждой метрики свой ореол —
// градиент от цветного тинта к фиолетовой подложке и обводка
// в цвете метрики. Тинт приглушён (22/4D вместо 2B/66): карточка
// «Калории» больше не красится целиком в красный (аудит по скрину)
function CardBg({ color }) {
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={[`${color}22`, '#1A123A']}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${color}4D`,
      }}
    />
  )
}

// Подпись-футер с иконкой календаря и тонкой линией сверху — как на
// скрине-2. Текст краткий («Цель: 4/7 дн») — помещается всегда
function CalFooter({ children, color = '#8B96B8', line = true }) {
  return (
    <View>
      {line && <View className="mt-2 h-px bg-white/[0.07]" />}
      <View className="mt-1.5 flex-row items-center gap-1">
        <Calendar size={11} color={color} />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.2}
          className="min-w-0 flex-1 font-medium text-[10.5px]"
          style={{ color }}
        >
          {children}
        </Text>
      </View>
    </View>
  )
}

// Шапка карточки: плитка иконки + шеврон-подсказка тапа в строке,
// название — СВОЕЙ строкой на всю ширину карточки (отзыв Кати:
// «название блоков обрезано» — в 3 колонки рядом с плиткой и
// шевроном «Калории»/«Сожжено» сжимались до «Кало…»/«С…»; теперь
// название всегда целиком, с adjustsFontSizeToFit как страховкой)
function CardHead({ m, s, iconColor = null }) {
  const color = iconColor || m.color
  const big = s.tile >= 32
  return (
    <View>
      <View className="flex-row items-center justify-between">
        <View
          style={{
            width: s.tile,
            height: s.tile,
            borderRadius: big ? 11 : 9,
            backgroundColor: `${color}33`,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <m.Icon size={s.icon} color={color} />
        </View>
        <ChevronRight size={big ? 15 : 13} color="rgba(255,255,255,0.28)" />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.15}
        className="mt-1 font-sans leading-tight text-bear-soft"
        style={{ fontSize: s.label }}
      >
        {m.label}
      </Text>
    </View>
  )
}

// Карточка показателя (шаги/калории/вода/сожжено): среднее за день,
// Δ% к прошлому периоду (когда есть данные), футер цели и спарклайн.
// large — крупный вариант нижнего ряда (сон/вес/сожжено, отзыв Кати)
function ReportCard({ m, rows, prevRows, days, goalMet = null, large = false, onPress = () => {} }) {
  const s = large ? SIZES.large : SIZES.compact
  // Среднее за день по ведённым дням; сравнение — тоже по средним
  const avg = useMemo(() => dailyAverage(rows, m.key), [rows, m.key])
  const prevAvg = useMemo(() => dailyAverage(prevRows, m.key), [prevRows, m.key])
  const pct = prevAvg > 0 ? changePct(avg, prevAvg) : null
  const tone = pct == null ? '#8B96B8' : deltaTone(pct, m.invert)
  const Arrow = pct != null && pct < 0 ? ArrowDownRight : ArrowUpRight
  const spark = useMemo(() => sparkOf(rows, m.key), [rows, m.key])

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${m.label}: в среднем ${m.fmt(avg)} за день. Тап — история показателя`}
      className="min-w-0 flex-1 active:opacity-90"
      style={{ borderRadius: 16 }}
    >
      {/* фон — абсолютный градиент во всю высоту Pressable (растянут
          рядом карточек). НЕ height:'100%' — в ряду с авто-высотой Yoga
          считал 100% от высоты вьюпорта, и карточки растягивались
          на весь экран (скрин «ужаса» из отзыва) */}
      <CardBg color={m.color} />
      <View style={{ padding: s.pad }}>
        <CardHead m={m} s={s} />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          className="mt-1.5 font-extrabold leading-tight tracking-tight text-bear-text"
          style={{ fontSize: s.value }}
        >
          {/* Единицы «ккал» у калорий и сожжённых (аудит по скрину Кати);
              авто-сжатие держит строку в узкой колонке */}
          {`${m.fmt(avg)}${m.key === 'kcal' || m.key === 'burned' ? ' ккал' : ''}`}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.15}
          className="font-sans leading-tight text-bear-dim"
          style={{ fontSize: s.cap }}
        >
          в среднем за день
        </Text>
        {/* «% к прошлому периоду» — только с данными прошлого периода;
            без сравнения строка не занимает место (отзыв Кати) */}
        <View className="mt-1 min-h-[26px] flex-row items-start gap-0.5">
          {pct != null && (
            <>
              <Arrow size={12} color={tone} />
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
                className="min-w-0 flex-1 font-medium text-[10.5px] leading-[13px]"
                style={{ color: tone }}
              >
                {`${Math.abs(pct)}% ${prevLabel(days)}`}
              </Text>
            </>
          )}
        </View>
        {/* Сколько дней периода цель достигнута — перенесено из карточки
            «Дисциплина» (отзыв Кати): в карточке показателя это уместнее,
            чем дубли плиток. Для калорий цель — «в рамках», не перебрать;
            у сожжённых цель burnKcal (раньше футер был пуст — отзыв Кати).
            goalMet = null (цель не задана) — строки нет */}
        {goalMet != null && (
          <CalFooter color={goalMet > 0 ? '#4ade80' : '#8B96B8'}>
            {`${m.key === 'kcal' ? 'В рамках' : 'Цель'}: ${goalMet}/${days} дн`}
          </CalFooter>
        )}
        <Spark data={spark} color={m.color} height={s.spark} />
      </View>
    </Pressable>
  )
}

// Карточка «Сон» (крупная, нижний ряд): средний сон за ночь по
// записанным дням периода — пустые дни среднее не топят.
// Футер «Цель: N/7 дн» — ночи с нормой ≥ цели по сну (goals.sleepMin,
// по умолчанию 7 ч). Пока ночей нет — приглашение «Записать первый сон →»:
// тап по пустой карточке открывает окно записи, тап по карточке с
// данными — окно истории показателя (как у остальных карточек)
function SleepCard({ days, rows, goalMin = 420, onPress = () => {}, onQuickAdd = () => {} }) {
  const s = SIZES.large
  const nights = rows.filter((r) => r.sleepMin > 0).length
  const avg = sleepAvg(rows)
  const inNorm = nightsInNorm(rows, goalMin)
  const spark = useMemo(
    () => rows.slice(-14).map((r) => ({ label: r.label, value: Number(r.sleepMin) || 0 })),
    [rows]
  )

  return (
    <Pressable
      onPress={nights ? onPress : onQuickAdd}
      accessibilityRole="button"
      accessibilityLabel={
        nights
          ? `Сон: в среднем ${fmtSleep(avg)} за ночь. Тап — история показателя`
          : 'Сон пока не записан. Тап — записать первый сон'
      }
      className="min-w-0 flex-1 active:opacity-90"
      style={{ borderRadius: 16 }}
    >
      {/* фон — абсолютный градиент (см. комментарий в ReportCard:
          height:'100%' растягивал карточку до высоты вьюпорта) */}
      <CardBg color="#c084fc" />
      <View style={{ padding: s.pad }}>
        <CardHead m={{ label: 'Сон', Icon: MoonStar, color: '#c084fc' }} s={s} />
        {nights ? (
          <>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className="mt-1.5 font-extrabold leading-tight tracking-tight text-bear-text"
              style={{ fontSize: s.value }}
            >
              {fmtSleep(avg)}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.15}
              className="font-sans leading-tight text-bear-dim"
              style={{ fontSize: s.cap }}
            >
              в среднем за ночь
            </Text>
            <View className="mt-1 min-h-[26px]" />
            {/* Футер цели — в той же позиции, что у соседних карточек
                крупного ряда (отзыв Кати: вторая сетка должна выглядеть
                единообразно): слот Δ%, черта, цель, спарклайн */}
            <CalFooter color={inNorm > 0 ? '#4ade80' : '#8B96B8'}>
              {`Цель: ${inNorm}/${days} дн`}
            </CalFooter>
            <Spark data={spark} color="#c084fc" height={s.spark} />
          </>
        ) : (
          <>
            <Text
              maxFontSizeMultiplier={1.15}
              className="mt-1.5 font-extrabold leading-tight text-bear-text"
              style={{ fontSize: s.value }}
            >
              —
            </Text>
            <View className="mt-1 min-h-[26px]" />
            <CalFooter color="#8DABFF">Записать первый сон →</CalFooter>
          </>
        )}
      </View>
    </Pressable>
  )
}

// Карточка «Вес» (крупная, нижний ряд): последнее взвешивание крупно,
// изменение за период в кг (зелёное — движение к здоровому диапазону)
// и спарклайн последних взвешиваний. Тап — окно истории «Вес · история»
// (как у остальных карточек — отзыв Кати; график динамики веса остаётся
// и на «Теле»)
function WeightReportCard({ days, onPress = () => {} }) {
  const s = SIZES.large
  const weights = useProfileStore((s2) => s2.weights)
  const heightCm = useProfileStore((s2) => s2.heightCm)

  const cutoff = Date.now() - days * 86400000
  const inPeriod = weights.filter((w) => new Date(w.date).getTime() >= cutoff)
  const lastW = inPeriod[0] || weights[0] || null
  const firstW = inPeriod.length >= 2 ? inPeriod[inPeriod.length - 1] : null
  const delta = firstW ? Math.round((lastW.kg - firstW.kg) * 10) / 10 : null

  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    delta != null && ((delta < 0 && lastW.kg >= min) || (delta > 0 && lastW.kg <= max))
  const tone = delta == null || delta === 0 ? '#8B96B8' : towardNorm ? '#4ADE80' : '#FB7185'
  const Arrow = delta != null && delta < 0 ? ArrowDownRight : ArrowUpRight

  // Спарклайн: последние до 10 взвешиваний по возрастанию даты
  // (журнал хранит новые сверху). Меньше двух точек — линии нет
  const spark = useMemo(
    () => weights.slice(0, 10).slice().reverse().map((w) => ({ label: '', value: w.kg })),
    [weights]
  )

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        lastW
          ? `Вес: ${fmtDecimal(lastW.kg)} кг. Тап — история показателя`
          : 'Вес — история показателя'
      }
      className="min-w-0 flex-1 active:opacity-80"
      style={{ borderRadius: 16 }}
    >
      <CardBg color="#a78bfa" />
      <View style={{ padding: s.pad }}>
        <CardHead m={{ label: 'Вес', Icon: Scale, color: '#a78bfa' }} s={s} />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          className="mt-1.5 font-extrabold leading-tight tracking-tight text-bear-text"
          style={{ fontSize: s.value }}
        >
          {lastW ? `${fmtDecimal(lastW.kg)} кг` : '—'}
        </Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.15}
          className="font-sans leading-tight text-bear-dim"
          style={{ fontSize: s.cap }}
        >
          последний замер
        </Text>
        <View className="mt-1 min-h-[26px] flex-row items-start gap-0.5">
          {delta == null ? (
            <Text
              numberOfLines={2}
              maxFontSizeMultiplier={1.2}
              className="min-w-0 flex-1 font-medium text-[10.5px] leading-[13px]"
              style={{ color: '#8B96B8' }}
            >
              {`Нет измерений за ${days} дн`}
            </Text>
          ) : (
            <>
              {delta !== 0 && <Arrow size={12} color={tone} />}
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
                className="min-w-0 flex-1 font-medium text-[10.5px] leading-[13px]"
                style={{ color: tone }}
              >
                {delta === 0
                  ? `без изменений за ${days} дн`
                  : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))} кг за ${days} дн`}
              </Text>
            </>
          )}
        </View>
        {/* Футер «Норма» — в одной позиции с целями соседних карточек
            ряда (отзыв Кати: вторая сетка должна выглядеть единообразно);
            у веса нет дневной цели — показываем здоровый диапазон роста.
            Рост не указан (min/max = 0) — футера нет */}
        {heightCm > 0 && Number.isFinite(min) && Number.isFinite(max) && max > min && (
          <CalFooter color="#8DABFF">
            {`Норма: ${min}–${max} кг`}
          </CalFooter>
        )}
        <Spark data={spark} color="#a78bfa" height={s.spark} />
      </View>
    </Pressable>
  )
}

export function ReportCards({ today, days, rows = [], onSelectMetric = () => {}, onAddSleep = () => {} }) {
  const goals = useGoalsStore((s) => s.goals)
  // Сколько дней периода цель достигнута по шагам/воде/калориям/сожжённым —
  // та же функция, что считала плитки «Дисциплины» (теперь данные
  // живут прямо в карточках показателей; сожжённые добавлены —
  // отзыв Кати: «в блоке сожжено пусто, нет ни цели»)
  const goalMet = useMemo(
    () => discipline(rows, goals).met,
    [rows, goals]
  )
  // Прошлый период — для Δ% по средним: один обход двойной истории,
  // режем пополам (тот же приём, что в окнах истории)
  const prevRows = useMemo(() => history(days * 2).slice(0, days), [days])

  const renderCard = (m) => {
    if (m.key === 'weight') {
      return <WeightReportCard key={m.key} days={days} onPress={() => onSelectMetric(m.key)} />
    }
    if (m.key === 'sleepMin') {
      return (
        <SleepCard
          key={m.key}
          days={days}
          rows={rows}
          goalMin={goals.sleepMin || 420}
          onPress={() => onSelectMetric(m.key)}
          onQuickAdd={onAddSleep}
        />
      )
    }
    return (
      <ReportCard
        key={m.key}
        m={m}
        rows={rows}
        prevRows={prevRows}
        days={days}
        goalMet={goalMet[m.key] ?? null}
        large={m.key === 'burned'} // нижний ряд крупнее (отзыв Кати)
        onPress={() => onSelectMetric(m.key)}
      />
    )
  }

  return (
    <View className="gap-2.5" accessibilityLabel="Отчёты за период">
      <View className="flex-row gap-2.5">{COMPACT_ITEMS.map(renderCard)}</View>
      <View className="flex-row gap-2.5">{LARGE_ITEMS.map(renderCard)}</View>
    </View>
  )
}
