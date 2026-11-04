// Карточки «Вес | Рост» в стиле макета «Динамика веса»: одна широкая
// hero-строка с двумя половинами и вертикальной разделительной линией —
// слева крупный светящийся градиентный чип + вес (26px) и изменение
// за неделю, справа рост и «✓ Постоянный». Тап по половине «Вес» —
// окно записи веса. Ниже — отдельная карточка на всю ширину с
// мини-графиком веса за 30 дней (спарклайн, тап по точке — дата и вес).

import { useEffect, useRef, useState } from 'react'
import { DeviceEventEmitter, Pressable, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { LinearGradient } from 'expo-linear-gradient'
import { Check, Ruler, TrendingDown, TrendingUp, Weight } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { fmtDecimal, healthyRange, monthWeights, weekWeights } from '@/lib/data/bmi'
import { WeightMiniChart } from './WeightMiniChart'

// Тёмные полупрозрачные карточки на фоне страницы — как на макете
const CARD = {
  backgroundColor: 'rgba(29,18,64,0.82)',
  borderColor: 'rgba(168,85,247,0.30)',
  borderWidth: 1,
}

// Большой светящийся чип-иконка — как на макете (44px, градиент, неон)
function Chip({ children }) {
  return (
    <View
      className="h-[44px] w-[44px] overflow-hidden rounded-[14px]"
      style={{ shadowColor: '#8B5CF6', shadowOpacity: 0.55, shadowRadius: 9 }}
    >
      <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#8B5CF6', '#6D28D9']}>
        <View className="h-[44px] w-[44px] items-center justify-center">{children}</View>
      </LinearGradient>
    </View>
  )
}

// Цветная капсула-бейдж («без изм.», «↑ +0,5», «✓ Постоянный»)
function Badge({ bg, children }) {
  return (
    <View
      className="flex-row items-center gap-1 rounded-full px-1.5 py-[2px]"
      style={{ backgroundColor: bg }}
    >
      {children}
    </View>
  )
}

export function BmiStatCards() {
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const weights = useProfileStore((s) => s.weights)
  const hapticsOn = useUiPrefsStore((s) => s.haptics)

  // Выбранная точка мини-графика (тап) — подпись «дата · вес» вместо
  // заголовка; через 5 секунд возвращается заголовок
  const [sel, setSel] = useState(null)
  const selTimer = useRef(null)
  useEffect(() => {
    if (sel == null) return
    clearTimeout(selTimer.current)
    selTimer.current = setTimeout(() => setSel(null), 5000)
    return () => clearTimeout(selTimer.current)
  }, [sel])

  // Изменение веса за неделю — как в карточке «Динамика веса»
  const week = weekWeights(weightKg, weights)
  const delta = Math.round((week[week.length - 1].kg - week[0].kg) * 10) / 10
  const { min, max } = healthyRange(heightCm)
  const towardNorm =
    (delta < 0 && week[week.length - 1].kg >= min) ||
    (delta > 0 && week[week.length - 1].kg <= max)
  const deltaColor = delta === 0 ? '#8B96B8' : towardNorm ? '#4ADE80' : '#FB7185'
  const deltaBg =
    delta === 0
      ? 'rgba(139,150,184,0.14)'
      : towardNorm
        ? 'rgba(74,222,128,0.14)'
        : 'rgba(251,113,133,0.14)'

  // Мини-график за 30 дней (точка каждые 3 дня)
  const month = monthWeights(weightKg, weights)
  const selPoint = sel != null && month[sel] ? month[sel] : null

  return (
    <View className="gap-2">
      {/* Hero-строка «Вес | Рост»: две половины с разделителем, как на
          макете «Динамика веса» (там — «вес сейчас | цель») */}
      <View className="flex-row items-stretch rounded-[18px]" style={CARD}>
        {/* Вес — тап открывает окно записи веса */}
        <Pressable
          onPress={() => DeviceEventEmitter.emit('nutribear/open-weight')}
          accessibilityRole="button"
          accessibilityLabel={`Вес ${fmtDecimal(weightKg)} кг — нажмите, чтобы записать новый вес`}
          className="min-w-0 flex-1 p-3 active:opacity-80"
        >
          <View className="flex-row items-center gap-2">
            <Chip>
              <Weight size={20} color="#FFFFFF" />
            </Chip>
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-semibold text-[12px] text-bear-sub">
              Вес
            </Text>
          </View>
          <View className="mt-2 flex-row items-baseline gap-1">
            <Text maxFontSizeMultiplier={1.15} numberOfLines={1} className="font-extrabold text-[26px] leading-none tracking-tight text-white">
              {fmtDecimal(weightKg)}
            </Text>
            <Text className="font-semibold text-[12px] text-bear-sub2">кг</Text>
          </View>
          <View className="mt-2 flex-row items-center gap-1.5">
            <Badge bg={deltaBg}>
              {delta < 0 && <TrendingDown size={11} color={deltaColor} />}
              {delta > 0 && <TrendingUp size={11} color={deltaColor} />}
              <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-bold text-[10.5px]" style={{ color: deltaColor }}>
                {delta === 0
                  ? 'без изм.'
                  : `${delta > 0 ? '+' : '−'}${fmtDecimal(Math.abs(delta))}`}
              </Text>
            </Badge>
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-sans text-[9.5px] text-bear-dim">
              ~ за неделю
            </Text>
          </View>
        </Pressable>

        {/* Вертикальный разделитель между половинами — как на макете */}
        <View className="my-3 w-px bg-white/10" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />

        {/* Рост — справочный показатель, вторая половина hero-строки */}
        <View
          accessibilityLabel={`Рост ${heightCm} сантиметров`}
          className="min-w-0 flex-1 p-3"
        >
          <View className="flex-row items-center gap-2">
            <Chip>
              <Ruler size={20} color="#FFFFFF" />
            </Chip>
            <Text maxFontSizeMultiplier={1.1} numberOfLines={1} className="font-semibold text-[12px] text-bear-sub">
              Рост
            </Text>
          </View>
          <View className="mt-2 flex-row items-baseline gap-1">
            <Text maxFontSizeMultiplier={1.15} numberOfLines={1} className="font-extrabold text-[26px] leading-none tracking-tight text-white">
              {heightCm}
            </Text>
            <Text className="font-semibold text-[12px] text-bear-sub2">см</Text>
          </View>
          <View className="mt-2 flex-row items-center">
            <Badge bg="rgba(74,222,128,0.12)">
              <Check size={11} color="#4ADE80" strokeWidth={3} />
              <Text maxFontSizeMultiplier={1.05} numberOfLines={1} className="font-bold text-[10.5px] text-[#4ADE80]">
                Постоянный
              </Text>
            </Badge>
          </View>
        </View>
      </View>

      {/* Мини-график веса за 30 дней — карточка на всю ширину, как
          карточка графика на макете (тап по точке — дата и вес,
          тап по карточке — запись веса) */}
      <Pressable
        onPress={() => DeviceEventEmitter.emit('nutribear/open-weight')}
        accessibilityRole="button"
        accessibilityLabel="График веса за 30 дней — нажмите, чтобы записать новый вес"
        className="rounded-[18px] p-3 pt-2.5 active:opacity-80"
        style={CARD}
      >
        <View className="flex-row items-center gap-1.5">
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            className={`min-w-0 flex-1 ${selPoint ? 'font-bold text-[10.5px] text-white' : 'font-sans text-[9.5px] text-bear-dim'}`}
          >
            {selPoint ? `${selPoint.label} · ${fmtDecimal(selPoint.kg)} кг` : 'Вес за 30 дней'}
          </Text>
          <View className="rounded-full bg-white/5 px-2 py-0.5">
            <Text className="font-sans text-[9px] text-bear-sub">кг</Text>
          </View>
        </View>
        <WeightMiniChart
          data={month}
          color="#A78BFA"
          height={44}
          activeIndex={sel}
          onPick={(idx) => {
            setSel(idx)
            if (idx != null && hapticsOn) {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
            }
          }}
        />
      </Pressable>
    </View>
  )
}
