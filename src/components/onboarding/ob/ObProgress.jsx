// Полоса прогресса онбординга: тонкая градиентная линия по числу шагов.

import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export function ObProgress({ current, total }) {
  const pct = Math.round(((current + 1) / total) * 100)
  return (
    <View className="pt-3" accessibilityLabel={`Шаг ${current + 1} из ${total}`}>
      <View className="h-1.5 w-full overflow-hidden rounded-full bg-white/5">
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          colors={['#4D7CFE', '#A45BFF']}
          style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
        />
      </View>
    </View>
  )
}
