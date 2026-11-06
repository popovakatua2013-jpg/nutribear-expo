// Переключатель приёма пищи в модалке — 4 равные пилюли одной строкой
// (как на референс-скриншоте окна «Добавить приём пищи»): активная —
// сплошная фиолетовая, остальные — тёмные с тонкой обводкой.
// «Перекус» вместо длинного «Перекус/Полдник» (короткое имя из
// meals.js); если строка не влезает на узком экране — текст сжимается,
// а не переносится на вторую строку.

import { Pressable, Text, View } from 'react-native'

export function MealTabs({ meals, mealId, onChange }) {
  return (
    <View className="mt-3 flex-row gap-1.5" accessibilityRole="tablist">
      {meals.map((m) => {
        const active = m.id === mealId
        return (
          <Pressable
            key={m.id}
            onPress={() => onChange(m.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            className={`min-w-0 flex-1 items-center rounded-xl px-1 py-2.5 ${
              active ? '' : 'border border-white/[0.06] bg-white/[0.05]'
            }`}
            style={active ? { backgroundColor: '#7B6CF6' } : null}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              className={`font-semibold text-[15px] ${active ? 'text-white' : 'text-bear-sub'}`}
            >
              {m.short || m.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
