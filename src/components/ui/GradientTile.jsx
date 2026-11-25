// Градиентная плитка — младшая сестра NeonCard для ВНУТРЕННИХ плиток
// и панелей (правка Кати 25.11, пятый круг: «приёмы пищи и активность
// дня — не совпадает с блоком „Съедено сегодня“ по оформлению»,
// «тренировки/нутриенты/динамика веса/измерения тела — ни рамок,
// ни свечения, ни градиента», «все вкладки должны быть оформлены
// одинаково»). Внутри неоновых карточек оставались ПЛОСКИЕ подложки
// bodyCard/card2 с серыми рамками line — они читались «дырами» на фоне
// светящихся блоков. Теперь все плитки — в том же языке, что и большие
// карточки, но без ореолов (мелким элементам свечение наружу не нужно,
// и десятки ореолов на экране стоили бы производительности):
//   снаружи — тонкая градиентная кайма accentBright → accent,
//   внутри — диагональный градиент акцент 10% → card → deep.
// Палитра — активная тема (useThemeColors), плитка перекрашивается
// вместе со всем приложением. Использование:
//   <GradientTile radius={16} className="p-3" style={{ marginTop: 8 }}>
//     …содержимое…
//   </GradientTile>
// style — на внешнем контейнере (отступы, flex), className/innerStyle —
// на внутренней поверхности (паддинги, выравнивание).

import { View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { withAlpha } from '@/lib/themes'
import { useThemeColors } from '@/lib/use-theme'

export function GradientTile({
  children,
  radius = 16,
  border = 1, // толщина каймы — как у NeonCard, тонкая
  className = '',
  style,
  innerStyle,
  accessibilityLabel,
  accessibilityRole,
}) {
  const c = useThemeColors()
  return (
    <View
      style={[{ position: 'relative' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole={accessibilityRole}
    >
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[c.accentBright, c.accent, c.accentBright]}
        // flex: 1 — плитка может растягиваться по высоте (ряды
        // items-stretch, flex:1 в колонке): градиент должен заполнить
        // всю высоту. В обычных случаях (высота по контенту) flex:1
        // безвреден
        style={{ borderRadius: radius, padding: border, flex: 1 }}
      >
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={[withAlpha(c.accent, 0.1), c.card, c.deep]}
          style={{ borderRadius: Math.max(0, radius - border), flex: 1 }}
        >
          <View className={className} style={innerStyle}>
            {children}
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  )
}
