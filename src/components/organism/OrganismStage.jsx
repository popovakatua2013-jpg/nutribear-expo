// Сцена организма — 1:1 порт веб-макета (organism-stage.tsx, режим веб):
// карточка .org-card (градиент 160°, кайма rgba(74,158,112,0.22), r18),
// мягкие радиальные пятна света сверху/по углам, арена 320px, парение ±6px
// за 3.2 c, реплика справа сверху, при поглаживании — 6 сердечек (#fb7185)
// с траекториями из макета. Без звёзд и декора — сцена как в макете.

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg'
import { LinearGradient } from 'expo-linear-gradient'
import { Heart } from 'lucide-react-native'
import { OrganismSvg } from './OrganismSvg'

const EASE_IO = Easing.inOut(Easing.ease)

const STATE_META = {
  bloom: { label: 'Расцвет', color: '#a3e635', text: '#bef264' },
  normal: { label: 'Норма', color: '#34d399', text: '#6ee7b7' },
  decline: { label: 'Упадок', color: '#94a3b8', text: '#cbd5c4' },
}

// Мягкое световое пятно: радиальный градиент вместо blur-3xl из макета
function SoftBlob({ size, left, top, right, bottom, color, opacity }) {
  const uid = `blob${Math.round((left ?? right ?? 0) + (top ?? bottom ?? 0))}${size}`
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left, top, right, bottom, width: size, height: size }}
    >
      <Svg viewBox="0 0 100 100" width={size} height={size}>
        <Defs>
          <RadialGradient id={uid} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.55} />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Circle cx="50" cy="50" r="50" fill={`url(#${uid})`} />
      </Svg>
    </View>
  )
}

// Сердечки при поглаживании: траектории и тайминги из макета
// (OFFSETS ×6, duration 1.35 c, задержка i*0.07, scale/rotate-ключи 1:1)
const HEARTS = [
  { x: -70, y: -10 },
  { x: 66, y: -26 },
  { x: -46, y: -60 },
  { x: 40, y: -78 },
  { x: -18, y: -96 },
  { x: 14, y: -40 },
]

function OneHeart({ o, i }) {
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 1350,
      delay: i * 70,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    })
    anim.start()
    return () => anim.stop()
  }, [t, i])

  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] })
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [o.x * 0.4, o.x * 1.25] })
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [30, o.y - 60] })
  const scale = t.interpolate({ inputRange: [0, 0.33, 0.66, 1], outputRange: [0.5, 1.15, 1, 0.7] })

  return (
    <Animated.View
      style={[
        { position: 'absolute', left: '50%', top: '50%' },
        { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: `${(i - 3) * 14}deg` }] },
      ]}
    >
      <Heart size={19} color="#fb7185" fill="#fb7185" fillOpacity={0.85} />
    </Animated.View>
  )
}

export function OrganismStage({ state, hydration, protein, phrase, onPet }) {
  const meta = STATE_META[state] || STATE_META.normal
  const [burst, setBurst] = useState(0)
  const timer = useRef(null)

  // Пружинка при нажатии (whileTap scale 0.96 из макета)
  const press = useRef(new Animated.Value(1)).current
  // Парение вверх-вниз: ±6px за 3.2 c (mirror)
  const floatT = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatT, { toValue: 1, duration: 3200, easing: EASE_IO, useNativeDriver: true }),
        Animated.timing(floatT, { toValue: 0, duration: 3200, easing: EASE_IO, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [floatT])

  const floatTy = floatT.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] })
  const floatStyle = { transform: [{ translateY: floatTy }, { scale: press }] }

  const avg = Math.round((hydration + protein) / 2)

  useEffect(() => () => timer.current && clearTimeout(timer.current), [])

  const handlePet = () => {
    Animated.sequence([
      Animated.timing(press, { toValue: 0.96, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(press, { toValue: 1.04, duration: 150, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: 170, useNativeDriver: true }),
    ]).start()
    setBurst((b) => b + 1)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBurst(0), 1700)
    onPet?.()
  }

  return (
    <View className="overflow-hidden rounded-[18px]" style={{ borderWidth: 1, borderColor: 'rgba(74,158,112,0.22)' }}>
      {/* фон карточки .org-card: linear-gradient(160deg, …) */}
      <LinearGradient
        colors={['rgba(24,44,33,0.72)', 'rgba(11,23,17,0.9)']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={{ padding: 16 }}
      >
        {/* мягкие световые пятна вместо blur-3xl из макета */}
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <SoftBlob size={260} left={-40} top={-70} color="#a3e635" opacity={0.1} />
          <SoftBlob size={176} left={-48} top={110} color="#a3e635" opacity={0.1} />
          <SoftBlob size={224} right={-56} bottom={40} color="#67e8f9" opacity={0.1} />
        </View>

        {/* бейдж состояния */}
        <View className="z-10 flex-row items-center justify-between">
          <View
            className="flex-row items-center gap-2 rounded-full border px-3 py-1.5"
            style={{ borderColor: `${meta.color}55`, backgroundColor: 'rgba(7,16,12,0.55)' }}
          >
            <View className="h-2 w-2 rounded-full" style={{ backgroundColor: meta.color }} />
            <Text className="font-bold text-[12px]" style={{ color: meta.text }}>
              {meta.label}
            </Text>
            <Text className="font-medium text-[12px] opacity-70" style={{ color: meta.text }}>
              · геном {avg}
            </Text>
          </View>
          <Text className="font-sans text-[10.5px] text-emerald-200/50">нажми, чтобы погладить</Text>
        </View>

        {/* арена */}
        <Pressable onPress={handlePet} accessibilityLabel="Погладить организм" className="items-center">
          <View className="relative h-[320px] w-full max-w-[360px] items-center justify-center">
            {/* реплика */}
            {phrase && (
              <View className="absolute right-0 top-0 z-20 max-w-[220px] rounded-2xl rounded-br-sm border border-emerald-400/25 bg-[#0b1a12]/90 px-3 py-2 shadow-lg">
                <Text className="font-medium text-[12.5px] leading-snug text-emerald-100">{phrase}</Text>
              </View>
            )}

            {/* сам организм */}
            <Animated.View style={floatStyle}>
              <OrganismSvg state={state} hydration={hydration} protein={protein} size={288} />
            </Animated.View>

            {/* сердечки при поглаживании */}
            {burst > 0 &&
              HEARTS.map((o, i) => <OneHeart key={`${burst}-${i}`} o={o} i={i} />)}
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  )
}
