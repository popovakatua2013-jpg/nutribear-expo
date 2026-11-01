// Легенда категорий ИМТ: вертикальный столбик справа от кольца,
// каждая позиция — строка «точка · название · диапазон» в капсуле.
// Активная категория — фиолетовая капсула-подсветка, белым и жирным,
// её точка светится.

import { Text, View } from 'react-native'
import { bmiCategory } from '@/lib/data/bmi'

const ROWS = [
  { ids: ['norm'], label: 'Норма', range: '18.5 – 24.9', color: '#38BDF8' },
  { ids: ['over'], label: 'Лишний вес', range: '25 – 29.9', color: '#A855F7' },
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
          <View
            key={row.label}
            className="flex-row items-center gap-[7px] rounded-full px-2.5 py-[6px]"
            style={{
              // Активная строка — лёгкая фиолетовая капсула;
              // у остальных прозрачная рамка той же толщины, чтобы строки
              // не прыгали при переключении категории
              backgroundColor: isActive ? 'rgba(168,85,247,0.16)' : 'transparent',
              borderColor: isActive ? 'rgba(168,85,247,0.35)' : 'transparent',
              borderWidth: 1,
            }}
          >
            <View
              className="h-[10px] w-[10px] shrink-0 rounded-full"
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
              className={`min-w-0 flex-1 text-[11.5px] leading-tight ${
                isActive ? 'font-bold text-white' : 'font-semibold text-[#E7E3F8]'
              }`}
            >
              {row.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              className={`shrink-0 text-[12px] leading-tight ${
                isActive ? 'font-bold text-white' : 'font-sans text-[#CBC4E8]'
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
