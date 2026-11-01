// Легенда категорий ИМТ 1-в-1 с макетом: вертикальный столбик справа
// от кольца, каждая позиция — ОДНА строка: точка · название · диапазон
// прижат вправо (диапазоны чуть крупнее подписей, как на макете).
// Текущая категория — белым и жирным, её точка светится.

import { Text, View } from 'react-native'
import { bmiCategory } from '@/lib/data/bmi'

const ROWS = [
  { ids: ['norm'], label: 'Норма', range: '18,5 – 24,9', color: '#38BDF8' },
  { ids: ['over'], label: 'Лишний вес', range: '25 – 29,9', color: '#A855F7' },
  { ids: ['obese1', 'obese2'], label: 'Ожирение', range: '≥ 30', color: '#F97316' },
]

export function BmiLegend({ bmi }) {
  const active = bmiCategory(bmi).id

  return (
    <View
      className="gap-[7px]"
      accessibilityLabel="Категории ИМТ: норма, лишний вес, ожирение"
    >
      {ROWS.map((row) => {
        const isActive = row.ids.includes(active)
        return (
          <View key={row.label} className="flex-row items-center gap-[5px]">
            <View
              className="h-[8px] w-[8px] shrink-0 rounded-full"
              style={{
                backgroundColor: row.color,
                shadowColor: row.color,
                shadowOpacity: isActive ? 0.95 : 0.4,
                shadowRadius: 6,
              }}
            />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              className={`min-w-0 flex-1 text-[9.5px] leading-tight ${
                isActive ? 'font-bold text-white' : 'font-sans text-bear-sub'
              }`}
            >
              {row.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              className={`shrink-0 text-[10px] leading-tight ${
                isActive ? 'font-bold text-white' : 'font-sans text-[#D8D2EE]'
              }`}
            >
              {row.range}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
