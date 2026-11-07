// Карточки «Отчётов»: сетка 3×2 — ВСЕ ШЕСТЬ карточек одного размера
// (отзыв Кати: «6 блоков — дневник по прежнему разного размера, первая
// сетка 3 одного размера, вторая сетка 3 другого размера» — раньше
// верхний ряд был компактным, нижний крупным, но рядом два размера
// выглядели недоделанными; теперь общий размер и единая структура).
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
// Футер цели — краткий «Цель: N/7 дн» у ВСЕХ карточек, включая
// калории (отзыв Кати: «калории сейчас в рамках 1/7 дн — нужно как
// везде цель 1/7 дн»; у калорий цель — уложиться в норму, не перебрать).
// Раньше обрезалось «Цель: 1 из 7 дней», у сожжённых футер был пуст).
//
// Тап по карточке ОТКРЫВАЕТ ОКНО ИСТОРИИ (MetricHistoryModal) —
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
import { useDayTypesStore } from '@/store/useDayTypesStore'
import { useCycleStore } from '@/store/useCycleStore'
import { kcalWithDayMark } from '@/lib/data/dayContext'
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

// Единый размер всех шести карточек (отзыв Кати: два размера рядом
// выглядели как недоделка — теперь сетка ровная). Два прохода
// «облегчения» по отзывам Кати:
// 1) «блоки стали одного размера, но громоздкие» — плитка 30→26,
//    значение 21→19, плотнее отступы;
// 2) скрин от 07.11 («так же») — главный виновник громоздкости не
//    плитки, а ДВА зарезервированных пустых слота в середине карточки
//    (26px под Δ% + 20px под спарклайн ≈ 46px пустоты у карточки без
//    данных). Теперь вместо двух слотов — ОДНА лента 22px: в ней живёт
//    спарклайн (есть ≥2 дня данных), иначе строка Δ%, иначе пусто.
//    Итог: карточка ~158px вместо ~186px (−15%), сетка по-прежнему
//    идеально ровная — структура всех шести карточек одинаковая.
const SIZES = {
  card: { pad: 10, tile: 24, icon: 13, label: 12, value: 19, cap: 11, band: 22 },
}

// Спарклайн карточки: последние дни периода (до 14 точек — плотность
// как на референсе), значения по возрастанию дней (rows уже идут
// от старых к свежим)
function sparkOf(rows, key) {
  const tail = rows.slice(-14)
  return tail.map((r) => ({ label: r.label, value: Number(r[key]) || 0 }))
}

// Единая лента карточки вместо двух пустых слотов: 22px, в ней живёт
// спарклайн (минимум два дня с ненулевыми значениями — отзыв про
// линии-заглушки «плоские нули» соблюдён), иначе строка Δ% (children),
// иначе лента пуста. ВЫСОТА ленты одинакова у всех карточек всегда —
// сетка не распадается на разные размеры, но пустоты в середине
// больше нет (скрин Кати 07.11: «так же» громоздкие).
// min-w-0 — страховка, чтобы график не распирал узкую колонку
function CardBand({ data, color, height = 22, children }) {
  const meaningful = data ? data.filter((d) => d.value > 0).length : 0
  const showSpark = !!data && meaningful >= 2
  return (
    <View className="mt-1.5 min-w-0 justify-center" style={{ height }}>
      {showSpark ? (
        <SvgAreaChart spark dot={false} data={data} color={color} height={height} />
      ) : (
        children || null
      )}
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
    // mt-auto — футер прижат к нижнему краю карточки даже когда сосед
    // в ряду выше (растянутая карточка не оставляет футер в середине)
    <View className="mt-auto">
      {line && <View className="mt-1.5 h-px bg-white/[0.07]" />}
      <View className="mt-1 flex-row items-center gap-1">
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
// Размер единый у всех шести карточек (отзыв Кати)
function ReportCard({ m, rows, prevRows, days, goalMet = null, onPress = () => {} }) {
  const s = SIZES.card
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
      <View style={{ padding: s.pad }} className="flex-1">
        <CardHead m={m} s={s} />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          adjustsFontSizeToFit
          minimumFontScale={0.6}
          className="mt-1 font-extrabold leading-tight tracking-tight text-bear-text"
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
        {/* Сколько дней периода цель достигнута — перенесено из карточки
            «Дисциплина» (отзыв Кати): в карточке показателя это уместнее,
            чем дубли плиток. Подпись ЕДИНАЯ «Цель: N/7 дн» (отзыв Кати:
            «калории сейчас в рамках 1/7 дн — нужно как везде цель 1/7 дн»);
            у калорий цель — уложиться в норму, день засчитан когда поел
            и не перебрал; у сожжённых цель burnKcal. goalMet = null
            (цель не задана) — строки нет */}
        {/* Лента: спарклайн, а без данных — Δ% к прошлому периоду
            (только когда есть с чем сравнивать — отзыв Кати), иначе
            пусто. Одна лента вместо двух слотов — середина карточки
            больше не пустует (скрин Кати 07.11: «так же» громоздкие);
            точный % и график за период — в окне истории по тапу */}
        <CardBand data={spark} color={m.color} height={s.band}>
          {pct != null && (
            <View className="flex-row items-center gap-0.5">
              <Arrow size={12} color={tone} />
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.2}
                className="min-w-0 flex-1 font-medium text-[10.5px] leading-[11px]"
                style={{ color: tone }}
              >
                {`${Math.abs(pct)}% ${prevLabel(days)}`}
              </Text>
            </View>
          )}
        </CardBand>
        {goalMet != null && (
          <CalFooter color={goalMet > 0 ? '#4ade80' : '#8B96B8'}>
            {`Цель: ${goalMet}/${days} дн`}
          </CalFooter>
        )}
      </View>
    </Pressable>
  )
}

