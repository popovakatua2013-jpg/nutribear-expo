// Шапка карточки «План питания»: заголовок, три маленькие серые кнопки
// (копировать вчерашний день, история приёмов, гид по порциям)
// и ссылка «Все приёмы пищи».

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Copy, History, UtensilsCrossed, ChevronRight, Hand } from 'lucide-react-native'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '@/components/ui/Toast'
import { PortionsModal } from './PortionsModal'

const yesterdayKey = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10)

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

export function PlanHeader({ onViewAll, onHistory }) {
  const addEntry = useFoodStore((s) => s.addEntry)
  const foodHistory = useFoodStore((s) => s.history)
  const { toast } = useToast()
  const [portionsOpen, setPortionsOpen] = useState(false)

  // Скопировать все вчерашние записи в сегодняшний дневник
  function copyYesterday() {
    const rows = foodHistory.filter((h) => h.day === yesterdayKey())
    if (!rows.length) {
      toast({ title: 'Вчера записей не было', description: 'Копировать нечего 🤷' })
      return
    }
    rows.forEach((r) =>
      addEntry(r.mealId, {
        // в истории БЖУ хранится на порцию — пересобираем «на 100 г»
        // (клетчатка/сахар тоже — иначе рейтинг дня по копии обнулится)
        food: {
          id: r.foodId,
          name: r.name,
          emoji: r.emoji,
          p: ((r.p || 0) * 100) / (r.grams || 1),
          f: ((r.f || 0) * 100) / (r.grams || 1),
          c: ((r.c || 0) * 100) / (r.grams || 1),
          fib: ((r.fib || 0) * 100) / (r.grams || 1),
          sug: ((r.sug || 0) * 100) / (r.grams || 1),
        },
        grams: r.grams,
        kcal: r.kcal,
      })
    )
    toast({
      title: '📋 Вчерашний день скопирован',
      description: `Добавлено записей: ${rows.length}`,
    })
  }

  return (
    <View className="mb-4 flex-row items-center justify-between gap-2">
      <View className="flex-row items-center gap-2">
        <UtensilsCrossed size={18} color="#AEB9D9" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          План питания
        </Text>
      </View>

      <View className="shrink-0 flex-row items-center gap-1.5">
        <IconBtn onPress={copyYesterday} label="Копировать вчерашний день">
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
    </View>
  )
}
