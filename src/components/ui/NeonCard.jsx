// Неоновая карточка — рамка-градиент цвета активной темы (правка Кати
// 24.11 «сделай в точности как на скрине»: темы должны быть яркими и
// градиентными, «не однотонные»). Снаружи — тонкая градиентная кайма
// (accentBright → accent по диагонали, у углов светится ярче — эффект
// неоновой трубки с макета), внутри — непрозрачная поверхность card
// активной темы. Главные блоки «Главной» (сводка, приёмы пищи,
// активность, тренировки, рейтинг, баннер) собираются на NeonCard;
// остальные карточки приложения светятся рамкой bodyLine той же темы.
//
// СВЕЧЕНИЕ (правка Кати 25.11, третий круг: «блоки красивые градиентные,
// но не хватает БОЛЬШЕ свечения — касается всех тем»): вокруг каймы —
// три ореола (LinearGradient-концентры, чем шире — тем бледнее), они
// выглядывают из-за непрозрачной каймы мягким цветным гало. Ореолы
// работают на обеих платформах (тени Android не красятся) и одинаковы
// во всех темах — цвет берётся из акцентов активной палитры.
//
// Внутренняя поверхность НЕПРОЗРАЧНАЯ (bg = bear-card): градиент
// просвечивать не должен. Если карточке нужен свой фон/обрезка —
// передайте innerStyle/innerClassName.

import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { withAlpha } from '@/lib/themes'
import { useThemeColors } from '@/lib/use-theme'

// Три концентрических ореола: насколько выходят за карточку (inset, px)
// и насколько плотные (alpha). Ближний — самый яркий, дальний — едва
// заметный хвост: сумма читается как одно мягкое свечение
const HALOS = [
  { inset: 6, alpha: 0.5 },
  { inset: 14, alpha: 0.28 },
  { inset: 26, alpha: 0.14 },
]

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
      style={[{ position: 'relative' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      {/* Ореолы свечения ПОД каймой: видны только их края за карточкой */}
      {HALOS.map(({ inset, alpha }) => (
        <LinearGradient
          key={inset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[withAlpha(c.accentBright, alpha), withAlpha(c.accent, alpha)]}
          style={{
            position: 'absolute',
            top: -inset,
            left: -inset,
            right: -inset,
            bottom: -inset,
            borderRadius: radius + inset,
          }}
        />
      ))}
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
