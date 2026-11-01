// Сцена организма: «комната» с тёмным фоном, звёздами и мягкими пятнами света.
// Организм парит, реагирует на поглаживание (сердечки + пружинка),
// вокруг живут купленные предметы-декор. Только transform/opacity — без blur.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { OrganismSvg } from './OrganismSvg'

const STATE_META = {
  bloom: { label: 'Расцвет', color: '#a3e635', text: '#bef264' },
  normal: { label: 'Норма', color: '#34d399', text: '#6ee7b7' },
  decline: { label: 'Упадок', color: '#94a3b8', text: '#cbd5c4' },
}

// Разлетающиеся сердечки при поглаживании
const HEARTS = [
  { x: -70, y: -96 },
  { x: 66, y: -110 },
  { x: -46, y: -130 },
  { x: 40, y: -140 },
  { x: -12, y: -150 },
  { x: 18, y: -118 },
]

function OneHeart({ o, i }) {
  const t = useSharedValue(0)
  useEffect(() => {
    t.value = withDelay(
      i * 70,
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.quad) })
    )
  }, [t])
  const style = useAnimatedStyle(() => {
    const p = t.value
    return {
      opacity: p < 0.12 ? p / 0.12 : Math.max(0, 1 - (p - 0.12) / 0.88),
      transform: [
        { translateX: o.x * (0.4 + 0.6 * p) },
        { translateY: 40 + (o.y - 40) * p },
        { scale: 0.5 + 0.6 * p },
        { rotate: `${(i - 3) * 14}deg` },
      ],
    }
  })
  return (
    <Animated.Text style={[{ position: 'absolute', left: '50%', top: '50%', fontSize: 20 }, style]}>
      {i % 2 ? '💗' : '💖'}
    </Animated.Text>
  )
}

export function OrganismStage({ state, hydration, protein, phrase, decor = [], onPet }) {
  const meta = STATE_META[state] || STATE_META.normal
  const [burst, setBurst] = useState(0)
  const timer = useRef(null)

  // Пружинка при нажатии
  const press = useSharedValue(1)
  // Парение вверх-вниз
  const floatT = useSharedValue(0)
  floatT.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.ease) }), -1, true)

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -6 + 12 * floatT.value }, { scale: press.value }],
  }))

  const avg = useMemo(
    () => Math.round((hydration + protein) / 2),
    [hydration, protein]
  )

  useEffect(() => () => timer.current && clearTimeout(timer.current), [])

  const handlePet = () => {
    press.value = withSequence(
      withTiming(0.95, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(1.05, { duration: 140, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 160 })
    )
    setBurst((b) => b + 1)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setBurst(0), 1700)
    onPet?.()
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-bear-line bg-bear-deep">
      {/* мягкие пятна света вместо blur */}
      <View pointerEvents="none" className="absolute inset-0">
        <View
          className="absolute -left-10 top-24 h-40 w-40 rounded-full"
          style={{ backgroundColor: 'rgba(163,230,53,0.07)' }}
        />
        <View
          className="absolute -right-12 bottom-10 h-48 w-48 rounded-full"
          style={{ backgroundColor: 'rgba(103,232,249,0.07)' }}
        />
        {/* звёзды */}
        {[
          [30, 40], [90, 26], [150, 48], [210, 30], [255, 66], [55, 92], [235, 120], [70, 150], [200, 168], [120, 20],
        ].map(([x, y], i) => (
          <View
            key={i}
            className="absolute rounded-full bg-white"
            style={{ left: x, top: y, width: i % 3 ? 2 : 3, height: i % 3 ? 2 : 3, opacity: 0.14 + (i % 4) * 0.05 }}
          />
        ))}
      </View>

      <View className="p-4">
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
          <Text className="font-sans text-[10.5px] text-bear-dim">нажми, чтобы погладить</Text>
        </View>

        {/* арена */}
        <Pressable onPress={handlePet} accessibilityLabel="Погладить организм" className="items-center">
          <View className="relative h-[300px] w-full max-w-[340px] items-center justify-center">
            {/* реплика */}
            {phrase && (
              <View className="absolute right-0 top-0 z-20 max-w-[210px] rounded-2xl rounded-br-sm border border-emerald-400/25 bg-[#0b1a12]/95 px-3 py-2">
                <Text className="font-medium text-[12px] leading-snug text-emerald-100">{phrase}</Text>
              </View>
            )}

            {/* декор из купленных предметов (проценты — чтобы не уезжало на узких экранах) */}
            {decor.slice(0, 6).map((d, i) => (
              <Text
                key={`${d.id}-${i}`}
                className="absolute text-[22px]"
                style={{
                  left: ['4%', '17%', '2%', '71%', '83%', '62%'][i] || '4%',
                  top: ['34%', '20%', '64%', '20%', '34%', '70%'][i] || '34%',
                  opacity: 0.9,
                }}
              >
                {d.emoji}
              </Text>
            ))}

            {/* сам организм */}
            <Animated.View style={floatStyle}>
              <OrganismSvg state={state} hydration={hydration} protein={protein} size={252} />
            </Animated.View>

            {/* сердечки при поглаживании */}
            {burst > 0 &&
              HEARTS.map((o, i) => <OneHeart key={`${burst}-${i}`} o={o} i={i} />)}
          </View>
        </Pressable>
      </View>
    </View>
  )
}
