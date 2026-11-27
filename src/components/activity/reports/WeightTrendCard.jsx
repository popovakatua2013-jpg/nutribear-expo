// Карточка «График веса» — оформление по отзыву Кати от 15.11
// («график веса вообще не понятен, оформить по-другому»): над графиком
// полоса «Сейчас / Цель / Осталось» — главные цифры видны сразу, без
// чтения осей; при ОДНОЙ записи вместо голой точки на пустой оси —
// строка списка с датой и весом + честная подсказка («линия появится
// со второго взвешивания»); линия рисуется с двух записей.
// ПО ОДНОМУ ЗНАЧЕНИЮ НА ДЕНЬ (weightByDay — последнее взвешивание
// дня): раньше несколько замеров за один день давали «Сб Сб Сб Сб»
// в подписях и ломали масштаб (аудит по скрину Кати). Подписи дней —
// числовые даты «7.11» (отзыв Кати: месяц вместо точек). Золотой
// пунктир — цель по весу, если задана; шкалу цель больше не
// растягивает (см. SvgAreaChart). Плашка значения в шапке убрана —
// дубль полосы «Сейчас». Под замком ТОЛЬКО 30/90 — пока дневник не
// дожил до этих дней; неделя открыта всегда (отзыв Кати: замок на
// «7 д» в первые 7 дней выглядел как поломка). Данные — журнал
// взвешиваний из профиля; за период измерений нет — честная
// подсказка. Тап по карточке открывает вкладку ИМТ и докручивает
// до большого графика «Динамика веса».
// Правка Кати 25.11 («график веса и почти все блоки не перекрашены»):
// подложка — тинт и поверхность ТЕМЫ (раньше фиолетовый градиент
// #a78bfa14 → #1A123A был во всех темах), иконка/точки графика — цвета темы

import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { router } from 'expo-router'
import { BarChart3, Lock } from 'lucide-react-native'
import { SvgAreaChart } from '../../ui/SvgAreaChart'
import { NeonCard } from '../../ui/NeonCard'
import { dotDateFromKey } from '@/lib/data/activity'
import { weightByDay, diaryAgeDays, periodLocked } from '@/lib/data/reports'
import { fmtDecimal } from '@/lib/data/bmi'
import { useProfileStore } from '@/store/useProfileStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { requestScrollToWeight } from '@/lib/navEvents'
import { useThemeColors } from '@/lib/use-theme'


const WEIGHT_RANGES = [
  { id: 7, label: '7 д', days: 7 },
  { id: 30, label: '30 д', days: 30 },
  { id: 90, label: '90 д', days: 90 },
]

