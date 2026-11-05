// Карточка «Аудит организма»: Доктор Топтыгин проводит шуточный медосмотр
// по реальным данным дня. Фразы — позитивные с чёрным юмором, к каждой
// системе — настоящая рекомендация. Freemium: 3 системы бесплатно; в Premium —
// все 6, редкие диагнозы и история за неделю. Штамп дня даёт +1 ген.
// Сканирование — статичный бар на JS-драйвере (2 с) + сменяющиеся статусы.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, Vibration, View } from 'react-native'
import {
  ArrowRight,
  ChevronRight,
  ClipboardCheck,
  Lock,
  RefreshCw,
  Share2,
  Sparkles,
  Stethoscope,
} from 'lucide-react-native'
import { GameCard, GameHeader, RightPill, Panel, Caps, GAME } from './GameUi'
import { AuditShareCard } from './AuditShareCard'
import {
  SCAN_STAGES,
  VERDICT_META,
  computeAudit,
  auditScore,
  auditStreak,
  auditDateLabel,
  weekdayLetterOf,
} from '@/lib/data/audit'
import { pluralDays } from '@/lib/format'

const SCAN_MS = 2000

// Цвет счёта: как вердикт заключения
function scoreColor(score) {
  return score >= 75 ? GAME.lime : score >= 45 ? GAME.emerald : GAME.red
}

function scoreVerdictMeta(score) {
  return VERDICT_META[score >= 75 ? 'good' : score >= 45 ? 'ok' : 'bad']
}

// Одна система в отчёте: открытая — диагноз + шутка + рекомендация,
// Premium-система у бесплатника — замок и тизер
function SystemRow({ s, pro, onLocked }) {
  if (s.pro && !pro) {
    return (
      <Pressable
        onPress={onLocked}
        accessibilityRole="button"
        accessibilityLabel={`${s.name} — открыть в Premium`}
        className="flex-row items-center gap-2.5 rounded-xl px-3 py-3"
        style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(196,181,253,0.18)' }}
      >
        <View className="h-9 w-9 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(196,181,253,0.12)' }}>
          <Lock size={17} color="#C4B5FD" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-[17.5px]" style={{ color: '#C4B5FD' }}>
            {s.emoji} {s.name} · Premium
          </Text>
          <Text className="font-sans text-[16px] leading-snug" style={{ color: GAME.dim2 }}>
            Диагноз, шутка и рекомендация — внутри
          </Text>
        </View>
        <ChevronRight size={17} color="#C4B5FD" />
      </Pressable>
    )
  }

  const meta = VERDICT_META[s.verdict]
  return (
    <View className="rounded-xl px-3 py-3" style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-semibold text-[17.5px]" style={{ color: GAME.text }}>
          {s.emoji} {s.name}
        </Text>
        <View className="flex-row items-center gap-1.5">
          {s.rare && (
            <View className="flex-row items-center gap-1 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(196,181,253,0.14)' }}>
              <Sparkles size={14} color="#C4B5FD" />
              <Text className="font-bold text-[15px]" style={{ color: '#C4B5FD' }}>
                редкий
              </Text>
            </View>
          )}
          <View className="rounded-full px-2 py-0.5" style={{ backgroundColor: `${meta.color}1A`, borderWidth: 1, borderColor: `${meta.color}55` }}>
            <Text className="font-bold text-[15px]" style={{ color: meta.color }}>
              {meta.label}
            </Text>
          </View>
        </View>
      </View>
      <Text className="mt-1 font-medium text-[17px] leading-snug" style={{ color: GAME.dim }}>
        «{s.phrase}»
      </Text>
      <View className="mt-1.5 flex-row items-start gap-1.5">
        <View style={{ marginTop: 2 }}>
          <ArrowRight size={15} color={GAME.emerald} />
        </View>
        <Text className="flex-1 font-sans text-[16.5px] leading-snug" style={{ color: GAME.emerald }}>
          {s.tip}
        </Text>
      </View>
    </View>
  )
}

