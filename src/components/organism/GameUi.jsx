// Общие примитивы игровых карточек организма — стиль веб-макета:
// тёмно-зелёные панели, тонкая изумрудная кайма, иконка в тонированном круге.

import { Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

export const GAME = {
  card: '#0D1F16', // фон карточки секции
  panel: '#0A1811', // внутренние панели
  panel2: '#0C1A12',
  line: 'rgba(74,158,112,0.22)', // кайма из макета (.org-card)
  text: '#E7F5EC',
  dim: '#7FA890', // приглушённый зелёный текст
  dim2: '#64866F',
  lime: '#A3E635',
  emerald: '#34D399',
  cyan: '#67E8F9',
  yellow: '#FACC15',
  red: '#F87171',
  pink: '#FDA4AF',
}

// Карточка секции
export function GameCard({ children, style }) {
  return (
    <View
      className="rounded-3xl p-4"
      style={{ backgroundColor: GAME.card, borderWidth: 1, borderColor: GAME.line, ...style }}
    >
      {children}
    </View>
  )
}

// Шапка секции: иконка в круге + заголовок + подзаголовок + правый пилль
export function GameHeader({ icon: Icon, iconColor, iconBg, title, subtitle, right }) {
  return (
    <View className="flex-row items-start justify-between gap-3">
      <View className="flex-1 flex-row items-start gap-3">
        <View className="h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: iconBg }}>
          <Icon size={21} color={iconColor} />
        </View>
        <View className="flex-1 pt-0.5">
          <Text className="font-extrabold text-[15px] tracking-tight" style={{ color: GAME.text }}>
            {title}
          </Text>
          <Text className="mt-0.5 font-sans text-[11.5px] leading-snug" style={{ color: GAME.dim }}>
            {subtitle}
          </Text>
        </View>
      </View>
      {right}
    </View>
  )
}

// Маленький пилль справа (количество участников, капсул и т.п.)
export function RightPill({ icon: Icon, text, color = GAME.lime }) {
  return (
    <View
      className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{ backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: GAME.line }}
    >
      {Icon && <Icon size={13} color={color} />}
      <Text className="font-bold text-[12px]" style={{ color }}>
        {text}
      </Text>
    </View>
  )
}

// Внутренняя панель
export function Panel({ children, style }) {
  return (
    <View
      className="rounded-2xl p-3.5"
      style={{ backgroundColor: GAME.panel, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', ...style }}
    >
      {children}
    </View>
  )
}

// Метка капсом (ТЕКУЩАЯ ФОРМА, ВАШ УРОН…)
export function Caps({ children, color = GAME.dim2, style }) {
  return (
    <Text className="font-bold text-[10.5px] tracking-[0.08em]" style={{ color, ...style }}>
      {children}
    </Text>
  )
}

// Полоска прогресса с градиентом (как в макете: изумруд → лайм и т.п.)
export function GradBar({ pct, colors, height = 8 }) {
  return (
    <View className="w-full overflow-hidden rounded-full" style={{ height, backgroundColor: 'rgba(255,255,255,0.07)' }}>
      <View style={{ width: `${Math.max(2, Math.min(100, pct))}%`, height: '100%', borderRadius: 999, overflow: 'hidden' }}>
        <LinearGradient colors={colors} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
      </View>
    </View>
  )
}

// Точка-маркер в списке истории
export function Dot({ children, color = GAME.emerald }) {
  return (
    <View className="flex-row items-start gap-2.5 rounded-xl px-3 py-2.5" style={{ backgroundColor: GAME.panel }}>
      <View className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      <Text className="flex-1 font-sans text-[12px] leading-snug" style={{ color: GAME.dim }}>
        {children}
      </Text>
    </View>
  )
}