export function WeightTrendCard() {
  const themeColors = useThemeColors()
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

  // Последнее измерение — для полосы «Сейчас / Цель / Осталось»
  const last = data.length ? data[data.length - 1] : null
  const hasGoal = goalKg > 0
  // Осталось до цели: положительное — сколько кг осталось, отрицательное —
  // перебор (вес ушёл за цель). Ровно на цели — «0 кг»
  let remainText = null
  if (last && hasGoal) {
    const diff = Math.round((goalKg - last.value) * 10) / 10
    remainText = diff === 0 ? '0 кг' : `${diff > 0 ? '' : '−'}${fmtDecimal(Math.abs(diff))} кг`
  }

  function pickDays(next) {
    const r = WEIGHT_RANGES.find((x) => x.id === next)
    if (r && periodLocked(r.days, diaryAge)) {
      setLockHint(
        r.days === 30
          ? 'Период 30 дней откроется на 30-й день с записями'
          : `Период ${r.days} дней откроется на ${r.days}-й день с записями`
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
    >
      {/* Правка Кати 25.11, пятый круг («все вкладки должны быть оформлены
          одинаково»): самодельный стек (два ореола 0.5/0.26 + кайма
          1.5 px + подложка card с тинтом) заменён NeonCard — те же
          ореолы, кайма и градиентная поверхность, что у всех блоков
          приложения, без расхождений по толщине/яркости */}
      <NeonCard radius={16}>
        <View className="p-3.5">

        <View className="flex-row items-center gap-2">
          <View
            style={{
              width: 28,
              height: 28,
              borderRadius: 10,
              backgroundColor: themeColors.accentFaint2,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <BarChart3 size={16} color={themeColors.accentBright} />
          </View>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            className="min-w-0 flex-1 font-bold text-[16.5px] text-bear-text"
          >
            График веса
          </Text>
          {/* Плашка значения в шапке убрана — теперь есть полоса
              «Сейчас / Цель / Осталось» (отзыв Кати 15.11) */}
        </View>

        {/* Период: короткие чипы 7/30/90 — как на референсе; под замком
            только 30/90, неделя — всегда (отзыв Кати) */}
        <View className="mt-2.5 flex-row items-center gap-1.5">
          {WEIGHT_RANGES.map((r) => {
            const active = days === r.id
            const locked = periodLocked(r.days, diaryAge)
            // Замок больше не приглушает чип до невидимости (отзыв
            // Кати 27.11: «не видно под замком надпись 30 дн 90 дн» —
            // opacity 0.5 топил и рамку, и текст на тёмных темах).
            // Вместо него — читаемая рамка accentBorder; иконка и
            // подпись остаются своими цветами (dim/sub)
            return (
              <Pressable
                key={r.id}
                onPress={() => pickDays(r.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: active, disabled: locked }}
                accessibilityLabel={`График за ${r.id} дней${locked ? ' — пока недоступно' : ''}`}
                className={`flex-row items-center gap-1 rounded-full px-2.5 py-1 active:opacity-80 ${active ? '' : 'bg-bear-accentFaint'}`}
                style={[
                  active ? { backgroundColor: themeColors.accent } : null,
                  locked && !active ? { borderWidth: 1, borderColor: themeColors.accentBorder } : null,
                ]}
              >
                {locked && (
                  <Lock size={11} color={active ? themeColors.accentOn : themeColors.dim} />
                )}
                <Text
                  maxFontSizeMultiplier={1.15}
                  className={`font-semibold text-[12.5px] ${active ? '' : 'text-bear-sub'}`}
                  style={{ color: active ? themeColors.accentOn : undefined }}
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

        {/* Полоса «Сейчас / Цель / Осталось»: главные цифры крупно и
            сразу — график больше не единственный источник информации
            (отзыв Кати 15.11: «график веса вообще не понятен») */}
        {last ? (
          <View className="mt-2.5 flex-row gap-2">
            <StatCell label="Сейчас" value={`${fmtDecimal(last.value)} кг`} />
            {hasGoal ? (
              <StatCell label="Цель" value={`${fmtDecimal(goalKg)} кг`} />
            ) : (
              <StatCell label="Записей" value={String(data.length)} />
            )}
            {hasGoal ? <StatCell label="Осталось" value={remainText} /> : null}
          </View>
        ) : null}

        {data.length >= 2 ? (
          <View className="mt-1">
            <SvgAreaChart
              data={data}
              color={themeColors.accentBright}
              dotColor={themeColors.accentOn}
              dot={data.length <= 10}
              height={150}
              goalLine={hasGoal ? goalKg : null}
              yFmt={(v) => `${Math.round(v)}`}
            />
          </View>
        ) : data.length === 1 ? (
          // ОДНА запись: строка списка вместо голой точки на пустой оси
          // (отзыв Кати 15.11: график с одной точкой и осью 74–76 «вообще
          // не понятен») + честная подсказка про второе взвешивание
          <View className="mt-2.5 gap-1.5">
            <View
              accessibilityLabel={`Взвешивание ${data[0].label}: ${fmtDecimal(data[0].value)} килограммов`}
              className="flex-row items-center justify-between rounded-xl bg-bear-accentFaint px-3 py-2.5"
            >
              <Text
                maxFontSizeMultiplier={1.2}
                className="font-sans text-[13.5px] text-bear-sub"
              >
                {data[0].label}
              </Text>
              <Text
                maxFontSizeMultiplier={1.15}
                className="font-bold text-[14.5px] text-bear-text"
              >
                {`${fmtDecimal(data[0].value)} кг`}
              </Text>
            </View>
            <Text
              maxFontSizeMultiplier={1.2}
              className="font-sans text-[12.5px] leading-snug text-bear-dim"
            >
              Линия появится со второго взвешивания — запишите вес ещё раз на вкладке «Тело»
            </Text>
          </View>
        ) : (
          <View
            className="items-center justify-center rounded-2xl border border-dashed border-bear-accentBorder"
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
        </View>
      </NeonCard>
    </Pressable>
  )
}

// Ячейка полосы «Сейчас / Цель / Осталось»: подпись сверху мелко,
// значение снизу крупно — как мини-статы в отчётах
function StatCell({ label, value }) {
  return (
    <View className="min-w-0 flex-1 rounded-xl bg-bear-accentFaint px-2.5 py-1.5">
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.2}
        className="font-sans text-[11px] text-bear-dim"
      >
        {label}
      </Text>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={1.15}
        className="font-bold text-[14px] text-bear-text"
      >
        {value}
      </Text>
    </View>
  )
}
