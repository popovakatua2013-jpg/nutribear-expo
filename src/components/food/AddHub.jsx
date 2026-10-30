// Хаб способов добавления еды: строка поиска над плитками (сканер,
// голос, галерея, рецепты), чипы «Недавние и частые» — блюдо за один
// тап, кнопки «Прошлый раз» (повтор приёма) и «Только калории»
// (быстрая запись без поиска). «База продуктов» — отдельное окно.

import { useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  Camera,
  ChefHat,
  ChevronRight,
  Images,
  LayoutGrid,
  Mic,
  RefreshCcw,
  Search,
  X,
  Zap,
} from 'lucide-react-native'
import { FoodList } from './FoodList'
import { BaseMode } from './BaseMode'
import { FOODS } from '@/lib/data/foods'
import { toBuildItem } from '@/lib/data/to-item'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useFoodStore } from '@/store/useFoodStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { getMeal } from '@/lib/data/meals'
import { round1 } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { useToast } from '../ui/Toast'

const TILES = [
  { id: 'scan', label: 'Сканер', Icon: Camera, color: '#4D7CFE' },
  { id: 'voice', label: 'Голос', Icon: Mic, color: '#A45BFF' },
  { id: 'gallery', label: 'Галерея', Icon: Images, color: '#0EA5E9' },
  { id: 'recipes', label: 'Рецепты', Icon: ChefHat, color: '#F59E0B' },
]

// Восстановить «продукт» из записи журнала, чтобы добавить её заново:
// в журнале БЖУ хранятся на порцию — пересчитываем на 100 г
function foodFromRow(row) {
  const g = row.grams > 0 ? row.grams : 0
  const k = g > 0 ? 100 / g : 0
  const per = (v) => round1((v || 0) * k)
  return {
    id: row.foodId || `recent-${row.id}`,
    name: row.name,
    emoji: row.emoji,
    kcal: Math.round((row.kcal || 0) * k),
    p: per(row.p),
    f: per(row.f),
    c: per(row.c),
    fib: per(row.fib),
    sug: per(row.sug),
    fe: per(row.fe),
    ca: per(row.ca),
    k: per(row.k),
    mg: per(row.mg),
    vitc: per(row.vitc),
    vita: per(row.vita),
    mk: row.mk,
  }
}

