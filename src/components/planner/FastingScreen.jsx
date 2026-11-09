// Экран «Интервальное питание» (открывается с карточки на «Плане»):
// режим «окно еды / голодание» (например 16/8).
// Большой таймер идущего сеанса — с СЕКУНДАМИ («0:07:32»): в формате
// «ч:мин» первую минуту видно «0:00» и кажется, что счётчик стоит
// (отзыв Кати). Обновление каждую секунду, прогресс до цели и
// «осталось»; цель фиксируется при старте (24 − окно еды) — смена
// плана на ходу не искажает идущий таймер. Настройка окна: час начала
// (− 1 ч +) и пресеты плана 12/12, 14/10, 16/8, 18/6.
// «Завершить» записывает сеанс в историю (laps, до 30 записей, свежие
// сверху) и показывает среднюю длительность. Подсказка «как это
// работает» — пока сеансов нет. Стиль — дизайн-система вкладки
// (theme.js). Без медицинских рекомендаций — только констатация.

import { useEffect, useState } from 'react'
import { AppState, Pressable, ScrollView, Text, View } from 'react-native'
import { Clock, History, Play, Square } from 'lucide-react-native'
import { useFastingStore, FASTING_MIN_LAP_MS } from '@/store/useFastingStore'
import { useToast } from '../ui/Toast'
import { HintBox } from '../ui/HintBox'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// Пресеты плана: длина окна еды, ч (голодание = 24 − окно)
const PLANS = [12, 14, 16, 18]
const HOW_STEPS = [
  'Выберите окно еды: пресетом или часом начала',
  'Нажмите «Начать окно без еды» — таймер посчитает часы без еды',
  '«Завершить» запишет результат в историю — увидите среднюю длительность',
]

