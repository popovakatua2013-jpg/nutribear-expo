// Этап 3. «Отлично!» — кульминация онбординга по макету: галочка в
// градиентном кольце, карточка трёх главных цифр плана (калории,
// тренировки, вода) и подробности по кнопке «Показать план» (БЖУ,
// дата цели, прогноз веса). Кнопка «Далее» сохраняет план.

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg'
import { Check, ChevronDown, ChevronUp } from 'lucide-react-native'
import { SvgLineChart } from '@/components/ui/SvgLineChart'
import { ObShell } from './ObShell'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { calcPlan, planDoneText } from '@/lib/data/onboarding'
import { WATER_BY_ANSWER, WORKOUT_OPTIONS } from '@/lib/data/onboarding-options'
import { formatNum } from '@/lib/format'
import { DISCLAIMER } from '@/lib/data/disclaimer'

const SIZE = 92
const R = 40
const CIRC = 2 * Math.PI * R
const ARC = 0.75 // кольцо заполнено на три четверти — как на макете

export function RevealStep({ onNext, onBack }) {
  const answers = useOnboardingStore((s) => s.answers)
  const savePlan = useOnboardingStore((s) => s.savePlan)
  const plan = useMemo(() => calcPlan(answers), [answers])
  const [open, setOpen] = useState(false)

  function accept() {
    savePlan(plan)
    onNext()
  }

  const workoutsShort = { '0': '0', '1-2': '1–2', '3-4': '3–4', '4+': '5+' }[answers.workouts] ?? '—'
  const waterMl = WATER_BY_ANSWER[answers.waterDay] || 2000
  const glasses = Math.max(1, Math.round(waterMl / 250))

  return (
    <ObShell
      sub="Шаг 3 из 5"
      title="Итог"
      onBack={onBack}
      onNext={accept}
      nextLabel="Далее"
    >
      <View className="items-center pt-2">
        {/* Галочка в градиентном кольце */}
        <View className="h-[92px] w-[92px] items-center justify-center">
          <Svg width={SIZE} height={SIZE}>
            <Defs>
              <SvgGradient id="revealRing" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#4D7CFE" />
                <Stop offset="1" stopColor="#A45BFF" />
              </SvgGradient>
            </Defs>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={R} stroke="rgba(255,255,255,0.08)" strokeWidth={7} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={R}
              stroke="url(#revealRing)"
              strokeWidth={7}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${ARC * CIRC} ${CIRC}`}
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          </Svg>
          <View className="absolute inset-0 items-center justify-center">
            <Check size={36} color="#FFFFFF" strokeWidth={3} />
          </View>
        </View>

        <Text className="mt-3 font-extrabold text-[28px] tracking-tight text-bear-text">
          Отлично!
        </Text>
        <Text className="mx-auto mt-1.5 max-w-[260px] text-center font-sans text-[17.5px] leading-relaxed text-[#aab4d4]">
          Твой персональный план готов
        </Text>
      </View>

      {/* Три главные цифры плана */}
      <View className="mt-5 flex-row items-stretch rounded-3xl border border-white/5 bg-bear-card p-4">
        <Stat emoji="🔥" value={formatNum(plan.targetKcal)} caption="ккал/день" />
        <View className="w-px self-stretch bg-white/5" />
        <Stat emoji="🏋️" value={workoutsShort} caption="тренировки в неделю" />
        <View className="w-px self-stretch bg-white/5" />
        <Stat emoji="💧" value={String(glasses)} caption="стаканы воды" />
      </View>

      <Text className="mt-3 px-1 text-center font-sans text-[16.5px] leading-relaxed text-[#aab4d4]">
        {planDoneText(plan)}
      </Text>

      {/* Подробности — по кнопке, чтобы экран оставался лёгким */}
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityLabel={open ? 'Скрыть план' : 'Показать план'}
        className="mt-3 flex-row items-center justify-between rounded-2xl border border-white/5 bg-bear-card/60 px-4 py-3"
      >
        <Text className="font-bold text-[17.5px] text-bear-text">
          {open ? 'Скрыть подробности' : 'Показать план'}
        </Text>
        {open ? (
          <ChevronUp size={18} color="#8B96B8" />
        ) : (
          <ChevronDown size={18} color="#8B96B8" />
        )}
      </Pressable>

      {open ? (
        <View className="mt-2.5 gap-3">
          <View className="rounded-2xl border border-white/5 bg-bear-card p-4">
            <Text className="font-semibold text-[16.5px] text-bear-sub2">
              Целевые БЖУ на день
            </Text>
            <View className="mt-2 flex-row justify-between">
              <Text className="font-bold text-[17.5px] text-bear-text">🥩 Б {plan.protein} г</Text>
              <Text className="font-bold text-[17.5px] text-bear-text">🥑 Ж {plan.fat} г</Text>
              <Text className="font-bold text-[17.5px] text-bear-text">🍞 У {plan.carbs} г</Text>
            </View>
            {plan.dailyDelta !== 0 ? (
              <Text className="mt-1.5 font-sans text-[15px] text-bear-dim">
                {plan.deltaLabel} {formatNum(plan.dailyDelta)} ккал/день при темпе {plan.pace} кг/нед
              </Text>
            ) : null}
          </View>

          {plan.projection ? (
            <View className="rounded-2xl border border-white/5 bg-bear-card p-4">
              <Text className="font-semibold text-[16.5px] text-bear-sub2">Прогноз веса</Text>
              <View className="mt-2">
                <SvgLineChart
                  data={plan.projection}
                  series={[{ key: 'kg', color: '#a78bfa' }]}
                  height={140}
                  yFmt={(v) => `${Math.round(v)}`}
                />
              </View>
            </View>
          ) : null}

          <Text className="px-1 font-sans text-[15px] leading-relaxed text-bear-dim">
            {DISCLAIMER}
          </Text>
        </View>
      ) : null}
    </ObShell>
  )
}

function Stat({ emoji, value, caption }) {
  return (
    <View className="min-w-0 flex-1 items-center px-1">
      <Text className="text-[26px]">{emoji}</Text>
      <Text className="mt-1 font-extrabold text-[24px] leading-none text-bear-text">
        {value}
      </Text>
      <Text className="mt-1 text-center font-sans text-[14.5px] leading-[16px] text-bear-sub2">
        {caption}
      </Text>
    </View>
  )
}
