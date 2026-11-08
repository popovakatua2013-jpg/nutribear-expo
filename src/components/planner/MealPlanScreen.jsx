// Экран «Меню на неделю» (вкладка «План» → сегмент «Меню»):
// семь карточек дней (Пн–Вс) с приёмами пищи. Тап по приёму — окно
// «Добавить блюдо» (база продуктов или своё блюдо). Тап по пилюле
// «250 г · 220 ккал» — правка граммовки (GramsModal), ккал
// пересчитываются от калорийности на 100 г. У каждого дня —
// сумма калорий против цели (пилюля + полоска), копирование дня,
// очистка; на сегодняшней карточке — «В дневник»: переносит блюда в
// дневник питания через useFoodStore.addEntry (полный БЖУ по граммовке).
// Навигация по неделям ‹ ›, «Копировать прошлую неделю» и «Очистить
// неделю» — в шапке. Стиль — дизайн-система вкладки «Тренировок».

import { useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import {
  ChevronLeft, ChevronRight, ClipboardCheck, Copy, Plus, Trash2, X,
} from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { buildFood } from '@/lib/data/pick'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useFoodStore } from '@/store/useFoodStore'
import {
  dayDate, dayKcal, MEAL_EMOJI, MEAL_IDS, MEAL_NAMES,
  useMealPlanStore, weekKeyOf, weekKeyShift, WEEKDAYS,
} from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { AddDishModal } from './AddDishModal'
import { GramsModal } from './GramsModal'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

