// Выбор граммовки: поле ввода + быстрые кнопки (50/100/150/200/250 г).
// Для сыпучих продуктов (сахар, мука, крупы, хлопья…) — пилюли ложек
// «1 ч.л. / 2 ч.л. / 1 ст.л. / 2 ст.л.» (просьба Кати 28.11: «в 1 ч.л.
// сахара ?кал?»): тап ставит граммы одной/двух ложек с горкой
// (spoons.js → foods.js даёт tsp/tbsp), калории пересчитываются
// сами из обычных КБЖУ на 100 г. Под пилюлями — подсказка, сколько
// это граммов и ккал.

import { Text, TextInput, View } from 'react-native'
import { QUICK_GRAMS } from '@/lib/data/foods'
import { spoonsFor } from '@/lib/data/spoons'
import { kcalForPortion } from '@/lib/data/foods'
import { formatNum } from '@/lib/format'
import { useThemeColors } from '@/lib/use-theme'

// Варианты ложек: подпись × множитель граммов одной ложки
const SPOON_OPTIONS = [
  { label: '1 ч.л.', mult: 1 },
  { label: '2 ч.л.', mult: 2 },
  { label: '1 ст.л.', tbsp: true, mult: 1 },
  { label: '2 ст.л.', tbsp: true, mult: 2 },
]

export function GramsPicker({ grams, onChange, food }) {
  const themeColors = useThemeColors()
  const gramsNum = Math.round(Number(grams) || 0)
  // Ложки: граммы одной ч.л./ст.л. для этого продукта (сахар 8/25,
  // мука 8/25, хлопья 6/12…) — null у продуктов, где ложки неуместны
  const sp = spoonsFor(food)

  return (
    <View>
      <Text className="font-medium text-[16.5px] text-bear-sub">Сколько съедите (граммы)?</Text>
      <View className="mt-1.5 flex-row items-center gap-2">
        <TextInput
          accessibilityLabel="Граммовка"
          keyboardType="number-pad"
          maxLength={4}
          value={String(grams)}
          onChangeText={onChange}
          className="flex-1 rounded-2xl border border-bear-line bg-bear-overlay px-3 py-2.5 text-center font-bold text-[24px] text-bear-text"
        />
        <Text className="font-sans text-[22px] text-bear-sub">г</Text>
      </View>

      {/* Ложки для сыпучих: тап — записать одну/две чайные или столовые */}
      {sp ? (
        <>
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {SPOON_OPTIONS.map((o) => {
              const g = sp[o.tbsp ? 'tbsp' : 'tsp'] * o.mult
              return (
                <Text
                  key={o.label}
                  onPress={() => onChange(String(g))}
                  accessibilityRole="button"
                  accessibilityLabel={`${o.label} — примерно ${g} граммов`}
                  className={`rounded-full px-3 py-1.5 font-semibold text-[16px] ${
                    gramsNum === g ? '' : 'bg-bear-overlay text-bear-sub'
                  }`}
                  style={
                    gramsNum === g
                      ? { backgroundColor: themeColors.accent, color: themeColors.accentOn }
                      : null
                  }
                >
                  {o.label}
                </Text>
              )
            })}
          </View>
          {/* Сколько в ложке граммов и ккал: «1 ч.л. ≈ 8 г · ≈31 ккал» */}
          <Text
            maxFontSizeMultiplier={1.2}
            className="mt-1.5 font-sans text-[14.5px] text-bear-dim"
          >
            {`1 ч.л. ≈ ${sp.tsp} г · ≈${formatNum(kcalForPortion(food, sp.tsp))} ккал · 1 ст.л. ≈ ${sp.tbsp} г · ≈${formatNum(kcalForPortion(food, sp.tbsp))} ккал`}
          </Text>
        </>
      ) : null}

      <View className="mt-2 flex-row flex-wrap gap-1.5">
        {QUICK_GRAMS.map((g) => (
          <PressPill key={g} g={g} active={gramsNum === g} onChange={onChange} />
        ))}
      </View>
    </View>
  )
}

function PressPill({ g, active, onChange }) {
  const themeColors = useThemeColors()
  return (
    <Text
      onPress={() => onChange(String(g))}
      accessibilityRole="button"
      className={`rounded-full px-3 py-1.5 font-semibold text-[16px] ${
        active ? '' : 'bg-bear-overlay text-bear-sub'
      }`}
      style={active ? { backgroundColor: themeColors.accent, color: themeColors.accentOn } : null}
    >
      {g} г
    </Text>
  )
}
