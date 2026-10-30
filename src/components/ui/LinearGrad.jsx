// Градиент «btn-gradient» из макета + обёртка LinearGrad
import { LinearGradient } from 'expo-linear-gradient'

export const GRAD_COLORS = ['#4D7CFE', '#8B5CF6', '#A45BFF']

export function LinearGrad({ style, className, children, angle = 135 }) {
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      colors={GRAD_COLORS}
      style={style}
      className={className}
    >
      {children}
    </LinearGradient>
  )
}
