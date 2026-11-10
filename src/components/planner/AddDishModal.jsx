// Окно «Добавить блюдо» в план меню: поиск по базе продуктов приложения
// (та же база, что в добавлении еды) + «своё блюдо» (название и ккал).
// По отзыву Кати тап по продукту больше не добавляет сразу и молча:
// открывается ЭТАП ПОРЦИИ — граммовка правится, ккал считаются
// автоматически (ккал/100 г × граммы), а галочка «Добавить в покупки»
// сразу кладёт блюдо в список покупок (например, «Бутерброд с сыром» —
// сыра дома нет, галочка — и он в покупках). Подпись без «нет дома» —
// отзыв Кати 09.11: осталась только галочка + корзина + «Добавить в
// покупки». Стиль — дизайн-система вкладки «Тренировок» (theme.js):
// тёмные карточки, лаймовый акцент.

import { useMemo, useState } from 'react'
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Check, Plus, Search, ShoppingCart, X } from 'lucide-react-native'
import { FOODS, kcalForPortion } from '@/lib/data/foods'
import { buildFood } from '@/lib/data/pick'
import { useShoppingStore } from '@/store/useShoppingStore'
// Палитра — planPalette (цвета приложения): вкладка «План» одного
// цвета с остальным приложением, включая кнопки (просьба Кати 09.11).
// Ключи те же, что у design-системы «Тренировок», значения — bear.*
import { spacing, radius, F, type } from '@/features/workouts/theme'
import { C as colors } from './planPalette'

const MAX_RESULTS = 40

/** Нормализация для поиска: нижний регистр, ё → е */
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е')

// «72,5» → 72.5; NaN → 0
const parseNum = (v) => Number(String(v).trim().replace(',', '.')) || 0

