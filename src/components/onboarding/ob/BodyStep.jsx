// Этап 3. Физические данные: пол, возраст, рост, вес + единицы
// (кг/см или фунты/дюймы). Храним метрику, на экране конвертируем.

import { Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { PillRow } from './ObOptions'
import { ObField } from './ObField'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { kgToLb, lbToKg, cmToIn, inToCm } from '@/lib/data/onboarding'

const num = (raw) => Number(String(raw).replace(',', '.'))

export function BodyStep({ onNext, onBack }) {
  const a = useOnboardingStore((s) => s.answers)
  const patch = useOnboardingStore((s) => s.patchAnswers)
  const imperial = a.units === 'imperial'

  const show = (v, conv) => (v === '' || v == null ? '' : String(conv(v)))
  const setMetric = (key, raw, back) => {
    if (!raw) return patch({ [key]: '' })
    const v = num(raw)
    patch({ [key]: Number.isFinite(v) && v > 0 ? Math.round(back(v) * 10) / 10 : '' })
  }

  const ok =
    a.age >= 10 && a.age <= 90 &&
    a.heightCm >= 120 && a.heightCm <= 230 &&
    a.weightKg >= 35 && a.weightKg <= 250

  return (
    <ObShell
      sub="Шаг 3 из 12"
      title="Ваши данные"
      onBack={onBack}
      onNext={onNext}
      nextDisabled={!ok}
    >
      <View className="gap-4">
        <PillRow
          label="Единицы измерения"
          options={[['metric', 'кг / см'], ['imperial', 'фунты / дюймы']]}
          value={a.units}
          onChange={(v) => patch({ units: v })}
        />
        <PillRow
          label="Пол"
          options={[['female', 'Женский'], ['male', 'Мужской']]}
          value={a.sex}
          onChange={(v) => patch({ sex: v })}
        />
        <ObField
          label="Возраст"
          value={a.age}
          onChange={(raw) => patch({ age: num(raw) || '' })}
          suffix="лет"
          placeholder="30"
          keyboardType="number-pad"
        />
        <ObField
          label="Рост"
          value={show(a.heightCm, imperial ? cmToIn : (v) => v)}
          onChange={(raw) => setMetric('heightCm', raw, imperial ? inToCm : (v) => v)}
          suffix={imperial ? 'дюйм' : 'см'}
          placeholder={imperial ? '66' : '170'}
        />
        <ObField
          label="Текущий вес"
          value={show(a.weightKg, imperial ? kgToLb : (v) => v)}
          onChange={(raw) => setMetric('weightKg', raw, imperial ? lbToKg : (v) => v)}
          suffix={imperial ? 'фунт' : 'кг'}
          placeholder={imperial ? '150' : '70'}
        />
        <Text className="px-1 font-sans text-[11px] leading-relaxed text-bear-dim">
          Обхват талии и % жира можно добавить позже в разделе «ИМТ» — это
          уточнит картину, но не обязательно для старта.
        </Text>
      </View>
    </ObShell>
  )
}
