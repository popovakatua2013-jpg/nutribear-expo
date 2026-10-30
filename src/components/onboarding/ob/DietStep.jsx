// Этап 5. Пищевые привычки: тип питания, аллергии и исключения,
// удобное число приёмов пищи, готовка дома или еда вне дома.

import { Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { OptionGrid, PillRow, ChipMulti } from './ObOptions'
import { DIET_TYPES, ALLERGENS, MEALS_DAY_OPTIONS, COOKING_OPTIONS } from '@/lib/data/onboarding-options'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const ALLERGEN_CHIPS = ALLERGENS.map((label) => ({
  id: label.toLowerCase(),
  label,
}))

export function DietStep({ onNext, onBack }) {
  const a = useOnboardingStore((s) => s.answers)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  function toggleAllergy(id) {
    patch({
      allergies: a.allergies.includes(id)
        ? a.allergies.filter((x) => x !== id)
        : [...a.allergies, id],
    })
  }

  return (
    <ObShell sub="Шаг 5 из 12" title="Пищевые привычки" onBack={onBack} onNext={onNext}>
      <View className="gap-5">
        <View>
          <Text className="mb-2 font-semibold text-[12px] text-bear-sub2">Тип питания</Text>
          <OptionGrid
            options={DIET_TYPES}
            value={a.dietType}
            onChange={(id) => patch({ dietType: id })}
            columns={2}
          />
        </View>
        <View>
          <Text className="mb-2 font-semibold text-[12px] text-bear-sub2">
            Аллергии и исключения
          </Text>
          <ChipMulti options={ALLERGEN_CHIPS} values={a.allergies} onToggle={toggleAllergy} />
        </View>
        <PillRow
          label="Сколько приёмов пищи в день удобно?"
          options={MEALS_DAY_OPTIONS}
          value={a.mealsDay}
          onChange={(v) => patch({ mealsDay: v })}
        />
        <PillRow
          label="Как чаще питаетесь?"
          options={COOKING_OPTIONS}
          value={a.cooking}
          onChange={(v) => patch({ cooking: v })}
        />
      </View>
    </ObShell>
  )
}
