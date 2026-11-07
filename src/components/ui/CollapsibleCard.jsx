// Сворачиваемая карточка: свёрнута по умолчанию, тап по шапке раскрывает.
// Если передан storageKey — состояние запоминается между запусками
// (useUiPrefsStore, AsyncStorage). Шапка: иконка + заголовок + короткая
// сводка + шеврон. Слот right — для тумблеров: он ВНЕ нажимаемой шапки,
// чтобы переключатель не сворачивал карточку. Тело рендерится только
// в раскрытом виде. Поверхность и шапка — в стиле вкладки «Тело»
// (фиолетовая bear-bodyCard, иконка — в градиентном чипе BodyChip):
// карточки вкладки «Ещё» выглядят как карточки «Тела» (единый стиль).

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown } from 'lucide-react-native'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { BodyChip } from './BodyChip'

export function CollapsibleCard({
  icon,
  title,
  summary,
  right,
  children,
  storageKey,
  accessibilityLabel,
}) {
  const stored = useUiPrefsStore((s) => (storageKey ? s.expanded[storageKey] : undefined))
  const setExpanded = useUiPrefsStore((s) => s.setExpanded)
  const [localOpen, setLocalOpen] = useState(false)

  // С ключом состояние живёт в сторе, без ключа — как раньше, локально
  const open = storageKey ? (stored ?? false) : localOpen
  const toggle = () => {
    const next = !open
    if (storageKey) setExpanded(storageKey, next)
    else setLocalOpen(next)
  }

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      <View className="flex-row items-center">
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${title}${open ? ' — свернуть' : ' — раскрыть'}`}
          className="min-w-0 flex-1 flex-row items-center gap-2.5 px-4 py-3.5 active:opacity-70"
        >
          {icon ? <BodyChip icon={icon} /> : null}
          {/* Заголовок и сводка — столбиком: в одну строку на 360dp
              длинная сводка сжимала заголовок до одной буквы
              («П экспорт · восстановление») */}
          <View className="min-w-0 flex-1">
            <Text
              numberOfLines={1}
              className="font-bold text-[20px] tracking-tight text-bear-text"
            >
              {title}
            </Text>
            {summary ? (
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.2}
                className="mt-0.5 font-sans text-[13px] text-bear-dim"
              >
                {summary}
              </Text>
            ) : null}
          </View>
          <ChevronDown
            size={20}
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
