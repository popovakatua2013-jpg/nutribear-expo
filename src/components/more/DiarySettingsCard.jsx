// Карточка «Дневник питания» в разделе «Ещё» — настройки дневника.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — содержимое встраивается в строку меню «Дневник питания»,
// тумблер возврата калорий — в первой строке рядом с заголовком режима.
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

import { useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'
import { ChevronDown, Minus, Plus, Utensils } from 'lucide-react-native'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useDayTypesStore, DELTA_MIN, DELTA_MAX, DELTA_STEP } from '@/store/useDayTypesStore'
import { DAY_TYPES } from '@/lib/data/dayContext'
import { formatNum } from '@/lib/format'
import { CollapsibleCard } from '../ui/CollapsibleCard'

export function DiarySettingsCard({ embedded = false }) {
  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))
  const setGoals = useGoalsStore((s) => s.setGoals)
  // Прибавки особых дней: строка «эмодзи Тип − 150 ккал +»
  const deltas = useDayTypesStore((s) => s.deltas)
  const setDelta = useDayTypesStore((s) => s.setDelta)
  // Простыня объяснений спрятана в раскрывашку (скрин Кати: три абзаца
  // текста занимали пол-экрана — настройки выглядели как статья)
  const [moreOpen, setMoreOpen] = useState(false)

  const modeTitle = countBurned
    ? 'Тренировки возвращают калории'
    : 'Строгий остаток: только съеденное'
  const modeText = countBurned
    ? 'Сожгли 200 — можете съесть на 200 больше: активность возвращается в остаток на Главной.'
    : 'Считаем только съеденное: сожжённое не возвращается — так дефицит виден честнее.'

  // Переключатель возврата калорий: в обычном режиме — в шапке (слот right
  // вне нажимаемой области), во встроенном — рядом с заголовком режима
  const switchEl = (
    <Switch
      accessibilityLabel="Учитывать сожжённые калории в остатке"
      value={countBurned}
      onValueChange={(v) => setGoals({ countBurned: v })}
      trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
      thumbColor="#fff"
    />
  )

  if (embedded) {
    return (
      <View accessibilityLabel="Дневник питания" className="gap-2">
        <View className="flex-row items-center justify-between gap-2">
          <Text className="min-w-0 flex-1 font-bold text-[16px] text-bear-text">{modeTitle}</Text>
          {switchEl}
        </View>
        <Text className="font-sans text-[15px] leading-snug text-bear-sub">{modeText}</Text>
        {/* Коротко — сразу, подробно — по тапу (отзыв Кати: «написать
            подсказку простым языком» без простыни текста) */}
        <Pressable
          onPress={() => setMoreOpen((s) => !s)}
          accessibilityRole="button"
          accessibilityState={{ expanded: moreOpen }}
          accessibilityLabel={moreOpen ? 'Свернуть подробности' : 'Подробнее о режиме остатка'}
          hitSlop={6}
          className="max-w-[220px] flex-row items-center gap-1 self-start active:opacity-70"
        >
          <Text className="font-semibold text-[13.5px] text-bear-bright">
            {moreOpen ? 'Свернуть' : 'Как это работает'}
          </Text>
          <ChevronDown
            size={14}
            color="#C4B5FD"
            style={{ transform: [{ rotate: moreOpen ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {moreOpen && (
          <View className="gap-2 rounded-2xl bg-white/[0.03] p-3">
            <Text className="font-sans text-[14px] leading-snug text-bear-sub">
              {countBurned
                ? 'Так же считают MyFitnessPal и Samsung Health: потраченное возвращается в дневной баланс. Учтите: приложения часто преувеличивают сожжённое — если цифры сомнительны, выключите возврат.'
                : 'Многие приложения возвращают сожжённое, но часто преувеличивают его — из-за этого легко перебрать норму и не заметить дефицит. Включите возврат переключателем сверху, если доверяете цифрам шагомера.'}
            </Text>
            <Text className="font-sans text-[14px] leading-snug text-bear-sub">
              В отчётах у карточки «Калории» цель — уложиться в свою норму: день засчитан, если вы поели и не вышли за неё. Строка «Цель: 2/7 дн» значит: из 7 дней вы 2 дня уложились в норму.
            </Text>
          </View>
        )}

        {/* ── Особые дни: прибавка ккал к норме ─────────────────────── */}
        <View className="gap-2.5 rounded-2xl bg-white/[0.03] p-3.5">
          <Text className="font-bold text-[16px] text-bear-text">🗓 Особые дни</Text>
          <Text className="font-sans text-[14px] leading-snug text-bear-sub">
            В такой день норма вырастает на прибавку. Менструация отмечается сама (если включён трекер цикла), командировку и праздник отметьте чипом «Особый день» на Главной.
          </Text>
          {Object.keys(DAY_TYPES).map((t) => {
            const meta = DAY_TYPES[t]
            const val = deltas[t] || 0
            const btn =
              'h-9 w-9 items-center justify-center rounded-full active:opacity-70'
            return (
              <View key={t} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
                {/* Название — всей шириной строки: «Менструация», «Командировка»
                    и «Праздник» больше не обрезаются на узких экранах */}
                <View className="flex-row items-center gap-2.5">
                  <Text className="w-8 text-center text-[20px]">{meta.emoji}</Text>
                  <Text
                    maxFontSizeMultiplier={1.15}
                    className="min-w-0 flex-1 font-bold text-[15.5px] text-bear-text"
                  >
                    {meta.label}
                  </Text>
                </View>
                {/* Степпер отдельной строкой: − прибавка + */}
                <View className="mt-2 flex-row items-center gap-3 pl-[42px]">
                  <Pressable
                    onPress={() => setDelta(t, Math.max(DELTA_MIN, val - DELTA_STEP))}
                    disabled={val <= DELTA_MIN}
                    accessibilityRole="button"
                    accessibilityLabel={`Уменьшить прибавку для «${meta.label}»`}
                    hitSlop={6}
                    className={`${btn} bg-white/5 ${val <= DELTA_MIN ? 'opacity-30' : ''}`}
                  >
                    <Minus size={16} color="#AEB9D9" />
                  </Pressable>
                  <Text
                    maxFontSizeMultiplier={1.1}
                    className="min-w-0 flex-1 text-center font-bold text-[15px] text-[#C4B5FD]"
                  >
                    {`+${formatNum(val)} ккал`}
                  </Text>
                  <Pressable
                    onPress={() => setDelta(t, Math.min(DELTA_MAX, val + DELTA_STEP))}
                    disabled={val >= DELTA_MAX}
                    accessibilityRole="button"
                    accessibilityLabel={`Увеличить прибавку для «${meta.label}»`}
                    hitSlop={6}
                    className={`${btn} ${val >= DELTA_MAX ? 'bg-white/5 opacity-30' : ''}`}
                    style={val >= DELTA_MAX ? null : { backgroundColor: 'rgba(123,108,246,0.15)' }}
                  >
                    <Plus size={16} color="#A78BFA" />
                  </Pressable>
                </View>
              </View>
            )
          })}
          <Text className="font-sans text-[13px] leading-snug text-bear-dim">
            Шаг — {DELTA_STEP} ккал. Прибавка 0 — день помечен, но считается по базовой норме.
          </Text>
        </View>
      </View>
    )
  }

  return (
    <CollapsibleCard
      storageKey="diary"
      accessibilityLabel="Дневник питания"
      icon={<Utensils size={20} color="#C4B5FD" />}
      title="Дневник питания"
      right={switchEl}
    >
      <Text className="font-bold text-[16px] text-bear-text">{modeTitle}</Text>
      <Text className="mt-1 font-sans text-[15px] leading-snug text-bear-sub">{modeText}</Text>
      {/* Раскрывашка с подробностями: сравнение с MFP/SC Health,
          как читается «Цель: N/7 дн» в отчётах */}
      <Pressable
        onPress={() => setMoreOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: moreOpen }}
        accessibilityLabel={moreOpen ? 'Свернуть подробности' : 'Подробнее о режиме остатка'}
        hitSlop={6}
        className="mt-2 max-w-[220px] flex-row items-center gap-1 self-start active:opacity-70"
      >
        <Text className="font-semibold text-[13.5px] text-bear-bright">
          {moreOpen ? 'Свернуть' : 'Как это работает'}
        </Text>
        <ChevronDown
          size={14}
          color="#C4B5FD"
          style={{ transform: [{ rotate: moreOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {moreOpen && (
        <View className="mt-2 gap-2 rounded-2xl bg-white/[0.03] p-3">
          <Text className="font-sans text-[14px] leading-snug text-bear-sub">
            {countBurned
              ? 'Так же считают MyFitnessPal и Samsung Health: потраченное возвращается в дневной баланс. Учтите: приложения часто преувеличивают сожжённое — если цифры сомнительны, выключите возврат.'
              : 'Многие приложения возвращают сожжённое, но часто преувеличивают его — из-за этого легко перебрать норму и не заметить дефицит. Включите возврат переключателем сверху, если доверяете цифрам шагомера.'}
          </Text>
          <Text className="font-sans text-[14px] leading-snug text-bear-sub">
            В отчётах у карточки «Калории» цель — уложиться в свою норму: день засчитан, если вы поели и не вышли за неё. Строка «Цель: 2/7 дн» значит: из 7 дней вы 2 дня уложились в норму.
          </Text>
        </View>
      )}

      {/* ── Особые дни: прибавка ккал к норме ─────────────────────────── */}
      <View className="mt-3 gap-2.5 rounded-2xl bg-white/[0.03] p-3.5">
        <Text className="font-bold text-[16px] text-bear-text">🗓 Особые дни</Text>
        <Text className="font-sans text-[14px] leading-snug text-bear-sub">
          В такой день норма вырастает на прибавку. Менструация отмечается сама (если включён трекер цикла), командировку и праздник отметьте чипом «Особый день» на Главной.
        </Text>
        {Object.keys(DAY_TYPES).map((t) => {
          const meta = DAY_TYPES[t]
          const val = deltas[t] || 0
          const btn =
            'h-9 w-9 items-center justify-center rounded-full active:opacity-70'
          return (
            <View key={t} className="rounded-xl bg-white/[0.03] px-3 py-2.5">
              {/* Название — всей шириной строки: «Менструация», «Командировка»
                  и «Праздник» больше не обрезаются на узких экранах */}
              <View className="flex-row items-center gap-2.5">
                <Text className="w-8 text-center text-[20px]">{meta.emoji}</Text>
                <Text
                  maxFontSizeMultiplier={1.15}
                  className="min-w-0 flex-1 font-bold text-[15.5px] text-bear-text"
                >
                  {meta.label}
                </Text>
              </View>
              {/* Степпер отдельной строкой: − прибавка + */}
              <View className="mt-2 flex-row items-center gap-3 pl-[42px]">
                <Pressable
                  onPress={() => setDelta(t, Math.max(DELTA_MIN, val - DELTA_STEP))}
                  disabled={val <= DELTA_MIN}
                  accessibilityRole="button"
                  accessibilityLabel={`Уменьшить прибавку для «${meta.label}»`}
                  hitSlop={6}
                  className={`${btn} bg-white/5 ${val <= DELTA_MIN ? 'opacity-30' : ''}`}
                >
                  <Minus size={16} color="#AEB9D9" />
                </Pressable>
                <Text
                  maxFontSizeMultiplier={1.1}
                  className="min-w-0 flex-1 text-center font-bold text-[15px] text-[#C4B5FD]"
                >
                  {`+${formatNum(val)} ккал`}
                </Text>
                <Pressable
                  onPress={() => setDelta(t, Math.min(DELTA_MAX, val + DELTA_STEP))}
                  disabled={val >= DELTA_MAX}
                  accessibilityRole="button"
                  accessibilityLabel={`Увеличить прибавку для «${meta.label}»`}
                  hitSlop={6}
                  className={`${btn} ${val >= DELTA_MAX ? 'bg-white/5 opacity-30' : ''}`}
                  style={val >= DELTA_MAX ? null : { backgroundColor: 'rgba(123,108,246,0.15)' }}
                >
                  <Plus size={16} color="#A78BFA" />
                </Pressable>
              </View>
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
