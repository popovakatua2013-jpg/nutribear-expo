// Этап 8. «Момент раскрытия» — кульминация онбординга: BMR → TDEE →
// целевые калории и БЖУ, дата достижения цели и прогнозная кривая веса.

import { useMemo } from 'react'
import { Text, View } from 'react-native'
import { Activity, Flame, Target } from 'lucide-react-native'
import { SvgLineChart } from '@/components/ui/SvgLineChart'
import { ObShell } from './ObShell'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { calcPlan, planDoneText } from '@/lib/data/onboarding'
import { formatNum } from '@/lib/format'
import { DISCLAIMER } from '@/lib/data/disclaimer'

export function RevealStep({ onNext, onBack }) {
  const answers = useOnboardingStore((s) => s.answers)
  const savePlan = useOnboardingStore((s) => s.savePlan)
  const plan = useMemo(() => calcPlan(answers), [answers])

  function accept() {
    savePlan(plan)
    onNext()
  }

  const cards = [
    { Icon: Flame, label: 'BMR', value: formatNum(plan.bmr), hint: 'ккал покоя' },
    { Icon: Activity, label: 'TDEE', value: formatNum(plan.tdee), hint: 'с активностью' },
    { Icon: Target, label: 'Цель', value: formatNum(plan.targetKcal), hint: 'ккал в день' },
  ]

  return (
    <ObShell
      sub="Шаг 8 из 12"
      title="Ваш план готов!"
      onBack={onBack}
      onNext={accept}
      nextLabel="План выглядит отлично!"
    >
      <View className="gap-3">
        <Text className="font-sans text-[13px] leading-relaxed text-[#aab4d4]">
          {planDoneText(plan)}
        </Text>

        <View className="flex-row gap-2.5">
          {cards.map((c) => (
            <View key={c.label} className="flex-1 items-center rounded-2xl border border-white/5 bg-bear-card p-3">
              <c.Icon size={16} color="#6c8cff" />
              <Text className="mt-1.5 font-extrabold text-[17px] leading-none text-bear-text">
                {c.value}
              </Text>
              <Text className="mt-1 font-bold text-[10px] text-bear-sub2">{c.label}</Text>
              <Text className="font-sans text-[9px] text-bear-dim">{c.hint}</Text>
            </View>
          ))}
        </View>

        <View className="rounded-2xl border border-white/5 bg-bear-card p-4">
          <Text className="font-semibold text-[12px] text-bear-sub2">
            Целевые БЖУ на день
          </Text>
          <View className="mt-2 flex-row justify-between">
            <Text className="font-bold text-[13px] text-bear-text">🥩 Б {plan.protein} г</Text>
            <Text className="font-bold text-[13px] text-bear-text">🥑 Ж {plan.fat} г</Text>
            <Text className="font-bold text-[13px] text-bear-text">🍞 У {plan.carbs} г</Text>
          </View>
          {plan.dailyDelta !== 0 && (
            <Text className="mt-1.5 font-sans text-[11px] text-bear-dim">
              {plan.deltaLabel} {formatNum(plan.dailyDelta)} ккал/день при темпе {plan.pace} кг/нед
            </Text>
          )}
        </View>

        <View className="rounded-2xl border border-white/5 bg-bear-card p-4">
          <Text className="font-semibold text-[12px] text-bear-sub2">Прогноз веса</Text>
          <View className="mt-2">
            <SvgLineChart
              data={plan.projection}
              series={[{ key: 'kg', color: '#a78bfa' }]}
              height={140}
              yFmt={(v) => `${Math.round(v)}`}
            />
          </View>
        </View>

        <Text className="px-1 font-sans text-[10px] leading-relaxed text-bear-dim">
          {DISCLAIMER}
        </Text>
      </View>
    </ObShell>
  )
}
