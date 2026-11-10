// Хаб способов добавления еды: компактная строка поиска, карточки
// «Мои комбо» и «Недавние и частые» со строками (эмодзи, название,
// калории, кнопка «Добавить», шеврон) — по умолчанию всегда свёрнуты
// (отзыв Кати), пунктирная кнопка «Сохранить приём», внизу — один ряд
// из 5 узких цветных плиток (сканер, фото, голос, галерея, этикетка).
// Плитка «Рецепты» переехала в ОТДЕЛЬНОЕ окно (RecipesModal) из
// раскрывающегося списка «Добавить еду» на Главной (отзыв Кати:
// «перенести со вкладки добавить приём пищи, где блоки с ИИ-
// распознаванием») — свои рецепты ищутся здесь же через поиск.
// «Только калории» перенесено на главную (под секциями
// дневника — запрос Кати), тут остались «Прошлый раз» и тонкая строка
// «База продуктов» — отдельное окно со своими продуктами.

import { useMemo, useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  Barcode,
  Camera,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Images,
  LayoutGrid,
  Mic,
  Plus,
  RefreshCcw,
  ScanSearch,
  Search,
  UtensilsCrossed,
  X,
} from 'lucide-react-native'
import { FoodList } from './FoodList'
import { BaseMode } from './BaseMode'
import { FOODS } from '@/lib/data/foods'
import { toBuildItem } from '@/lib/data/to-item'
import { useRecipesStore, gramsPerServing } from '@/store/useRecipesStore'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { useCombosStore } from '@/store/useCombosStore'
import { useFoodStore } from '@/store/useFoodStore'
import { dayKeyOf } from '@/store/useHistoryStore'
import { getMeal } from '@/lib/data/meals'
import { readdRow } from '@/lib/data/readd'
import { dishesWord, formatNum } from '@/lib/format'
import { useToast } from '../ui/Toast'

// 5 плиток — один компактный ряд (отзыв Кати: блоки 3×2 были крупными;
// «Рецепты» переехали в отдельное окно — отзыв Кати).
// Единый цвет всех плиток — #7B6CF6 (отзыв Кати от 11.11: все кнопки
// и выборы — одного цвета; раньше у каждой плитки был свой цвет:
// #4D7CFE, #38BDF8, #A45BFF, #0EA5E9, #F59E0B)
const TILE_COLOR = '#7B6CF6'
const TILES = [
  { id: 'barcode', label: 'Сканер', Icon: Barcode, color: TILE_COLOR },
  { id: 'scan', label: 'Фото', Icon: Camera, color: TILE_COLOR },
  { id: 'voice', label: 'Голос', Icon: Mic, color: TILE_COLOR },
  { id: 'gallery', label: 'Галерея', Icon: Images, color: TILE_COLOR },
  { id: 'label', label: 'Этикетка', Icon: ScanSearch, color: TILE_COLOR },
]

