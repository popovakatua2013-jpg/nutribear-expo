// Экран «Покупки» (вкладка «Тренировки» → сегмент «Покупки»): список
// продуктов для магазина. Добавление строкой с кнопкой «+», тап по
// строке — отметить «в корзине» (уходит вниз, зачёркивается), корзина
// удаления у строки, «Убрать купленные» — одной кнопкой. Сверху —
// прогресс «Куплено X из Y» с полоской. Стиль — дизайн-система вкладки
// «Тренировок» (theme.js).

import { useState } from 'react'
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Check, Plus, ShoppingBasket, Trash2 } from 'lucide-react-native'
import { sortItems, useShoppingStore } from '@/store/useShoppingStore'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

export function ShoppingListScreen() {
  const items = useShoppingStore((s) => s.items)
  const store = useShoppingStore
  const [draft, setDraft] = useState('')

  const sorted = sortItems(items)
  const total = items.length
  const done = items.filter((it) => it.done).length
  const pct = total > 0 ? done / total : 0

  const submit = () => {
    if (store.getState().add(draft)) setDraft('')
    Keyboard.dismiss()
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Покупки</Text>
      <Text style={styles.subtitle}>Что купить в магазине — отмечай, что уже в корзине</Text>

      {/* Прогресс: куплено X из Y */}
      <View style={styles.progressCard}>
        <View style={styles.progressHead}>
          <Text style={styles.progressLabel}>Куплено</Text>
          <Text style={styles.progressValue}>{done} из {total}</Text>
        </View>
        <View style={styles.barTrack}>
          <View style={[styles.barFill, { width: `${pct * 100}%` }]} />
        </View>
      </View>

      {/* Строка добавления */}
      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="Добавить продукт…"
          placeholderTextColor={colors.text3}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={submit}
          returnKeyType="done"
          maxLength={80}
        />
        <Pressable onPress={submit} style={styles.addBtn} accessibilityLabel="Добавить продукт">
          <Plus size={20} color={colors.accentInk} />
        </Pressable>
      </View>

      {/* Список */}
      {sorted.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Список пуст</Text>
          <Text style={styles.emptyText}>Добавь первый продукт строкой выше — например, «молоко» или «овсянка»</Text>
        </View>
      ) : (
        <>
          {sorted.map((it) => (
            <Pressable
              key={it.id}
              onPress={() => store.getState().toggle(it.id)}
              style={[styles.row, it.done && styles.rowDone]}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: it.done }}
              accessibilityLabel={it.name}
            >
              <View style={[styles.check, it.done && styles.checkDone]}>
                {it.done && <Check size={13} color={colors.accentInk} />}
              </View>
              <Text style={[styles.rowName, it.done && styles.rowNameDone]} numberOfLines={1}>
                {it.name}
              </Text>
              <Pressable
                onPress={() => store.getState().remove(it.id)}
                style={styles.delBtn}
                hitSlop={8}
                accessibilityLabel={`Удалить ${it.name}`}
              >
                <Trash2 size={15} color={colors.text3} />
              </Pressable>
            </Pressable>
          ))}

          {done > 0 && (
            <Pressable onPress={() => store.getState().clearDone()} style={styles.clearBtn} accessibilityLabel="Убрать купленные">
              <ShoppingBasket size={14} color={colors.cyan} />
              <Text style={[styles.clearText, { color: colors.cyan }]}>Убрать купленные ({done})</Text>
            </Pressable>
          )}
        </>
      )}
    </ScrollView>
  )
}

const styles = {
  title: { ...type.display, fontSize: 26, color: colors.text, letterSpacing: -0.3, marginTop: spacing.l },
  subtitle: { ...type.body, color: colors.text2, marginTop: 4, marginBottom: spacing.l },
  progressCard: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.l,
  },
  progressHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressLabel: { ...type.caption, color: colors.text2 },
  progressValue: { fontSize: 14, fontWeight: '800', fontFamily: F[800], color: colors.text },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: colors.line, marginTop: 10, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3, backgroundColor: colors.accent },
  addRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m, alignItems: 'center' },
  input: {
    flex: 1, height: 46,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.field, paddingHorizontal: spacing.m,
    color: colors.text, fontSize: 14.5, fontFamily: F[400],
  },
  addBtn: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.row, paddingHorizontal: spacing.m,
    paddingVertical: 10, marginTop: spacing.s, minHeight: 48,
  },
  rowDone: { opacity: 0.62 },
  check: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.text3,
    alignItems: 'center', justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.accent, borderColor: colors.accent },
  rowName: { ...type.body, color: colors.text, flex: 1, fontWeight: '600', fontFamily: F[600], fontSize: 14 },
  rowNameDone: { color: colors.text3, textDecorationLine: 'line-through' },
  delBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, height: 40, marginTop: spacing.m,
  },
  clearText: { fontSize: 12.5, fontWeight: '700', fontFamily: F[700] },
  emptyCard: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.xxl, alignItems: 'center', marginTop: spacing.m,
  },
  emptyEmoji: { fontSize: 38 },
  emptyTitle: { ...type.title, color: colors.text, marginTop: spacing.s },
  emptyText: { ...type.caption, color: colors.text2, textAlign: 'center', marginTop: 6, lineHeight: 17 },
}
