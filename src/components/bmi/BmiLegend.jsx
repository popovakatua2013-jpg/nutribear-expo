// Легенда категорий ИМТ: вертикальный столбик справа от кольца,
// каждая позиция — строка «точка · название · диапазон» в капсуле.
// Активная категория — капсула-подсветка темы, её точка светится.
// Тап по строке открывает карточку с пояснением
// по этой категории (onRowPress получает id категории строки).
// Правка Кати 25.11 («вкладка тело не соответствует темам»): раньше
// названия/диапазоны были светло-фиолетовыми (#E7E3F8/#CBC4E8) и белыми —
// на светлой «Кремовой» строки пропадали; точки не совпадали с бейджем
// кольца — теперь цвета категорий те же, что в lib/data/bmi (единая
// семантическая шкала жёлтый/зелёный/оранжевый/красный)

import { Pressable, Text, View } from 'react-native'
import { bmiCategory, BMI_CATEGORIES } from '@/lib/data/bmi'
import { useThemeColors } from '@/lib/use-theme'

// Цвета строк — те же, что у бейджа кольца (bmiCategory.color):
// norm → зелёный, over → оранжевый, obese1/2 → красные
const catColor = (ids) => BMI_CATEGORIES.find((c) => c.id === ids[0])?.color || '#4ade80'

const ROWS = [
  { ids: ['norm'], label: 'Норма', range: '18.5 – 24.9' },
  { ids: ['over'], label: 'Лишний вес', range: '25 – 29.9' },
  { ids: ['obese1', 'obese2'], label: 'Ожирение', range: '≥ 30' },
]

export function BmiLegend({ bmi, onRowPress }) {
  const themeColors = useThemeColors()
  const active = bmiCategory(bmi).id

  return (
    <View
      className="gap-[7px]"
      accessibilityLabel="Категории ИМТ: норма, лишний вес, ожирение"
    >
      {ROWS.map((row) => {
        const isActive = row.ids.includes(active)
        const rowColor = catColor(row.ids)
        // «Ожирение» объединяет две категории: если пользователь в одной
        // из них — пояснение показываем по его категории, иначе по первой
        const catId = isActive ? active : row.ids[0]
        return (
          <Pressable
            key={row.label}
            onPress={() => onRowPress?.(catId)}
            accessibilityRole="button"
            accessibilityLabel={`Категория «${row.label}» (${row.range}) — открыть пояснение и рекомендации`}
            className="flex-row items-center gap-[7px] rounded-full px-2.5 py-[6px] active:opacity-70"
            style={{
              // Активная строка — капсула цвета темы;
              // у остальных прозрачная рамка той же толщины, чтобы строки
              // не прыгали при переключении категории
              backgroundColor: isActive ? themeColors.bodyLine : 'transparent',
              borderColor: isActive ? themeColors.bodyLine : 'transparent',
              borderWidth: 1,
            }}
          >
            <View
              className="h-[10px] w-[10px] shrink-0 rounded-full"
              style={{
                backgroundColor: rowColor,
                shadowColor: rowColor,
                shadowOpacity: isActive ? 0.95 : 0.4,
                shadowRadius: 6,
              }}
            />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              className={`min-w-0 flex-1 text-[16px] leading-tight ${
                isActive ? 'font-bold text-bear-text' : 'font-semibold text-bear-soft'
              }`}
            >
              {row.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              className={`shrink-0 text-[16.5px] leading-tight ${
                isActive ? 'font-bold text-bear-text' : 'font-sans text-bear-dim'
              }`}
            >
              {row.range}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