export function AddHub({ mealId, onPick, onSelect }) {
  const recipes = useRecipesStore((s) => s.items)
  const history = useFoodStore((s) => s.history)
  const addEntry = useFoodStore((s) => s.addEntry)
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [baseOpen, setBaseOpen] = useState(false)
  const [quickOpen, setQuickOpen] = useState(false)
  const [qName, setQName] = useState('')
  const [qKcal, setQKcal] = useState('')

  const mealName = getMeal(mealId).name
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

  // Недавние и частые: топ блюд из журнала — свои для этого приёма выше,
  // дальше по числу повторений, при равенстве — более свежие
  const recent = useMemo(() => {
    if (!history.length) return []
    const acc = new Map()
    history.forEach((h, i) => {
      const key = (h.name || '').toLowerCase()
      if (!key) return
      const prev = acc.get(key)
      acc.set(key, {
        row: h, // журнал «новые сверху» — остаётся последняя запись
        count: (prev?.count || 0) + 1,
        fresh: h.mealId === mealId ? 1 : 0,
        idx: i,
      })
    })
    return [...acc.values()]
      .sort((a, b) => b.fresh - a.fresh || b.count - a.count || a.idx - b.idx)
      .slice(0, 8)
  }, [history, mealId])

  // Последний приём этого вида пищи (не сегодня) — для кнопки «Прошлый раз»
  const lastMeal = useMemo(() => {
    const today = dayKeyOf()
    const rows = history.filter((h) => h.mealId === mealId && h.day < today)
    if (!rows.length) return null
    const list = history.filter((h) => h.mealId === mealId && h.day === rows[0].day)
    return { day: rows[0].day, list }
  }, [history, mealId])

  // Выбор блюда из поиска или базы — окно базы закрываем сами
  function pick(item) {
    setBaseOpen(false)
    onPick(item)
  }

  // Добавить запись из журнала с той же граммовкой (1 тап по чипу)
  function addFromRow(row, silent) {
    addEntry(mealId, {
      food: foodFromRow(row),
      grams: row.grams > 0 ? row.grams : 0,
      kcal: Math.max(1, Math.round(row.kcal || 0)),
      desc: row.desc,
    })
    if (!silent) {
      toast({
        title: `${row.emoji || '🍽️'} ${row.name} — в «${mealName}»`,
        description: `${row.grams > 0 ? `${row.grams} г · ` : ''}≈${formatNum(row.kcal)} ккал`,
      })
    }
  }

  function repeatLast() {
    if (!lastMeal) return
    lastMeal.list.forEach((row) => addFromRow(row, true))
    const [, m, d] = lastMeal.day.split('-')
    toast({
      title: `↻ Повторён прошлый «${mealName}»`,
      description: `${lastMeal.list.length} блюд(а) · ${d}.${m}`,
    })
  }

  function submitQuick() {
    const kcal = Math.round(Number(String(qKcal).replace(',', '.')) || 0)
    if (kcal < 10 || kcal > 3000) {
      toast({ title: '⚡ Укажите калории', description: 'От 10 до 3000 ккал, например 250' })
      return
    }
    const name = qName.trim().slice(0, 40) || 'Быстрая запись'
    addEntry(mealId, {
      food: { id: 'quick', name, emoji: '⚡', kcal, p: 0, f: 0, c: 0, fib: 0, sug: 0 },
      grams: 0,
      kcal,
      desc: '',
    })
    toast({ title: `⚡ ${kcal} ккал — в «${mealName}»`, description: name })
    setQuickOpen(false)
    setQName('')
    setQKcal('')
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
          {/* недавние и частые — добавление в один тап */}
          {recent.length > 0 && (
            <View className="mt-3">
              <Text className="font-semibold text-[11px] uppercase tracking-wide text-bear-sub">
                Недавние и частые
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingTop: 7, paddingBottom: 2 }}
              >
                {recent.map(({ row }) => (
                  <Pressable
                    key={row.id}
                    onPress={() => addFromRow(row)}
                    accessibilityRole="button"
                    accessibilityLabel={`Добавить ${row.name} как в прошлый раз`}
                    className="flex-row items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 active:bg-white/10"
                  >
                    <Text className="text-[13px]">{row.emoji || '🍽️'}</Text>
                    <Text
                      numberOfLines={1}
                      className="max-w-[110px] font-semibold text-[11.5px] text-bear-text"
                    >
                      {row.name}
                    </Text>
                    <Text className="font-sans text-[10px] text-bear-dim">
                      {row.grams > 0 ? `${row.grams} г` : `${Math.round(row.kcal)} ккал`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

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

          {/* повтор прошлого приёма + быстрая запись калорий */}
          <View className="mt-2 flex-row gap-2">
            {lastMeal && (
              <Pressable
                onPress={repeatLast}
                accessibilityRole="button"
                accessibilityLabel={`Повторить прошлый приём: ${lastMeal.list.length} блюд(а)`}
                className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 active:bg-white/10"
              >
                <RefreshCcw size={15} color="#AEB9D9" />
                <Text numberOfLines={1} className="font-semibold text-[12px] text-bear-text">
                  Прошлый раз
                </Text>
              </Pressable>
            )}
            <Pressable
              onPress={() => setQuickOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Быстрая запись: только калории"
              className="flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 active:bg-white/10"
            >
              <Zap size={15} color="#FBBF24" />
              <Text numberOfLines={1} className="font-semibold text-[12px] text-bear-text">
                Только калории
              </Text>
            </Pressable>
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

      {/* быстрая запись: только калории */}
      <Modal
        visible={quickOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setQuickOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/60 px-8">
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-7 w-7 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  <Zap size={14} color="#FFFFFF" />
                </View>
                <Text className="font-bold text-[15px] text-bear-text">Быстрая запись</Text>
              </View>
              <Pressable
                onPress={() => setQuickOpen(false)}
                accessibilityLabel="Закрыть быструю запись"
                className="p-1"
              >
                <X size={18} color="#8A94B3" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[11px] text-bear-sub">
              Когда некогда искать блюдо — запишите только калории
            </Text>

            <Text className="mt-3 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Калории
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={qKcal}
                onChangeText={setQKcal}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="250"
                placeholderTextColor="#5C668A"
                accessibilityLabel="Калории за порцию"
                autoFocus
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
              />
              <Text className="shrink-0 font-sans text-sm text-bear-sub">ккал</Text>
            </View>

            <Text className="mt-3 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Название (необязательно)
            </Text>
            <TextInput
              value={qName}
              onChangeText={setQName}
              maxLength={40}
              placeholder="Перекус в офисе"
              placeholderTextColor="#5C668A"
              accessibilityLabel="Название быстрой записи"
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-bear-text"
            />

            <Pressable
              onPress={submitQuick}
              accessibilityRole="button"
              accessibilityLabel="Добавить быструю запись"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text className="text-center font-bold text-sm text-white">
                Добавить в «{mealName}»
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}
