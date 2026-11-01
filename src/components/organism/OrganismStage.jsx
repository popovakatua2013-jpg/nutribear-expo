// Сцена организма: «комната» с тёмным фоном, звёздами и мягкими пятнами света.
// Организм парит, реагирует на поглаживание (сердечки + пружинка),
// вокруг живут купленные предметы-декор. Только transform/opacity — без blur.
// Анимации — на родном Animated из react-native (native driver), без
// Reanimated: вкладка должна открываться на любой сборке без нативных сюрпризов.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, Pressable, Text, View } from 'react-native'
import { OrganismSvg } from './OrganismSvg'

const EASE_IO = Easing.inOut(Easing.ease)

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
  const t = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.timing(t, {
      toValue: 1,
      duration: 1200,
      delay: i * 70,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    })
    anim.start()
    return () => anim.stop()
  }, [t, i])

  const opacity = t.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 0] })
  const tx = t.interpolate({ inputRange: [0, 1], outputRange: [o.x * 0.4, o.x] })
  const ty = t.interpolate({ inputRange: [0, 1], outputRange: [40, o.y] })
  const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.1] })

  return (
    <Animated.Text
      style={[
        { position: 'absolute', left: '50%', top: '50%', fontSize: 20 },
        { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: `${(i - 3) * 14}deg` }] },
      ]}
    >
      {i % 2 ? '💗' : '💖'}
    </Animated.Text>
  )
}

export function OrganismStage({ state, hydration, protein, phrase, decor = [], onPet }) {
  const meta = STATE_META[state] || STATE_META.normal
  const [burst, setBurst] = useState(0)
  const timer = useRef(null)

  // Пружинка при нажатии
  const press = useRef(new Animated.Value(1)).current
  // Парение вверх-вниз
  const floatT = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(floatT, { toValue: 1, duration: 1600, easing: EASE_IO, useNativeDriver: true }),
        Animated.timing(floatT, { toValue: 0, duration: 1600, easing: EASE_IO, useNativeDriver: true }),
      ])
    )
    anim.start()
    return () => anim.stop()
  }, [floatT])

  const floatTy = floatT.interpolate({ inputRange: [0, 1], outputRange: [-6, 6] })
  const floatStyle = { transform: [{ translateY: floatTy }, { scale: press }] }

  const avg = useMemo(
    () => Math.round((hydration + protein) / 2),
    [hydration, protein]
  )

  useEffect(() => () => timer.current && clearTimeout(timer.current), [])

  const handlePet = () => {
    Animated.sequence([
      Animated.timing(press, { toValue: 0.95, duration: 90, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(press, { toValue: 1.05, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(press, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start()
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
