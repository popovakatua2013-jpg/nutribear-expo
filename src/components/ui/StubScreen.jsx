// Экран-заглушка раздела (переносится в следующей сборке Expo-версии)
import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function StubScreen({ title, emoji }) {
  const insets = useSafeAreaInsets()

  return (
    <View
      className="flex-1 items-center justify-center gap-3 bg-bear-bg px-8"
      style={{ paddingTop: insets.top }}
    >
      <Text className="text-[52px]">{emoji}</Text>
      <Text className="font-bold text-[19px] text-bear-text">{title}</Text>
      <Text className="text-center font-sans text-[13px] leading-relaxed text-bear-sub">
        Раздел переносится из веб-версии и появится в Expo-приложении в следующей сборке.
      </Text>
    </View>
  )
}
