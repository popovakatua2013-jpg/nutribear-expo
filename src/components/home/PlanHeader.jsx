// Шапка карточки «Приёмы пищи»: фиолетовый чип-иконка BodyChip (стиль
// вкладки «Тела») и заголовок. Кнопки «+ Добавить» больше нет —
// добавление по тапу на плитку приёма (завтрак/обед/ужин/перекус),
// дубли не нужны. «Повторить день» — ПОДПИСАННАЯ сиреневая кнопка
// (отзыв Кати: серая иконка без подписи была не найти), «История» и
// «Порции» — серые иконки; справа — ссылка «Все».

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Copy, History, UtensilsCrossed, ChevronRight, Hand } from 'lucide-react-native'
import { PortionsModal } from './PortionsModal'
import { RepeatDayModal } from './RepeatDayModal'
import { BodyChip } from '../ui/BodyChip'

// Серая иконка-кнопка без подписи; назначение — в accessibilityLabel
function IconButton({ onPress, label, Icon }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
    >
      <Icon size={17} color="#AEB9D9" />
    </Pressable>
  )
}

export function PlanHeader({ onViewAll, onHistory, onCopied }) {
  const [portionsOpen, setPortionsOpen] = useState(false)
  const [repeatOpen, setRepeatOpen] = useState(false)

  // Повтор дня: кнопка копирования открывает RepeatDayModal — список
  // последних дней с записями, тап по дню и «Скопировать в сегодня»

  return (
    <View className="mb-3">
      {/* заголовок; добавление — тап по плитке приёма ниже */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<UtensilsCrossed size={17} />} />
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">
            Приёмы пищи
          </Text>
        </View>
      </View>

      {/* служебная строка: «Повторить день» с подписью слева, «История»
          и «Порции» — иконки рядом, «Все» справа */}
      <View className="mt-2.5 flex-row items-center gap-1.5">
        {/* Повторить день: с подписью, чтобы кнопку было видно сразу
            (отзыв Кати: «не могу даже я найти!») */}
        <Pressable
          onPress={() => setRepeatOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Повторить день — скопировать еду выбранного дня в сегодня"
          hitSlop={4}
          className="shrink-0 flex-row items-center gap-1.5 rounded-full border border-[#A78BFA]/45 bg-[#A78BFA]/15 px-3 py-[7px] active:opacity-70"
        >
          <Copy size={15} color="#C4B5FD" />
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
            maxFontSizeMultiplier={1.15}
            className="font-bold text-[14.5px] text-[#C4B5FD]"
          >
            Повторить день
          </Text>
        </Pressable>
        <IconButton onPress={onHistory} label="История приёмов" Icon={History} />
        <IconButton onPress={() => setPortionsOpen(true)} label="Порции" Icon={Hand} />

        {onViewAll && (
          <Pressable
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel="Открыть все приёмы пищи"
            hitSlop={4}
            className="ml-auto flex-row items-center gap-0.5 px-1 py-1.5"
          >
            <Text className="font-medium text-[16.5px] text-[#6C8CFF]">Все</Text>
            <ChevronRight size={16} color="#6C8CFF" />
          </Pressable>
        )}
      </View>

      <PortionsModal visible={portionsOpen} onClose={() => setPortionsOpen(false)} />
      {/* onCopied — приёмы, куда пришла еда после копирования дня:
          карточка раскрывает их, чтобы результат был виден сразу */}
      <RepeatDayModal
        visible={repeatOpen}
        onClose={() => setRepeatOpen(false)}
        onCopied={onCopied}
      />
    </View>
  )
}
