// Переключатель приёма пищи в модалке: основные + перекусы пользователя

import { Pressable, Text, View } from 'react-native'

export function MealTabs({ meals, mealId, onChange }) {
  return (
    <View className="mt-3 flex-row flex-wrap gap-1.5" accessibilityRole="tablist">
      {meals.map((m) => {
        const active = m.id === mealId
        return (
          <Pressable
            key={m.id}
            onPress={() => onChange(m.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`rounded-xl px-2.5 py-2 ${active ? '' : 'bg-white/5'}`}
            style={active ? { backgroundColor: '#7B6CF6' } : null}
          >
            <Text
              className={`font-semibold text-[11px] ${active ? 'text-white' : 'text-bear-sub'}`}
            >
              {m.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
