// Карточка интервального голодания: таймер текущего сеанса
// (16/8 и другие планы). Контролы — в FastingControls.

import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Timer } from 'lucide-react-native'
import { useFastingStore } from '@/store/useFastingStore'
import { FastingControls } from './FastingControls'
import { two, fmtH } from '@/lib/data/fasting'

export function FastingCard() {
  const windowStart = useFastingStore((s) => s.windowStart)
  const windowHours = useFastingStore((s) => s.windowHours)
  const startedAt = useFastingStore((s) => s.startedAt)

  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000)
    return () => clearInterval(id)
  }, [])

  const winLabel = `${two(windowStart)}:00 – ${two((windowStart + windowHours) % 24)}:00`
  const planLabel = `${24 - windowHours}/${windowHours}`
  const running = !!startedAt

  const elapsed = running ? now - startedAt : 0
  const fastMs = (24 - windowHours) * 3600000
  const left = running ? Math.max(0, fastMs - elapsed) : 0
  const pct = running ? Math.min(100, Math.round((elapsed / fastMs) * 100)) : 0
  const fastDone = running && left === 0

  return (
    <View
      accessibilityLabel="Интервальное голодание"
      className="rounded-3xl border border-bear-line bg-bear-card p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <Timer size={18} color="#A78BFA" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Голодание {planLabel}
          </Text>
        </View>
        <View className="rounded-full bg-white/5 px-2.5 py-1">
          <Text className="font-semibold text-[10.5px] text-bear-soft">
            Окно {winLabel}
          </Text>
        </View>
      </View>

      {running ? (
        <View className="mt-3">
          <View className="flex-row items-baseline justify-between">
            <Text className="font-semibold text-[13px] text-[#AAB4D4]">
              {fastDone ? '🎉 Окно голодания пройдено!' : 'Голодание идёт'}
            </Text>
            <Text className="font-bold text-[13px] text-[#A78BFA]">
              {fastDone ? `${planLabel} выполнено` : `осталось ${fmtH(left)}`}
            </Text>
          </View>
          <View className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
            <View
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                backgroundColor: '#7B6CF6',
              }}
            />
          </View>
          {elapsed > 0 && (
            <Text className="mt-2 px-1 font-sans text-[10px] text-bear-dim">
              Прошло {fmtH(elapsed)} из {Math.round(fastMs / 3600000)} ч
            </Text>
          )}
        </View>
      ) : (
        <Text className="mt-3 font-sans text-[12px] leading-relaxed text-bear-sub2">
          Ешьте в окне {winLabel}, остальное время — вода, чай и кофе без
          сахара. Нажмите «Начать», когда окно закроется.
        </Text>
      )}

      <FastingControls running={running} winLabel={winLabel} planLabel={planLabel} />
    </View>
  )
}
