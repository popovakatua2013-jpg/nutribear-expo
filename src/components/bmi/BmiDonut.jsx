// Кольцевой датчик ИМТ 1-в-1 с макетом: толстое градиентное кольцо
// (голубой → синий → фиолетовый → маджента), белая светящаяся ДУГА на
// позиции текущего ИМТ (как на макете — сверху для нормы), в центре —
// крупное значение и бейдж категории: полупрозрачный фон цвета категории,
// яркий текст и галочка в залитом кружке («Норма ✓» — зелёная пилюля).
// Шкала кольца: ИМТ 15 → 40, старт с 9 часов — норма ложится на верх.

import { Text, View } from 'react-native'
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Circle, Path } from 'react-native-svg'
import { Check } from 'lucide-react-native'
import { bmiCategory, fmtDecimal } from '@/lib/data/bmi'

const SIZE = 100
const C = SIZE / 2
const R = 40
const STROKE = 14

// Шкала маркера: ИМТ 15 → 40; угол по часовой от 12 часов.
// 262° — старт (9 часов), 270° дуги: норма 18,5–25 ложится на верх,
// лишний вес — на верх-право, ожирение — на правую сторону, как на макете.
const BMI_MIN = 15
const BMI_MAX = 40
const START_DEG = 262
const SWEEP_DEG = 270

// Полудлина белой дуги-маркера в градусах (как на макете ~24°)
const HALF_DEG = 12

export function BmiDonut({ bmi }) {
  const cat = bmiCategory(bmi)

  // Угол маркера (по часовой от 12 часов)
  const t = Math.min(BMI_MAX, Math.max(BMI_MIN, bmi || BMI_MIN))
  const deg = START_DEG + ((t - BMI_MIN) / (BMI_MAX - BMI_MIN)) * SWEEP_DEG

  // Точки белой дуги: от deg−HALF до deg+HALF, по часовой
  const a1 = ((deg - HALF_DEG) * Math.PI) / 180
  const a2 = ((deg + HALF_DEG) * Math.PI) / 180
  const ax = C + R * Math.sin(a1)
  const ay = C - R * Math.cos(a1)
  const bx = C + R * Math.sin(a2)
  const by = C - R * Math.cos(a2)
  const arc = `M ${ax.toFixed(2)} ${ay.toFixed(2)} A ${R} ${R} 0 0 1 ${bx.toFixed(2)} ${by.toFixed(2)}`

  return (
    <View className="h-[100px] w-[100px] shrink-0 items-center justify-center">
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
          strokeOpacity={0.22}
          strokeWidth={22}
          fill="none"
        />
        {/* Основное толстое градиентное кольцо */}
        <Circle
          cx={C}
          cy={C}
          r={R}
          stroke="url(#nbsRing)"
          strokeWidth={STROKE}
          fill="none"
        />
        {/* Свечение белой дуги */}
        <Path
          d={arc}
          stroke="#FFFFFF"
          strokeOpacity={0.3}
          strokeWidth={STROKE + 8}
          strokeLinecap="round"
          fill="none"
        />
        {/* Белая светящаяся дуга на позиции ИМТ — как на макете */}
        <Path
          d={arc}
          stroke="#FFFFFF"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
        />
      </Svg>

      <Text className="font-extrabold text-[26px] leading-none tracking-tight text-white">
        {fmtDecimal(bmi)}
      </Text>
      <View
        className="mt-1.5 flex-row items-center gap-1 rounded-full px-2 py-[3px]"
        style={{
          backgroundColor: `${cat.color}26`,
          shadowColor: cat.color,
          shadowOpacity: 0.5,
          shadowRadius: 9,
        }}
      >
        <Text
          maxFontSizeMultiplier={1.1}
          className="font-bold text-[10.5px] leading-none"
          style={{ color: cat.color }}
        >
          {cat.label}
        </Text>
        {/* Галочка в залитом кружке — как на макете */}
        <View
          className="h-[14px] w-[14px] items-center justify-center rounded-full"
          style={{ backgroundColor: cat.color }}
        >
          <Check size={9} color="#0B1B12" strokeWidth={3.6} />
        </View>
      </View>
    </View>
  )
}