const pad = (n) => String(n).padStart(2, '0')
const fmtClock = (h) => `${pad(((h % 24) + 24) % 24)}:00`
// Длительность: «15 ч 42 мин» / «42 мин»
const fmtDur = (ms) => {
  const total = Math.max(0, Math.floor(ms / 60000))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h} ч ${pad(m)} мин` : `${m} мин`
}
// Часы:минуты:секунды для большого таймера — «15:42:07»:
// тикает каждую секунду — видно, что счётчик живой
const fmtHMS = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000))
  return `${Math.floor(total / 3600)}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
}
const fmtStamp = (ts) => {
  const d = new Date(ts)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function FastingScreen() {
  const { toast } = useToast()
  const windowStart = useFastingStore((s) => s.windowStart)
  const windowHours = useFastingStore((s) => s.windowHours)
  const fastHours = useFastingStore((s) => s.fastHours)
  const startedAt = useFastingStore((s) => s.startedAt)
  const laps = useFastingStore((s) => s.laps)

  // Тик каждую секунду: таймер живой, видно как идут минуты. Возврат из
  // фона — системные таймеры спят, поэтому время подтягиваем сразу по
  // AppState (иначе после сворачивания приложения таймер «замирал»)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!startedAt) return undefined
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 1000)
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setNow(Date.now())
    })
    return () => {
      clearInterval(t)
      sub.remove()
    }
  }, [startedAt])

  const running = Boolean(startedAt)
  const goalMs = (fastHours || 24 - windowHours) * 3600000
  const elapsed = running ? Math.max(0, now - startedAt) : 0
  const pct = goalMs > 0 ? Math.min(1, elapsed / goalMs) : 0
  const overGoal = running && elapsed > goalMs
  const left = Math.max(0, goalMs - elapsed)
  const windowEnd = (windowStart + windowHours) % 24

  const shiftWindow = (d) => {
    const s = useFastingStore.getState()
    s.setWindowStart((((s.windowStart + d) % 24) + 24) % 24)
  }

  // Блокировка «Начать окно без еды» сразу после «Завершить»: кнопка
  // встаёт на то же место — случайный второй тап (привычка нажимать
  // дважды) тут же запускал новый сеанс, и казалось, что выйти из
  // режима невозможно (отзыв Кати)
  const [lockStart, setLockStart] = useState(false)

  const start = () => {
    useFastingStore.getState().start()
    setNow(Date.now())
    toast({
      title: '▶ Окно без еды начато',
      description: `Цель — ${24 - windowHours} ч без еды. Вода не считается!`,
    })
  }

  // «Завершить» — одним тапом, без подтверждающего окна (отзыв Кати:
  // выйти из голодания не получалось). Результат сразу в историю;
  // случайный сеанс короче 2 минут в историю не пишется (стор) —
  // тост честно объясняет, почему строка не появилась
  const stop = () => {
    const dur = Math.max(0, Date.now() - startedAt)
    useFastingStore.getState().stop()
    setLockStart(true)
    setTimeout(() => setLockStart(false), 2500)
    toast(
      dur >= FASTING_MIN_LAP_MS
        ? { title: '⏹ Окно без еды завершено', description: `Длилось ${fmtDur(dur)}` }
        : {
            title: '⏹ Окно без еды завершено',
            description: 'Сеанс короче 2 минут — в историю не пишем',
          },
    )
  }

  const avgMs = laps.length
    ? laps.reduce((acc, l) => acc + Math.max(0, (l.to || 0) - (l.from || 0)), 0) / laps.length
    : 0

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.title}>Интервальное питание</Text>
      <Text style={styles.subtitle}>Окно еды и таймер без еды</Text>

      {/* Таймер: идущий сеанс или цель к старту */}
      <View style={[styles.mainCard, running && styles.mainCardActive]}>
        {running ? (
          <>
            <View style={styles.runHead}>
              <View style={styles.liveDot} />
              <Text style={styles.runLabel}>Идёт окно без еды</Text>
              <Text style={styles.runGoal}>цель {fastHours} ч</Text>
            </View>
            <Text style={[styles.bigTimer, overGoal && { color: colors.orange }]}>{fmtHMS(elapsed)}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${pct * 100}%`, backgroundColor: overGoal ? colors.orange : colors.accent },
                ]}
              />
            </View>
            <Text style={styles.progressHint}>
              {overGoal
                ? `Цель превышена на ${fmtDur(elapsed - goalMs)} — молодец!`
                : `Осталось ${fmtDur(left)} из ${fastHours} ч`}
            </Text>
            <Pressable onPress={stop} style={styles.stopBtn} accessibilityLabel="Завершить окно без еды">
              <Square size={16} color={colors.orange} />
              <Text style={styles.stopText}>Завершить</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.runHead}>
              <Clock size={16} color={colors.text2} />
              <Text style={styles.runLabel}>Сейчас — окно питания</Text>
            </View>
            <Text style={styles.bigTimer}>{24 - windowHours} ч</Text>
            <Text style={styles.progressHint}>Цель окна без еды при плане {24 - windowHours}/{windowHours}</Text>
            <Pressable
              onPress={start}
              disabled={lockStart}
              style={lockStart ? [styles.startBtn, styles.btnLocked] : styles.startBtn}
              accessibilityLabel="Начать окно без еды"
              accessibilityState={{ disabled: lockStart }}
            >
              <Play size={16} color={colors.accentInk} />
              <Text style={styles.startText}>Начать окно без еды</Text>
            </Pressable>
          </>
        )}
      </View>

      {/* План: окно еды и пресеты */}
      <View style={styles.planCard}>
        <Text style={styles.planTitle}>План: окно еды {windowHours} ч</Text>
        <Text style={styles.planHint}>
          Едим с {fmtClock(windowStart)} до {fmtClock(windowEnd)}, остальное время — окно без еды
        </Text>
        <View style={styles.windowRow}>
          <Pressable onPress={() => shiftWindow(-1)} style={styles.stepBtn} accessibilityLabel="Окно на час раньше">
            <Text style={styles.stepSign}>−</Text>
          </Pressable>
          <Text style={styles.windowVal}>{fmtClock(windowStart)} – {fmtClock(windowEnd)}</Text>
          <Pressable onPress={() => shiftWindow(1)} style={styles.stepBtn} accessibilityLabel="Окно на час позже">
            <Text style={styles.stepSign}>+</Text>
          </Pressable>
        </View>
        <View style={styles.plansRow}>
          {PLANS.map((h) => {
            const active = h === windowHours
            return (
              <Pressable
                key={h}
                onPress={() => useFastingStore.getState().setWindowHours(h)}
                style={[styles.planChip, active && styles.planChipActive]}
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Окно еды ${h} часов, голодание ${24 - h}`}
              >
                <Text style={[styles.planChipText, active && styles.planChipTextActive]}>
                  {24 - h}/{h}
                </Text>
              </Pressable>
            )
          })}
        </View>
        {running && (
          <Text style={styles.planNote}>Идущий таймер зафиксировал цель при старте — план можно менять на будущее</Text>
        )}
      </View>

      {/* Подсказка — пока сеансов нет: свернута в строку по умолчанию,
          тап раскрывает шаги, крестик закрывает насовсем (отзыв Кати) */}
      {!running && laps.length === 0 && (
        <HintBox id="fasting-how" steps={HOW_STEPS} />
      )}

      {/* История сеансов */}
      {laps.length > 0 && (
        <View style={styles.historyCard}>
          <View style={styles.historyHead}>
            <History size={16} color={colors.cyan} />
            <Text style={styles.historyTitle}>История</Text>
            <Text style={styles.historyAvg}>{fmtDur(avgMs)} в среднем</Text>
          </View>
          {laps.slice(0, 6).map((l, i) => (
            <View key={i} style={styles.lapRow}>
              <Text style={styles.lapWhen}>
                {fmtStamp(l.from)} → {fmtStamp(l.to)}
              </Text>
              <Text style={styles.lapDur}>{fmtDur(Math.max(0, (l.to || 0) - (l.from || 0)))}</Text>
            </View>
          ))}
          {laps.length > 6 && <Text style={styles.historyMore}>…и ещё {laps.length - 6} сеансов</Text>}
        </View>
      )}
    </ScrollView>
  )
}

