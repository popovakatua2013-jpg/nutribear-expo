// Окно «Добавить блюдо» в план меню: поиск по базе продуктов приложения
// (та же база, что в добавлении еды) + «своё блюдо» (название и ккал
// вручную). Тап по продукту — добавить с его обычной порцией
// (defaultGrams), ккал считаются по формуле базы. Стиль — дизайн-система
// вкладки «Тренировок» (theme.js): тёмные карточки, лаймовый акцент.

import { useMemo, useState } from 'react'
import { Alert, FlatList, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Plus, Search, X } from 'lucide-react-native'
import { FOODS, kcalForPortion } from '@/lib/data/foods'
import { buildFood } from '@/lib/data/pick'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

const MAX_RESULTS = 40

/** Нормализация для поиска: нижний регистр, ё → е */
const norm = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е')

export function AddDishModal({ open, onClose, onPick }) {
  const [query, setQuery] = useState('')
  const [customName, setCustomName] = useState('')
  const [customKcal, setCustomKcal] = useState('')

  const results = useMemo(() => {
    const q = norm(query.trim())
    const pool = q ? FOODS.filter((f) => norm(f.name).includes(q)) : FOODS
    return pool.slice(0, MAX_RESULTS)
  }, [query])

  const pickProduct = (raw) => {
    const food = buildFood(raw)
    const grams = raw.defaultGrams || 100
    onPick({
      name: food.name,
      emoji: food.emoji,
      grams,
      kcal: kcalForPortion({ kcal: food.kcal }, grams),
      kcal100: food.kcal,
      p: food.p, f: food.f, c: food.c,
      source: 'local',
    })
    setQuery('')
  }

  const pickCustom = () => {
    const name = customName.trim()
    const kcal = Math.round(Number(String(customKcal).replace(',', '.')) || 0)
    if (!name) {
      Alert.alert('Как называется блюдо?', 'Впишите название — хотя бы «Каша с ягодами».')
      return
    }
    if (kcal <= 0 || kcal > 5000) {
      Alert.alert('Сколько калорий?', 'Впишите калорийность порции, например 320.')
      return
    }
    onPick({
      name,
      emoji: '🍽️',
      grams: 100,
      kcal,
      kcal100: kcal,
      source: 'custom',
    })
    setCustomName('')
    setCustomKcal('')
  }

  const close = () => {
    setQuery('')
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
              <Pressable style={styles.row} onPress={() => pickProduct(item)}>
                <Text style={styles.rowEmoji}>{item.emoji}</Text>
                <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.rowMeta}>{item.kcal} ккал/100 г</Text>
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
  customLabel: { ...type.caption, color: colors.text2, marginTop: spacing.xs },
  customRow: { flexDirection: 'row', gap: spacing.s, alignItems: 'center' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: spacing.m,
    height: 42,
    color: colors.text,
    fontSize: 14.5,
    fontFamily: F[400],
  },
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
