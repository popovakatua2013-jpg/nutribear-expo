// Окно «Заменить блюдо» в плане меню (просьба Кати 10.11: «тап по блюду
// в меню: „заменить на похожее по ккал", приложение предлагает 2–3
// варианта из базы»). Открывается тапом по названию блюда в строке
// приёма. Предлагает 2–3 похожих продукта из базы по калорийности
// на 100 г; граммовка каждой замены подогнана под те же ккал порции,
// что у текущего блюда — сумма ккал приёма не уезжает. Правка граммовки
// после замены — как раньше, тапом по пилюле (GramsModal).
// Стиль — как у GramsModal: тёмная карточка по центру, палитра planPalette.

import { useMemo } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { swapCandidates, gramsForSameKcal } from '@/lib/data/swap'
// Палитра — planPalette (цвета приложения), как у остальных окон вкладки
import { spacing, radius, F, type } from '@/features/workouts/theme'
import { C as colors } from './planPalette'

export function SwapDishModal({ item, onClose, onReplace }) {
  // Похожие по ккал из базы — считаем, пока окно открыто
  const list = useMemo(() => swapCandidates(item), [item])

  const open = !!item
  const kcal = Math.round(Number(item?.kcal) || 0)

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Шапка: текущее блюдо */}
          <View style={styles.head}>
            <Text style={styles.emoji}>{item?.emoji || '🍽️'}</Text>
            <View style={styles.headTexts}>
              <Text style={styles.name} numberOfLines={1}>{item?.name || ''}</Text>
              <Text style={styles.sub} numberOfLines={1}>
                {formatNum(kcal)} ккал · похожие по ккал из базы
              </Text>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Закрыть окно замены">
              <X size={18} color={colors.text2} />
            </Pressable>
          </View>

          {/* 2–3 варианта замены: тап — заменить блюдо на это */}
          {list.length === 0 ? (
            <Text style={styles.empty}>
              Похожего в базе нет — можно убрать блюдо крестиком и добавить другое
            </Text>
          ) : (
            list.map((f) => {
              const grams = gramsForSameKcal(f.kcal, kcal)
              const kcalPortion = Math.round((f.kcal * grams) / 100)
              return (
                <Pressable
                  key={f.id}
                  style={styles.row}
                  onPress={() =>
                    onReplace({
                      name: f.name,
                      emoji: f.emoji,
                      grams,
                      kcal: kcalPortion,
                      kcal100: f.kcal,
                      p: f.p,
                      f: f.f,
                      c: f.c,
                      source: 'local',
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Заменить на ${f.name}: ${grams} грамм, ${formatNum(kcalPortion)} калорий`}
                >
                  <Text style={styles.rowEmoji}>{f.emoji}</Text>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowName} numberOfLines={1}>{f.name}</Text>
                    <Text style={styles.rowMeta} numberOfLines={1}>{f.kcal} ккал/100 г</Text>
                  </View>
                  <Text style={styles.rowPortion} numberOfLines={1}>
                    {grams} г · {formatNum(kcalPortion)} ккал
                  </Text>
                </Pressable>
              )
            })
          )}

          <Text style={styles.hint}>Порция подогнана под те же ккал, что у текущего блюда</Text>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.xl, width: '86%', gap: spacing.m,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  emoji: { fontSize: 20, width: 26, textAlign: 'center' },
  headTexts: { flex: 1, minWidth: 0 },
  name: { ...type.title, color: colors.text, fontSize: 15.5 },
  sub: { ...type.caption, color: colors.text3, marginTop: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  empty: { ...type.caption, color: colors.text2, textAlign: 'center', paddingVertical: spacing.s },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.s,
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.row, paddingHorizontal: 12, paddingVertical: 10,
    minHeight: 46,
  },
  rowEmoji: { fontSize: 18, width: 24, textAlign: 'center' },
  rowTexts: { flex: 1, minWidth: 0 },
  rowName: { ...type.body, color: colors.text, fontWeight: '700', fontFamily: F[700], fontSize: 13.5 },
  rowMeta: { ...type.caption, color: colors.text3, marginTop: 1 },
  rowPortion: {
    fontSize: 12, fontWeight: '700', fontFamily: F[700], color: colors.accentText,
    fontVariant: ['tabular-nums'], flexShrink: 0,
  },
  hint: { ...type.caption, color: colors.text3, textAlign: 'center', marginTop: -spacing.xs },
}
