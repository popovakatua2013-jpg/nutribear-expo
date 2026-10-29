// Карточка интервального голодания: круговой прогресс слева (как в
// «Прогрессе»), фактические времена — справа. Все времена привязаны к
// реальному моменту старта: начали в 01:00 при 16/8 → голодание
// 01:00–17:00, окно питания 17:00–01:00. Контролы — в FastingControls.

import { useEffect, useState } from 'react'
import { AppState, Text, View } from 'react-native'
import { Timer } from 'lucide-react-native'
import { useFastingStore } from '@/store/useFastingStore'
import { FastingControls } from './FastingControls'
import { FastingRing } from './FastingRing'
import { fmtH, fmtClock } from '@/lib/data/fasting'

// Запас после конца голодания, прежде чем зависший сеанс
// (начали вчера и забыли завершить) будет сброшен автоматически
const STALE_MS = 12 * 3600000

export function FastingCard() {
  const windowHours = useFastingStore((s) => s.windowHours)
  const startedAt = useFastingStore((s) => s.startedAt)
  const fastHours = useFastingStore((s) => s.fastHours)

  const [now, setNow] = useState(() => Date.now())

  // Живой тик каждую секунду + мгновенное обновление после
  // возврата приложения из фона (раньше показ замирал до 30 с)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'active') setNow(Date.now())
    })
    return () => {
      clearInterval(id)
      sub.remove()
    }
  }, [])

  const running = !!startedAt

  // План сеанса заморожен в момент старта — смена плашек на ходу
  // больше не искажает процент и «осталось»
  const planFastH = running && fastHours ? fastHours : 24 - windowHours
  const planLabel = `${planFastH}/${24 - planFastH}`
  const fastMs = planFastH * 3600000

  const elapsed = running ? now - startedAt : 0
  const left = running ? Math.max(0, fastMs - elapsed) : 0
  const pct = running ? Math.min(100, Math.round((elapsed / fastMs) * 100)) : 0
  const fastDone = running && left === 0

  // Зависший сеанс: если после конца голодания прошло больше STALE_MS,
  // завершаем автоматически, чтобы блок не висел «выполненным» сутками
  useEffect(() => {
    if (running && elapsed > fastMs + STALE_MS) {
      useFastingStore.getState().stop()
    }
  }, [running, elapsed, fastMs])

  // Фактическое окно питания — от реального времени старта
  const eatOpen = running ? startedAt + fastMs : now + planFastH * 3600000
  const eatClose = eatOpen + (24 - planFastH) * 3600000
  const winLabel = `${fmtClock(eatOpen)} – ${fmtClock(eatClose)}`

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
            {running ? `Окно ${winLabel}` : `Сейчас ${fmtClock(now)}`}
          </Text>
        </View>
      </View>

      {running ? (
        <View className="mt-4 flex-row items-center gap-4">
          <FastingRing pct={pct} />
          <View className="min-w-0 flex-1">
            <Text className="font-semibold text-[13px] text-[#AAB4D4]">
              {fastDone ? '🎉 Окно голодания пройдено!' : 'Голодание идёт'}
            </Text>
            <Text className="mt-0.5 font-bold text-[16px] text-[#A78BFA]">
              {fastDone ? `${planLabel} выполнено` : `осталось ${fmtH(left)}`}
            </Text>
            <Text className="mt-2 font-sans text-[10px] text-bear-dim">
              {fastDone
                ? `Окно питания открыто до ${fmtClock(eatClose)}`
                : `Прошло ${fmtH(elapsed)} из ${planFastH} ч · окно в ${fmtClock(eatOpen)}`}
            </Text>
          </View>
        </View>
      ) : (
        <View className="mt-4 flex-row items-center gap-4">
          <FastingRing pct={0} />
          <Text className="min-w-0 flex-1 font-sans text-[12px] leading-relaxed text-bear-sub2">
            Начнёте сейчас ({fmtClock(now)}) — таймер пойдёт от текущего
            времени: окно питания откроется в {fmtClock(eatOpen)} и закроется
            в {fmtClock(eatClose)}. Вне окна — вода, чай и кофе без сахара.
          </Text>
        </View>
      )}

      <FastingControls running={running} planLabel={planLabel} />
    </View>
  )
}