const styles = {
  title: { ...type.display, fontSize: 26, color: colors.text, letterSpacing: -0.3, marginTop: spacing.l },
  subtitle: { ...type.body, color: colors.text2, marginTop: 4, marginBottom: spacing.l },
  mainCard: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.xl, alignItems: 'center',
  },
  mainCardActive: { borderColor: colors.accentBorder, backgroundColor: colors.surface },
  runHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.accent },
  runLabel: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  runGoal: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.accent },
  bigTimer: {
    fontSize: 52, fontWeight: '800', fontFamily: F[800], color: colors.accent,
    letterSpacing: -1, marginTop: spacing.s, fontVariant: ['tabular-nums'],
  },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: spacing.m, alignSelf: 'stretch', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  progressHint: { ...type.caption, color: colors.text2, marginTop: 8, textAlign: 'center' },
  startBtn: {
    flexDirection: 'row', gap: 7, alignSelf: 'stretch',
    backgroundColor: colors.accent, borderRadius: radius.field, height: 46,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.l,
  },
  startText: { fontSize: 14.5, fontWeight: '800', fontFamily: F[800], color: colors.accentInk },
  btnLocked: { opacity: 0.5 },
  stopBtn: {
    flexDirection: 'row', gap: 7, alignSelf: 'stretch',
    backgroundColor: colors.card, borderColor: colors.orange, borderWidth: 1,
    borderRadius: radius.field, height: 46,
    alignItems: 'center', justifyContent: 'center', marginTop: spacing.l,
  },
  stopText: { fontSize: 14.5, fontWeight: '800', fontFamily: F[800], color: colors.orange },
  planCard: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.l, marginTop: spacing.m,
  },
  planTitle: { ...type.title, fontSize: 15, color: colors.text },
  planHint: { ...type.caption, color: colors.text2, marginTop: 3 },
  windowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.m },
  stepBtn: {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepSign: { fontSize: 20, fontWeight: '800', fontFamily: F[800], color: colors.accent, marginTop: -2 },
  windowVal: { ...type.title, fontSize: 17, color: colors.text, fontVariant: ['tabular-nums'] },
  plansRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
  planChip: {
    flex: 1, height: 38, borderRadius: 999, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
  },
  planChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  planChipText: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  planChipTextActive: { color: colors.accentInk },
  planNote: { ...type.caption, color: colors.text3, marginTop: spacing.s, lineHeight: 16 },
  historyCard: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.l, marginTop: spacing.m,
  },
  historyHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  historyTitle: { ...type.title, fontSize: 15, color: colors.text, flex: 1 },
  historyAvg: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.cyan },
  lapRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.s,
    backgroundColor: colors.surface2, borderRadius: radius.row,
    paddingHorizontal: 10, paddingVertical: 8, marginTop: 6, minHeight: 34,
  },
  lapWhen: { ...type.body, fontSize: 12.5, color: colors.text2, flex: 1, fontVariant: ['tabular-nums'] },
  lapDur: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.text },
  historyMore: { ...type.caption, color: colors.text3, marginTop: spacing.s },
}
