// Экран «Тело» (вкладка, раньше называлась «ИМТ») в стиле фото-макета:
// сверху переключатель-пилюли («Динамика веса» — раскрывает секцию
// и скроллит к ней, «ИМТ и состав тела» — активна, «Подробнее» — советы),
// главный блок БЕЗ карточки — кольцо ИМТ и легенда свободно парят на
// тёмном фоне (карточки «Вес / Рост» и «Вес за 30 дней» убраны: вес живёт
// в «Динамике веса», рост — карандашом в карточке «Текущий вес»),
// ниже — «Рекомендации» (с крестиком — скрывается), калькулятор,
// секции «Динамика веса» и «Измерения тела» (свёрнуты по умолчанию,
// тап по шапке раскрывает; цвета как у ИМТ), советы и фото-прогресс.

import { useEffect, useRef, useState } from 'react'
import { DeviceEventEmitter, Pressable, ScrollView, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChartColumn, ChevronRight, Scale, ShieldCheck } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { calcBmi, bmiCategory, normStreakWeeks } from '@/lib/data/bmi'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { BmiDonut } from '@/components/bmi/BmiDonut'
import { BmiLegend } from '@/components/bmi/BmiLegend'
import { BmiAdvice } from '@/components/bmi/BmiAdvice'
import { BmiCalculator } from '@/components/bmi/BmiCalculator'
import { WeightCard } from '@/components/bmi/WeightCard'
import { MeasurementsCard } from '@/components/bmi/MeasurementsCard'
import { TipOfDay } from '@/components/bmi/TipOfDay'
import { ProgressPhotos } from '@/components/bmi/ProgressPhotos'
import { AdviceModal } from '@/components/bmi/AdviceCard'
import { NormCongrats } from '@/components/bmi/NormCongrats'
import { WeightNudge } from '@/components/bmi/WeightNudge'
import { StreakHistoryModal } from '@/components/bmi/StreakHistoryModal'
import { consumeScrollToWeight } from '@/lib/navEvents'

