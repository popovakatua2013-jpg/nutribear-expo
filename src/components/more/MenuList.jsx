// Групповое меню вкладки «Ещё» — компактные группы-списки, как в
// настройках iOS и в меню MyFitnessPal/Yazio.
//   MenuGroup  — секция: маленький заголовок-ярлык (опционален) + один
//                общий контейнер со строками и разделителями
//   MenuRow    — строка меню: цветной квадрат-иконка, название, живое
//                значение справа (время пинка, норма ккал, «сборка …»)
//                и шеврон. Тап раскрывает прежний виджет внутри группы —
//                виджеты переиспользуются в режиме embedded. Вариант
//                с toggle — строка-переключатель (как в iOS): тап по
//                строке двигает тумблер, шеврона и раскрытия нет.
//   MiniToggle — компактный тумблер вкл/выкл (для строк и плиток)
//   PillPicker — ряд пилюль-чипов с выбором одного значения (стиль
//                пинков, дни недели, интервал воды, порог мишки)

import { Children, cloneElement, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight } from 'lucide-react-native'

// Секция меню: заголовок-ярлык + скруглённый контейнер со строками.
// Разделители между строками добавляются автоматически (первая — без).
// Заголовок опционален: у нижних групп («Документы», «О приложении»)
// его нет — как в стандартных приложениях.
export function MenuGroup({ title, children }) {
  const items = Children.toArray(children)
  return (
    <View className="gap-2">
      {title ? (
        <Text
          maxFontSizeMultiplier={1.2}
          accessibilityRole="header"
          className="px-1.5 font-bold text-[12.5px] text-bear-dim"
        >
          {title}
        </Text>
      ) : null}
      <View className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard">
        {items.map((child, i) =>
          i === 0 ? child : cloneElement(child, { bordered: true })
        )}
      </View>
    </View>
  )
}

// Компактный тумблер (стандартный Switch шире строки меню)
export function MiniToggle({ value, onChange, label }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      hitSlop={6}
      className="h-[22px] w-[40px] shrink-0 justify-center rounded-full"
      style={{
        backgroundColor: value ? '#7B6CF6' : 'rgba(255,255,255,0.15)',
        alignItems: value ? 'flex-end' : 'flex-start',
        paddingHorizontal: 2,
      }}
    >
      <View className="h-[18px] w-[18px] rounded-full bg-white" />
    </Pressable>
  )
}

// Ряд пилюль-чипов: одно активное значение подсвечивается фиолетовым
export function PillPicker({ options, value, onChange, accessibilityLabel }) {
  return (
    <View accessibilityLabel={accessibilityLabel} className="flex-row flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.key === value
        return (
          <Pressable
            key={String(o.key)}
            onPress={() => onChange(o.key)}
            accessibilityRole="button"
            accessibilityLabel={o.a11y || o.label}
            accessibilityState={{ selected: active }}
            className={`rounded-full px-3 py-1.5 active:opacity-70 ${active ? '' : 'bg-white/5'}`}
            style={active ? { backgroundColor: '#7B6CF6' } : null}
          >
            <Text
              maxFontSizeMultiplier={1.1}
              className={`font-semibold text-[14.5px] ${active ? 'text-white' : 'text-bear-sub'}`}
            >
              {o.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// Строка меню: иконка-квадрат + название + значение + шеврон.
// Тап раскрывает содержимое (виджет) прямо внутри секции.
// Строка-действие: если задан onPress — тап вызывает его вместо
// раскрытия (например, «Документы» открывает окно), шеврон остаётся
// направленным вправо. Строка-переключатель: если задан toggle —
// тап по строке двигает тумблер (как в iOS).
export function MenuRow({
  icon,
  iconBg,
  title,
  value,
  children,
  onPress,
  toggle,
  accessibilityLabel,
  bordered = false,
}) {
  const [open, setOpen] = useState(false)

  const handlePress = toggle
    ? () => toggle.onChange(!toggle.value)
    : onPress
      ? onPress
      : () => setOpen((s) => !s)

  return (
    <View accessibilityLabel={accessibilityLabel || title} className={bordered ? 'border-t border-white/[0.06]' : ''}>
      <Pressable
        onPress={handlePress}
        accessibilityRole={toggle ? 'switch' : 'button'}
        accessibilityState={toggle ? { checked: toggle.value } : onPress ? undefined : { expanded: open }}
        accessibilityLabel={
          toggle
            ? accessibilityLabel || title
            : onPress
              ? title
              : open
                ? `Свернуть: ${title}`
                : `Раскрыть: ${title}`
        }
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

        {toggle ? (
          <MiniToggle value={toggle.value} onChange={toggle.onChange} label={toggle.label || title} />
        ) : (
          <>
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
          </>
        )}
      </Pressable>

      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  )
}
