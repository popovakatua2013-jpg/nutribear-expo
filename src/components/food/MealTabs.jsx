// Переключатель приёма пищи в модалке — 4 равные пилюли одной строкой
// (как на референс-скриншоте окна «Добавить приём пищи»): активная —
// сплошная фиолетовая, остальные — тёмные с тонкой обводкой.
// «Перекус» вместо длинного «Перекус/Полдник» (короткое имя из
// meals.js); если строка не влезает на узком экране — текст сжимается,
// а не переносится на вторую строку.
// Пятая пилюля (свой перекус «Перекус 2» — окно открыто прямо в него,
// отзыв Кати: «Перекус 2 встаёт криво») включается плотный режим: все
// пилюли одинаково чуть мельче — строка остаётся ровной, без «кривых»
// сжатых текстов разного размера.

import { Pressable, Text, View } from 'react-native'

export function MealTabs({ meals, mealId, onChange }) {
  // Плотный режим: 5+ пилюль — текст и отступы чуть меньше, но ОДИНАКОВЫЕ
  const dense = meals.length > 4

  return (
    <View
      className={`mt-3 flex-row ${dense ? 'gap-1' : 'gap-1.5'}`}
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
            className={`min-w-0 flex-1 items-center rounded-xl ${dense ? 'px-0.5 py-2' : 'px-1 py-2.5'} ${
              active ? '' : 'border border-white/[0.06] bg-white/[0.05]'
            }`}
            style={active ? { backgroundColor: '#7B6CF6' } : null}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
              className={`font-semibold ${dense ? 'text-[13px]' : 'text-[15px]'} ${
                active ? 'text-white' : 'text-bear-sub'
              }`}
            >
              {m.short || m.name}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
