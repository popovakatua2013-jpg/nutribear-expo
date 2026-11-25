// Легенда категорий ИМТ: вертикальный столбик справа от кольца,
// каждая позиция — строка «точка · название · диапазон» в капсуле.
// Активная категория — капсула-подсветка темы, её точка светится.
// Тап по строке открывает карточку с пояснением
// по этой категории (onRowPress получает id категории строки).
//
// Правка Кати 25.11 (третий круг): «обозначения норма/лишний вес/
// ожирение подогнать по цвету с кольцом» — теперь вся строка (точка,
// название, диапазон) красится тоном категории из СЕМЕЙСТВА темы
// (bmiTones) — ровно тем же цветом, каким её сегмент закрашен на
// кольце ИМТ: в «Кремовой» это янтарь/жжёная терракота/терракота,
// в «Классике» — зелёный/оранжевый/розовый, в неонах — неон + жёлтый/
// розовая семантика. Раньше название и диапазон были серыми текстами
// темы, а точки — фиксированными цветами lib/data/bmi, и рядом с
// янтарным кольцом легенда читалась «чужой».

import { Pressable, Text, View } from 'react-native'
import { bmiCategory } from '@/lib/data/bmi'
import { bmiTones, withAlpha } from '@/lib/themes'
import { useThemeColors } from '@/lib/use-theme'

// Ключ тона для строки: «Ожирение» объединяет две категории — обе
// красятся «плохо» (obese1), как их единый красный сегмент кольца
const TONE_KEY = { norm: 'norm', over: 'over', obese1: 'obese1', obese2: 'obese1' }

const ROWS = [
  { ids: ['norm'], label: 'Норма', range: '18.5 – 24.9' },
  { ids: ['over'], label: 'Лишний вес', range: '25 – 29.9' },
  { ids: ['obese1', 'obese2'], label: 'Ожирение', range: '≥ 30' },
]

export function BmiLegend({ bmi, onRowPress }) {
  const themeColors = useThemeColors()
  const tones = bmiTones(themeColors)
  const active = bmiCategory(bmi).id

  return (
    <View
      className="gap-[7px]"
      accessibilityLabel="Категории ИМТ: норма, лишний вес, ожирение"
    >
      {ROWS.map((row) => {
        const isActive = row.ids.includes(active)
        // Тон строки = тон её сегмента на кольце (bmiTones)
        const tone = tones[TONE_KEY[row.ids[0]]] || tones.norm
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
              // Активная строка — капсула-подсветка темы;
              // у остальных прозрачная рамка той же толщины, чтобы строки
              // не прыгали при переключении категории
              backgroundColor: isActive ? themeColors.accentFaint2 : 'transparent',
              borderColor: isActive ? themeColors.accentBorder : 'transparent',
              borderWidth: 1,
            }}
          >
            <View
              className="h-[10px] w-[10px] shrink-0 rounded-full"
              style={{
                backgroundColor: tone,
                shadowColor: tone,
                shadowOpacity: isActive ? 0.95 : 0.4,
                shadowRadius: 6,
              }}
            />
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              className={`min-w-0 flex-1 text-[16px] leading-tight ${
                isActive ? 'font-bold' : 'font-semibold'
              }`}
              // Название — цветом сегмента на кольце: активная категория
              // полным тоном, остальные — приглушённым (различимы, но в цвете)
              style={{ color: isActive ? tone : withAlpha(tone, 0.66) }}
            >
              {row.label}
            </Text>
            <Text
              maxFontSizeMultiplier={1.1}
              numberOfLines={1}
              className={`shrink-0 text-[16.5px] leading-tight ${
                isActive ? 'font-bold' : 'font-sans'
              }`}
              style={{ color: isActive ? themeColors.text : themeColors.dim }}
            >
              {row.range}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
