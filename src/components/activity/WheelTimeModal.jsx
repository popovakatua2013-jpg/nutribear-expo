// Окно-«счётчик» для записи тренировки — как в приложении-эталоне
// (скриншот Кати от 10.11, экран «Бег»): два барабана — интенсивность
// (Лёгкая/Средняя/Высокая/Максимум) и минуты, под ними живой расчёт
// ккал по формуле MET. «Готово» переносит минуты в форму, а ккал
// пишет от выбранной интенсивности (в форме цифру можно поправить
// вручную — как и раньше). Без медицинских претензий — просто расчёт.
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { INTENSITY_LEVELS, intensityMet, kcalBurned } from '@/lib/data/exercises'
import { formatNum } from '@/lib/format'
import { WheelPicker } from './WheelPicker'

const MIN_MAX = 180 // максимум минут в барабане

export function WheelTimeModal({ open, onClose, exercise, weightKg, initialMinutes = 0, onApply }) {
  const [level, setLevel] = useState('mid')
  const [minutes, setMinutes] = useState(30)

  // Каждое открытие — старт от текущего выбора: минуты из поля формы
  // (или типовая длительность тренировки typ), интенсивность —
  // ближайший уровень к калорийности самой тренировки («Бег» → Высокая)
  useEffect(() => {
    if (!open) return
    setMinutes(
      initialMinutes > 0
        ? Math.min(MIN_MAX, Math.round(initialMinutes))
        : exercise?.typ || 30,
    )
    if (exercise) {
      const near = INTENSITY_LEVELS.reduce((a, b) =>
        Math.abs(b.met - exercise.met) < Math.abs(a.met - exercise.met) ? b : a,
      )
      setLevel(near.id)
    } else {
      setLevel('mid')
    }
  }, [open, exercise, initialMinutes])

  const LEVELS = useMemo(
    () => INTENSITY_LEVELS.map((l) => ({ value: l.id, label: l.label })),
    [],
  )
  const MINS = useMemo(
    () => Array.from({ length: MIN_MAX }, (_, i) => ({ value: i + 1, label: `${i + 1} мин` })),
    [],
  )

  // ккал считаются от интенсивности барабана (а не от мета тренировки)
  const w = Number(weightKg) || 0
  const kcal = w > 0 ? kcalBurned(intensityMet(level), w, minutes) : 0

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {exercise ? `${exercise.emoji} ${exercise.name}` : 'Время и интенсивность'}
            </Text>
            <Pressable onPress={onClose} style={styles.closeBtn} accessibilityLabel="Закрыть счётчик">
              <X size={18} color="#8B96B8" />
            </Pressable>
          </View>
          <Text style={styles.sub}>
            Крути барабаны — калории считаются сами от интенсивности
          </Text>

          <View style={styles.wheels}>
            <View style={styles.wheelCol}>
              <Text style={styles.wheelLabel}>Интенсивность</Text>
              <WheelPicker
                data={LEVELS}
                value={level}
                onChange={setLevel}
                width={128}
                accessibilityLabel="Интенсивность тренировки"
              />
            </View>
            <View style={styles.wheelCol}>
              <Text style={styles.wheelLabel}>Время</Text>
              <WheelPicker
                data={MINS}
                value={minutes}
                onChange={setMinutes}
                width={118}
                accessibilityLabel="Время тренировки в минутах"
              />
            </View>
          </View>

          <Text style={styles.kcal}>
            {w > 0
              ? `≈ ${formatNum(kcal)} ккал при ${Math.round(w)} кг`
              : 'Укажи вес в профиле — покажем калории'}
          </Text>

          <Pressable
            onPress={() => onApply({ minutes, kcal: w > 0 ? kcal : null })}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Применить время и интенсивность"
          >
            <Text style={styles.doneText}>Готово</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#121B33',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 34,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    color: '#EEF2FB',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#131E3A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    fontSize: 12.5,
    fontFamily: 'Inter_400Regular',
    color: '#98A2C2',
    lineHeight: 17,
  },
  wheels: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 4 },
  wheelCol: { alignItems: 'center' },
  wheelLabel: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#8B96B8',
    marginBottom: 6,
  },
  kcal: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    color: '#C4B5FD',
  },
  doneBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#7B6CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  doneText: {
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    color: '#FFFFFF',
  },
})