export function AddDishModal({ open, onClose, onPick }) {
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')
  // Этап порции: { raw, grams, kcal, manualKcal } — граммовку и ккал
  // можно править, ккал пересчитываются от калорийности на 100 г
  const [picked, setPicked] = useState(null)
  // Галочка «Добавить в покупки»: блюдо уйдёт в список покупок
  const [toShop, setToShop] = useState(false)

  const results = useMemo(() => {
    const q = norm(query.trim())
    const pool = q ? FOODS.filter((f) => norm(f.name).includes(q)) : FOODS
    return pool.slice(0, MAX_RESULTS)
  }, [query])

  // Тап по продукту — этап порции (не мгновенное добавление, отзыв Кати:
  // «не видно кал — автоматический подсчёт с возможностью редактировать»)
  const openPortion = (raw) => {
    const grams = raw.defaultGrams || 100
    setPicked({
      raw,
      grams: String(grams),
      kcal: String(kcalForPortion({ kcal: raw.kcal }, grams)),
      manualKcal: false,
    })
    setToShop(false)
  }

  // Граммы изменились — ккал пересчитываются сами, пока их не правили вручную
  const changeGrams = (v) => {
    setPicked((p) => {
      if (!p) return p
      const g = parseNum(v)
      return {
        ...p,
        grams: v,
        manualKcal: false,
        kcal: String(g > 0 ? kcalForPortion({ kcal: p.raw.kcal }, g) : 0),
      }
    })
  }

  const changeKcal = (v) => {
    setPicked((p) => (p ? { ...p, kcal: v, manualKcal: true } : p))
  }

  // Добавить в план с этапа порции; ккал/100 г выводим из введённой
  // пары «граммы · ккал» — правка порции позже (GramsModal) будет
  // пересчитывать честно от этой калорийности
  const confirmPortion = () => {
    const g = Math.round(parseNum(picked?.grams))
    const kcal = Math.round(parseNum(picked?.kcal))
    if (g < 1 || g > 2000) {
      Alert.alert('Проверьте порцию', 'От 1 до 2000 г, например 80.')
      return
    }
    if (kcal <= 0 || kcal > 5000) {
      Alert.alert('Сколько калорий?', 'Впишите калорийность порции, например 200.')
      return
    }
    const food = buildFood(picked.raw)
    let shopAdded = false
    if (toShop) {
      shopAdded = useShoppingStore.getState().addMany([{ name: food.name }]) > 0
    }
    onPick({
      name: food.name,
      emoji: food.emoji,
      grams: g,
      kcal,
      kcal100: Math.round((kcal * 100) / g * 10) / 10,
      p: food.p, f: food.f, c: food.c,
      source: 'local',
      shopAdded,
    })
    setPicked(null)
    setToShop(false)
    setQuery('')
  }

  const pickCustom = () => {
    const name = customName.trim()
    const kcal = Math.round(parseNum(customKcal))
    if (!name) {
      Alert.alert('Как называется блюдо?', 'Впишите название — хотя бы «Каша с ягодами».')
      return
    }
    if (kcal <= 0 || kcal > 5000) {
      Alert.alert('Сколько калорий?', 'Впишите калорийность порции, например 320.')
      return
    }
    let shopAdded = false
    if (toShop) {
      shopAdded = useShoppingStore.getState().addMany([{ name }]) > 0
    }
    onPick({
      name,
      emoji: '🍽️',
      grams: 100,
      kcal,
      kcal100: kcal,
      source: 'custom',
      shopAdded,
    })
    setCustomName('')
    setCustomKcal('')
    setToShop(false)
  }

  const close = () => {
    setQuery('')
    setPicked(null)
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Шапка */}
          <View style={styles.head}>
            <Text style={styles.title}>Добавить блюдо</Text>
            <Pressable onPress={close} style={styles.closeBtn} accessibilityLabel="Закрыть окно">
              <X size={18} color={colors.text2} />
            </Pressable>
          </View>

          {picked ? (
            <>
              {/* ── Этап порции: продукт + граммы + ккал + «в покупки» ── */}
              <View style={styles.stageCard}>
                <View style={styles.stageHead}>
                  <Text style={styles.rowEmoji}>{picked.raw.emoji}</Text>
                  <View style={styles.stageHeadText}>
                    <Text style={styles.stageName} numberOfLines={1}>{picked.raw.name}</Text>
                    <Text style={styles.stageSub} numberOfLines={1}>
                      {`${picked.raw.kcal} ккал/100 г${
                        picked.raw.p ? ` · Б ${picked.raw.p} · Ж ${picked.raw.f} · У ${picked.raw.c}` : ''
                      }`}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setPicked(null)}
                    style={styles.stageBack}
                    accessibilityLabel="Назад к поиску продуктов"
                  >
                    <X size={16} color={colors.text2} />
                  </Pressable>
                </View>

                <View style={styles.stageFields}>
                  <View style={styles.stageField}>
                    <Text style={styles.stageLabel}>Порция, г</Text>
                    <TextInput
                      style={styles.input}
                      value={picked.grams}
                      onChangeText={changeGrams}
                      keyboardType="number-pad"
                      maxLength={5}
                      textAlign="center"
                      accessibilityLabel="Порция в граммах"
                    />
                  </View>
                  <View style={styles.stageField}>
                    <Text style={styles.stageLabel}>Калории</Text>
                    <TextInput
                      style={styles.input}
                      value={picked.kcal}
                      onChangeText={changeKcal}
                      keyboardType="number-pad"
                      maxLength={5}
                      textAlign="center"
                      accessibilityLabel="Калории порции, считаются автоматически, можно исправить"
                    />
                  </View>
                </View>
                <Text style={styles.stageHint}>
                  {picked.manualKcal
                    ? 'Ккал заданы вручную — при смене граммовки не пересчитаются'
                    : 'Ккал считаются автоматически — можно исправить вручную'}
                </Text>

                {/* Галочка «в покупки»: корзина и подпись без «нет дома»
                    (отзыв Кати 09.11) */}
                <Pressable
                  onPress={() => setToShop((v) => !v)}
                  style={styles.shopRow}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: toShop }}
                  accessibilityLabel="Добавить блюдо в список покупок"
                >
                  <View style={[styles.cbox, toShop && styles.cboxOn]}>
                    {toShop && <Check size={13} color={colors.accentInk} strokeWidth={3} />}
                  </View>
                  <ShoppingCart size={15} color={colors.cyan} />
                  <Text style={styles.shopText}>Добавить в покупки</Text>
                </Pressable>

                <Pressable
                  onPress={confirmPortion}
                  style={styles.confirmBtn}
                  accessibilityRole="button"
                  accessibilityLabel="Добавить блюдо в план"
                >
                  <Text style={styles.confirmText}>Добавить в план</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {/* Поиск по базе продуктов */}
              <View style={styles.searchWrap}>
                <Search size={16} color={colors.text3} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Найти продукт…"
                  placeholderTextColor={colors.text3}
                  value={query}
                  onChangeText={setQuery}
                  returnKeyType="search"
                />
              </View>

              <FlatList
                data={results}
                keyExtractor={(item) => item.id}
                keyboardShouldPersistTaps="handled"
                style={{ flexGrow: 0 }}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>
                    {query ? 'В базе такого нет — добавь своим блюдом ниже' : 'Продукты базы'}
                  </Text>
                }
                renderItem={({ item }) => (
                  <Pressable
                    style={styles.row}
                    onPress={() => openPortion(item)}
                    accessibilityLabel={`${item.name}, ${item.kcal} калорий на 100 граммов. Тап — выбрать порцию`}
                  >
                    <Text style={styles.rowEmoji}>{item.emoji}</Text>
                    <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                    <Text style={styles.rowMeta}>
                      {item.kcal} ккал/100 г{item.defaultGrams && item.defaultGrams !== 100 ? ` · порция ${item.defaultGrams} г` : ''}
                    </Text>
                  </Pressable>
                )}
              />

              {/* Своё блюдо */}
              <Text style={styles.customLabel}>Своё блюдо</Text>
              <View style={styles.customRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Название"
                  placeholderTextColor={colors.text3}
                  value={customName}
                  onChangeText={setCustomName}
                />
                <TextInput
                  style={[styles.input, styles.kcalInput]}
                  placeholder="ккал"
                  placeholderTextColor={colors.text3}
                  value={customKcal}
                  onChangeText={setCustomKcal}
                  keyboardType="number-pad"
                />
                <Pressable style={styles.addBtn} onPress={pickCustom} accessibilityLabel="Добавить своё блюдо">
                  <Plus size={18} color={colors.accentInk} />
                </Pressable>
              </View>

              {/* Галочка «в покупки» — работает и для своего блюда */}
              <Pressable
                onPress={() => setToShop((v) => !v)}
                style={styles.shopRow}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: toShop }}
                accessibilityLabel="Добавить своё блюдо в список покупок"
              >
                <View style={[styles.cbox, toShop && styles.cboxOn]}>
                  {toShop && <Check size={13} color={colors.accentInk} strokeWidth={3} />}
                </View>
                <ShoppingCart size={15} color={colors.cyan} />
                <Text style={styles.shopText}>Добавить в покупки</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: radius.screen,
    borderTopRightRadius: radius.screen,
    paddingTop: spacing.l,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl + 8,
    maxHeight: '80%',
    gap: spacing.m,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { ...type.title, color: colors.text, flex: 1 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: spacing.m,
    height: 42,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14.5, fontFamily: F[400], paddingVertical: 0 },
  emptyText: { ...type.caption, color: colors.text3, paddingVertical: spacing.m },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: 9,
    minHeight: 44,
  },
  rowEmoji: { fontSize: 19, width: 26, textAlign: 'center' },
  rowName: { ...type.body, color: colors.text, flex: 1, fontWeight: '600', fontFamily: F[600] },
  rowMeta: { ...type.caption, color: colors.text3 },

  // ── Этап порции ──
  stageCard: {
    backgroundColor: colors.card,
    borderColor: colors.accentBorder,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.l,
    gap: spacing.m,
  },
  stageHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.m },
  stageHeadText: { flex: 1 },
  stageName: { ...type.body, color: colors.text, fontWeight: '700', fontFamily: F[700] },
  stageSub: { ...type.caption, color: colors.text3, marginTop: 2 },
  stageBack: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  stageFields: { flexDirection: 'row', gap: spacing.s },
  stageField: { flex: 1, gap: 6 },
  stageLabel: { ...type.caption, color: colors.text2 },
  stageHint: { ...type.caption, color: colors.text3, marginTop: -spacing.s },
  input: {
    backgroundColor: colors.surface2,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: spacing.m,
    height: 42,
    color: colors.text,
    fontSize: 14.5,
    fontFamily: F[400],
  },
  shopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, paddingVertical: 2 },
  cbox: {
    width: 20, height: 20, borderRadius: 6,
    borderColor: colors.line, borderWidth: 1, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  cboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  shopText: { ...type.body, color: colors.text2, flex: 1 },
  confirmBtn: {
    height: 46, borderRadius: radius.field, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  confirmText: { fontSize: 14.5, fontWeight: '800', fontFamily: F[800], color: colors.accentInk },

  customLabel: { ...type.caption, color: colors.text2, marginTop: spacing.xs },
  customRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'center' },
  kcalInput: { width: 84, textAlign: 'center' },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
}
