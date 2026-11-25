// Неоновая карточка — рамка-градиент цвета активной темы (правка Кати
// 24.11 «сделай в точности как на скрине»: темы должны быть яркими и
// градиентными, «не однотонные»). Снаружи — тонкая градиентная кайма
// (accentBright → accent по диагонали), внутри — ГРАДИЕНТНАЯ поверхность
// активной темы. Главные блоки «Главной» (сводка, приёмы пищи,
// активность, тренировки, рейтинг, баннер) собираются на NeonCard;
// карточки «Отчётов» и вкладки «Тело» — на том же языке.
//
// ТОЛЩИНА РАМКИ (правка Кати 25.11, четвёртый круг: «толстые рамки —
// сделать на каждом блоке и на всех вкладках более тонкими»): кайма
// 1 px вместо 1.5 — неоновая линия осталась, перестала читаться
// толстым кантом.
//
// ВНУТРЕННЯЯ ПОВЕРХНОСТЬ — ГРАДИЕНТ (правка Кати 25.11, четвёртый круг:
// «сделать все белые блоки градиентными — сейчас они белые, касается
// всех тем»): раньше внутри была плоская заливка card — на светлой
// «Кремовой» каждый блок читался белым листом, на тёмных — чёрным
// пластом («Дисциплина — чёрный фон, сделать одинаково»). Теперь
// поверхность — диагональный градиент с тинтом акцента у верхнего края:
//   акцент 7% (свечение изнутри) → card → deep.
// В «Кремовой» это тёплый перелив сливочного → янтарно-глубокого,
// в неонах — мягкое свечение неона из верхнего угла. Тексты не
// теряют контраст: низ карточки — прежние тона card/deep.
//
// СВЕЧЕНИЕ (правка Кати 25.11, третий круг: «не хватает БОЛЬШЕ
// свечения — касается всех тем»): вокруг каймы — три ореола
// (LinearGradient-концентры, чем шире — тем бледнее), они выглядывают
// из-за каймы мягким цветным гало. Ореолы работают на обеих платформах
// (тени Android не красятся) и одинаковы во всех темах.
//
// Если карточке нужен свой фон/обрезка — передайте innerStyle/
// innerClassName (поверх градиента можно положить свою полупрозрачную
// подложку, например bg-black/20 под сканером).

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
  border = 1, // толщина неоновой каймы — тонкая (четвёртый круг Кати)
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
      {/* Кайма + внутренняя поверхность: снаружи яркая градиентная линия
          accentBright→accent (padding = толщина каймы), внутри — градиент
          card→deep с тинтом акцента у верхнего края */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[c.accentBright, c.accent, c.accentBright]}
        style={{ borderRadius: radius, padding: border }}
      >
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[withAlpha(c.accent, 0.07), c.card, c.deep]}
          style={{ borderRadius: Math.max(0, radius - border) }}
        >
          <View className={className} style={innerStyle}>
            {children}
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  )
}