// Карточка «Сон» (нижний ряд): средний сон за ночь по записанным дням
// периода — пустые дни среднее не топят.
// Футер «Цель: N/7 дн» — ночи с нормой ≥ цели по сну (goals.sleepMin,
// по умолчанию 7 ч). Пока ночей нет — приглашение «Записать первый сон →»:
// тап по пустой карточке открывает окно записи, тап по карточке с
// данными — окно истории показателя (как у остальных карточек)
function SleepCard({ days, rows, goalMin = 420, onPress = () => {}, onQuickAdd = () => {} }) {
  const s = SIZES.card
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
      <View style={{ padding: s.pad }} className="flex-1">
        <CardHead m={{ label: 'Сон', Icon: MoonStar, color: '#c084fc' }} s={s} />
        {nights ? (
          <>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              className="mt-1 font-extrabold leading-tight tracking-tight text-bear-text"
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
            {/* Лента со спарклайном ночей — как у соседних карточек:
                одна и та же структура, футер прижат к низу */}
            <CardBand data={spark} color="#c084fc" height={s.band} />
            <CalFooter color={inNorm > 0 ? '#4ade80' : '#8B96B8'}>
              {`Цель: ${inNorm}/${days} дн`}
            </CalFooter>
          </>
        ) : (
          <>
            <Text
              maxFontSizeMultiplier={1.15}
              className="mt-1 font-extrabold leading-tight text-bear-text"
              style={{ fontSize: s.value }}
            >
              —
            </Text>
            {/* Подпись как у карточек с данными — структура (и высота)
                всех состояний карточки одинаковая */}
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.15}
              className="font-sans leading-tight text-bear-dim"
              style={{ fontSize: s.cap }}
            >
              пока нет записей
            </Text>
            <CardBand height={s.band} />
            <CalFooter color="#8DABFF">Записать первый сон →</CalFooter>
          </>
        )}
      </View>
    </Pressable>
  )
}

// Карточка «Вес» (нижний ряд): последнее взвешивание крупно,
// изменение за период в кг (зелёное — движение к здоровому диапазону)
// и спарклайн последних взвешиваний. Тап — окно истории «Вес · история»
// (как у остальных карточек — отзыв Кати; график динамики веса остаётся
// и на «Теле»)
function WeightReportCard({ days, onPress = () => {} }) {
  const s = SIZES.card
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
      <View style={{ padding: s.pad }} className="flex-1">
        <CardHead m={{ label: 'Вес', Icon: Scale, color: '#a78bfa' }} s={s} />
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.15}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          className="mt-1 font-extrabold leading-tight tracking-tight text-bear-text"
          style={{ fontSize: s.value }}
        >
          {lastW ? `${fmtDecimal(lastW.kg)} кг` : '—'}
        </Text>
        {/* Δ за период — в строке подписи (скрин Кати 07.11: экономим
            высоту): «+36,0 кг за 7 дн» в цвете движения к норме, без
            изменений — серым. Сравнивать не с чем — «последний замер» */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.15}
          className="font-sans leading-tight text-bear-dim"
          style={{ fontSize: s.cap, color: delta != null ? tone : undefined }}
        >
          {delta == null
            ? 'последний замер'
            : delta === 0
              ? `без изменений за ${days} дн`
              : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))} кг за ${days} дн`}
        </Text>
        {/* Лента со спарклайном взвешиваний — как у соседних карточек;
            у веса нет дневной цели — показываем здоровый диапазон роста.
            Рост не указан (min/max = 0) — футера нет */}
        <CardBand data={spark} color="#a78bfa" height={s.band} />
        {heightCm > 0 && Number.isFinite(min) && Number.isFinite(max) && max > min && (
          <CalFooter color="#8DABFF">
            {`Норма: ${min}–${max} кг`}
          </CalFooter>
        )}
      </View>
    </Pressable>
  )
}

export function ReportCards({ today, days, rows = [], onSelectMetric = () => {}, onAddSleep = () => {} }) {
  const goals = useGoalsStore((s) => s.goals)
  // Особые дни: у дня с меткой (менструация/командировка/праздник)
  // своя норма — «Цель: N/7 дн» считает каждый день по его норме
  // (отзыв Кати: перерасчёт в особые дни нигде не фиксировался)
  const dayMarks = useDayTypesStore((s) => s.marks)
  const dayDeltas = useDayTypesStore((s) => s.deltas)
  const cycEnabled = useCycleStore((s) => s.enabled)
  const cycLastStart = useCycleStore((s) => s.lastStart)
  const cycLength = useCycleStore((s) => s.length)
  const cycBleed = useCycleStore((s) => s.bleed)
  const cycHistory = useCycleStore((s) => s.history)
  const dayCtx = useMemo(() => ({ marks: dayMarks, deltas: dayDeltas }), [dayMarks, dayDeltas])
  const cycSnapshot = useMemo(
    () => ({ enabled: cycEnabled, lastStart: cycLastStart, length: cycLength, bleed: cycBleed, history: cycHistory }),
    [cycEnabled, cycLastStart, cycLength, cycBleed, cycHistory]
  )
  // Сколько дней периода цель достигнута по шагам/воде/калориям/сожжённым —
  // та же функция, что считала плитки «Дисциплины» (теперь данные
  // живут прямо в карточках показателей; сожжённые добавлены —
  // отзыв Кати: «в блоке сожжено пусто, нет ни цели»)
  const goalMet = useMemo(
    () =>
      discipline(rows, goals, (key) =>
        kcalWithDayMark(goals.kcal, key, dayCtx, cycSnapshot)
      ).met,
    [rows, goals, dayCtx, cycSnapshot]
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
