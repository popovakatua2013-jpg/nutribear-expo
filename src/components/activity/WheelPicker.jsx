// Колёсный выбор (wheel picker) — «барабан», как в приложениях-эталонах:
// центральная строка крупная и яркая на фиолетовой плашке, соседние
// приглушены, докручивается до значения (snapToInterval). Без новых
// зависимостей: обычный ScrollView. Просьба Кати 10.11: «такой же счётчик
// выбора интенсивности и времени, как в DietAI».
//
// Правка 10.11 по скрину Кати («много пустого места, не видно подписи»):
// 1) окно сжато с пяти строк до трёх — барабан стал компактным;
// 2) первый скролл к выбранному значению стал надёжным: на Android
//    scrollTo сразу после монтирования терялся (контент ещё не измерен),
//    плашка оставалась на верхней строке, а выбранное значение уезжало
//    вниз без рамки. Теперь скролл повторяется, когда контент измерился;
// 3) медленный драг без инерции тоже докручивается до строки — раньше
//    барабан мог застрять между строками без подсветки.
import { useCallback, useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'

const ITEM_H = 40 // высота одной строки барабана
const VISIBLE = 3 // сколько строк видно в окне
const SIDE = (VISIBLE - 1) / 2 // строк над/под центральной
export const WHEEL_H = ITEM_H * VISIBLE

export function WheelPicker({ data, value, onChange, width = 128, accessibilityLabel }) {
  const listRef = useRef(null)
  // Скролл, который ещё нужно применить: на Android первый scrollTo
  // после монтирования теряется (контент ещё не измерен), повторяем
  // его в onContentSizeChange
  const pendingY = useRef(null)
  // Последнее значение, выставленное самим барабаном (тап/докрутка):
  // чтобы не прыгать, когда событие onChange вернуло его же в пропс
  const lastSet = useRef(undefined)
  // Таймер докрутки после медленного драга без инерции
  const settleTimer = useRef(null)
  const indexOf = useCallback(
    (v) => {
      const i = data.findIndex((d) => d.value === v)
      return i < 0 ? 0 : i
    },
    [data],
  )
  // индекс центральной строки — для подсветки активного значения
  const [active, setActive] = useState(() => indexOf(value))

  const goTo = useCallback(
    (i, animated) => {
      setActive(i)
      const y = i * ITEM_H
      pendingY.current = y
      lastSet.current = data[i]?.value
      listRef.current?.scrollTo({ y, animated })
    },
    [data],
  )

  // Значение изменилось извне (открытие окна) — мгновенно ставим нужную
  // строку в центр; изменение от самого барабана пропускаем
  useEffect(() => {
    if (value === lastSet.current) return
    goTo(indexOf(value), false)
  }, [value, indexOf, goTo])

  // Контент измерился (в т.ч. на первом монтировании) — применяем
  // отложенный скролл, если обычный scrollTo уже не сработал
  const onContentSize = () => {
    if (pendingY.current == null) return
    listRef.current?.scrollTo({ y: pendingY.current, animated: false })
    pendingY.current = null
  }

  useEffect(
    () => () => {
      if (settleTimer.current) clearTimeout(settleTimer.current)
    },
    [],
  )

  // Барабан остановился — берём строку у центра и докручиваем до неё,
  // если остановились между строками
  const settle = (y) => {
    const i = Math.max(0, Math.min(data.length - 1, Math.round(y / ITEM_H)))
    setActive(i)
    if (Math.abs(i * ITEM_H - y) > 1) {
      listRef.current?.scrollTo({ y: i * ITEM_H, animated: true })
    }
    const v = data[i]?.value
    if (v !== undefined && v !== value) onChange(v)
  }

  const onEndDrag = (e) => {
    // Медленный драг без инерции: momentum-события не будет — докручиваем
    // сами короткой паузой; если инерция пойдёт, обработчик ниже отменит
    const y = e.nativeEvent.contentOffset.y
    if (settleTimer.current) clearTimeout(settleTimer.current)
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      settle(y)
    }, 150)
  }

  const onMomentumEnd = (e) => {
    if (settleTimer.current) {
      clearTimeout(settleTimer.current)
      settleTimer.current = null
    }
    settle(e.nativeEvent.contentOffset.y)
  }

  // Тап по строке — докрутить до неё
  const tap = (i) => {
    goTo(i, true)
    const v = data[i]?.value
    if (v !== undefined && v !== value) onChange(v)
  }

  return (
    <View style={[styles.wrap, { width, height: WHEEL_H }]} accessibilityLabel={accessibilityLabel}>
      <ScrollView
        ref={listRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        snapToInterval={ITEM_H}
        snapToAlignment="start"
        decelerationRate="fast"
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        onContentSizeChange={onContentSize}
        onScrollBeginDrag={() => {
          if (settleTimer.current) {
            clearTimeout(settleTimer.current)
            settleTimer.current = null
          }
        }}
        onScrollEndDrag={onEndDrag}
        onMomentumScrollEnd={onMomentumEnd}
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
  content: { paddingVertical: ITEM_H * SIDE },
  item: { height: ITEM_H, alignItems: 'center', justifyContent: 'center' },
  halo: {
    position: 'absolute',
    top: ITEM_H * SIDE,
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
