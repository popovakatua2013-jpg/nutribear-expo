// Групповое меню вкладки «Ещё» — редизайн по отзыву Кати («сделай
// вкладку ещё полностью по другому, не нравится результат»: вместо
// стены из 14 больших карточек — компактные группы-списки, как в
// настройках iOS и в меню MyFitnessPal/Yazio).
//   MenuGroup — секция: маленький заголовок-ярлык + один общий контейнер
//   MenuRow  — строка меню: цветной квадрат-иконка, название, живое
//              значение справа (время пинка, норма ккал, «сборка …»)
//              и шеврон. Тап раскрывает прежний виджет внутри группы —
//              виджеты переиспользуются в режиме embedded (без своей
//              карточки и шапки), вся логика и данные не менялись.

import { Children, cloneElement, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'

// Секция меню: заголовок-ярлык + скруглённый контейнер со строками.
// Разделители между строками добавляются автоматически (первая — без).
export function MenuGroup({ title, children }) {
  const items = Children.toArray(children)
  return (
    <View className="gap-2">
      <Text
        maxFontSizeMultiplier={1.2}
        accessibilityRole="header"
        className="px-1.5 font-bold text-[12.5px] text-bear-dim"
      >
        {title}
      </Text>
      <View className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard">
        {items.map((child, i) =>
          i === 0 ? child : cloneElement(child, { bordered: true })
        )}
      </View>
    </View>
  )
}

// Строка меню: иконка-квадрат + название + значение + шеврон.
// Тап раскрывает содержимое (виджет) прямо внутри секции.
// Строка-действие: если задан onPress — тап вызывает его вместо
// раскрытия (например, «Правовые документы» открывает окно),
// шеврон остаётся направленным вправо.
export function MenuRow({
  icon,
  iconBg,
  title,
  value,
  children,
  onPress,
  accessibilityLabel,
  bordered = false,
}) {
  const [open, setOpen] = useState(false)

  return (
    <View accessibilityLabel={accessibilityLabel || title} className={bordered ? 'border-t border-white/[0.06]' : ''}>
      <Pressable
        onPress={onPress ? onPress : () => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={onPress ? undefined : { expanded: open }}
        accessibilityLabel={onPress ? title : open ? `Свернуть: ${title}` : `Раскрыть: ${title}`}
        className="min-w-0 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
      >
        {/* Цветной квадрат-иконка (как плитки на референсе Кати) */}
        <View
          className="h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px]"
          style={{ backgroundColor: iconBg || 'rgba(255,255,255,0.07)' }}
        >
          <Text className="text-[18px]">{icon}</Text>
        </View>

        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          className="min-w-0 flex-1 font-bold text-[16.5px] text-bear-text"
        >
          {title}
        </Text>

        {/* Живое значение: время, ккал, статус, сборка */}
        {value ? (
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            className="shrink-0 font-sans text-[13.5px] text-bear-dim"
          >
            {value}
          </Text>
        ) : null}

        <ChevronRight
          size={17}
          color="#A5AECB"
          style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}
        />
      </Pressable>

      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  )
}
