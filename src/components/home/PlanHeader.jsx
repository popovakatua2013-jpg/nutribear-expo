// Шапка панели «План питания» по макету: фиолетовая плитка с приборами,
// заголовок с подзаголовком, три маленькие серые кнопки
// (копировать вчерашний день, история приёмов, гид по порциям)
// и ссылка «Все приёмы пищи».

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
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
      className="h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] active:bg-white/15"
    >
      {children}
    </Pressable>
  )
}

export function PlanHeader({ onViewAll, onHistory, rightInset = 0 }) {
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
        food: {
          id: r.foodId,
          name: r.name,
          emoji: r.emoji,
          p: ((r.p || 0) * 100) / (r.grams || 1),
          f: ((r.f || 0) * 100) / (r.grams || 1),
          c: ((r.c || 0) * 100) / (r.grams || 1),
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
    <View className="mb-3 flex-row items-center gap-2.5">
      {/* Фиолетовая плитка с приборами — как в макете */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['#A78BFA', '#7C3AED']}
        style={{
          height: 36,
          width: 36,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#8B5CF6',
          shadowOpacity: 0.55,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 3 },
        }}
      >
        <UtensilsCrossed size={17} color="#FFFFFF" />
      </LinearGradient>

      <View className="min-w-0 flex-1">
        <Text
          maxFontSizeMultiplier={1.25}
          className="font-extrabold text-[16px] tracking-tight text-bear-text"
        >
          План питания
        </Text>
        <Text
          numberOfLines={2}
          maxFontSizeMultiplier={1.1}
          className="mt-0.5 font-medium text-[10px] leading-snug text-bear-sub"
        >
          Сбалансированное питание для твоих целей
        </Text>
      </View>

      <View
        className="shrink-0 flex-row items-center gap-1"
        style={{ marginRight: rightInset }}
      >
        <IconBtn onPress={copyYesterday} label="Копировать вчерашний день">
          <Copy size={13} color="#AEB9D9" />
        </IconBtn>
        <IconBtn onPress={onHistory} label="История приёмов">
          <History size={13} color="#AEB9D9" />
        </IconBtn>
        <IconBtn onPress={() => setPortionsOpen(true)} label="Гид по порциям">
          <Hand size={13} color="#AEB9D9" />
        </IconBtn>
        {onViewAll && (
          <Pressable
            onPress={onViewAll}
            accessibilityRole="button"
            accessibilityLabel="Открыть все приёмы пищи"
            className="ml-0.5 flex-row items-center gap-0.5 px-1"
          >
            <Text className="font-medium text-[11.5px] text-[#8F9BFF]">Все</Text>
            <ChevronRight size={13} color="#8F9BFF" />
          </Pressable>
        )}
      </View>

      <PortionsModal visible={portionsOpen} onClose={() => setPortionsOpen(false)} />
    </View>
  )
}
