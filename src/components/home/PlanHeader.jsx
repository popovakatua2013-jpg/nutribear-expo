// Шапка карточки «Приёмы пищи»: фиолетовый значок, заголовок и
// фиолетовая пилюля «+ Добавить» (как в референсе) — добавляет блюдо
// в первый приём без записей. Ниже, мелкой служебной строкой —
// кнопки: повторить день (выбор даты), история приёмов, гид по порциям,
// и ссылка «Все» — управление блюдами.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Copy, History, UtensilsCrossed, ChevronRight, Hand, Plus } from 'lucide-react-native'
import { PortionsModal } from './PortionsModal'
import { RepeatDayModal } from './RepeatDayModal'

function IconBtn({ onPress, label, children }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="h-8 w-8 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
    >
      {children}
    </Pressable>
  )
}

export function PlanHeader({ onViewAll, onHistory, onAdd }) {
  const [portionsOpen, setPortionsOpen] = useState(false)
  const [repeatOpen, setRepeatOpen] = useState(false)

  // Повтор дня: кнопка копирования открывает RepeatDayModal — список
  // последних дней с записями, тап по дню и «Скопировать в сегодня»

  return (
    <View className="mb-3">
      {/* заголовок + фиолетовая пилюля «+ Добавить» */}
      <View className="flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-row items-center gap-2">
          <UtensilsCrossed size={18} color="#A78BFA" />
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Приёмы пищи
          </Text>
        </View>

        {onAdd && (
          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Добавить блюдо в первый пустой приём пищи"
            className="shrink-0 flex-row items-center gap-1 rounded-full border border-[#7B6CF6]/40 bg-[#7B6CF6]/10 px-3 py-1.5 active:opacity-70"
          >
            <Plus size={13} color="#A78BFA" strokeWidth={2.5} />
            <Text className="font-semibold text-[12px] text-[#A78BFA]">Добавить</Text>
          </Pressable>
        )}
      </View>

      {/* служебная строка: повторить день / история / порции / все блюда */}
      <View className="mt-2 flex-row items-center justify-end gap-1.5">
        <IconBtn onPress={() => setRepeatOpen(true)} label="Повторить день — скопировать еду выбранного дня">
          <Copy size={15} color="#AEB9D9" />
        </IconBtn>
        <IconBtn onPress={onHistory} label="История приёмов">
          <History size={15} color="#AEB9D9" />
        </IconBtn>
        <IconBtn onPress={() => setPortionsOpen(true)} label="Гид по порциям">
          <Hand size={15} color="#AEB9D9" />
        </IconBtn>
        {onViewAll && (
          <Pressable
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel="Открыть все приёмы пищи"
            className="ml-0.5 flex-row items-center gap-0.5 px-1"
          >
            <Text className="font-medium text-[12px] text-[#6C8CFF]">Все</Text>
            <ChevronRight size={14} color="#6C8CFF" />
          </Pressable>
        )}
      </View>

      <PortionsModal visible={portionsOpen} onClose={() => setPortionsOpen(false)} />
      <RepeatDayModal visible={repeatOpen} onClose={() => setRepeatOpen(false)} />
    </View>
  )
}
