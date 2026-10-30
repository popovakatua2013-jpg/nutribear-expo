// Тонкая полоса прогресса (замена div-полосок из веб-версии)
import { View } from 'react-native'

// tone: 'grad' | 'emerald' | 'amber'
export function ProgressBar({ pct = 0, h = 6, tone = 'grad' }) {
  const w = Math.max(0, Math.min(100, pct))
  const bg = tone === 'emerald' ? '#34D399' : tone === 'amber' ? '#FBBF24' : '#7B6CF6'
  return (
    <View
      accessibilityRole="progressbar"
      className="overflow-hidden rounded-full bg-white/5"
      style={{ height: h }}
    >
      <View className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: bg }} />
    </View>
  )
}
