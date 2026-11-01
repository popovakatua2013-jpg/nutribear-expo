// Сворачиваемая карточка: свёрнута по умолчанию, тап по шапке раскрывает.
// Шапка: иконка + заголовок + короткая сводка + шеврон. Слот right — для
// тумблеров: он ВНЕ нажимаемой шапки, чтобы переключатель не сворачивал
// карточку. Тело рендерится только в раскрытом виде.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'

export function CollapsibleCard({
  icon,
  title,
  summary,
  right,
  children,
  accessibilityLabel,
}) {
  const [open, setOpen] = useState(false)

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="overflow-hidden rounded-3xl border border-white/5 bg-bear-card"
    >
      <View className="flex-row items-center">
        <Pressable
          onPress={() => setOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${title}${open ? ' — свернуть' : ' — раскрыть'}`}
          className="min-w-0 flex-1 flex-row items-center gap-2.5 px-4 py-3.5 active:opacity-70"
        >
          {icon}
          <Text
            numberOfLines={1}
            className="min-w-0 flex-1 font-bold text-[15px] tracking-tight text-bear-text"
          >
            {title}
          </Text>
          {summary ? (
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.2}
              className="shrink-0 font-semibold text-[11.5px] text-bear-dim"
            >
              {summary}
            </Text>
          ) : null}
          <ChevronDown
            size={18}
            color="#A5AECB"
            style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
          />
        </Pressable>
        {right ? <View className="pr-4">{right}</View> : null}
      </View>

      {open && <View className="px-4 pb-4">{children}</View>}
    </View>
  )
}
