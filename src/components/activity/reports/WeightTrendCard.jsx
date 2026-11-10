// Карточка «График веса» — как на референсе дневника: заголовок со
// значком, переключатель периода (7/30/90 дней) и сглаженная линия
// измерений с заливкой. ПО ОДНОМУ ЗНАЧЕНИЮ НА ДЕНЬ (weightByDay —
// последнее взвешивание дня): раньше несколько замеров за один день
// давали «Сб Сб Сб Сб» в подписях и ломали масштаб (аудит по скрину
// Кати). Подписи дней — числовые даты «7.11» (отзыв Кати: месяц
// вместо точек). Золотой пунктир — цель по весу, если задана; шкалу
// цель больше не растягивает (см. SvgAreaChart). Под замком ТОЛЬКО
// 30/90 — пока дневник не дожил до этих дней; неделя открыта всегда
// (отзыв Кати: замок на «7 д» в первые 7 дней выглядел как поломка).
// Данные — журнал
// взвешиваний из профиля; за период измерений нет — честная
// подсказка. ОДНА запись — точка по центру со значением (отзыв
// Кати от 10.11: «добавила вес — график в дневнике не фиксирует
// данные»: требовать два взвешивания для первой точки — нечестно);
// линия рисуется с двух записей. Тап по карточке открывает
// вкладку ИМТ и докручивает
// до большого графика «Динамика веса»

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { BarChart3, Lock } from 'lucide-react-native'
import { SvgAreaChart } from '../../ui/SvgAreaChart'
import { dotDateFromKey } from '@/lib/data/activity'
import { weightByDay, diaryAgeDays, periodLocked } from '@/lib/data/reports'
import { fmtDecimal } from '@/lib/data/bmi'
import { useProfileStore } from '@/store/useProfileStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { requestScrollToWeight } from '@/lib/navEvents'

const WEIGHT_RANGES = [
  { id: 7, label: '7 д', days: 7 },
  { id: 30, label: '30 д', days: 30 },
  { id: 90, label: '90 д', days: 90 },
]

export function WeightTrendCard() {
  const weights = useProfileStore((s) => s.weights)
  const goalKg = useProfileStore((s) => s.goalWeightKg)
  const savedDays = useHistoryStore((s) => s.days)
  const [days, setDays] = useState(7)
  const [lockHint, setLockHint] = useState(null)

  // Замок периодов — та же логика, что у пилюль «Отчётов» и окон истории
  const diaryAge = diaryAgeDays(savedDays)

  // По одному значению на день (последнее взвешивание дня) по возрастанию
  // даты; подписи — числовые даты «7.11» (на неделе дни различимы и так,
  // но даты не путаются между одинаковыми днями разных недель)
  const data = useMemo(() => {
    const byDay = weightByDay(weights)
    const out = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const k = dayKeyOf(d)
      if (byDay[k]) out.push({ label: dotDateFromKey(k), value: byDay[k] })
    }
    return out
  }, [weights, days])

  // Последнее измерение — для плашки значения в шапке
  const last = data.length ? data[data.length - 1] : null

  function pickDays(next) {
    const r = WEIGHT_RANGES.find((x) => x.id === next)
    if (r && periodLocked(r.days, diaryAge)) {
      setLockHint(
        r.days === 30
          ? 'Период 30 дней откроется на 30-й день ведения дневника'
          : `Период ${r.days} дней откроется на ${r.days}-й день ведения дневника`
      )
      return
    }
    setLockHint(null)
    setDays(next)
  }

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

        {/* Период: короткие чипы 7/30/90 — как на референсе; под замком
            только 30/90, неделя — всегда (отзыв Кати) */}
        <View className="mt-2.5 flex-row items-center gap-1.5">
          {WEIGHT_RANGES.map((r) => {
            const active = days === r.id
            const locked = periodLocked(r.days, diaryAge)
            return (
              <Pressable
                key={r.id}
                onPress={() => pickDays(r.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: locked }}
                accessibilityLabel={`График за ${r.id} дней${locked ? ' — пока недоступно' : ''}`}
                className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 active:opacity-80 ${active ? '' : 'bg-white/[0.06]'}`}
                style={[active ? { backgroundColor: '#7B6CF6' } : null, locked ? { opacity: 0.5 } : null]}
              >
                {locked && (
                  <Lock size={11} color={active ? '#FFFFFF' : '#8B96B8'} />
                )}
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
        {lockHint ? (
          <Text
            accessibilityLiveRegion="polite"
            maxFontSizeMultiplier={1.2}
            className="mt-1.5 font-sans text-[12.5px] leading-snug text-bear-dim"
          >
            🔒 {lockHint}
          </Text>
        ) : null}

        {data.length >= 1 ? (
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
              {`Нет измерений за ${days} дней — запишите вес на вкладке «Тело»`}
            </Text>
          </View>
        )}
      </LinearGradient>
    </Pressable>
  )
}
