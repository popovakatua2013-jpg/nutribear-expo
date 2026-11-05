// Модалка «Рекомендации»: текст и советы по категории ИМТ.
// Открывается с вкладки «Тело» — кнопкой «Подробнее», стрелкой
// на трофейном баннере, тапом по кольцу и тапом по строке легенды.
// catId — необязательная категория: для строки легенды показываем
// пояснение именно той категории (мини-кольцо всегда показывает
// реальный ИМТ пользователя). В шапке — мини-копия кольца
// (та же шкала 15→40, статичный снимок).
// Кнопка «К рекомендациям» закрывает модалку и скроллит к блоку
// советов на вкладке (если передан onRecommendations).

import { Modal, ScrollView, Text, View, Pressable } from 'react-native'
import Svg, {
  Defs,
  LinearGradient as SvgGradient,
  Stop,
  Circle,
  Path,
} from 'react-native-svg'
import { ArrowDown, Target, X } from 'lucide-react-native'
import { BMI_CATEGORIES, bmiCategory, fmtDecimal, kgToNextCategory, RECOMMENDATIONS } from '@/lib/data/bmi'

// Та же шкала, что у большого кольца на вкладке (BmiDonut)
const MR_BMI_MIN = 15
const MR_BMI_MAX = 40
const MR_START_DEG = 262
const MR_SWEEP_DEG = 270

// Короткое название категории — чтобы умещалось в отверстии мини-кольца
const MINI_SHORT = {
  low: 'Дефицит',
  norm: 'Норма',
  over: 'Лишний вес',
  obese1: 'Ожирение',
  obese2: 'Ожирение',
}

// Мини-копия кольца ИМТ: тот же градиент и углы, без анимаций —
// статичный снимок текущего значения (id градиента свой — nbsRingMini,
// чтобы не пересекаться с большим кольцом на вкладке)
function MiniRing({ bmi, catColor, shortLabel }) {
  const SIZE = 66
  const C = 33
  const R = 25
  const STROKE = 8

  const target = Math.min(MR_BMI_MAX, Math.max(MR_BMI_MIN, bmi || MR_BMI_MIN))
  // Минимальный сдвиг 4° — чтобы при ИМТ ровно 15 дуга не вырождалась в точку
  const deg = Math.max(
    MR_START_DEG + 4,
    MR_START_DEG + ((target - MR_BMI_MIN) / (MR_BMI_MAX - MR_BMI_MIN)) * MR_SWEEP_DEG
  )
  const rad = (d) => (d * Math.PI) / 180
  const pt = (a) => [C + R * Math.sin(rad(a)), C - R * Math.cos(rad(a))]
  const [ax, ay] = pt(MR_START_DEG)
  const [bx, by] = pt(deg)
  const large = deg - MR_START_DEG > 180 ? 1 : 0
  const arc = `M ${ax.toFixed(2)} ${ay.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${bx.toFixed(2)} ${by.toFixed(2)}`

  return (
    <View className="h-[66px] w-[66px] items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="nbsRingMini" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#53E3F2" />
            <Stop offset="0.42" stopColor="#6366F1" />
            <Stop offset="0.72" stopColor="#A855F7" />
            <Stop offset="1" stopColor="#EA5CF5" />
          </SvgGradient>
        </Defs>
        <Circle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#nbsRingMini)"
          strokeOpacity={0.22}
          strokeWidth={STROKE + 4}
          fill="none"
        />
        <Circle cx={C} cy={C} r={R} stroke="url(#nbsRingMini)" strokeWidth={STROKE} fill="none" />
        <Path
          d={arc}
          stroke="#FFFFFF"
          strokeOpacity={0.2}
          strokeWidth={STROKE + 3}
          strokeLinecap="round"
          fill="none"
        />
        <Path d={arc} stroke="#FFFFFF" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
      </Svg>
      <View className="items-center">
        <Text className="font-extrabold text-[19px] leading-none text-white">
          {fmtDecimal(bmi)}
        </Text>
        <Text
          maxFontSizeMultiplier={1.1}
          numberOfLines={1}
          className="mt-[2px] font-semibold text-[13px] leading-none"
          style={{ color: catColor }}
        >
          {shortLabel}
        </Text>
      </View>
    </View>
  )
}

