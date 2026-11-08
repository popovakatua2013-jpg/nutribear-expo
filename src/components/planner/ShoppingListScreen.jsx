// Экран «Покупки» (отдельная нижняя вкладка, вынесена из вкладки «План»): список
// продуктов для магазина, сгруппированный по категориям-«отделам»
// (овощи, молочное, хлеб…). Новые строки получают категорию по названию
// автоматически или из выбранного чипа. У каждой строки — количество
// (− шт +), тап по строке — «в корзине» (уходит вниз отдела,
// зачёркивается), корзина удаления. Кнопка «Из плана» собирает продукты
// из меню текущей недели (дубликаты объединяются). Сверху — прогресс
// «Куплено X из Y» с полоской. Стиль — дизайн-система вкладки
// «Тренировок» (theme.js).

import { useState } from 'react'
import { Alert, Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { Check, ListPlus, Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react-native'
import {
  groupByCategory, SHOP_CATEGORIES, useShoppingStore,
} from '@/store/useShoppingStore'
import { useMealPlanStore, weekKeyOf } from '@/store/useMealPlanStore'
import { planToShopping } from '@/lib/plan-shopping'
import { useToast } from '../ui/Toast'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

export function ShoppingListScreen() {
  const { toast } = useToast()
  const items = useShoppingStore((s) => s.items)
  const planWeek = useMealPlanStore((s) => s.plans[weekKeyOf(new Date())])
  const store = useShoppingStore
  const [draft, setDraft] = useState('')
  const [pickedCat, setPickedCat] = useState(null) // null — авто по названию

  const groups = groupByCategory(items)
  const total = items.length
  const done = items.filter((it) => it.done).length
  const pct = total > 0 ? done / total : 0

  const submit = () => {
    if (store.getState().add(draft, pickedCat ? { category: pickedCat } : {})) {
      setDraft('')
    }
    Keyboard.dismiss()
  }

  const fromPlan = () => {
    const list = planToShopping(planWeek)
    if (!list.length) {
      toast({ title: 'В плане этой недели пусто', description: 'Заполните меню в сегменте «Меню»' })
      return
    }
    Alert.alert(
      'Добавить из плана?',
      `${list.length} поз. из меню этой недели. Дубликаты объединены, то, что уже в списке, второй раз не добавим.`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Добавить',
          onPress: () => {
            const n = store.getState().addMany(list)
            toast(
              n
                ? { title: `🛒 Добавлено: ${n}`, description: 'Из плана на этой неделе' }
                : { title: 'Всё из плана уже в списке', description: 'Новых продуктов нет' },
            )
          },
        },
      ],
    )
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 48 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Покупки</Text>
      <Text style={styles.subtitle}>По отделам магазина — отмечай, что уже в корзине</Text>

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

      {/* Категории: чип-фильтр для новой строки */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipsScroll}
        contentContainerStyle={styles.chipsContent}
        keyboardShouldPersistTaps="handled"
      >
        <Pressable
          onPress={() => setPickedCat(null)}
          style={[styles.chip, pickedCat === null && styles.chipActive]}
          accessibilityState={{ selected: pickedCat === null }}
        >
          <Text style={styles.chipEmoji}>✨</Text>
          <Text style={[styles.chipText, pickedCat === null && styles.chipTextActive]}>Авто</Text>
        </Pressable>
        {SHOP_CATEGORIES.map((c) => {
          const active = pickedCat === c.id
          return (
            <Pressable
              key={c.id}
              onPress={() => setPickedCat(active ? null : c.id)}
              style={[styles.chip, active && styles.chipActive]}
              accessibilityState={{ selected: active }}
            >
              <Text style={styles.chipEmoji}>{c.emoji}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{c.label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

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

      {/* Из плана: продукты из меню текущей недели */}
      <Pressable onPress={fromPlan} style={styles.planBtn} accessibilityLabel="Добавить из плана меню">
        <ListPlus size={14} color={colors.cyan} />
        <Text style={[styles.planBtnText, { color: colors.cyan }]}>Из плана на этой неделе</Text>
      </Pressable>

      {/* Список по отделам */}
      {total === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🛒</Text>
          <Text style={styles.emptyTitle}>Список пуст</Text>
          <Text style={styles.emptyText}>
            Добавь продукт строкой выше или нажми «Из плана» — продукты из меню недели соберутся сами
          </Text>
        </View>
      ) : (
        <>
          {groups.map((g) => (
            <View key={g.id}>
              {/* Отдел */}
              <View style={styles.sectionHead}>
                <Text style={styles.sectionEmoji}>{g.emoji}</Text>
                <Text style={styles.sectionLabel}>{g.label}</Text>
                <Text style={styles.sectionCount}>
                  {g.items.filter((it) => it.done).length}/{g.items.length}
                </Text>
              </View>
              {g.items.map((it) => (
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
                  {/* Количество: − шт + */}
                  <View style={styles.qtyBox}>
                    <Pressable
                      onPress={() => store.getState().setQty(it.id, (it.qty || 1) - 1)}
                      style={[styles.qtyBtn, (it.qty || 1) <= 1 && styles.qtyBtnOff]}
                      disabled={(it.qty || 1) <= 1}
                      hitSlop={6}
                      accessibilityLabel={`Меньше: ${it.name}`}
                    >
                      <Minus size={13} color={colors.text2} />
                    </Pressable>
                    <Text style={styles.qtyVal}>{it.qty || 1}</Text>
                    <Pressable
                      onPress={() => store.getState().setQty(it.id, (it.qty || 1) + 1)}
                      style={styles.qtyBtn}
                      hitSlop={6}
                      accessibilityLabel={`Больше: ${it.name}`}
                    >
                      <Plus size={13} color={colors.accent} />
                    </Pressable>
                  </View>
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
            </View>
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
  chipsScroll: { marginTop: spacing.m, flexGrow: 0 },
  chipsContent: { gap: spacing.s, paddingRight: spacing.xl },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 11, height: 32,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipEmoji: { fontSize: 12 },
  chipText: { fontSize: 11.5, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  chipTextActive: { color: colors.accentInk },
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
  planBtn: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6,
    backgroundColor: colors.cyanSoft, borderColor: 'rgba(61,220,242,0.25)', borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 13, height: 32, marginTop: spacing.s,
  },
  planBtnText: { fontSize: 12, fontWeight: '700', fontFamily: F[700] },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.l, marginBottom: 2 },
  sectionEmoji: { fontSize: 13 },
  sectionLabel: { ...type.caption, color: colors.text2, flex: 1 },
  sectionCount: { fontSize: 11, fontWeight: '700', fontFamily: F[700], color: colors.text3 },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.m,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.row, paddingHorizontal: spacing.m,
    paddingVertical: 9, marginTop: spacing.s, minHeight: 48,
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
  qtyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: colors.surface2, borderRadius: 999, padding: 2,
  },
  qtyBtn: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  qtyBtnOff: { opacity: 0.35 },
  qtyVal: { minWidth: 20, textAlign: 'center', fontSize: 13, fontWeight: '700', fontFamily: F[700], color: colors.text },
  delBtn: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, height: 40, marginTop: spacing.l,
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
