// Экран «ИМТ» в стиле фото-макета: сверху переключатель-пилюли
// («Динамика веса» → скролл к карточке веса, «ИМТ и состав тела» — активна,
// «Подробнее» — советы), главный блок БЕЗ карточки — кольцо ИМТ
// и легенда свободно парят на тёмном фоне, ниже — тёмные
// карточки «Вес / Рост», блок «Рекомендации» с полосой идеального диапазона.
// Ниже — калькулятор, динамика веса и фото-прогресс.

import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChartColumn, ChevronRight, Scale } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { calcBmi, bmiCategory } from '@/lib/data/bmi'
import { BmiDonut } from '@/components/bmi/BmiDonut'
import { BmiLegend } from '@/components/bmi/BmiLegend'
import { BmiStatCards } from '@/components/bmi/BmiStatCards'
import { BmiAdvice } from '@/components/bmi/BmiAdvice'
import { BmiCalculator } from '@/components/bmi/BmiCalculator'
import { WeightCard } from '@/components/bmi/WeightCard'
import { ProgressPhotos } from '@/components/bmi/ProgressPhotos'
import { AdviceModal } from '@/components/bmi/AdviceCard'
import { NormCongrats } from '@/components/bmi/NormCongrats'

// Мягкое неоновое свечение (дымка как на макете): радиальный градиент
// плавно уходит в прозрачность — без жёсткого края круглой заливки
function SoftGlow({ w, h, style, color = '#7C3AED', peak = 0.32, id }) {
  return (
    <Svg width={w} height={h} pointerEvents="none" style={[{ position: 'absolute' }, style]}>
      <Defs>
        <RadialGradient id={id} cx="0.5" cy="0.5" r="0.5">
          <Stop offset="0" stopColor={color} stopOpacity={peak} />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id})`} />
    </Svg>
  )
}

// Неактивная пилюля переключателя
function NavPill({ label, icon, chevron, onPress, accessibilityLabel }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || label}
      className="min-w-0 shrink flex-row items-center gap-1 rounded-full border px-2 py-[7px] active:opacity-70"
      style={{ backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }}
    >
      {icon}
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-semibold text-[11px] text-[#D6DCF2]">
        {label}
      </Text>
      {chevron}
    </Pressable>
  )
}

export default function BmiScreen() {
  const insets = useSafeAreaInsets()
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const haptics = useUiPrefsStore((s) => s.haptics)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // Категория для карточки «Что означает твой ИМТ»: null — своя
  // (тап по кольцу, «Подробнее»), id — категория из строки легенды
  const [detailsCatId, setDetailsCatId] = useState(null)

  const bmi = calcBmi(weightKg, heightCm)

  // Открыть карточку пояснения: с лёгкой вибрацией (как у кольца)
  const openDetails = (catId = null) => {
    if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
    setDetailsCatId(catId)
    setDetailsOpen(true)
  }

  // ─── Поздравление при переходе ИМТ в «Норму» ─────────────────────
  // Сравниваем категорию с последней известной (lastBmiCat в профиле):
  // живой переход «не норма → норма» — один раз показываем окно.
  // Ждём гидрацию AsyncStorage — иначе до загрузки профиля можно
  // случайно перезаписать сохранённую категорию и поздравить зря.
  const lastBmiCat = useProfileStore((s) => s.lastBmiCat)
  const setLastBmiCat = useProfileStore((s) => s.setLastBmiCat)
  const [congratsOpen, setCongratsOpen] = useState(false)
  const [hydrated, setHydrated] = useState(useProfileStore.persist.hasHydrated())

  useEffect(() => {
    const unsub = useProfileStore.persist.onFinishHydration(() => setHydrated(true))
    return unsub
  }, [])

  const curCatId = bmiCategory(bmi).id
  useEffect(() => {
    if (!hydrated || !bmi) return
    if (lastBmiCat == null) {
      // Первый запуск — просто запоминаем категорию, без поздравления
      setLastBmiCat(curCatId)
      return
    }
    if (lastBmiCat !== curCatId) {
      if (curCatId === 'norm') setCongratsOpen(true)
      setLastBmiCat(curCatId)
    }
  }, [hydrated, bmi, lastBmiCat, curCatId, setLastBmiCat])

  // Скролл к карточке «Динамика веса» и к блоку рекомендаций
  const scrollRef = useRef(null)
  const weightY = useRef(0)
  const adviceY = useRef(0)

  const scrollToWeight = () =>
    scrollRef.current?.scrollTo({ y: Math.max(0, weightY.current - 8), animated: true })

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 14,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Переключатель-пилюли как на макете */}
        <View accessibilityLabel="Разделы: ИМТ и динамика веса" className="flex-row items-center gap-1">
          <NavPill
            label="Динамика веса"
            icon={<ChartColumn size={12} color="#A78BFA" />}
            onPress={scrollToWeight}
            accessibilityLabel="Перейти к динамике веса"
          />
          {/* Активная пилюля: чистый яркий градиент без обводки — как на макете */}
          <View
            accessibilityLabel="ИМТ и состав тела — текущий раздел"
            accessibilityState={{ selected: true }}
            className="overflow-hidden rounded-full"
            style={{
              shadowColor: '#8B5CF6',
              shadowOpacity: 0.55,
              shadowRadius: 12,
            }}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={['#A855F7', '#7C3AED']}
              style={{ paddingHorizontal: 9, paddingVertical: 7 }}
            >
              <View className="flex-row items-center gap-1">
                <Scale size={13} color="#FFFFFF" />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-bold text-[11px] text-white">
                  ИМТ и состав тела
                </Text>
              </View>
            </LinearGradient>
          </View>
          <NavPill
            label="Подробнее"
            chevron={<ChevronRight size={12} color="#A5AECB" />}
            onPress={() => openDetails(null)}
            accessibilityLabel="Подробнее о категориях и рекомендациях"
          />
        </View>

        {/* Главный блок: БЕЗ карточки — кольцо и легенда свободно
            парят на тёмном фоне; ниже — тёмные карточки «Вес» и «Рост» */}
        <View accessibilityLabel="ИМТ и состав тела">
          {/* Мягкая неоновая дымка справа сверху и по правому краю — как на макете */}
          <SoftGlow id="nbsGlowTR" w={185} h={150} peak={0.34} style={{ top: -24, right: -42 }} />
          <SoftGlow id="nbsGlowR" w={130} h={215} peak={0.2} color="#8B5CF6" style={{ top: 64, right: -30 }} />
          <View className="gap-2.5">
            <View className="flex-row items-center gap-2">
              {/* Кольцо ИМТ + легенда категорий. Тап по кольцу — карточка
                  со своей категорией, тап по строке легенды — по её категории */}
              <Pressable
                onPress={() => openDetails(null)}
                accessibilityRole="button"
                accessibilityLabel="Что означает твой ИМТ — открыть подробности"
                className="shrink-0 active:opacity-80"
              >
                <BmiDonut bmi={bmi} />
              </Pressable>
              <View className="min-w-0 flex-1" style={{ minWidth: 96 }}>
                <BmiLegend bmi={bmi} onRowPress={openDetails} />
              </View>
            </View>
            <BmiStatCards />
          </View>
        </View>

        {/* Рекомендации + идеальный диапазон ИМТ (сюда ведёт кнопка
            «К рекомендациям» из карточки «Что означает твой ИМТ») */}
        <View
          onLayout={(e) => {
            adviceY.current = e.nativeEvent.layout.y
          }}
        >
          <BmiAdvice bmi={bmi} onDetails={() => openDetails(null)} />
        </View>

        {/* Калькулятор: пол, возраст, рост, вес */}
        <BmiCalculator />

        {/* Динамика веса (пилюля «Динамика веса» скроллит сюда) */}
        <View
          onLayout={(e) => {
            weightY.current = e.nativeEvent.layout.y
          }}
        >
          <WeightCard />
        </View>
        <ProgressPhotos />
      </ScrollView>

      <AdviceModal
        bmi={bmi}
        catId={detailsCatId}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRecommendations={() => {
          setDetailsOpen(false)
          // Даём модалке закрыться, затем плавно скроллим к советам
          setTimeout(
            () =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, adviceY.current - 8),
                animated: true,
              }),
            280
          )
        }}
      />

      {/* Поздравление медвежонка: один раз, при живом переходе в «Норму» */}
      <NormCongrats open={congratsOpen} onClose={() => setCongratsOpen(false)} bmi={bmi} />
    </View>
  )
}
