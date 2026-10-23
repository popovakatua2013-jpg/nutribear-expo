// Этап 1. Приветствие: 3 слайда — ценностное предложение,
// соцдоказательство (★4.8, 10 млн пользователей), результаты.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ObShell } from './ObShell'

const SLIDES = [
  {
    emoji: '🐻',
    title: 'Похудей без стресса',
    text: 'Ешь любимую еду и худей. Мишка посчитает калории и БЖУ за тебя — просто веди дневник.',
  },
  {
    emoji: '⭐',
    title: '4.8 из 5',
    text: '10 млн пользователей уже ведут дневник с NutriBear. Средняя оценка в магазинах — 4.8.',
  },
  {
    emoji: '📸',
    title: 'Реальные результаты',
    text: '«−12 кг за полгода без жёстких диет» — Марина, 34. «Удерживаю вес второй год» — Ольга, 41.',
  },
]

export function WelcomeStep({ onNext }) {
  const [i, setI] = useState(0)
  const slide = SLIDES[i]
  const last = i === SLIDES.length - 1

  return (
    <ObShell title="NutriBear" onNext={onNext} nextLabel={last ? 'Начать' : 'Далее'}>
      <View className="min-h-[340px] items-center justify-center rounded-3xl border border-white/5 bg-bear-card p-6 text-center">
        <Text className="text-[64px]">{slide.emoji}</Text>
        <Text className="mt-4 font-extrabold text-[22px] tracking-tight text-bear-text">
          {slide.title}
        </Text>
        <Text className="mx-auto mt-2 max-w-[280px] text-center font-sans text-[13px] leading-relaxed text-[#aab4d4]">
          {slide.text}
        </Text>

        <View className="mt-6 flex-row items-center gap-1.5" accessibilityLabel="Слайды">
          {SLIDES.map((s, idx) => (
            <Pressable
              key={s.title}
              onPress={() => setI(idx)}
              accessibilityLabel={`Слайд ${idx + 1}`}
              className="h-2 overflow-hidden rounded-full"
            >
              {idx === i ? (
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['#4D7CFE', '#A45BFF']} style={{ width: 24, height: 8, borderRadius: 999 }} />
              ) : (
                <View className="h-2 w-2 rounded-full bg-white/15" />
              )}
            </Pressable>
          ))}
        </View>
      </View>
    </ObShell>
  )
}
