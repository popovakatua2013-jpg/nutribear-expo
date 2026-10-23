// Минимальные тосты в стиле sonner: провайдер + хук useToast
import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const ToastContext = createContext({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const seq = useRef(0)

  const toast = useCallback(({ title, description }) => {
    const id = ++seq.current
    setItems((list) => [...list.slice(-2), { id, title, description }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 2800)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <SafeAreaView
        pointerEvents="none"
        edges={['bottom']}
        className="absolute inset-x-0 bottom-0 z-50 items-center px-4"
      >
        <View className="w-full max-w-[380px] gap-2 pb-20">
          {items.map((t) => (
            <View
              key={t.id}
              className="rounded-2xl border border-bear-line bg-[#1A2647] px-4 py-3 shadow-lg shadow-black/40"
            >
              <Text className="font-semibold text-[13px] text-bear-text">{t.title}</Text>
              {t.description ? (
                <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">{t.description}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </ToastContext.Provider>
  )
}
