// Тонкая полоса прогресса (замена div-полосок из веб-версии).
// Правка Кати 25.11 (четвёртый круг: «рейтинг питания — где-то серые,
// где-то золотые полоски» и «все рамки согласно темам»): трек больше
// не серо-белый bg-bear-overlay (на светлой «Кремовой» его не было видно,
// на тёмных он читался чужой серой подложкой) — трек красится line
// активной темы; фиксированные зелёный/янтарный тоны заменены
// семантикой темы good/warn (у «Классики» значения совпадают дословно)
import { View } from 'react-native'
import { useThemeColors } from '@/lib/use-theme'


// tone: 'grad' | 'emerald' | 'amber'; color — прямой цвет поверх tone
export function ProgressBar({ pct = 0, h = 6, tone = 'grad', color }) {
  const themeColors = useThemeColors()
  const w = Math.max(0, Math.min(100, pct))
  const bg =
    color ||
    (tone === 'emerald' ? themeColors.good : tone === 'amber' ? themeColors.warn : themeColors.accent)
  return (
    <View
      accessibilityRole="progressbar"
      className="overflow-hidden rounded-full"
      style={{ height: h, backgroundColor: themeColors.line }}
    >
      <View className="h-full rounded-full" style={{ width: `${w}%`, backgroundColor: bg }} />
    </View>
  )
}
