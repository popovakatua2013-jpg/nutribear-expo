// Карточка «График веса» — как на референсе дневника: заголовок со
// значком, переключатель периода (7/30/90 дней) и сглаженная линия
// измерений с заливкой; на неделе — точки каждого взвешивания (белые),
// последняя — самая свежая. Золотой пунктир — цель по весу, если задана.
// Данные — журнал взвешиваний из профиля; за период измерений нет —
// честная подсказка. Тап по карточке открывает вкладку ИМТ и докручивает
// до большого графика «Динамика веса»

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { BarChart3 } from 'lucide-react-native'
import { SvgAreaChart } from '../../ui/SvgAreaChart'
import { shortDate, shortWeekday } from '@/lib/data/activity'
import { fmtDecimal } from '@/lib/data/bmi'
import { useProfileStore } from '@/store/useProfileStore'
import { pluralDays } from '@/lib/format'
import { requestScrollToWeight } from '@/lib/navEvents'

const WEIGHT_RANGES = [
  { id: 7, label: '7 д' },
  { id: 30, label: '30 д' },
  { id: 90, label: '90 д' },
]

export function WeightTrendCard() {
  const weights = useProfileStore((s) => s.weights)
  const goalKg = useProfileStore((s) => s.goalWeightKg)
  const [days, setDays] = useState(7)

  // Измерения периода по возрастанию даты (журнал хранит новые сверху).
  // На неделе подписи — дни недели (Пн…Вс), на 30/90 — даты
  const data = useMemo(() => {
    const cutoff = Date.now() - days * 86400000
    return weights
      .filter((w) => new Date(w.date).getTime() >= cutoff)
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((w) => {
        const d = new Date(w.date)
        return { label: days <= 7 ? shortWeekday(d) : shortDate(d), value: w.kg }
      })
  }, [weights, days])

  // Последнее измерение — для плашки значения в шапке
  const last = data.length ? data[data.length - 1] : null

  function openWeightChart() {
    router.navigate('/bmi')
    requestScrollToWeight()
  }

  return (
    <Pressable
      onPress={openWeightChart}
      accessibilityRole="button"
      accessibilityLabel="График веса. Тап — открыть вкладку ИМТ"
      className="active:opacity-90"
      style={{ borderRadius: 16 }}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['#a78bfa14', '#1A123A']}
        style={{
          borderRadius: 16,
          borderWidth: 1,
          borderColor: 'rgba(168,85,247,0.30)',
          padding: 14,
        }}
      >
        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              backgroundColor: '#a78bfa1f',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={16} color="#a78bfa" />
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            className="min-w-0 flex-1 font-bold text-[16.5px] text-bear-text"
          >
            График веса
          </Text>
          {last ? (
            <View className="shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1">
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                className="font-bold text-[13px] text-bear-soft"
              >
                {`${fmtDecimal(last.value)} кг`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Период: короткие чипы 7/30/90 — как на референсе */}
        <View className="mt-2.5 flex-row items-center gap-1.5">
          {WEIGHT_RANGES.map((r) => {
            const active = days === r.id
            return (
              <Pressable
                key={r.id}
                onPress={() => setDays(r.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`График за ${r.id} ${pluralDays(r.id)}`}
                className={`rounded-full px-2.5 py-1 active:opacity-80 ${active ? '' : 'bg-white/[0.06]'}`}
                style={active ? { backgroundColor: '#7B6CF6' } : null}
              >
                <Text
                  maxFontSizeMultiplier={1.15}
                  className={`font-semibold text-[12.5px] ${active ? 'text-white' : 'text-bear-sub'}`}
                >
                  {r.label}
                </Text>
              </Pressable>
            )
          })}
        </View>

        {data.length >= 2 ? (
          <View className="mt-1">
            <SvgAreaChart
              data={data}
              color="#A78BFA"
              dotColor="#FFFFFF"
              dot={data.length <= 10}
              height={150}
              goalLine={goalKg > 0 ? goalKg : null}
              yFmt={(v) => `${Math.round(v)}`}
            />
          </View>
        ) : (
          <View
            className="items-center justify-center rounded-2xl border border-dashed border-white/10"
            style={{ height: 130, marginTop: 8 }}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              className="px-4 text-center font-sans text-[13.5px] leading-snug text-bear-dim"
            >
              {data.length === 1
                ? 'Нужно хотя бы два взвешивания — запишите вес ещё раз на вкладке «Тело»'
                : `Нет измерений за ${days} ${pluralDays(days)} — запишите вес на вкладке «Тело»`}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  )
}
