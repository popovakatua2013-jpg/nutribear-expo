// Легенда категорий ИМТ: пять строк с ромбиком, диапазоном и названием.
// Текущая категория подсвечивается рамкой, как на макете.

import { Text, View } from 'react-native'
import { BMI_CATEGORIES, bmiCategory } from '@/lib/data/bmi'

export function BmiLegend({ bmi }) {
  const active = bmiCategory(bmi).id

  return (
    <View className="gap-2" accessibilityLabel="Категории ИМТ">
      {BMI_CATEGORIES.map((cat) => {
        const isActive = cat.id === active
        return (
          <View
            key={cat.id}
            className={`flex-row items-center gap-2.5 rounded-xl border px-3 py-2 ${
              isActive
                ? 'border-[#5b7fff]/70 bg-[#5b7fff]/10'
                : 'border-white/5 bg-[#0d1530]/70'
            }`}
          >
            <View
              className="h-2 w-2 shrink-0 rotate-45 rounded-[2px]"
              style={{ backgroundColor: cat.color }}
            />
            <Text className="shrink-0 font-semibold text-[12px] text-bear-soft">
              {cat.range}
            </Text>
            <Text
              numberOfLines={1}
              className={`min-w-0 flex-1 text-right text-[12px] ${
                isActive ? 'font-bold text-white' : 'font-sans text-bear-sub'
              }`}
            >
              {cat.label}
            </Text>
          </View>
        )
      })}
    </View>
  )
}