const dayKeyOfDate = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`

export function MealPlanScreen() {
  const { toast } = useToast()
  const [weekKey, setWeekKey] = useState(() => weekKeyOf(new Date()))
  const [picker, setPicker] = useState(null) // { dayIdx, mealId }
  const [copyFrom, setCopyFrom] = useState(null) // idx дня-источника
  const [gramsFor, setGramsFor] = useState(null) // { dayIdx, mealId, itemId }

  const plan = useMealPlanStore((s) => s.plans[weekKey])
  const goal = useGoalsStore((s) => s.goals.kcal)

  const store = useMealPlanStore
  const todayKey = dayKeyOfDate(new Date())
  const todayIdx = useMemo(() => {
    const idx = WEEKDAYS.findIndex((_, i) => dayKeyOfDate(dayDate(weekKey, i)) === todayKey)
    return idx // -1 — неделя без сегодня (листаем прошлое/будущее)
  }, [weekKey, todayKey])

  const week = plan || {}

  const weekLabel = useMemo(() => {
    const a = dayDate(weekKey, 0)
    const b = dayDate(weekKey, 6)
    const sameMonth = a.getMonth() === b.getMonth()
    return sameMonth
      ? `${a.getDate()} – ${b.getDate()} ${MONTHS[b.getMonth()]}`
      : `${fmtDate(a)} – ${fmtDate(b)}`
  }, [weekKey])

  const onPick = (item) => {
    if (!picker) return
    store.getState().addItem(weekKey, picker.dayIdx, picker.mealId, item)
    setPicker(null)
  }

  const removeItem = (dayIdx, mealId, itemId) =>
    store.getState().removeItem(weekKey, dayIdx, mealId, itemId)

  const saveGrams = (g) => {
    if (!gramsFor) return
    const { dayIdx, mealId, itemId } = gramsFor
    const it = (week[dayIdx]?.[mealId] || []).find((x) => x.id === itemId)
    store.getState().updateGrams(weekKey, dayIdx, mealId, itemId, g)
    const kcal = Math.round(((Number(it?.kcal100) || 0) * g) / 100)
    toast({
      title: '⚖️ Порция обновлена',
      description: `${it?.name || 'Блюдо'}: ${g} г · ${formatNum(kcal)} ккал`,
    })
    setGramsFor(null)
  }

  const clearDay = (idx, label) => {
    Alert.alert(`Очистить ${label.toLowerCase()}?`, 'Меню этого дня будет удалено.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: () => store.getState().clearDay(weekKey, idx) },
    ])
  }

  const doCopy = (toIdx) => {
    if (copyFrom === null || toIdx === copyFrom) {
      setCopyFrom(null)
      return
    }
    store.getState().copyDay(weekKey, copyFrom, weekKey, toIdx)
    toast({ title: '📋 День скопирован', description: `${WEEKDAYS[copyFrom]} → ${WEEKDAYS[toIdx]}` })
    setCopyFrom(null)
  }

  const copyPrevWeek = () => {
    const ok = store.getState().copyPrevWeek(weekKey)
    toast(
      ok
        ? { title: '📋 Прошлая неделя скопирована', description: 'Меню можно подправить по дням' }
        : { title: 'У прошлой недели нет меню', description: 'Сначала заполните её в разделе «Меню»' },
    )
  }

  const clearWeek = () => {
    Alert.alert('Очистить неделю?', 'Меню всех семи дней будет удалено.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: () => store.getState().clearWeek(weekKey) },
    ])
  }

  const transferToDiary = (idx) => {
    const day = week[idx]
    if (!day) return
    let n = 0
    for (const mealId of MEAL_IDS) {
      for (const it of day[mealId] || []) {
        useFoodStore.getState().addEntry(mealId, {
          food: buildFood({
            id: it.source === 'custom' ? undefined : it.id,
            name: it.name, emoji: it.emoji, kcal100: it.kcal100,
            p: it.p, f: it.f, c: it.c, source: it.source,
          }),
          grams: it.grams, kcal: it.kcal, desc: '',
        })
        n += 1
      }
    }
    toast(
      n
        ? { title: '🍽️ Меню перенесено в дневник', description: `Сегодня: ${n} блюд` }
        : { title: 'Меню дня пустое', description: 'Сначала добавьте блюда' },
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Шапка */}
      <Text style={styles.title}>Меню на неделю</Text>
      <Text style={styles.subtitle}>Запланируйте блюда — и переносите день в дневник одним тапом</Text>

      {/* Навигация по неделям + действия */}
      <View style={styles.weekBar}>
        <Pressable onPress={() => setWeekKey(weekKeyShift(weekKey, -1))} style={styles.weekBtn} accessibilityLabel="Прошлая неделя">
          <ChevronLeft size={18} color={colors.text2} />
        </Pressable>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <Pressable onPress={() => setWeekKey(weekKeyShift(weekKey, 1))} style={styles.weekBtn} accessibilityLabel="Следующая неделя">
          <ChevronRight size={18} color={colors.text2} />
        </Pressable>
      </View>
      <View style={styles.weekActions}>
        <Pressable onPress={copyPrevWeek} style={styles.weekAction}>
          <Copy size={14} color={colors.cyan} />
          <Text style={[styles.weekActionText, { color: colors.cyan }]}>Копировать прошлую</Text>
        </Pressable>
        <Pressable onPress={clearWeek} style={styles.weekAction}>
          <Trash2 size={14} color={colors.text3} />
          <Text style={styles.weekActionText}>Очистить</Text>
        </Pressable>
      </View>

      {/* Дни недели */}
      {WEEKDAYS.map((label, idx) => {
        const day = week[idx]
        const kcal = dayKcal(day)
        const isToday = idx === todayIdx
        const pct = goal > 0 ? kcal / goal : 0
        const dishCount = MEAL_IDS.reduce((n, m) => n + (day?.[m]?.length || 0), 0)
        return (
          <View key={idx} style={[styles.dayCard, isToday && styles.dayCardToday]}>
            {/* Шапка дня */}
            <View style={styles.dayHead}>
              <Text style={styles.dayName}>{label}{isToday ? ' · сегодня' : ''}</Text>
              {dishCount > 0 && (
                <View style={styles.kcalPill}>
                  <Text style={styles.kcalPillText}>{formatNum(kcal)} ккал</Text>
                </View>
              )}
            </View>
            {/* Полоска к цели дня */}
            {dishCount > 0 && goal > 0 && (
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(pct, 1) * 100}%`, backgroundColor: pct > 1.05 ? colors.orange : colors.accent }]} />
              </View>
            )}
            {/* Действия дня */}
            <View style={styles.dayActions}>
              <Pressable onPress={() => setCopyFrom(idx)} style={styles.dayAction} accessibilityLabel={`Копировать меню ${label}`}>
                <Copy size={14} color={colors.text2} />
                <Text style={styles.dayActionText}>Копировать</Text>
              </Pressable>
              <Pressable onPress={() => clearDay(idx, label)} style={styles.dayAction} accessibilityLabel={`Очистить ${label}`}>
                <Trash2 size={14} color={colors.text3} />
                <Text style={styles.dayActionText}>Очистить</Text>
              </Pressable>
              {isToday && (
                <Pressable onPress={() => transferToDiary(idx)} style={styles.transferBtn} accessibilityLabel="Перенести меню в дневник">
                  <ClipboardCheck size={14} color={colors.accentInk} />
                  <Text style={styles.transferText}>В дневник</Text>
                </Pressable>
              )}
            </View>

            {/* Приёмы пищи */}
            {MEAL_IDS.map((mealId) => {
              const items = day?.[mealId] || []
              return (
                <View key={mealId} style={styles.mealBlock}>
                  <Pressable
                    onPress={() => setPicker({ dayIdx: idx, mealId })}
                    style={styles.mealHead}
                    accessibilityLabel={`${MEAL_NAMES[mealId]}: добавить блюдо`}
                  >
                    <Text style={styles.mealEmoji}>{MEAL_EMOJI[mealId]}</Text>
                    <Text style={styles.mealName}>{MEAL_NAMES[mealId]}</Text>
                    <View style={styles.mealAdd}>
                      <Plus size={13} color={colors.accent} />
                      <Text style={styles.mealAddText}>добавить</Text>
                    </View>
                  </Pressable>
                  {items.map((it) => (
                    <View key={it.id} style={styles.itemRow}>
                      <Text style={styles.itemEmoji}>{it.emoji}</Text>
                      <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                      <Pressable
                        onPress={() => setGramsFor({ dayIdx: idx, mealId, itemId: it.id })}
                        style={styles.itemMetaBtn}
                        accessibilityLabel={`Изменить порцию: ${it.name}`}
                      >
                        <Text style={styles.itemMeta}>{it.grams} г · {formatNum(it.kcal)}</Text>
                      </Pressable>
                      <Pressable onPress={() => removeItem(idx, mealId, it.id)} style={styles.itemDel} accessibilityLabel="Убрать блюдо">
                        <X size={13} color={colors.text3} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              )
            })}
          </View>
        )
      })}

      {/* Окно добавления блюда */}
      <AddDishModal open={!!picker} onClose={() => setPicker(null)} onPick={onPick} />

      {/* Окно правки граммовки блюда */}
      <GramsModal
        item={gramsFor ? (week[gramsFor.dayIdx]?.[gramsFor.mealId] || []).find((x) => x.id === gramsFor.itemId) : null}
        onClose={() => setGramsFor(null)}
        onSave={saveGrams}
      />

      {/* Окно копирования дня: куда */}
      <Modal visible={copyFrom !== null} transparent animationType="fade" onRequestClose={() => setCopyFrom(null)}>
        <Pressable style={styles.copyBackdrop} onPress={() => setCopyFrom(null)}>
          <Pressable style={styles.copySheet} onPress={() => {}}>
            <Text style={styles.copyTitle}>Куда скопировать {copyFrom !== null ? WEEKDAYS[copyFrom] : ''}?</Text>
            <View style={styles.copyGrid}>
              {WEEKDAYS.map((label, toIdx) => (
                <Pressable
                  key={toIdx}
                  onPress={() => doCopy(toIdx)}
                  style={[styles.copyPill, toIdx === copyFrom && styles.copyPillOff]}
                  disabled={toIdx === copyFrom}
                >
                  <Text style={[styles.copyPillText, toIdx === copyFrom && { color: colors.text3 }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.copyHint}>Меню выбранного дня будет заменено</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

const styles = {
  title: { ...type.display, fontSize: 26, color: colors.text, letterSpacing: -0.3, marginTop: spacing.l },
  subtitle: { ...type.body, color: colors.text2, marginTop: 4, marginBottom: spacing.l },
  weekBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, paddingLeft: 6, paddingRight: 6, height: 44,
  },
  weekBtn: { width: 38, height: 34, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { ...type.title, fontSize: 15, color: colors.text },
  weekActions: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.s },
  weekAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 12, height: 32,
  },
  weekActionText: { fontSize: 12, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  dayCard: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.l, marginTop: spacing.m,
  },
  dayCardToday: { borderColor: colors.accentBorder, backgroundColor: colors.surface },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayName: { ...type.title, fontSize: 16, color: colors.text, flex: 1 },
  kcalPill: {
    backgroundColor: colors.accentSoft, borderColor: colors.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3,
  },
  kcalPillText: { fontSize: 12, fontWeight: '700', fontFamily: F[700], color: colors.accent },
  barTrack: { height: 5, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 5, borderRadius: 3 },
  dayActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.m },
  dayAction: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.surface2, borderRadius: 999,
    paddingHorizontal: 10, height: 28,
  },
  dayActionText: { fontSize: 11.5, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  transferBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accent, borderRadius: 999,
    paddingHorizontal: 12, height: 28,
  },
  transferText: { fontSize: 11.5, fontWeight: '700', fontFamily: F[700], color: colors.accentInk },
  mealBlock: { marginTop: spacing.m },
  mealHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, minHeight: 36 },
  mealEmoji: { fontSize: 16, width: 22, textAlign: 'center' },
  mealName: { ...type.body, color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 13.5, flex: 1 },
  mealAdd: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.accentSoft, borderRadius: 999,
    paddingHorizontal: 9, height: 24,
  },
  mealAddText: { fontSize: 11, fontWeight: '700', fontFamily: F[700], color: colors.accent },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    backgroundColor: colors.surface2, borderRadius: radius.row,
    paddingHorizontal: 10, paddingVertical: 7, marginTop: 6, minHeight: 34,
  },
  itemEmoji: { fontSize: 14, width: 20, textAlign: 'center' },
  itemName: { ...type.body, color: colors.text, flex: 1, fontSize: 13 },
  itemMetaBtn: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3,
  },
  itemMeta: { fontSize: 11.5, fontWeight: '600', fontFamily: F[600], color: colors.text2 },
  itemDel: { width: 22, height: 22, alignItems: 'center', justifyContent: 'center' },
  copyBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  copySheet: {
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.xl, width: '86%',
  },
  copyTitle: { ...type.title, color: colors.text, textAlign: 'center' },
  copyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.s, marginTop: spacing.l },
  copyPill: {
    backgroundColor: colors.card, borderColor: colors.accentBorder, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 16, height: 38,
    alignItems: 'center', justifyContent: 'center', minWidth: 56,
  },
  copyPillOff: { borderColor: colors.line, opacity: 0.5 },
  copyPillText: { fontSize: 14, fontWeight: '700', fontFamily: F[700], color: colors.text },
  copyHint: { ...type.caption, color: colors.text3, textAlign: 'center', marginTop: spacing.m },
}
