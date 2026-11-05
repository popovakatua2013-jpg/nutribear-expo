// Универсальный переключатель-«пилюли»: периоды (7/30/90), показатели
// (шаги/калории/…), минуты в тренировках. Раньше этот паттерн был
// скопирован в четырёх местах с чуть разными отступами и цветами.
// Активная пилюля — градиент (полный фирменный или в цвет показателя,
// если у пункта задан color), неактивная — серая подложка.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const BRAND = ['#4D7CFE', '#8B5CF6', '#A45BFF']

export function Pills({ items, value, onChange, size = 'sm', accessibilityLabel }) {
  const pad =
    size === 'sm' ? 'px-2.5 py-1.5 text-[13px]' : 'px-3 py-1.5 text-[14px]'

  return (
    <View className="flex-row flex-wrap gap-1.5" accessibilityLabel={accessibilityLabel}>
      {items.map((it) => {
        const active = it.id === value
        const pill = (
          <Text className={`${pad} font-semibold ${active ? 'text-white' : 'text-bear-dim'}`}>
            {it.label}
          </Text>
        )
        return (
          <Pressable
            key={it.id}
            onPress={() => onChange(it.id)}
            accessibilityLabel={`${accessibilityLabel ? accessibilityLabel + ' ' : ''}${it.label}`}
            accessibilityRole="button"
            className="overflow-hidden rounded-full"
          >
            {active ? (
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={it.color ? [it.color, `${it.color}99`] : BRAND}
              >
                {pill}
              </LinearGradient>
            ) : (
              <View className="bg-white/5">{pill}</View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
