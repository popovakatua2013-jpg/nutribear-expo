// Режим «База»: встроенная база продуктов + СВОИ продукты (запоминаются)
// с поиском. Свои продукты можно добавлять, изменять и удалять —
// они участвуют в поиске по всему приложению наравне с базой.
// Если в встроенной базе нет нужного (редкий продукт, бренд) — кнопка
// «Искать в Open Food Facts» (≈2.5 млн позиций, бесплатно, с кешем).

import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native'
import { Cloud, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react-native'
import { FoodList } from './FoodList'
import { UserFoodForm } from './UserFoodForm'
import { FOODS } from '@/lib/data/foods'
import { foodMatchesQuery, foodMatchesQueryAnyAlias } from '@/lib/food-search'
import { toBuildItem } from '@/lib/data/to-item'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { searchOFFCached } from '@/store/useOffCacheStore'
import { useToast } from '../ui/Toast'
import { useThemeColors } from '@/lib/use-theme'


export function BaseMode({ mealId, onPick }) {
  const themeColors = useThemeColors()
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false) // создание нового
  const [editItem, setEditItem] = useState(null) // свой продукт на изменении
  // OFF-поиск: результаты, статус загрузки, была ли уже попытка (чтобы
  // не показывать кнопку повторно, если пользователь уже искал)
  const [offResults, setOffResults] = useState([])
  const [offLoading, setOffLoading] = useState(false)
  const [offSearched, setOffSearched] = useState(false)
  const userFoods = useUserFoodsStore((s) => s.items)
  const removeUserFood = useUserFoodsStore((s) => s.remove)
  const { toast } = useToast()

  const q = query.trim().toLowerCase()

  // Сброс OFF-поиска при изменении запроса — новый запрос, новый поиск
  // (кеш в useOffCacheStore переживает смену запроса, поэтому повторный
  // поиск по тому же слову будет мгновенным)
  const qKey = q
  const lastQRef = useState({ current: '' })[0]
  if (lastQRef.current !== qKey) {
    lastQRef.current = qKey
    if (offSearched || offResults.length || offLoading) {
      setOffResults([])
      setOffSearched(false)
      // offLoading не сбрасываем — если идёт запрос, пусть дойдёт
    }
  }

  // Свои продукты: показываются отдельной секцией под поиском, но и в
  // общий поиск по базе они тоже попадают (в результатах поиска — «мой продукт»)
  const mine = useMemo(
    () =>
      userFoods
        .filter((f) => !q || foodMatchesQuery(f.name, q))
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
        })),
    [userFoods, q]
  )

  // Локальная база. При непустом запросе ищем по ВСЕЙ базе — без фильтра
  // по приёму пищи (отзыв Кати 21.11: «батон» на Обеде не находился —
  // «Батон нарезной» помечен только завтраком; а «йогуртов», «творожков»,
  // «бургеров» не было вовсе — поиск был строгой подстрокой). Пустой
  // запрос — каталог продуктов текущего приёма, как раньше.
  // Формы слов и ё/е понимает foodMatchesQuery: «йогуртов» → «йогурт»,
  // «творожков» → «творог», «вареная» → «варёная»
  const local = useMemo(
    () =>
      FOODS.filter(
        (f) =>
          (mealId.startsWith('custom-') || !q || f.tags.includes(mealId)) &&
          foodMatchesQueryAnyAlias(f, q)
      ).map((f) => toBuildItem(f)),
    [mealId, q]
  )

  // Поиск в Open Food Facts (≈2.5 млн позиций). Показываем кнопку,
  // когда локальная база дала < 5 результатов и запрос ≥ 2 символа —
  // это сигнал «нет в базе, ищи шире». Кеш в useOffCacheStore переживает
  // повторные запросы — мгновенный ответ.
  const showOFFButton = q.length >= 2 && local.length + mine.length < 5 && !offSearched
  const showOFFResults = offSearched && offResults.length > 0

  async function runOFFSearch() {
    if (!q || offLoading) return
    setOffLoading(true)
    try {
      const items = await searchOFFCached(q)
      setOffResults(items)
      setOffSearched(true)
      if (items.length === 0) {
        toast({ title: 'В Open Food Facts не нашлось', description: `«${q}» — попробуйте иначе или добавьте свой продукт +` })
      } else {
        toast({ title: `Найдено в OFF: ${items.length}`, description: 'Кеш сохранён — повтор будет мгновенным' })
      }
    } catch {
      toast({ title: 'OFF недоступен', description: 'Проверьте сеть и попробуйте снова' })
    } finally {
      setOffLoading(false)
    }
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Поиск «тетрадная строка» + кнопка «свой продукт» */}
      <View className="flex-row items-end gap-2">
        <View className="min-w-0 flex-1 flex-row items-center gap-2 border-b border-white/15 px-1 pb-1.5">
          <Search size={18} color={themeColors.dim} />
          <TextInput
            accessibilityLabel="Поиск блюда"
            placeholder="Найти блюдо…"
            placeholderTextColor={themeColors.dim}
            value={query}
            onChangeText={setQuery}
            className="min-w-0 flex-1 font-sans text-[17.5px] text-bear-text"
          />
        </View>
        <Pressable
          onPress={() => setFormOpen(true)}
          accessibilityRole="button"
          accessibilityLabel="Добавить свой продукт"
          className="h-[36px] w-[42px] shrink-0 items-center justify-center rounded-xl active:opacity-80"
          style={{ backgroundColor: themeColors.accent }}
        >
          <Plus size={20} color={themeColors.accentOn} />
        </Pressable>
      </View>

      {/* Свои продукты — сразу под поиском, чтобы их было видно: тап по строке
          добавляет продукт в приём, карандаш — изменяет, корзина — удаляет */}
      {mine.length > 0 && (
        <View className="mt-3">
          <View className="flex-row items-center gap-1.5 px-1">
            <Star size={14} color="#FBBF24" />
            <Text className="font-semibold text-[15px] uppercase tracking-wide text-bear-sub">
              {`Мои продукты · ${mine.length}`}
            </Text>
          </View>
          <View className="mt-1.5 gap-1">
            {mine.map((f) => (
              <View
                key={f.id}
                className="flex-row items-center gap-2 rounded-2xl bg-[#FBBF24]/[0.06] px-3 py-1.5"
              >
                <Pressable
                  onPress={() => onPick(f)}
                  accessibilityRole="button"
                  accessibilityLabel={`Добавить «${f.name}» (${f.kcal100} ккал на 100 г)`}
                  className="min-w-0 flex-1 flex-row items-center gap-2"
                >
                  <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-[17px] text-bear-text">
                    {f.name}
                  </Text>
                  <Text className="shrink-0 font-sans text-[15px] text-bear-sub">
                    {f.kcal100} ккал/100 г
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setEditItem(f)}
                  accessibilityLabel={`Изменить продукт «${f.name}»`}
                  accessibilityRole="button"
                  hitSlop={6}
                  className="rounded p-1"
                >
                  <Pencil size={15} color={themeColors.dim} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    removeUserFood(f.id)
                    toast({ title: '🗑 Продукт удалён', description: f.name })
                  }}
                  accessibilityLabel={`Удалить продукт «${f.name}»`}
                  accessibilityRole="button"
                  hitSlop={6}
                  className="rounded p-1"
                >
                  <Trash2 size={16} color={themeColors.sub2} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="mt-3 min-h-0 flex-1">
        <FoodList
          items={local}
          emptyText="Ничего не нашлось 🤷 Добавьте свой продукт кнопкой + или ищите в Open Food Facts ниже"
          onPick={onPick}
        />
      </View>

      {/* Кнопка «Искать в Open Food Facts» — когда локальной базы мало */}
      {showOFFButton && (
        <Pressable
          onPress={runOFFSearch}
          disabled={offLoading}
          accessibilityRole="button"
          accessibilityLabel={`Искать «${q}» в Open Food Facts`}
          className="mt-2 flex-row items-center justify-center gap-2 rounded-2xl border border-[#38BDF8]/30 bg-[#38BDF8]/8 px-4 py-3 active:opacity-80"
        >
          {offLoading ? (
            <ActivityIndicator size="small" color="#38BDF8" />
          ) : (
            <Cloud size={18} color="#38BDF8" />
          )}
          <Text className="font-semibold text-[15.5px] text-[#7DD3FC]">
            {offLoading ? 'Ищем в Open Food Facts…' : `Искать «${q}» в Open Food Facts`}
          </Text>
        </Pressable>
      )}

      {/* Результаты OFF — отдельной секцией, пометка «📦 из OFF» */}
      {showOFFResults && (
        <View className="mt-3">
          <View className="flex-row items-center gap-1.5 px-1">
            <Cloud size={14} color="#38BDF8" />
            <Text className="font-semibold text-[15px] uppercase tracking-wide text-bear-sub">
              {`Open Food Facts · ${offResults.length}`}
            </Text>
          </View>
          <View className="mt-1.5">
            <FoodList
              items={offResults.map((f) => toBuildItem(f))}
              onPick={onPick}
              emptyText=""
            />
          </View>
        </View>
      )}

      {/* Если OFF вернул 0 — мягкая подсказка */}
      {offSearched && offResults.length === 0 && !offLoading && (
        <Text className="mt-2 px-1 text-center text-[14px] text-bear-sub2">
          В Open Food Facts «{q}» не нашлось. Добавьте свой продукт кнопкой +
        </Text>
      )}

      {/* Форма своего продукта (создание / изменение) */}
      {(formOpen || editItem) && (
        <UserFoodForm
          open
          initial={editItem || undefined}
          onClose={() => {
            setFormOpen(false)
            setEditItem(null)
          }}
        />
      )}
    </View>
  )
}
