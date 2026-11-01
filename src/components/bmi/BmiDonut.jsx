// Кольцевой датчик ИМТ как на фото-макете: сплошное градиентное кольцо
// (голубой → синий → фиолетовый → маджента), белый светящийся маркер на
// позиции текущего ИМТ, в центре — крупное значение и цветной бейдж
// категории с галочкой (для нормы — зелёная пилюля «Норма ✓»).
// Шкала кольца: ИМТ 15 → 40, норма занимает верхнюю левую дугу.

import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle } from 'react-native-svg'
import { Check } from 'lucide-react-native'
import { bmiCategory, fmtDecimal } from '@/lib/data/bmi'

const SIZE = 104
const C = SIZE / 2
const R = 41
const STROKE = 11

// Шкала маркера: ИМТ 15 → 40; угол по часовой от 12 часов.
// 225° — старт (низ-лево), 270° дуги: норма 18,5–25 ложится на верх-лево,
// лишний вес — на верх-право, ожирение — на правую сторону, как на макете.
const BMI_MIN = 15
const BMI_MAX = 40
const START_DEG = 225
const SWEEP_DEG = 270

export function BmiDonut({ bmi }) {
  const cat = bmiCategory(bmi)

  // Угол маркера (по часовой от 12 часов)
  const t = Math.min(BMI_MAX, Math.max(BMI_MIN, bmi || BMI_MIN))
  const deg = START_DEG + ((t - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG
  const rad = (deg * Math.PI) / 180
  const mx = C + R * Math.sin(rad)
  const my = C - R * Math.cos(rad)

  return (
    <View className="h-[104px] w-[104px] shrink-0 items-center justify-center">
      <Svg width={SIZE} height={SIZE} style={{ position: 'absolute' }}>
        <Defs>
          <SvgGradient id="nbsRing" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#53E3F2" />
            <Stop offset="0.42" stopColor="#6366F1" />
            <Stop offset="0.72" stopColor="#A855F7" />
            <Stop offset="1" stopColor="#EA5CF5" />
          </SvgGradient>
        </Defs>

        {/* Мягкое свечение кольца: тот же градиент шире и бледнее */}
        <Circle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#nbsRing)"
          strokeOpacity={0.18}
          strokeWidth={18}
          fill="none"
        />
        {/* Основное градиентное кольцо */}
        <Circle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#nbsRing)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Белый светящийся маркер на позиции ИМТ */}
        <Circle cx={mx} cy={my} r={7} fill="#FFFFFF" fillOpacity={0.22} />
        <Circle cx={mx} cy={my} r={3.5} fill="#FFFFFF" />
      </Svg>

      <Text className="font-extrabold text-[24px] leading-none tracking-tight text-white">
        {fmtDecimal(bmi)}
      </Text>
      <View
        className="mt-1.5 flex-row items-center gap-1 rounded-full px-1.5 py-[3px]"
        style={{
          backgroundColor: cat.color,
          shadowColor: cat.color,
          shadowOpacity: 0.55,
          shadowRadius: 9,
        }}
      >
        <Text maxFontSizeMultiplier={1.1} className="font-bold text-[9.5px] leading-none" style={{ color: '#0A1310' }}>
          {cat.label}
        </Text>
        <Check size={9} color="#0A1310" strokeWidth={3.6} />
      </View>
    </View>
  )
}
