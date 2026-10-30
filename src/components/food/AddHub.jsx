// Хаб способов добавления еды: строка поиска прямо над плитками
// (сканер, голос, галерея, рецепты) — результаты по всей базе продуктов
// и своим рецептам появляются сразу под строкой. «База продуктов» —
// ручной поиск по списку приёма пищи — открывается отдельным окном.

import { useMemo, useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import {
  Camera,
  ChefHat,
  ChevronRight,
  Images,
  LayoutGrid,
  Mic,
  Search,
  X,
} from 'lucide-react-native'
import { FoodList } from './FoodList'
import { BaseMode } from './BaseMode'
import { FOODS } from '@/lib/data/foods'
import { toBuildItem } from '@/lib/data/to-item'
import { useRecipesStore } from '@/store/useRecipesStore'

const TILES = [
  { id: 'scan', label: 'Сканер', Icon: Camera, color: '#4D7CFE' },
  { id: 'voice', label: 'Голос', Icon: Mic, color: '#A45BFF' },
  { id: 'gallery', label: 'Галерея', Icon: Images, color: '#0EA5E9' },
  { id: 'recipes', label: 'Рецепты', Icon: ChefHat, color: '#F59E0B' },
]

export function AddHub({ mealId, onPick, onSelect }) {
  const recipes = useRecipesStore((s) => s.items)
  const [query, setQuery] = useState('')
  const [baseOpen, setBaseOpen] = useState(false)

  const q = query.trim().toLowerCase()

  // Быстрый поиск: свои рецепты + вся база продуктов (без фильтра по приёму)
  const results = useMemo(() => {
    if (!q) return null
    const rec = recipes
      .filter((r) => r.name.toLowerCase().includes(q))
      .map((r) => ({
        id: r.id,
        name: r.name,
        kcal100: r.kcal100,
        emoji: '🍴',
        p: r.p100,
        f: r.f100,
        c: r.c100,
        source: 'recipe',
        defaultGrams: r.grams,
        sub: 'свой рецепт',
      }))
    const foods = FOODS.filter((f) => f.name.toLowerCase().includes(q)).map((f) =>
      toBuildItem(f)
    )
    return [...rec, ...foods]
  }, [q, recipes])

  function pick(item) {
    setBaseOpen(false)
    onPick(item)
  }

  return (
    <View style={{ flex: 1 }}>
      {/* строка поиска — сразу над плитками */}
      <View className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
        <Search size={16} color="#5C668A" />
        <TextInput
          accessibilityLabel="Поиск продукта или рецепта"
          placeholder="Найти продукт или рецепт…"
          placeholderTextColor="#5C668A"
          value={query}
          onChangeText={setQuery}
          className="min-w-0 flex-1 font-sans text-sm text-bear-text"
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            className="p-0.5 active:opacity-60"
          >
            <X size={15} color="#5C668A" />
          </Pressable>
        )}
      </View>

      {results ? (
        <>
          {/* результаты поиска */}
          <View className="mt-3 min-h-0 flex-1">
            <FoodList
              items={results}
              emptyText="Ничего не нашлось 🤷 Попробуйте другой запрос"
              onPick={pick}
            />
          </View>
          <Pressable
            onPress={() => setBaseOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Ручной поиск по всей базе продуктов"
            className="mt-2 flex-row items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2.5 active:bg-white/10"
          >
            <LayoutGrid size={14} color="#AEB9D9" />
            <Text className="font-semibold text-[12px] text-bear-soft">
              Ручной поиск · вся база продуктов
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* плитки способов */}
          <View className="mt-3 flex-row flex-wrap gap-2">
            {TILES.map(({ id, label, Icon, color }) => (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                accessibilityRole="button"
                accessibilityLabel={label}
                className="h-[96px] rounded-2xl border border-white/10 bg-white/[0.04] p-3 active:bg-white/10"
                style={{ width: '48.5%' }}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: color }}
                >
                  <Icon size={17} color="#FFFFFF" />
                </View>
                <Text className="absolute inset-x-3 bottom-2.5 font-bold text-[12.5px] text-bear-text">
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ручной поиск: база продуктов отдельным окном */}
          <Pressable
            onPress={() => setBaseOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Открыть базу продуктов"
            className="mt-2 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3.5 active:bg-white/10"
          >
            <View
              className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <LayoutGrid size={16} color="#FFFFFF" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[13.5px] text-bear-text">База продуктов</Text>
              <Text className="font-sans text-[11px] text-bear-sub">
                Ручной поиск по всему списку
              </Text>
            </View>
            <ChevronRight size={16} color="#5C668A" />
          </Pressable>
        </>
      )}

      {/* отдельное окно базы продуктов */}
      <Modal
        visible={baseOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setBaseOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          <View className="h-[88%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#7B6CF6' }}
                >
                  <LayoutGrid size={14} color="#FFFFFF" />
                </View>
                <Text className="font-bold text-[15px] text-bear-text">База продуктов</Text>
              </View>
              <Pressable
                onPress={() => setBaseOpen(false)}
                accessibilityLabel="Закрыть базу продуктов"
                className="p-1"
              >
                <X size={20} color="#8A94B3" />
              </Pressable>
            </View>
            <View className="min-h-0 flex-1 px-5 pb-4 pt-3">
              <BaseMode mealId={mealId} onPick={pick} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}