// Чип истории: счёт за день + буква дня недели, сегодняшний подсвечен
function ScoreChip({ score, weekday, today }) {
  return (
    <View
      className="min-w-[32px] items-center rounded-lg px-1.5 py-1.5"
      style={{
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderWidth: 1,
        borderColor: today ? 'rgba(163,230,53,0.45)' : 'transparent',
      }}
    >
      <Text className="font-extrabold text-[16.5px]" style={{ color: scoreColor(score) }}>
        {score}
      </Text>
      {!!weekday && (
        <Text className="font-sans text-[14.5px]" style={{ color: today ? GAME.lime : GAME.dim2 }}>
          {weekday}
        </Text>
      )}
    </View>
  )
}

export function AuditCard({
  org,
  streak = 0,
  auditDays = {},
  dayKey,
  kcal = 0,
  kcalGoal = 0,
  pro = false,
  onRunAudit,
  onOpenPaywall,
  haptics = true,
}) {
  const [report, setReport] = useState(null) // последнее заключение
  const [scanning, setScanning] = useState(false)
  const [stage, setStage] = useState(0)
  const [awarded, setAwarded] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const bar = useRef(new Animated.Value(0)).current
  const stageTimer = useRef(null)
  const finishTimer = useRef(null)

  // серия осмотров подряд — для панели истории (Premium).
  // Внимание: проп streak — это стрик организма (Нервы), не путать.
  const auditSeries = useMemo(() => auditStreak(auditDays, dayKey), [auditDays, dayKey])
  // серия с зачётом сегодняшнего дня: 7-й, 14-й… день — юбилей,
  // в Premium редкий диагноз гарантирован
  const seriesToday = useMemo(
    () => auditStreak({ ...auditDays, [dayKey]: 1 }, dayKey),
    [auditDays, dayKey]
  )
  const jubilee = seriesToday > 0 && seriesToday % 7 === 0

  // Поделиться заключением: карточка-картинка через системный шэринг
  const handleShare = useCallback(() => setShareOpen(true), [])

  useEffect(
    () => () => {
      clearInterval(stageTimer.current)
      clearTimeout(finishTimer.current)
    },
    []
  )

  const doneToday = auditDays[dayKey] != null
  const liveScore = auditScore(org.axes)
  // данные за день меняются — заключение может устареть (зацепка перепройти)
  const stale = !!report && !scanning && liveScore !== report.score
  const stageText = SCAN_STAGES[Math.min(stage, SCAN_STAGES.length - 1)]
  const barWidth = bar.interpolate({ inputRange: [0, 1], outputRange: ['4%', '100%'] })

  // последние 7 дней истории (для Premium)
  const history = useMemo(
    () =>
      Object.entries(auditDays)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .slice(-7),
    [auditDays]
  )

  // средний балл за неделю — панель истории (Premium)
  const avgScore = useMemo(
    () =>
      history.length
        ? Math.round(history.reduce((sum, [, v]) => sum + v, 0) / history.length)
        : null,
    [history]
  )

  const runScan = useCallback(() => {
    setScanning(true)
    setStage(0)
    bar.setValue(0)
    Animated.timing(bar, {
      toValue: 1,
      duration: SCAN_MS,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start()
    stageTimer.current = setInterval(() => setStage((s) => s + 1), 333)
    finishTimer.current = setTimeout(() => {
      clearInterval(stageTimer.current)
      const res = computeAudit(
        { axes: org.axes, state: org.state, streak, kcal, kcalGoal },
        { pro, guaranteeRare: jubilee }
      )
      setReport(res)
      setScanning(false)
      const { awarded: a } = onRunAudit ? onRunAudit({ dayKey, score: res.score }) : { awarded: false }
      setAwarded(!!a)
      if (haptics) Vibration.vibrate(24)
    }, SCAN_MS + 120)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bar, dayKey, org.axes, org.state, streak, kcal, kcalGoal, pro, jubilee, onRunAudit, haptics])

  const overallMeta = report ? scoreVerdictMeta(report.score) : null

  return (
    <GameCard>
      <GameHeader
        icon={Stethoscope}
        iconColor={GAME.cyan}
        iconBg="rgba(103,232,249,0.13)"
        title="Аудит организма"
        subtitle="Доктор Топтыгин осматривает по данным дня"
        right={
          <RightPill
            icon={ClipboardCheck}
            text={doneToday ? `${auditDays[dayKey]}/100` : '6 систем'}
            color={GAME.cyan}
          />
        }
      />

      {/* до первого осмотра: что проверяем + кнопка */}
      {!report && !scanning && (
        <Panel style={{ marginTop: 12 }}>
          <Caps>что проверяем</Caps>
          <Text className="mt-1.5 font-semibold text-[17.5px] leading-snug" style={{ color: GAME.text }}>
            🧴 Кожа · 🍲 Желудок · ❤️ Сердце и ноги
          </Text>
          <Text className="mt-1.5 font-sans text-[16px] leading-snug" style={{ color: GAME.dim }}>
            В Premium — ещё 💪 Мышцы, 🧠 Нервы и 🛡️ Иммунитет, редкие диагнозы
            и история аудитов за неделю
          </Text>
          {pro && jubilee && (
            <Text className="mt-2 font-medium text-[16.5px] leading-snug" style={{ color: GAME.lime }}>
              Юбилей серии: {seriesToday} осмотров подряд — редкий диагноз гарантирован ✨
            </Text>
          )}
          <Pressable
            onPress={runScan}
            className="mt-3 items-center rounded-2xl py-3.5"
            style={{ backgroundColor: GAME.lime }}
            accessibilityRole="button"
            accessibilityLabel="Провести аудит организма"
          >
            <Text className="font-extrabold text-[20px]" style={{ color: '#12200F' }}>
              Провести аудит
            </Text>
          </Pressable>
        </Panel>
      )}

      {/* сканирование: статусы + бар */}
      {scanning && (
        <Panel style={{ marginTop: 12 }}>
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-[17.5px]" style={{ color: GAME.text }}>
              {stageText}
            </Text>
            <Text className="font-sans text-[15px]" style={{ color: GAME.dim2 }}>
              не щекотно
            </Text>
          </View>
          <View className="mt-2.5 h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.07)' }}>
            <Animated.View
              style={{ width: barWidth, height: '100%', borderRadius: 999, backgroundColor: GAME.lime }}
            />
          </View>
        </Panel>
      )}

      {/* заключение */}
      {report && !scanning && (
        <>
          <Panel style={{ marginTop: 12 }}>
            <View className="flex-row items-center gap-2.5">
              <Text className="font-extrabold text-[32px] tracking-tight" style={{ color: scoreColor(report.score) }}>
                {report.score}
              </Text>
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-2">
                  <Caps color={overallMeta.color}>заключение доктора</Caps>
                </View>
                <Text className="mt-0.5 font-medium text-[17px] leading-snug" style={{ color: GAME.text }}>
                  {report.conclusion}
                </Text>
              </View>
              <Pressable
                onPress={handleShare}
                hitSlop={4}
                accessibilityRole="button"
                accessibilityLabel="Поделиться заключением"
                className="h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <Share2 size={17} color={GAME.dim} />
              </Pressable>
            </View>
            {stale && (
              <View
                className="mt-2.5 flex-row items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: 'rgba(250,204,21,0.08)', borderWidth: 1, borderColor: 'rgba(250,204,21,0.25)' }}
              >
                <Sparkles size={16} color={GAME.yellow} />
                <Text className="flex-1 font-medium text-[16.5px] leading-snug" style={{ color: '#FDE68A' }}>
                  Показатели изменились — осмотр устарел. Проверь ещё раз, будет новая шутка
                </Text>
              </View>
            )}
            {pro && jubilee && (
              <View
                className="mt-2.5 flex-row items-center gap-2 rounded-xl px-3 py-2.5"
                style={{ backgroundColor: 'rgba(163,230,53,0.08)', borderWidth: 1, borderColor: 'rgba(163,230,53,0.25)' }}
              >
                <Sparkles size={16} color={GAME.lime} />
                <Text className="flex-1 font-medium text-[16.5px] leading-snug" style={{ color: GAME.lime }}>
                  Юбилей серии: {seriesToday} осмотров подряд — редкий диагноз гарантирован ✨
                </Text>
              </View>
            )}
          </Panel>

          {/* системы: открытые диагнозы + Premium-замки */}
          <View className="mt-2.5 gap-2">
            {report.systems.map((s) => (
              <SystemRow key={s.key} s={s} pro={pro} onLocked={onOpenPaywall} />
            ))}
          </View>

          {/* история аудитов — Premium */}
          {pro ? (
            <Panel style={{ marginTop: 10 }}>
              <Caps>аудиты недели</Caps>
              {history.length === 0 ? (
                <Text className="mt-2 font-sans text-[16px]" style={{ color: GAME.dim2 }}>
                  Пока пусто — осмотры появятся здесь
                </Text>
              ) : (
                <>
                  <View className="mt-2 flex-row flex-wrap items-stretch gap-1.5">
                    {history.map(([k, v]) => (
                      <ScoreChip key={k} score={v} weekday={weekdayLetterOf(k)} today={k === dayKey} />
                    ))}
                  </View>
                  {auditSeries > 0 && (
                    <Text className="mt-2 font-sans text-[16px]" style={{ color: GAME.dim }}>
                      Серия осмотров: {auditSeries} {pluralDays(auditSeries)} подряд 🩺
                    </Text>
                  )}
                  {avgScore != null && (
                    <Text className="mt-1 font-sans text-[16px]" style={{ color: GAME.dim }}>
                      Средний балл за неделю: {avgScore}
                    </Text>
                  )}
                </>
              )}
            </Panel>
          ) : (
            <Pressable
              onPress={onOpenPaywall}
              accessibilityRole="button"
              accessibilityLabel="История аудитов — открыть Premium"
              className="mt-2.5 flex-row items-center gap-2 rounded-xl px-3 py-2.5"
              style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(196,181,253,0.18)' }}
            >
              <Lock size={16} color="#C4B5FD" />
              <Text className="flex-1 font-medium text-[16.5px]" style={{ color: '#C4B5FD' }}>
                История аудитов за неделю — в Premium
              </Text>
              <ChevronRight size={16} color="#C4B5FD" />
            </Pressable>
          )}

          {/* футер: штамп дня + перепроведение */}
          <View className="mt-3 flex-row items-center justify-between px-1">
            <Text className="flex-1 font-sans text-[15px] leading-snug" style={{ color: GAME.dim2 }}>
              {awarded
                ? '+1 ген за медосмотр — начислено'
                : doneToday
                  ? 'Штамп дня стоит. Повтор — ради свежих шуток'
                  : 'Шутки шутками, а к врачу — по расписанию'}
            </Text>
            <Pressable
              onPress={runScan}
              accessibilityRole="button"
              accessibilityLabel="Провести аудит ещё раз"
              className="ml-2 flex-row items-center gap-1 rounded-xl px-2.5 py-1.5"
              style={{ backgroundColor: 'rgba(163,230,53,0.1)' }}
            >
              <RefreshCw size={15} color={GAME.lime} />
              <Text className="font-bold text-[16.5px]" style={{ color: GAME.lime }}>
                Ещё раз
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {/* шеринг заключения картинкой (как «Итоги недели») */}
      <AuditShareCard
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        report={report}
        pro={pro}
        dateLabel={auditDateLabel(dayKey)}
      />
    </GameCard>
  )
}
