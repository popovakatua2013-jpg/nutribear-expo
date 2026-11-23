// Неоновая карточка — рамка-градиент цвета активной темы (правка Кати
// 24.11 «сделай в точности как на скрине»: темы должны быть яркими и
// градиентными, «не однотонные»). Снаружи — тонкая градиентная кайма
// (accentBright → accent по диагонали, у углов светится ярче — эффект
// неоновой трубки с макета), внутри — непрозрачная поверхность card
// активной темы. Главные блоки «Главной» (сводка, приёмы пищи,
// активность, тренировки, рейтинг, баннер) собираются на NeonCard;
// остальные карточки приложения светятся рамкой bodyLine той же темы.
//
// Внутренняя поверхность НЕПРОЗРАЧНАЯ (bg = bear-card): градиент
// просвечивать не должен. Если карточке нужен свой фон/обрезка —
// передайте innerStyle/innerClassName.

import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/lib/use-theme'

export function NeonCard({
  children,
  radius = 24, // как rounded-3xl
  border = 1.5, // толщина неоновой каймы
  className = '', // классы ВНУТРЕННЕЙ поверхности (padding и т.п.)
  style, // стиль внешнего контейнера
  innerStyle,
  accessibilityLabel, // доступность — на внешнем контейнере карточки
  accessibilityRole,
}) {
  const c = useThemeColors()
  return (
    <View
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[c.accentBright, c.accent, c.accentBright]}
        style={{ borderRadius: radius, padding: border }}
      >
        <View
          className={className}
          style={[
            { borderRadius: Math.max(0, radius - border), backgroundColor: c.card },
            innerStyle,
          ]}
        >
          {children}
        </View>
      </LinearGradient>
    </View>
  )
}
