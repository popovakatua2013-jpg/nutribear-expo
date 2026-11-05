// Тонкая полоска «Нет сети» поверх ВСЕХ экранов (а не только в чате):
// пользователь сразу видит, почему ИИ отвечает встроенными подсказками.
// Дневник, отчёты и вода работают офлайн — об этом полоска и говорит.
// pointerEvents="none" — полоска не перекрывает кнопки под собой.

import { Text, View } from 'react-native'
import { WifiOff } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOffline } from '@/lib/useOffline'

export function OfflineBar() {
  const offline = useOffline()
  const insets = useSafeAreaInsets()
  if (!offline) return null

  return (
    <View
      accessibilityLabel="Нет сети"
      pointerEvents="none"
      className="absolute left-4 right-4 z-50 flex-row items-center justify-center gap-1.5 rounded-full bg-black/75 px-3.5 py-1.5"
      style={{ top: insets.top + 6, elevation: 10 }}
    >
      <WifiOff size={14} color="#8B96B8" />
      <Text maxFontSizeMultiplier={1.2} className="font-sans text-[12.5px] text-[#aeb9d9]">
        Нет сети — дневник работает, ИИ отключён
      </Text>
    </View>
  )
}
