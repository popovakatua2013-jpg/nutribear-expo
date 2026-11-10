// Колёсный выбор (wheel picker) — «барабан», как в приложениях-эталонах:
// центральная строка крупная и яркая на фиолетовой плашке, соседние
// приглушены, докручивается до значения (snapToInterval). Без новых
// зависимостей: обычный ScrollView. Просьба Кати 10.11: «такой же счётчик
// выбора интенсивности и времени, как в DietAI».
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

const ITEM_H = 40 // высота одной строки барабана
const VISIBLE = 5 // сколько строк видно в окне
export const WHEEL_H = ITEM_H * VISIBLE

export function WheelPicker({ data, value, onChange, width = 128, accessibilityLabel }) {
  const listRef = useRef(null)
  const indexOf = useCallback(
    (v) => {
      const i = data.findIndex((d) => d.value === v)
      return i < 0 ? 0 : i
    },
    [data],
  )
  // индекс центральной строки — для подсветки активного значения
  const [active, setActive] = useState(() => indexOf(value))

  // Значение изменилось извне (открытие окна, тап по строке) —
  // мгновенно ставим нужную строку в центр (без анимации — события
  // momentum не срабатывают, петли обратной связи нет)
  useEffect(() => {
    const i = indexOf(value)
    setActive(i)
    listRef.current?.scrollTo({ y: i * ITEM_H, animated: false })
  }, [value, indexOf])

  // Барабан остановился — берём строку у центра
  const settle = (e) => {
    const y = e.nativeEvent.contentOffset.y
    const i = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_H)))
    setActive(i)
    const v = data[i]?.value
    if (v !== undefined && v !== value) onChange(v)
  }

  // Тап по строке — докрутить до неё
  const tap = (i) => {
    setActive(i)
    listRef.current?.scrollTo({ y: i * ITEM_H, animated: true })
    const v = data[i]?.value
    if (v !== undefined && v !== value) onChange(v)
  }

  return (
    <View style={[styles.wrap, { width, height: WHEEL_H }]} accessibilityLabel={accessibilityLabel}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={settle}
      >
        {data.map((d, i) => {
          const dist = Math.abs(i - active)
          return (
            <Pressable
              key={String(d.value)}
              onPress={() => tap(i)}
              style={styles.item}
              accessibilityRole="button"
              accessibilityLabel={d.label}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.text,
                  dist === 0 && styles.textOn,
                  dist === 1 && styles.textNear,
                  dist >= 2 && styles.textFar,
                ]}
              >
                {d.label}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
      {/* Фиолетовая плашка по центру — «выбранная строка» (поверх текста,
          тапы проходят сквозь неё к строкам) */}
      <View style={styles.halo} pointerEvents="none" />
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  // flex:1 — занять всю высоту обёртки (у обёртки фиксированная высота),
  // иначе ScrollView растёт по контенту и вылезает за окно барабана
  scroll: { flex: 1, flexGrow: 1 },
  content: { paddingVertical: ITEM_H * 2 },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    top: ITEM_H * 2,
    left: 4,
    right: 4,
    height: ITEM_H,
    borderRadius: 12,
    backgroundColor: 'rgba(123,108,246,0.16)',
    borderColor: 'rgba(167,139,250,0.45)',
    borderWidth: 1,
  },
  text: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: '#6E799C',
  },
  textNear: { fontSize: 14.5, color: '#AEB9D9' },
  textOn: {
    fontSize: 16.5,
    fontWeight: '700',
    fontFamily: 'Inter_600SemiBold',
    color: '#EEF2FB',
  },
  textFar: { fontSize: 12.5, color: '#5F6A8E' },
})
