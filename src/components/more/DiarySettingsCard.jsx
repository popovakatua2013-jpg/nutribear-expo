// Карточка «Дневник питания» в разделе «Ещё» — настройки дневника.
// Первая настройка — режим остатка калорий (отзыв Кати: «строгий
// остаток по умолчанию» + «переключатель в настройках дневника — сама
// выбираешь режим»). ВЫКЛ (по умолчанию) — строгий остаток:
// цель − съедено, сожжённое не возвращается — его оценка по шагам и
// тренировкам часто завышена. ВКЛ — активность возвращается в остаток:
// цель − съедено + сожжено, как в MyFitnessPal/Samsung Health.
// Значение живёт в goals.countBurned (useGoalsStore) — сводка
// «Съедено за сегодня» на Главной переключается мгновенно.
// Ниже — «Особые дни» (отзыв Кати: корректировка калорий в дни цикла
// «нигде не фиксируется», плюс «можно выбрать командировки и праздники —
// в этот день делать перерасчёт»): прибавка ккал к норме на такой день.
// Менструальные дни включаются сами из трекера цикла, командировку и
// праздник отмечают на Главной — чип «Особый день» в сводке.

import { Pressable, Switch, Text, View } from 'react-native'
import { Minus, Plus, Utensils } from 'lucide-react-native'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useDayTypesStore, DELTA_MIN, DELTA_MAX, DELTA_STEP } from '@/store/useDayTypesStore'
import { DAY_TYPES } from '@/lib/data/dayContext'
import { formatNum } from '@/lib/format'
import { CollapsibleCard } from '../ui/CollapsibleCard'

export function DiarySettingsCard() {
  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))
  const setGoals = useGoalsStore((s) => s.setGoals)
  // Прибавки особых дней: строка «эмодзи Тип − 150 ккал +»
  const deltas = useDayTypesStore((s) => s.deltas)
  const setDelta = useDayTypesStore((s) => s.setDelta)

  return (
    <CollapsibleCard
      storageKey="diary"
      accessibilityLabel="Дневник питания"
      icon={<Utensils size={20} color="#C4B5FD" />}
      title="Дневник питания"
      right={
        <Switch
          accessibilityLabel="Учитывать сожжённые калории в остатке"
          value={countBurned}
          onValueChange={(v) => setGoals({ countBurned: v })}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      }
    >
      <Text className="font-bold text-[16px] text-bear-text">
        {countBurned ? 'Тренировки возвращают калории' : 'Тренировки не возвращают калории'}
      </Text>
      {/* Простым языком (отзыв Кати: «написать подсказку для
          пользователя простым языком») — без формул в лоб */}
      <Text className="mt-1 font-sans text-[15.5px] leading-snug text-bear-sub">
        {countBurned
          ? 'Сожгли на прогулке или тренировке — эти калории вернутся в ваш остаток на Главной: потратили 200, значит можете съесть на 200 больше. Так же считают MyFitnessPal и Samsung Health.'
          : 'Считаем только съеденное: от вашей нормы отнимается еда, а «сожжённое» на шагах и тренировках не возвращается. Приложения часто преувеличивают сожжённое — так проще не перебрать и честнее видеть дефицит.'}
      </Text>
      {/* Как считаются дни «в рамках» в отчётах (отзыв Кати: «калории
          сейчас в рамках 1/7 дн — нужно как везде цель 1/7 дн»): подпись
          в карточке «Калории» теперь единая «Цель: N/7 дн», а здесь —
          простое объяснение, что это значит */}
      <Text className="mt-2 font-sans text-[15.5px] leading-snug text-bear-sub">
        В отчётах у карточки «Калории» цель — уложиться в свою норму: день засчитан, если вы поели и не вышли за неё. Строка «Цель: 2/7 дн» значит: из 7 дней вы 2 дня уложились в норму.
      </Text>
      <Text className="mt-2 font-sans text-[14px] leading-snug text-bear-sub2">
        Переключатель сверху решает, возвращать ли потраченные калории в остаток на Главной.
      </Text>

      {/* ── Особые дни: прибавка ккал к норме ─────────────────────────── */}
      <View className="mt-3 gap-2.5 rounded-2xl bg-white/[0.03] p-3.5">
        <Text className="font-bold text-[16px] text-bear-text">🗓 Особые дни</Text>
        <Text className="font-sans text-[14.5px] leading-snug text-bear-sub">
          В такой день норма калорий увеличивается на прибавку: остаток на Главной, кольцо «съедено» и «Цель: N/7 дн» в отчётах считают по норме дня. Дни менструации отмечаются сами, если включён трекер цикла; командировку и праздник отметьте на Главной — чип «Особый день» в карточке «Съедено за сегодня».
        </Text>
        {Object.keys(DAY_TYPES).map((t) => {
          const meta = DAY_TYPES[t]
          const val = deltas[t] || 0
          return (
            <View key={t} className="flex-row items-center gap-2.5">
              <Text className="w-8 text-center text-[20px]">{meta.emoji}</Text>
              <Text numberOfLines={1} className="min-w-0 flex-1 font-bold text-[15.5px] text-bear-text">
                {meta.label}
              </Text>
              <Pressable
                onPress={() => setDelta(t, Math.max(DELTA_MIN, val - DELTA_STEP))}
                disabled={val <= DELTA_MIN}
                accessibilityRole="button"
                accessibilityLabel={`Уменьшить прибавку для «${meta.label}»`}
                hitSlop={6}
                className={`h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70 ${
                  val <= DELTA_MIN ? 'opacity-30' : ''
                }`}
              >
                <Minus size={16} color="#AEB9D9" />
              </Pressable>
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                maxFontSizeMultiplier={1.1}
                className="w-[86px] shrink-0 text-center font-bold text-[15px] text-bear-text"
              >
                {`+${formatNum(val)} ккал`}
              </Text>
              <Pressable
                onPress={() => setDelta(t, Math.min(DELTA_MAX, val + DELTA_STEP))}
                disabled={val >= DELTA_MAX}
                accessibilityRole="button"
                accessibilityLabel={`Увеличить прибавку для «${meta.label}»`}
                hitSlop={6}
                className={`h-9 w-9 items-center justify-center rounded-full active:opacity-70 ${
                  val >= DELTA_MAX ? 'bg-white/5 opacity-30' : ''
                }`}
                style={{ backgroundColor: 'rgba(123,108,246,0.15)' }}
              >
                <Plus size={16} color="#A78BFA" />
              </Pressable>
            </View>
          )
        })}
        <Text className="font-sans text-[13px] leading-snug text-bear-dim">
          Шаг — {DELTA_STEP} ккал. Прибавка 0 — день помечен, но считается по базовой норме.
        </Text>
      </View>
    </CollapsibleCard>
  )
}
