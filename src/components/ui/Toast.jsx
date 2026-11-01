// Минимальные тосты в стиле sonner: провайдер + хук useToast.
// Каждый тост можно закрыть самому: крестиком или свайпом в любую
// сторону — списался и исчез. Автоскрытие через 2,8 с остаётся.
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Animated, PanResponder, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'

const ToastContext = createContext({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

// Один тост: свайп в любую сторону или крестик — закрыть.
// Анимации — только native Animated (transform/opacity).
function ToastItem({ item, onDismiss }) {
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current
  const fade = useRef(new Animated.Value(1)).current
  const closing = useRef(false)

  // Плавно спрятать и убрать из списка
  function close() {
    if (closing.current) return
    closing.current = true
    Animated.parallel([
      Animated.timing(pos, { toValue: { x: 0, y: -26 }, duration: 150, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 0, duration: 150, useNativeDriver: true }),
    ]).start(() => onDismiss(item.id))
  }

  // Свайп: тянем свободно, отпустил далеко — тост улетает в сторону
  // свайпа, близко — мягко возвращается на место
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 10 || Math.abs(g.dy) > 10,
      onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }]),
      onPanResponderRelease: (_, g) => {
        const far = Math.abs(g.dx) > 70 || g.dy < -48 || g.dy > 90
        if (far && !closing.current) {
          closing.current = true
          Animated.timing(pos, {
            toValue: { x: g.dx * 8, y: g.dy * 8 },
            duration: 180,
            useNativeDriver: true,
          }).start(() => onDismiss(item.id))
        } else {
          Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: true }).start()
        }
      },
    })
  ).current

  return (
    <Animated.View
      style={{ transform: pos.getTranslateTransform(), opacity: fade }}
      {...pan.panHandlers}
    >
      <View className="flex-row items-start gap-2 rounded-2xl border border-bear-line bg-[#1A2647] px-4 py-3 shadow-lg shadow-black/40">
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-[13px] text-bear-text">{item.title}</Text>
          {item.description ? (
            <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">{item.description}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel="Закрыть уведомление"
          hitSlop={8}
          className="shrink-0 rounded-full bg-white/5 p-1 active:opacity-70"
        >
          <X size={13} color="#8B96B8" />
        </Pressable>
      </View>
    </Animated.View>
  )
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const toast = useCallback(({ title, description }) => {
    const id = ++seq.current
    setItems((list) => [...list.slice(-2), { id, title, description }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2800)
  }, [])

  // Ручное закрытие (крестик/свайп) — просто убираем из списка
  const dismiss = useCallback((id) => {
    setItems((list) => list.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* box-none: сам слой касания не ловит, а тосты внутри — кликабельны
          (раньше стоял pointerEvents="none" и крестик был бы мёртвым) */}
      <SafeAreaView
        pointerEvents="box-none"
        edges={['bottom']}
        className="absolute inset-x-0 bottom-0 z-50 items-center px-4"
      >
        <View pointerEvents="box-none" className="w-full max-w-[380px] gap-2 pb-20">
          {items.map((t) => (
            <ToastItem key={t.id} item={t} onDismiss={dismiss} />
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  )
}