// Мягкое неоновое свечение (дымка как на макете) — SoftGlow переехал
// в ui/SoftGlow.jsx: ту же дымку получают шапки всех страниц

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
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-semibold text-[13px] text-[#D6DCF2]">
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
  const weights = useProfileStore((s) => s.weights)
  const haptics = useUiPrefsStore((s) => s.haptics)
  // Блок «Рекомендации» скрыт крестиком (флаг в сторe переживает
  // перезапуск); кнопка «К рекомендациям» возвращает его
  const adviceHidden = useUiPrefsStore((s) => s.bmiAdviceHidden)
  const setBmiAdviceHidden = useUiPrefsStore((s) => s.setBmiAdviceHidden)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // Категория для карточки «Что означает твой ИМТ»: null — своя
  // (тап по кольцу, «Подробнее»), id — категория из строки легенды
  const [detailsCatId, setDetailsCatId] = useState(null)

  const bmi = calcBmi(weightKg, heightCm)
  // Стрик «в норме N недель» — сколько полных недель ИМТ держится в норме
  const normWeeks = normStreakWeeks(weightKg, weights, heightCm)

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
  // Мини-история ИМТ по неделям — тап по бейджу стрика
  const [streakOpen, setStreakOpen] = useState(false)
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

  // Секция «Динамика веса» по умолчанию свёрнута: пилюля сначала
  // раскрывает её, затем экран докручивает (даём отрисоваться)
  const scrollToWeight = () => {
    DeviceEventEmitter.emit('nutribear/expand-weight-section')
    setTimeout(
      () => scrollRef.current?.scrollTo({ y: Math.max(0, weightY.current - 8), animated: true }),
      350
    )
  }

  // Сквозной скролл к графику веса из других мест (например, тап по
  // карточке «Вес» в отчётах): если вкладка уже смонтирована — докручиваем
  // по событию; если вкладку только лениво смонтировали — забираем флаг
  // и даём списку отрисоваться, иначе scrollRef ещё пуст
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('nutribear/goto-weight-chart', () =>
      setTimeout(scrollToWeight, 350)
    )
    if (consumeScrollToWeight()) setTimeout(scrollToWeight, 600)
    return () => sub.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
            icon={<ChartColumn size={14} color="#A78BFA" />}
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
                <Scale size={15} color="#FFFFFF" />
                <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-bold text-[13px] text-white">
                  ИМТ и состав тела
                </Text>
              </View>
            </LinearGradient>
          </View>
          <NavPill
            label="Подробнее"
            chevron={<ChevronRight size={14} color="#A5AECB" />}
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
              {/* Кольцо + бейдж стрика «в норме N недель» + легенда.
                  Тап по кольцу — карточка со своей категорией,
                  тап по строке легенды — по её категории */}
              <View className="items-center gap-1.5">
                <Pressable
                  onPress={() => openDetails(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Что означает твой ИМТ — открыть подробности"
                  className="shrink-0 active:opacity-80"
                >
                  <BmiDonut bmi={bmi} />
                </Pressable>
                {normWeeks >= 1 && (
                  <Pressable
                    onPress={() => {
                      if (haptics) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {})
                      setStreakOpen(true)
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`В норме ${normWeeks} недель — открыть историю ИМТ по неделям`}
                    className="flex-row items-center gap-1 rounded-full px-2 py-[3px] active:opacity-70"
                    style={{
                      backgroundColor: 'rgba(56,189,248,0.13)',
                      borderColor: 'rgba(56,189,248,0.30)',
                      borderWidth: 1,
                    }}
                  >
                    <ShieldCheck size={13} color="#38BDF8" />
                    <Text
                      maxFontSizeMultiplier={1.1}
                      numberOfLines={1}
                      className="font-bold text-[12px] text-[#7DD3FC]"
                    >
                      {`В норме ${normWeeks} нед.`}
                    </Text>
                  </Pressable>
                )}
              </View>
              <View className="min-w-0 flex-1" style={{ minWidth: 96 }}>
                <BmiLegend bmi={bmi} onRowPress={openDetails} />
              </View>
            </View>
          </View>
        </View>

        {/* Рекомендации + идеальный диапазон ИМТ (сюда ведёт кнопка
            «К рекомендациям» из карточки «Что означает твой ИМТ»).
            Крестик в шапке блока прячет его до следующего вызова
            «К рекомендациям» */}
        {adviceHidden ? null : (
          <View
            onLayout={(e) => {
              adviceY.current = e.nativeEvent.layout.y
            }}
          >
            <BmiAdvice bmi={bmi} onDetails={() => openDetails(null)} />
          </View>
        )}

        {/* Калькулятор: пол, возраст, рост, вес */}
        <BmiCalculator />

        {/* Динамика веса (пилюля «Динамика веса» скроллит сюда).
            Над ней — мягкое напоминание мишки, если вес >7 дней не записывался */}
        <View
          onLayout={(e) => {
            weightY.current = e.nativeEvent.layout.y
          }}
        >
          <WeightNudge />
          <WeightCard />
        </View>

        {/* Замеры тела: плитки, «Общий прогресс» с датчиком и таблица */}
        <MeasurementsCard />

        {/* Совет дня: один совет про вес/замеры на день */}
        <TipOfDay />

        <ProgressPhotos />
      </ScrollView>

      <AdviceModal
        bmi={bmi}
        catId={detailsCatId}
        weightKg={weightKg}
        heightCm={heightCm}
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        onRecommendations={() => {
          setDetailsOpen(false)
          // Если блок закрыт крестиком — возвращаем его, затем
          // плавно скроллим к советам
          setBmiAdviceHidden(false)
          setTimeout(
            () =>
              scrollRef.current?.scrollTo({
                y: Math.max(0, adviceY.current - 8),
                animated: true,
              }),
            350
          )
        }}
      />

      {/* Поздравление медвежонка: один раз, при живом переходе в «Норму» */}
      <NormCongrats open={congratsOpen} onClose={() => setCongratsOpen(false)} bmi={bmi} />

      {/* Мини-история ИМТ по неделям — тап по бейджу стрика */}
      <StreakHistoryModal
        open={streakOpen}
        onClose={() => setStreakOpen(false)}
        weightKg={weightKg}
        weights={weights}
        heightCm={heightCm}
      />
    </View>
  )
}
