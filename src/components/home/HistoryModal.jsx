// Модалка «История приёмов»: журнал добавленной еды по дням.
// История не сбрасывается «Новый день» — видно прошлые дни.
// Кнопка скачивания — экспорт дневника в CSV через «Поделиться».

import { useMemo } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Download, History, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '@/components/ui/Toast'
import { MEALS } from '@/lib/data/meals'
import { formatNum } from '@/lib/format'
import { buildCsv, shareCsv } from '@/lib/data/diary-export'

const DAY_MS = 86400000

// Ключ дня — как в useFoodStore (toISOString → YYYY-MM-DD)
const dayKey = (date) => new Date(date).toISOString().slice(0, 10)

function dayTitle(key) {
  if (key === dayKey(Date.now())) return 'Сегодня'
  if (key === dayKey(Date.now() - DAY_MS)) return 'Вчера'
  const [y, m, d] = key.split('-')
  return `${d}.${m}.${y}`
}

// Название приёма пищи: встроенный или пользовательский перекус
function resolveMealName(id, customMeals) {
  return (
    MEALS.find((m) => m.id === id)?.name ||
    customMeals.find((m) => m.id === id)?.name ||
    'Приём пищи'
  )
}

export function HistoryModal({ visible, onClose }) {
  const history = useFoodStore((s) => s.history)
  const customMeals = useFoodStore((s) => s.customMeals)
  const { toast } = useToast()
  const insets = useSafeAreaInsets()

  // Группировка по дням, новые сверху
  const groups = useMemo(() => {
    const map = new Map()
    for (const row of history) {
      if (!map.has(row.day)) map.set(row.day, [])
      map
        .get(row.day)
        .push({ ...row, mealName: resolveMealName(row.mealId, customMeals) })
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [history, customMeals])

  async function exportCsv() {
    if (!history.length) {
      toast({ title: 'Дневник пуст', description: 'Экспортировать нечего 🤷' })
      return
    }
    try {
      const csv = buildCsv(history, (id) => resolveMealName(id, customMeals))
      await shareCsv('nutribear-diary.csv', csv)
      toast({
        title: '📁 Дневник подготовлен',
        description: 'Выберите «Сохранить в файл» в меню',
      })
    } catch {
      toast({ title: 'Не удалось поделиться', description: 'Попробуйте ещё раз' })
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View
          className="h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {/* Шапка */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <History size={17} color="#6C8CFF" />
                <Text className="font-bold text-[15px] text-bear-text">
                  История приёмов
                </Text>
              </View>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Что и когда вы ели — последние дни
              </Text>
            </View>
            <Pressable
              onPress={exportCsv}
              accessibilityRole="button"
              accessibilityLabel="Экспорт дневника в файл"
              className="mr-1 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <Download size={15} color="#AEB9D9" />
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={16} color="#AEB9D9" />
            </Pressable>
          </View>

          {/* Список по дням */}
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-3">
            {groups.length === 0 ? (
              <Text className="py-10 text-center font-sans text-[12px] text-bear-sub">
                Пока пусто — добавьте первое блюдо 🐻
              </Text>
            ) : (
              <View className="gap-4 pb-3">
                {groups.map(([day, rows]) => (
                  <View key={day} className="gap-1.5">
                    <Text className="px-1 font-bold text-[12px] text-bear-soft">
                      {dayTitle(day)}
                    </Text>
                    {rows.map((r) => (
                      <View
                        key={r.id}
                        className="flex-row items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2"
                      >
                        <Text className="shrink-0 text-[13px]">{r.emoji}</Text>
                        <View className="min-w-0 flex-1">
                          <Text numberOfLines={1} className="font-medium text-[12px] text-bear-bright">
                            {r.name}
                          </Text>
                          <Text numberOfLines={1} className="font-sans text-[10px] text-bear-sub2">
                            {`${r.mealName} · ${r.grams} г · ${formatNum(r.kcal)} ккал${
                              r.time ? ` · ${r.time}` : ''
                            }`}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