export function AdviceModal({ bmi, open, onClose, onRecommendations, catId = null, weightKg, heightCm }) {
  // Своя категория — по реальному ИМТ; catId (тап по строке легенды)
  // подменяет только текст пояснения, мини-кольцо остаётся «твоим»
  const own = bmiCategory(bmi)
  const cat = (catId && BMI_CATEGORIES.find((c) => c.id === catId)) || own
  const rec = RECOMMENDATIONS[cat.id] || RECOMMENDATIONS[own.id]
  const isOwn = cat.id === own.id
  // Сколько кг до следующей (лучшей) категории — только для своей категории
  const nextKg = isOwn ? kgToNextCategory(weightKg, heightCm) : null

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          <View className="flex-row items-start px-5 pb-1 pt-5">
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[20px] text-bear-text">
                💡 Рекомендации
              </Text>
              <Text className="mt-1 font-sans text-[17.5px] leading-relaxed text-bear-soft">
                {rec.main}
              </Text>
            </View>
            {/* Мини-копия кольца: твой ИМТ и категория — как на большой вкладке */}
            <View className="ml-2 items-center">
              <MiniRing
                bmi={bmi}
                catColor={cat.color}
                shortLabel={MINI_SHORT[cat.id] || cat.label}
              />
              <Text
                maxFontSizeMultiplier={1.1}
                className="mt-1 font-sans text-[13px] text-bear-dim"
              >
                Твой ИМТ
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              className="ml-1 mt-0.5 p-1"
            >
              <X hitSlop={10} size={22} color="#A5AECB" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
            <Text className="mt-2 font-semibold text-[16px]" style={{ color: cat.color }}>
              {isOwn ? 'Ваша категория' : 'Категория'}: {cat.label} ({cat.range})
            </Text>

            {/* Сколько кг до следующей (лучшей) категории — по реальным весу и росту */}
            {nextKg && (
              <View
                className="mt-2 flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5"
                style={{
                  backgroundColor: nextKg.tone === 'ok' ? 'rgba(74,222,128,0.12)' : 'rgba(141,171,255,0.12)',
                }}
              >
                <Target size={14} color={nextKg.tone === 'ok' ? '#4ADE80' : '#8DABFF'} />
                <Text
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.1}
                  className="min-w-0 flex-1 font-semibold text-[16px]"
                  style={{ color: nextKg.tone === 'ok' ? '#4ADE80' : '#8DABFF' }}
                >
                  {nextKg.text}
                </Text>
              </View>
            )}
            <View className="mt-3 gap-2">
              {rec.tips.map((tip) => (
                <View
                  key={tip}
                  className="flex-row items-start gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-2.5"
                >
                  <View
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <Text className="min-w-0 flex-1 font-sans text-[17.5px] text-bear-soft">
                    {tip}
                  </Text>
                </View>
              ))}
            </View>

            {/* Кнопка «К рекомендациям»: закрыть модалку и показать блок
                советов на вкладке (рисуется, только если передан обработчик) */}
            {onRecommendations && (
              <Pressable
                onPress={onRecommendations}
                accessibilityRole="button"
                accessibilityLabel="К рекомендациям — перейти к блоку советов"
                className="mt-4 flex-row items-center justify-center gap-1.5 rounded-2xl py-3 active:opacity-75"
                style={{
                  backgroundColor: 'rgba(168,85,247,0.16)',
                  borderColor: 'rgba(168,85,247,0.35)',
                  borderWidth: 1,
                }}
              >
                <Text className="font-semibold text-[17.5px] text-[#D8B4FE]">
                  К рекомендациям
                </Text>
                <ArrowDown size={16} color="#D8B4FE" />
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