export function AddHub({ mealId, dayOff = 0, onPick, onSelect }) {
  const recipes = useRecipesStore((s) => s.items)
  const userFoods = useUserFoodsStore((s) => s.items)
  const combos = useCombosStore((s) => s.items)
  const addComboItem = useCombosStore((s) => s.add)
  const removeCombo = useCombosStore((s) => s.remove)
  const history = useFoodStore((s) => s.history)
  const mealEntries = useFoodStore((s) => s.entries[mealId]) || []
  const customMeals = useFoodStore((s) => s.customMeals)
  const addEntry = useFoodStore((s) => s.addEntry)
  const { toast } = useToast()

  const [query, setQuery] = useState('')
  const [baseOpen, setBaseOpen] = useState(false)
  const [comboOpen, setComboOpen] = useState(false)
  const [comboName, setComboName] = useState('')
  // Сворачивание карточек «Мои комбо» и «Недавние и частые» — по умолчанию
  // всегда свёрнуты (отзыв Кати): окно каждый раз открывается компактным,
  // разворачиваются только по тапу; состояние сбрасывается при закрытии
  const [combosOpen, setCombosOpen] = useState(false)
  const [recentOpen, setRecentOpen] = useState(false)

  const mealName = getMeal(mealId, customMeals).name
  const q = query.trim().toLowerCase()

  // Выбор блюда из поиска или базы — окно базы закрываем сами
  function pick(item) {
    setBaseOpen(false)
    onPick(item)
  }

  // Быстрый поиск: свои рецепты + свои продукты + вся база (без фильтра по приёму).
  // У рецепта — граммовка одной порции (выход, делённый на число порций)
  const results = useMemo(() => {
    if (!q) return null
    const rec = recipes
      .filter((r) => r.name.toLowerCase().includes(q))
      .map((r) => {
        const sv = Math.max(1, Math.round(r.servings || 1))
        return {
          id: r.id,
          name: r.name,
          photo: r.photo,
          kcal100: r.kcal100,
          emoji: '🍴',
          p: r.p100,
          f: r.f100,
          c: r.c100,
          source: 'recipe',
          defaultGrams: gramsPerServing(r) || r.grams,
          sub: sv > 1 ? `свой рецепт · ${sv} порции по ${gramsPerServing(r)} г` : 'свой рецепт',
        }
      })
    const mine = userFoods
      .filter((f) => f.name.toLowerCase().includes(q))
      .map((f) => ({
        id: f.id,
        name: f.name,
        kcal100: f.kcal,
        emoji: f.emoji,
        p: f.p,
        f: f.f,
        c: f.c,
        fib: f.fib,
        sug: f.sug,
        defaultGrams: f.defaultGrams,
        source: 'user',
        sub: 'мой продукт',
      }))
    const foods = FOODS.filter((f) => f.name.toLowerCase().includes(q)).map((f) =>
      toBuildItem(f)
    )
    return [...rec, ...mine, ...foods]
  }, [q, recipes, userFoods])

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

  // Добавить запись из журнала с той же граммовкой (1 тап по чипу).
  // dayOff — выбранный в шапке день (сегодня/вчера)
  function addFromRow(row, silent) {
    readdRow(addEntry, mealId, row, dayOff)
    if (!silent) {
      toast({
        title: `${row.emoji || '🍽️'} ${row.name} — в «${mealName}»`,
        description: `${row.grams > 0 ? `${row.grams} г · ` : ''}≈${formatNum(row.kcal)} ккал${
          dayOff ? ' · записано за вчера' : ''
        }`,
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

  // Комбо: весь набор одним тапом; долгий тап по чипу — удалить
  function addCombo(combo) {
    combo.items.forEach((row) => readdRow(addEntry, mealId, row, dayOff))
    toast({
      title: `${combo.emoji} ${combo.name} — в «${mealName}»`,
      description: `${combo.items.length} блюд(а) из комбо${dayOff ? ' · записано за вчера' : ''}`,
    })
  }

  function confirmDeleteCombo(combo) {
    Alert.alert('Удалить комбо?', `${combo.emoji} ${combo.name}`, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          removeCombo(combo.id)
          toast({ title: '🗑 Комбо удалено', description: combo.name })
        },
      },
    ])
  }

  function saveCombo() {
    if (!mealEntries.length) {
      toast({ title: '💾 Сначала добавьте блюда', description: `В «${mealName}» пока пусто` })
      setComboOpen(false)
      return
    }
    const name = comboName.trim() || `Мой ${mealName.toLowerCase()}`
    addComboItem({ name, emoji: mealEntries[0]?.emoji || '⭐', items: mealEntries })
    toast({ title: '💾 Комбо сохранено', description: `${name} · ${mealEntries.length} блюд(а)` })
    setComboName('')
    setComboOpen(false)
  }

  return (
    <View style={{ flex: 1 }}>
      {/* строка поиска — ЖЁСТКО та же высота, что у кнопки «Сохранить
          приём» ниже: у обеих h-[42px]. Прежняя «одинаковость» через
          py-2.5 не работала: нативная высота TextInput на Android
          раздувала поле выше кнопки (отзыв Кати: «по прежнему
          габаритная»). py-0 и textAlignVertical — текст по центру */}
      <View className="h-[42px] flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5">
        <Search size={16} color="#8B96B8" />
        <TextInput
          accessibilityLabel="Поиск продукта или рецепта"
          placeholder="Найти продукт или рецепт…"
          placeholderTextColor="#8B96B8"
          value={query}
          onChangeText={setQuery}
          className="min-w-0 flex-1 py-0 font-sans text-[15.5px] text-bear-text"
          style={{ textAlignVertical: 'center' }}
        />
        {query.length > 0 && (
          <Pressable
            onPress={() => setQuery('')}
            accessibilityRole="button"
            accessibilityLabel="Очистить поиск"
            className="active:opacity-60"
          >
            <X hitSlop={10} size={15} color="#8B96B8" />
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
            <LayoutGrid size={16} color="#A78BFA" />
            <Text className="font-semibold text-[15px] text-bear-soft">
              Ручной поиск · вся база продуктов
            </Text>
          </Pressable>
        </>
      ) : (
        <ScrollView
          className="mt-3 min-h-0 flex-1"
          contentContainerStyle={{ paddingBottom: 6 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Мои комбо: сохранённые наборы блюд — вертикальная карточка
              со строками (как на референс-скриншоте): эмодзи, название,
              «ккал · N блюд», кнопка «Добавить»; тап — добавить набор,
              долгий тап — удалить комбо. Карточку прячем, когда комбо нет */}
          {combos.length > 0 && (
            <View className="overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04]">
              <Pressable
                onPress={() => setCombosOpen((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={combosOpen ? 'Свернуть мои комбо' : 'Развернуть мои комбо'}
                className="flex-row items-center gap-2 px-3.5 py-3 active:opacity-80"
              >
                <UtensilsCrossed size={17} color="#A78BFA" />
                <Text className="min-w-0 flex-1 font-bold text-[16px] text-bear-text">
                  Мои комбо
                </Text>
                {combosOpen ? (
                  <ChevronUp size={16} color="#8B96B8" />
                ) : (
                  <ChevronDown size={16} color="#8B96B8" />
                )}
              </Pressable>
              {combosOpen && (
                <View className="gap-0.5 px-2 pb-2">
                  {combos.map((c) => {
                    const total = c.items.reduce((s, e) => s + e.kcal, 0)
                    return (
                      <Pressable
                        key={c.id}
                        onPress={() => addCombo(c)}
                        onLongPress={() => confirmDeleteCombo(c)}
                        delayLongPress={400}
                        accessibilityRole="button"
                        accessibilityLabel={`Добавить комбо ${c.name} (${c.items.length} блюд). Долгий тап — удалить`}
                        className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.03] px-2 py-2 active:bg-white/10"
                      >
                        <Text className="shrink-0 text-[19px]">{c.emoji}</Text>
                        <View className="min-w-0 flex-1">
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                            className="font-semibold text-[15.5px] text-bear-text"
                          >
                            {c.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                            className="font-sans text-[13px] text-bear-sub2"
                          >
                            {`${formatNum(total)} ккал · ${c.items.length} ${dishesWord(c.items.length)}`}
                          </Text>
                        </View>
                        <View className="shrink-0 rounded-full border border-[#7B6CF6]/60 px-3 py-1">
                          <Text className="font-semibold text-[13.5px] text-[#C4B5FD]">
                            Добавить
                          </Text>
                        </View>
                        <ChevronRight size={15} color="#8B96B8" />
                      </Pressable>
                    )
                  })}
                </View>
              )}
            </View>
          )}

          {/* Сохранить текущий приём как комбо — пунктирная кнопка на всю
              ширину (как на референс-скриншоте) */}
          {mealEntries.length > 0 && (
            <Pressable
              onPress={() => setComboOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Сохранить текущий приём как комбо"
              className={`h-[42px] flex-row items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#7B6CF6]/50 active:bg-[#7B6CF6]/10 ${
                combos.length > 0 ? 'mt-2.5' : ''
              }`}
            >
              <Plus size={16} color="#C4B5FD" />
              <Text className="font-semibold text-[15.5px] text-[#C4B5FD]">
                Сохранить приём
              </Text>
            </Pressable>
          )}

          {/* Недавние и частые: карточка со строками — блюдо в один тап,
              как на референс-скриншоте */}
          {recent.length > 0 && (
            <View
              className={`overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] ${
                combos.length > 0 || mealEntries.length > 0 ? 'mt-2.5' : ''
              }`}
            >
              <Pressable
                onPress={() => setRecentOpen((s) => !s)}
                accessibilityRole="button"
                accessibilityLabel={recentOpen ? 'Свернуть недавние и частые' : 'Развернуть недавние и частые'}
                className="flex-row items-center gap-2 px-3.5 py-3 active:opacity-80"
              >
                <Clock size={17} color="#A78BFA" />
                <Text className="min-w-0 flex-1 font-bold text-[16px] text-bear-text">
                  Недавние и частые
                </Text>
                {recentOpen ? (
                  <ChevronUp size={16} color="#8B96B8" />
                ) : (
                  <ChevronDown size={16} color="#8B96B8" />
                )}
              </Pressable>
              {recentOpen && (
                <View className="gap-0.5 px-2 pb-2">
                  {recent.map(({ row }) => (
                    <Pressable
                      key={row.id}
                      onPress={() => addFromRow(row)}
                      accessibilityRole="button"
                      accessibilityLabel={`Добавить ${row.name} как в прошлый раз`}
                      className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.03] px-2 py-2 active:bg-white/10"
                    >
                      <Text className="shrink-0 text-[19px]">{row.emoji || '🍽️'}</Text>
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.2}
                          className="font-semibold text-[15.5px] text-bear-text"
                        >
                          {row.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.2}
                          className="font-sans text-[13px] text-bear-sub2"
                        >
                          {`${row.grams > 0 ? `${row.grams} г · ` : ''}${formatNum(row.kcal)} ккал`}
                        </Text>
                      </View>
                      <View className="shrink-0 rounded-full bg-[#7B6CF6]/80 px-3 py-1">
                        <Text className="font-semibold text-[13.5px] text-white">Добавить</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* плитки способов — один компактный ряд из 6 узких плиток
              (отзыв Кати: прежние крупные блоки 3×2 занимали пол-окна):
              иконка по центру, подпись под ней с подгонкой размера,
              чтобы «Этикетка» и «Галерея» не переносились */}
          <View className="mt-3 flex-row gap-1.5">
            {TILES.map(({ id, label, Icon, color }) => (
              <Pressable
                key={id}
                onPress={() => onSelect(id)}
                accessibilityRole="button"
                accessibilityLabel={label}
                className="h-[64px] min-w-0 flex-1 overflow-hidden rounded-xl active:opacity-90"
                style={{ backgroundColor: color }}
              >
                <View className="flex-1 items-center justify-center">
                  <Icon size={21} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  maxFontSizeMultiplier={1.2}
                  className="pb-1.5 text-center font-bold text-[11px] text-white"
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* повтор прошлого приёма: тап — весь приём с той же граммовкой */}
          {lastMeal && (
            <Pressable
              onPress={repeatLast}
              accessibilityRole="button"
              accessibilityLabel={`Повторить прошлый приём: ${lastMeal.list.length} блюд(а)`}
              className="mt-2 flex-row items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-3 active:bg-white/10"
            >
              <RefreshCcw size={17} color="#AEB9D9" />
              <Text numberOfLines={1} className="font-semibold text-[16.5px] text-bear-text">
                Прошлый раз
              </Text>
            </Pressable>
          )}

          {/* база продуктов — заметнее прежнего (отзыв Кати:
              «крупнее и значок фиолетовый»): фиолетовая иконка и
              покрупнее шрифт, чуть выше строка */}
          <Pressable
            onPress={() => setBaseOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Открыть базу продуктов"
            className="mt-1 flex-row items-center justify-center gap-1.5 py-2.5 active:opacity-60"
          >
            <LayoutGrid size={16} color="#A78BFA" />
            <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="font-semibold text-[15px] text-bear-soft">
              База продуктов · ручной поиск
            </Text>
            <ChevronRight size={14} color="#A78BFA" />
          </Pressable>
        </ScrollView>
      )}

      {/* отдельное окно базы продуктов */}
      <Modal
        visible={baseOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setBaseOpen(false)}
      >
        {/* Клавиатура не съедает список: панель поднимается над ней целиком */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/60 px-3 pb-3"
        >
          <View className="h-[88%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#7B6CF6' }}
                >
                  <LayoutGrid size={16} color="#FFFFFF" />
                </View>
                <Text className="font-bold text-[20px] text-bear-text">База продуктов</Text>
              </View>
              <Pressable
                onPress={() => setBaseOpen(false)}
                accessibilityLabel="Закрыть базу продуктов"
                className="p-1"
              >
                <X hitSlop={10} size={22} color="#A5AECB" />
              </Pressable>
            </View>
            <View className="min-h-0 flex-1 px-5 pb-4 pt-3">
              <BaseMode mealId={mealId} onPick={pick} />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* сохранение текущего приёма как комбо */}
      <Modal
        visible={comboOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setComboOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 items-center justify-center bg-black/60 px-8"
        >
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[20px] text-bear-text">Сохранить как комбо</Text>
              <Pressable
                onPress={() => setComboOpen(false)}
                accessibilityLabel="Закрыть"
                className="p-1"
              >
                <X hitSlop={10} size={20} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 font-sans text-[15px] text-bear-sub">
              {`«${mealName}» · ${mealEntries.length} блюд(а) — набор можно будет добавить одним тапом`}
            </Text>
            <Text className="mt-3 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Название комбо
            </Text>
            <TextInput
              value={comboName}
              onChangeText={setComboName}
              maxLength={40}
              placeholder={`Мой ${mealName.toLowerCase()}`}
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Название комбо"
              autoFocus
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[19px] text-bear-text"
            />
            <Pressable
              onPress={saveCombo}
              accessibilityRole="button"
              accessibilityLabel="Сохранить комбо"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text className="text-center font-bold text-[19px] text-white">Сохранить комбо</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
