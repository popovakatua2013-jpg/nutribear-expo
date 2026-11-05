// Карточка «Итоги недели» для шеринга: красивый слепок периода —
// мишка, средние калории, шаги, вода, сжигание и стрик. Кнопка
// «Поделиться» снимает карточку в PNG (react-native-view-shot) и
// открывает системное меню («Сохранить в файл», WhatsApp, Telegram…).
// Иконки показателей — из общего реестра lib/data/metrics.js
// («Сожжено» — Sparkles, как на графиках и карточках отчётов).

import { useRef, useState } from 'react'
import { Image, Modal, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { ArrowDownRight, ArrowUpRight, BookOpen, Droplets, Flame, Footprints, Share2, Sparkles, Timer, X } from 'lucide-react-native'
import { formatNum, pluralDays } from '@/lib/format'
import { formatLiters, changePct, deltaTone } from '@/lib/data/reports'
import { METRICS } from '@/lib/data/metrics'

const BEAR = require('../../../../assets/images/bear.webp')
const MAX = 1.25

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

export function WeeklyShareCard({ open, onClose, totals, prev, recorded, streak = 0, days = 7 }) {
  const cardRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const avgKcal = Math.round((totals?.kcal || 0) / Math.max(1, days))
  const title = days === 7 ? 'Итоги недели' : `Итоги за ${days} ${pluralDays(days)}`

  async function share() {
    if (busy || !cardRef.current) return
    setBusy(true)
    try {
      const uri = await captureRef(cardRef, { result: 'tmpfile', format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Итоги NutriBear',
        })
      }
    } catch {
      // шаринг недоступен или отменён — молча закрывать не будем
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
          accessibilityLabel="Карточка итогов для поделиться"
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
                  {days} {pluralDays(days)}
                </Text>
              </View>
            </View>

            {/* Заголовок периода */}
            <Text maxFontSizeMultiplier={MAX} className="mt-4 font-extrabold text-[25px] leading-tight tracking-tight text-white">
              {title} 🐻
            </Text>

            {/* Сетка показателей 2×2 */}
            <View className="mt-3.5 flex-row gap-2.5">
              <Stat Icon={Timer} color="#a78bfa" value={formatNum(avgKcal)} label="ккал в день, в среднем" />
              <Stat Icon={Footprints} color="#4ade80" value={formatNum(totals?.steps || 0)} label="шагов за период" />
            </View>
            <View className="mt-2.5 flex-row gap-2.5">
              <Stat Icon={Droplets} color="#38bdf8" value={formatLiters(totals?.waterMl || 0)} label="воды выпито" />
              <Stat Icon={Sparkles} color="#fb923c" value={formatNum(totals?.burned || 0)} label="ккал сожжено" />
            </View>

            {/* Сравнение с прошлым периодом: только показатели, по которым
                в прошлый период были данные — иначе Δ бессмысленна */}
            {METRICS.some((m) => (prev?.[m.key] || 0) > 0) ? (
              <View className="mt-2.5 rounded-2xl bg-white/[0.05] px-3 py-2.5">
                <Text maxFontSizeMultiplier={MAX} className="font-sans text-[12px] text-white/50">
                  К прошлому периоду
                </Text>
                <View className="mt-1.5 flex-row flex-wrap gap-x-3 gap-y-1">
                  {METRICS.filter((m) => (prev?.[m.key] || 0) > 0).map((m) => {
                    const pct = changePct(totals?.[m.key] || 0, prev[m.key])
                    const tone = deltaTone(pct, m.invert, '#8B96B8')
                    const Arrow = pct > 0 ? ArrowUpRight : pct < 0 ? ArrowDownRight : null
                    return (
                      <View key={m.key} className="flex-row items-center gap-1">
                        {Arrow ? <Arrow size={13} color={tone} /> : null}
                        <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12.5px]" style={{ color: tone }}>
                          {`${m.label.toLowerCase()} ${pct > 0 ? '+' : ''}${pct}%`}
                        </Text>
                      </View>
                    )
                  })}
                </View>
              </View>
            ) : null}

            {/* Стрик */}
            {streak > 0 ? (
              <View className="mt-2.5 flex-row items-center gap-1.5 self-start rounded-full bg-[#fb923c]/15 px-3 py-1.5">
                <Flame size={15} color="#fb923c" />
                <Text maxFontSizeMultiplier={MAX} className="font-bold text-[14px] text-[#fdba74]">
                  {`${streak} ${pluralDays(streak)} подряд 🔥`}
                </Text>
              </View>
            ) : null}

            {/* Дисциплина: сколько дней периода велся дневник */}
            {recorded != null ? (
              <View className="mt-2 flex-row items-center gap-1.5 self-start rounded-full bg-[#4D7CFE]/15 px-3 py-1.5">
                <BookOpen size={15} color="#8DABFF" />
                <Text maxFontSizeMultiplier={MAX} className="font-bold text-[14px] text-[#8DABFF]">
                  {`вели дневник ${recorded} из ${days} дней`}
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
          accessibilityLabel="Поделиться карточкой итогов"
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
          accessibilityLabel="Закрыть карточку итогов"
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
