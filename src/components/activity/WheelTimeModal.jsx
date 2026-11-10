// Окно-«счётчик» для записи тренировки — как в приложении-эталоне
// (скриншот Кати от 10.11, экран «Бег»): два барабана — интенсивность
// (Лёгкая/Средняя/Высокая/Максимум) и минуты, под ними живой расчёт
// ккал по формуле MET. «Готово» переносит минуты в форму, а ккал —
// от выбранной интенсивности. С 11.11 (просьба Кати «править ккал
// вручную») цифру можно вписать прямо здесь — чип «править» открывает
// поле с текущим значением, «авто» возвращает расчёт. Вписанное
// применяется как есть, расчёт остаётся подсказкой. Без медпретензий.
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { Check, Pencil, RotateCcw, X } from 'lucide-react-native'
import { INTENSITY_LEVELS, intensityMet, kcalBurned, parseManualKcal } from '@/lib/data/exercises'
import { formatNum } from '@/lib/format'
import { WheelPicker } from './WheelPicker'

const MIN_MAX = 180 // максимум минут в барабане

export function WheelTimeModal({ open, onClose, exercise, weightKg, initialMinutes = 0, onApply }) {
  const [level, setLevel] = useState('mid')
  const [minutes, setMinutes] = useState(30)
  // Ручные ккал: null — автоподсчёт, строка — вписанное в поле.
  // Сырая строка хранится, пока открыто окно правки (можно стереть
  // и набрать заново), вне правки она всегда валидна или null.
  const [manualKcal, setManualKcal] = useState(null)
  const [editingKcal, setEditingKcal] = useState(false)

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
    // Каждое открытие начинается с автоподсчёта: ручная цифра прошлого
    // раза осталась в поле формы, здесь — заново от барабанов
    setManualKcal(null)
    setEditingKcal(false)
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
  const kcalAuto = w > 0 ? kcalBurned(intensityMet(level), w, minutes) : 0
  // Вписанное вручную применяется как есть, расчёт остаётся подсказкой.
  // Невалидное (пусто, 0, мусор) тихо считается авто — форма внизу
  // перепроверит при записи, сюрпризов не будет.
  const manualNum = manualKcal === null ? null : parseManualKcal(manualKcal)
  const isManual = manualNum !== null

  // Войти в правку ккал: в поле сразу подставляем текущую цифру —
  // удобно подправить одну цифру, а не набирать всё заново
  function startEditKcal() {
    setManualKcal(isManual ? String(manualNum) : kcalAuto > 0 ? String(kcalAuto) : '')
    setEditingKcal(true)
  }

  // «ОК»: валидное число остаётся ручным, пусто/мусор — назад к авто
  function confirmKcal() {
    if (parseManualKcal(manualKcal) === null) setManualKcal(null)
    setEditingKcal(false)
  }

  // «авто»: вернуть расчёт по формуле MET
  function resetKcal() {
    setManualKcal(null)
    setEditingKcal(false)
  }

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
            Крути барабаны — калории считаются сами. Свою цифру можно вписать вручную
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

          {/* Ккал: живой расчёт, рядом чип «править» — вписать свою цифру
              (например, с тренажёра); чип «авто» возвращает расчёт */}
          {editingKcal ? (
            <View style={styles.kcalRow}>
              <TextInput
                value={manualKcal ?? ''}
                onChangeText={setManualKcal}
                keyboardType="number-pad"
                maxLength={5}
                autoFocus
                selectTextOnFocus
                placeholder="ккал"
                placeholderTextColor="#8B96B8"
                accessibilityLabel="Калории вручную"
                style={styles.kcalInput}
              />
              <Pressable
                onPress={confirmKcal}
                style={styles.kcalChip}
                accessibilityRole="button"
                accessibilityLabel="Применить ручные калории"
              >
                <Check size={13} color="#C4B5FD" />
                <Text style={styles.kcalChipText}>ОК</Text>
              </Pressable>
              <Pressable
                onPress={resetKcal}
                style={styles.kcalChip}
                accessibilityRole="button"
                accessibilityLabel="Вернуть автоподсчёт калорий"
              >
                <RotateCcw size={13} color="#A7B1D0" />
                <Text style={styles.kcalChipText}>авто</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.kcalCol}>
              <View style={styles.kcalRow}>
                <Text style={styles.kcal} numberOfLines={1}>
                  {isManual
                    ? `${formatNum(manualNum)} ккал · вручную`
                    : w > 0
                      ? `≈ ${formatNum(kcalAuto)} ккал при ${Math.round(w)} кг`
                      : 'Укажи вес в профиле — покажем калории'}
                </Text>
                <Pressable
                  onPress={startEditKcal}
                  style={styles.kcalChip}
                  accessibilityRole="button"
                  accessibilityLabel="Вписать калории вручную"
                >
                  <Pencil size={12} color="#C4B5FD" />
                  <Text style={styles.kcalChipText}>править</Text>
                </Pressable>
                {isManual && (
                  <Pressable
                    onPress={resetKcal}
                    style={styles.kcalChip}
                    accessibilityRole="button"
                    accessibilityLabel="Вернуть автоподсчёт калорий"
                  >
                    <RotateCcw size={12} color="#A7B1D0" />
                    <Text style={styles.kcalChipText}>авто</Text>
                  </Pressable>
                )}
              </View>
              {isManual && w > 0 && Math.abs(manualNum - kcalAuto) > 5 && (
                <Text style={styles.kcalHint} numberOfLines={1}>
                  по расчёту при {Math.round(w)} кг было бы ≈ {formatNum(kcalAuto)} ккал
                </Text>
              )}
            </View>
          )}

          <Pressable
            onPress={() => onApply({ minutes, kcal: isManual ? manualNum : w > 0 ? kcalAuto : null })}
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
  wheels: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  wheelCol: { alignItems: 'center' },
  // Подписи крупнее и светлее — по отзыву Кати 10.11 «не видно подписи»
  wheelLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#A7B1D0',
    marginBottom: 4,
  },
  kcal: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    color: '#C4B5FD',
  },
  kcalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  kcalCol: { alignItems: 'center', gap: 2 },
  kcalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#131E3A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  kcalChipText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    color: '#A7B1D0',
  },
  kcalInput: {
    minWidth: 92,
    borderWidth: 1,
    borderColor: 'rgba(196,181,253,0.35)',
    backgroundColor: '#131E3A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    fontFamily: 'Inter_800ExtraBold',
    color: '#C4B5FD',
  },
  kcalHint: {
    fontSize: 11.5,
    fontFamily: 'Inter_400Regular',
    color: '#8B96B8',
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
