// Переключатель приёма пищи в модалке — всегда одной строкой:
// «Перекус» вместо длинного «Перекус/Полдник» (короткое имя из meals.js),
// а если строка всё же не влезает на узком экране — горизонтальный
// скролл вместо переноса на вторую строку.

import { Pressable, ScrollView, Text, View } from 'react-native'

export function MealTabs({ meals, mealId, onChange }) {
  return (
    <View className="mt-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ columnGap: 6 }}
        accessibilityRole="tablist"
      >
        {meals.map((m) => {
          const active = m.id === mealId
          return (
            <Pressable
              key={m.id}
              onPress={() => onChange(m.id)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className={`rounded-xl px-3 py-2 ${active ? '' : 'bg-white/5'}`}
              style={active ? { backgroundColor: '#7B6CF6' } : null}
            >
              <Text
                numberOfLines={1}
                className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-bear-sub'}`}
              >
                {m.short || m.name}
              </Text>
            </Pressable>
          )
        })}
      </ScrollView>
    </View>
  )
}
