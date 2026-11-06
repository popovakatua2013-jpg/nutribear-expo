// Карточка «Итоги дня» для шеринга — ответ на отзыв «каждый день шлю
// тренеру скрины»: одна кнопка вместо серии скриншотов. Слепок дня:
// калории с нормой, БЖУ и клетчатка, шаги, вода, сожжено и стрик.
// По стилю повторяет WeeklyShareCard (арт-файл, не трогаем): кнопка
// «Поделиться» снимает карточку в PNG (react-native-view-shot) и
// открывает системное меню (WhatsApp, Telegram, «Сохранить в файл»…).
// Данные читает сама из сторов — живое «сегодня», props не нужны.

import { useRef, useState } from 'react'
import { Image, Modal, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Droplets, Flame, Footprints, Share2, Sparkles, Utensils, X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { formatLiters } from '@/lib/data/reports'
import { totalConsumed, dayBju } from '@/lib/data/diary'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useExerciseStore, totalBurned } from '@/store/useExerciseStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { streakOf } from '@/lib/streak'

const BEAR = require('../../../../assets/images/bear.webp')
const MAX = 1.25

const MONTHS_RU = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

function todayLabel() {
  const now = new Date()
  return `${now.getDate()} ${MONTHS_RU[now.getMonth()]}`
}

function Stat({ Icon, color, value, label }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl bg-white/[0.06] px-3 py-2.5">
      <View className="flex-row items-center gap-1.5">
        <Icon size={15} color={color} />
        <Text maxFontSizeMultiplier={MAX} className="font-sans text-[12px] text-white/60">
          {label}
        </Text>
      </View>
      <Text
        numberOfLines={1}
        maxFontSizeMultiplier={MAX}
        className="mt-1 font-extrabold text-[19px] leading-tight text-white"
      >
        {value}
      </Text>
    </View>
  )
}

export function DayShareCard({ open, onClose }) {
  const cardRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const entries = useFoodStore((s) => s.entries)
  const waterMl = useActivityStore((s) => s.waterMl)
  const steps = useActivityStore(selectTotalSteps)
  const exLogs = useExerciseStore((s) => s.logs)
  const goals = useGoalsStore((s) => s.goals)
  const streak = streakOf(useHistoryStore((s) => s.days))

  const consumed = totalConsumed(entries)
  const bju = dayBju(entries)
  const burned = totalBurned(exLogs, dayKeyOf(), steps)

  async function share() {
    if (busy || !cardRef.current) return
    setBusy(true)
    try {
      const uri = await captureRef(cardRef, { result: 'tmpfile', format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Итоги дня — NutriBear',
        })
      }
    } catch {
      // шаринг недоступен или отменён — молча
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/70 px-8">
        {/* Карточка для снятия в PNG */}
        <View
          ref={cardRef}
          collapsable={false}
          accessibilityLabel="Карточка итогов дня для поделиться"
          className="w-full overflow-hidden rounded-3xl border border-white/10"
          style={{ backgroundColor: '#101831' }}
        >
          <LinearGradient colors={['rgba(77,124,254,0.16)', 'rgba(139,92,246,0.05)', 'rgba(16,24,49,0)']} style={{ padding: 20 }}>
            {/* Шапка: мишка + бренд */}
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-white/5">
                <Image source={BEAR} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-extrabold text-[17px] leading-tight text-white">NutriBear</Text>
                <Text className="font-sans text-[12px] text-white/50">дневник питания и активности</Text>
              </View>
              <View className="rounded-full bg-white/10 px-2.5 py-1">
                <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12px] text-white/70">
                  {todayLabel()}
                </Text>
              </View>
            </View>

            {/* Заголовок */}
            <Text maxFontSizeMultiplier={MAX} className="mt-4 font-extrabold text-[25px] leading-tight tracking-tight text-white">
              Итоги дня 🐻
            </Text>

            {/* Сетка показателей 2×2 */}
            <View className="mt-3.5 flex-row gap-2.5">
              <Stat Icon={Utensils} color="#a78bfa" value={`${formatNum(consumed)} / ${formatNum(goals.kcal)}`} label="ккал съедено из нормы" />
              <Stat Icon={Footprints} color="#4ade80" value={formatNum(steps)} label="шагов" />
            </View>
            <View className="mt-2.5 flex-row gap-2.5">
              <Stat Icon={Droplets} color="#38bdf8" value={formatLiters(waterMl)} label="воды выпито" />
              <Stat Icon={Sparkles} color="#fb923c" value={formatNum(burned)} label="ккал сожжено" />
            </View>

            {/* БЖУ и клетчатка дня */}
            <View className="mt-2.5 rounded-2xl bg-white/[0.05] px-3 py-2.5">
              <Text maxFontSizeMultiplier={MAX} className="font-sans text-[12px] text-white/50">
                Пищевая ценность
              </Text>
              <View className="mt-1.5 flex-row flex-wrap gap-x-3 gap-y-1">
                <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12.5px] text-[#34D399]">
                  {`белки ${formatNum(bju.p)} г`}
                </Text>
                <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12.5px] text-[#FB923C]">
                  {`жиры ${formatNum(bju.f)} г`}
                </Text>
                <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12.5px] text-[#38BDF8]">
                  {`углеводы ${formatNum(bju.c)} г`}
                </Text>
                <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12.5px] text-[#2DD4BF]">
                  {`клетчатка ${formatNum(bju.fib || 0)} г`}
                </Text>
              </View>
            </View>

            {/* Стрик */}
            {streak > 0 ? (
              <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-[#fb923c]/15 px-3 py-1.5">
                <Flame size={15} color="#fb923c" />
                <Text maxFontSizeMultiplier={MAX} className="font-bold text-[14px] text-[#fdba74]">
                  {`${streak} дн. дневника подряд 🔥`}
                </Text>
              </View>
            ) : null}

            {/* Подвал карточки */}
            <Text className="mt-4 font-sans text-[11.5px] text-white/40">
              Данные хранятся только на устройстве · NutriBear
            </Text>
          </LinearGradient>
        </View>

        {/* Кнопки под карточкой (в PNG не попадают) */}
        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Поделиться карточкой итогов дня"
          disabled={busy}
          className="mt-4 w-full overflow-hidden rounded-2xl active:opacity-80"
        >
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
            <View className="flex-row items-center justify-center gap-2 py-3.5">
              <Share2 size={19} color="#FFFFFF" />
              <Text className="font-bold text-[18px] text-white">
                {busy ? 'Готовим…' : 'Поделиться'}
              </Text>
            </View>
          </LinearGradient>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрыть карточку итогов дня"
          className="mt-1 w-full items-center py-3"
        >
          <View className="flex-row items-center gap-1.5">
            <X size={17} color="#8B96B8" />
            <Text className="font-semibold text-[15.5px] text-bear-sub">Закрыть</Text>
          </View>
        </Pressable>
      </View>
    </Modal>
  )
}
