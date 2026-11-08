// Окно правки граммовки блюда в плане меню: открывается тапом по
// пилюле «250 г · 220 ккал» на строке блюда. Шаг ±10 г, пресеты и
// точный ввод; калории пересчитываются на лету от калорийности на
// 100 г. Стиль — дизайн-система вкладки «Тренировок» (theme.js):
// тёмный bottom-sheet, лаймовый акцент.

import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Minus, Plus, X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { colors, spacing, radius, F, type } from '@/features/workouts/theme'

const MIN = 10
const MAX = 2000
const STEP = 10
const PRESETS = [50, 100, 150, 200, 250, 300, 400]

const clamp = (v) => Math.max(MIN, Math.min(MAX, Math.round(Number(v)) || MIN))

export function GramsModal({ item, onClose, onSave }) {
  const [grams, setGrams] = useState(100)
  const [draft, setDraft] = useState('')

  useEffect(() => {
    if (item) {
      setGrams(item.grams || 100)
      setDraft('')
    }
  }, [item])

  const open = !!item
  const kcal100 = Number(item?.kcal100) || 0
  const kcal = Math.round((kcal100 * grams) / 100)

  const apply = (v) => {
    setGrams(clamp(v))
    setDraft('')
  }

  const commit = () => {
    const v = clamp(draft === '' ? grams : draft)
    onSave?.(v)
    onClose?.()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Шапка: блюдо */}
          <View style={styles.head}>
            <Text style={styles.emoji}>{item?.emoji || '🍽️'}</Text>
            <Text style={styles.name} numberOfLines={1}>{item?.name || ''}</Text>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Закрыть окно">
              <X size={18} color={colors.text2} />
            </Pressable>
          </View>

          {/* Текущая порция и калории */}
          <View style={styles.preview}>
            <Text style={styles.previewGrams}>{grams} г</Text>
            <Text style={styles.previewKcal}>≈ {formatNum(kcal)} ккал</Text>
          </View>

          {/* Степпер: − значение + */}
          <View style={styles.stepper}>
            <Pressable
              onPress={() => apply(grams - STEP)}
              style={[styles.stepBtn, grams <= MIN && styles.stepBtnOff]}
              disabled={grams <= MIN}
              accessibilityLabel="Меньше на 10 грамм"
            >
              <Minus size={18} color={colors.accent} />
            </Pressable>
            <TextInput
              style={styles.stepValue}
              value={draft || String(grams)}
              onChangeText={setDraft}
              onSubmitEditing={commit}
              keyboardType="number-pad"
              maxLength={4}
              textAlign="center"
              accessibilityLabel="Граммовка, можно ввести вручную"
            />
            <Pressable
              onPress={() => apply(grams + STEP)}
              style={[styles.stepBtn, grams >= MAX && styles.stepBtnOff]}
              disabled={grams >= MAX}
              accessibilityLabel="Больше на 10 грамм"
            >
              <Plus size={18} color={colors.accent} />
            </Pressable>
          </View>

          {/* Пресеты порций */}
          <View style={styles.presets}>
            {PRESETS.map((p) => {
              const active = p === grams
              return (
                <Pressable
                  key={p}
                  onPress={() => apply(p)}
                  style={[styles.preset, active && styles.presetActive]}
                  accessibilityLabel={`Порция ${p} грамм`}
                >
                  <Text style={[styles.presetText, active && styles.presetTextActive]}>{p}</Text>
                </Pressable>
              )
            })}
          </View>

          {/* Готово */}
          <Pressable onPress={commit} style={styles.saveBtn} accessibilityLabel="Сохранить порцию">
            <Text style={styles.saveText}>Готово</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: colors.surface2, borderColor: colors.line, borderWidth: 1,
    borderRadius: radius.screen, padding: spacing.xl, width: '86%', gap: spacing.l,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  emoji: { fontSize: 20, width: 26, textAlign: 'center' },
  name: { ...type.title, color: colors.text, flex: 1 },
  closeBtn: {
    width: 34, height: 34, borderRadius: 12, backgroundColor: colors.card,
    alignItems: 'center', justifyContent: 'center',
  },
  preview: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: spacing.s },
  previewGrams: { fontSize: 34, fontWeight: '800', fontFamily: F[800], color: colors.accent, letterSpacing: -0.5 },
  previewKcal: { ...type.caption, color: colors.text2 },
  stepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.l,
  },
  stepBtn: {
    width: 44, height: 44, borderRadius: 15, backgroundColor: colors.accentSoft,
    borderColor: colors.accentBorder, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff: { opacity: 0.35 },
  stepValue: {
    minWidth: 90, color: colors.text, fontSize: 18, fontWeight: '800', fontFamily: F[800],
    paddingVertical: 0,
  },
  presets: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.s },
  preset: {
    backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1,
    borderRadius: 999, paddingHorizontal: 13, height: 32,
    alignItems: 'center', justifyContent: 'center',
  },
  presetActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  presetText: { fontSize: 12.5, fontWeight: '700', fontFamily: F[700], color: colors.text2 },
  presetTextActive: { color: colors.accentInk },
  saveBtn: {
    height: 46, borderRadius: radius.field, backgroundColor: colors.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  saveText: { fontSize: 14.5, fontWeight: '800', fontFamily: F[800], color: colors.accentInk },
}
