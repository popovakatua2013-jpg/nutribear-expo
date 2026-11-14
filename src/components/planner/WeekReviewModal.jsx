// Окно «Разбор недели от напарника» — Premium-функция этапа 2
// монетизации. Открывается строкой в карточке «Прогресс» (PlanScreen).
// Free — честный paywall с PremiumCard (демо-активация сразу работает:
// окно само переключается на разбор). Premium — разбор считается по
// журналу дневника за ТЕКУЩУЮ неделю (week-review.js): ИИ-ответ выбранного
// медведя либо, без сети, офлайн-разбор по правилам — с честной подписью.
// Готовый разбор хранится в useWeekReviewStore — повторное открытие
// бесплатное, «Обновить» пересчитывает.

import { useMemo, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { RefreshCw, Sparkles, X } from 'lucide-react-native'
import { tapGuard } from '@/lib/tap-guard'
import {
  generateWeekReview,
  weekDayKeys,
  weekFoodStats,
} from '@/lib/week-review'
import { useProStore } from '@/store/useProStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useWeekReviewStore } from '@/store/useWeekReviewStore'
import { weekKeyOf } from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { PremiumCard } from '@/components/more/PremiumCard'
import { P } from './planPalette'
import { spacing, radius, F, type } from '@/features/workouts/theme'

export function WeekReviewModal({ open, onClose }) {
  const { toast } = useToast()
  const pro = useProStore((s) => s.pro)
  const history = useFoodStore((s) => s.history)
  const kcalGoal = useGoalsStore((s) => s.goals.kcal)
  const macroNorms = useGoalsStore((s) => s.goals.macroNorms)
  const name = useProfileStore((s) => s.name)
  const sex = useProfileStore((s) => s.sex)
  const goalId = useFoodStore((s) => s.goal)
  const setReview = useWeekReviewStore((s) => s.setReview)
  const [busy, setBusy] = useState(false)
  const reviewOnce = useRef(tapGuard()).current

  // Текущая неделя (Пн–Вс) и её разбор, если уже считали
  const weekNow = useMemo(() => weekKeyOf(new Date()), [])
  const dayKeys = useMemo(() => weekDayKeys(new Date()), [])
  const review = useWeekReviewStore((s) => s.reviews[weekNow])

  // Статистика недели из журнала дневника — считается при открытии
  const stats = useMemo(() => weekFoodStats(history, dayKeys), [history, dayKeys])

  const GOAL_LABEL = { lose: 'похудеть', cut: 'подсушиться', maintain: 'удержать вес', gain: 'набрать вес' }

  const run = () => {
    if (busy) return
    if (stats.loggedDays < 2) {
      toast({
        title: 'Мало данных',
        description: 'Запишите еду хотя бы за 2 дня недели — и разбор будет честным',
      })
      return
    }
    reviewOnce(() => {
      setBusy(true)
      generateWeekReview({
        name,
        sex,
        goal: GOAL_LABEL[goalId] || '',
        kcalGoal,
        // Нормы: свои из целей (0 = авто) или «тарелка» — как в «Прогрессе»
        norms: {
          p: macroNorms?.p > 0 ? macroNorms.p : Math.round((kcalGoal * 0.2) / 4),
          f: macroNorms?.f > 0 ? macroNorms.f : Math.round((kcalGoal * 0.3) / 9),
          c: macroNorms?.c > 0 ? macroNorms.c : Math.round((kcalGoal * 0.5) / 4),
        },
        stats,
      })
        .then((res) => {
          setReview(weekNow, res.text, res.source)
          toast({
            title: res.source === 'ai' ? '🧸 Разбор недели готов' : '🧸 Разбор по правилам (без ИИ)',
            description:
              res.source === 'ai'
                ? `${res.text.length > 120 ? 'Напарник посмотрел ваш дневник за 7 дней' : 'Готово'}`
                : 'Нет сети — разбор посчитан по правилам нутрициологии',
          })
          setBusy(false)
        })
        .catch((e) => {
          toast({ title: 'Не получилось', description: String(e?.message || 'Попробуйте ещё раз') })
          setBusy(false)
        })
    })
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHead}>
            <View style={styles.iconTile}>
              <Sparkles size={16} color={P.accentText} />
            </View>
            <View style={styles.titleTexts}>
              <Text style={styles.title}>Разбор недели</Text>
              <Text style={styles.subtitle}>итоги и советы от вашего напарника</Text>
            </View>
            <Pressable
              onPress={onClose}
              style={styles.xBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Закрыть разбор недели"
            >
              <X size={18} color={P.text2} />
            </Pressable>
          </View>

          {!pro ? (
            <>
              <Text style={styles.paywallText}>
                Напарник посмотрит ваш дневник за 7 дней: что получилось, где растёт
                калорийность и какие 2–3 шага дадут результат на следующей неделе.
              </Text>
              <PremiumCard embedded />
            </>
          ) : (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              {review ? (
                <>
                  <View style={styles.reviewCard}>
                    <Text style={styles.reviewText}>{review.text}</Text>
                  </View>
                  <Text style={styles.meta}>
                    {review.source === 'ai' ? 'Разбор от ИИ-напарника' : 'Разбор по правилам (без ИИ)'} ·{' '}
                    {new Date(review.at).toLocaleDateString('ru-RU')}
                  </Text>
                  <Pressable
                    onPress={run}
                    disabled={busy}
                    style={[styles.runBtn, busy && styles.runBtnBusy]}
                    accessibilityRole="button"
                    accessibilityLabel={busy ? 'Медведь пересчитывает разбор' : 'Обновить разбор недели'}
                  >
                    <RefreshCw size={14} color={P.accentInk} />
                    <Text style={styles.runBtnText}>
                      {busy ? 'Медведь смотрит дневник…' : 'Обновить разбор'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.hint}>
                    В дневнике есть записи за {stats.loggedDays} из 7 дней. Разбор посчитает среднюю
                    калорийность, белок и подскажет, что улучшить на следующей неделе.
                  </Text>
                  <Pressable
                    onPress={run}
                    disabled={busy}
                    style={[styles.runBtn, busy && styles.runBtnBusy]}
                    accessibilityRole="button"
                    accessibilityLabel={busy ? 'Медведь смотрит дневник' : 'Разобрать неделю'}
                  >
                    <Sparkles size={14} color={P.accentInk} />
                    <Text style={styles.runBtnText}>
                      {busy ? 'Медведь смотрит дневник…' : 'Разобрать неделю'}
                    </Text>
                  </Pressable>
                  <Text style={styles.note}>
                    {busy
                      ? 'Обычно 10–30 секунд. Без сети разбор посчитается по правилам'
                      : 'Данных мало (меньше 2 дней)? Запишите еду — и разбор будет честным'}
                  </Text>
                </>
              )}
            </ScrollView>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: P.tile,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.xl,
    width: '88%',
    maxHeight: '86%',
    gap: spacing.m,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleTexts: { flex: 1, minWidth: 0 },
  title: { ...type.title, fontSize: 15.5, color: P.text },
  subtitle: { fontSize: 11.5, fontWeight: '400', fontFamily: F[400], color: P.text3, marginTop: 1 },
  xBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  // Paywall для free
  paywallText: { ...type.caption, color: P.text2, lineHeight: 18 },

  // Разбор (Premium)
  body: { maxHeight: 360 },
  reviewCard: {
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.row,
    padding: spacing.m,
  },
  reviewText: {
    fontSize: 13.5,
    fontWeight: '400',
    fontFamily: F[400],
    color: P.text,
    lineHeight: 20,
  },
  meta: { ...type.caption, color: P.text3, textAlign: 'center' },
  hint: { ...type.caption, color: P.text2, lineHeight: 18 },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.accent,
    borderRadius: 999,
    height: 46,
    marginTop: spacing.s,
  },
  runBtnBusy: { opacity: 0.7 },
  runBtnText: { fontSize: 13.5, fontWeight: '800', fontFamily: F[800], color: P.accentInk },
  note: { ...type.caption, color: P.text3, textAlign: 'center' },
}
