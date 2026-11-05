// Модалка «Повторить день»: выбираешь любой из последних дней с записями
// (новые сверху) — и все его блюда копируются в сегодняшний дневник,
// каждый в свой приём пищи. Замена старой кнопки «копировать вчера»:
// теперь день виден списком, с числом записей и калориями.
// Если в сегодняшнем дневнике уже есть еда — сначала спросим
// «добавить к имеющимся?», а в тосте «День повторён» есть кнопка
// «Отменить» — убирает только что скопированные блюда.

import { useMemo, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { CalendarDays, Check, Copy, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '@/components/ui/Toast'
import { readdRow } from '@/lib/data/readd'
import { formatNum } from '@/lib/format'

const DAY_MS = 86400000

// Ключ дня по ЛОКАЛЬНЫМ часам — как в useHistoryStore и журнале
const dayKey = (date) => {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}

function dayTitle(key) {
  if (key === dayKey(Date.now())) return 'Сегодня'
  if (key === dayKey(Date.now() - DAY_MS)) return 'Вчера'
  const [, m, d] = key.split('-')
  return `${+d} ${['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'][+m - 1]}`
}

export function RepeatDayModal({ visible, onClose }) {
  const history = useFoodStore((s) => s.history)
  const entries = useFoodStore((s) => s.entries)
  const addEntry = useFoodStore((s) => s.addEntry)
  const removeEntry = useFoodStore((s) => s.removeEntry)
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [picked, setPicked] = useState(null)

  // Дни с записями, новые сверху; сегодня не предлагаем повторять сам с собой.
  // Если журнал пуст (записи велись до появления истории), но в сегодняшнем
  // дневнике есть блюда — предлагаем повторить сегодняшний набор
  const days = useMemo(() => {
    const map = new Map()
    for (const row of history) {
      if (!map.has(row.day)) map.set(row.day, { count: 0, kcal: 0 })
      const agg = map.get(row.day)
      agg.count += 1
      agg.kcal += row.kcal || 0
    }
    if (map.size === 0) {
      const todays = Object.values(entries || {}).flat()
      if (todays.length) {
        map.set(dayKey(Date.now()), {
          count: todays.length,
          kcal: todays.reduce((s, e) => s + (e.kcal || 0), 0),
        })
      }
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, agg]) => ({ key, ...agg }))
  }, [history, entries])

  const todayKey = dayKey(Date.now())

  // Скопировать все записи выбранного дня в сегодняшний дневник.
  // Источник: журнал истории, а если он пуст — сегодняшние записи дневника.
  // Если в сегодняшнем дневнике уже есть еда — сначала подтверждение:
  // добавляем к имеющимся, ничего не затирая
  function repeatPicked() {
    let rows = history.filter((h) => h.day === picked)
    if (!rows.length && picked === dayKey(Date.now())) {
      rows = Object.values(entries || {})
        .flat()
        .map((e, i) => ({ ...e, id: `${e.id}-rp-${i}`, mealId: e.mealId || 'snack' }))
    }
    if (!rows.length) return

    const hasFoodToday = Object.values(entries || {}).some((arr) => (arr || []).length > 0)
    if (hasFoodToday) {
      Alert.alert(
        'В сегодняшнем дневнике уже есть еда',
        `Добавить ${rows.length} скопированных записей к имеющимся? Ничего не будет затёрто.`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Добавить', onPress: () => doCopy(rows) },
        ]
      )
      return
    }
    doCopy(rows)
  }

  function doCopy(rows) {
    // Собираем id только что добавленных записей — по ним работает «Отменить»
    const added = []
    rows.forEach((r) => {
      try {
        const e = readdRow(addEntry, r.mealId, r)
        if (e?.id) added.push({ mealId: r.mealId, id: e.id })
      } catch {}
    })
    toast({
      title: '📋 День повторён',
      description: `Добавлено записей: ${added.length}`,
      action: added.length
        ? { label: 'Отменить', onPress: () => undoCopy(added) }
        : undefined,
    })
    setPicked(null)
    onClose()
  }

  // «Отменить» в тосте: убираем только что скопированные блюда —
  // и из дневника, и из журнала (removeEntry чистит обе стороны)
  function undoCopy(added) {
    added.forEach(({ mealId, id }) => {
      try {
        removeEntry(mealId, id)
      } catch {}
    })
    toast({
      title: '↩ Копирование отменено',
      description: `Убрано записей: ${added.length}`,
    })
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View
          className="max-h-[80%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {/* Шапка */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <CalendarDays size={19} color="#6C8CFF" />
                <Text className="font-bold text-[18px] text-bear-text">Повторить день</Text>
              </View>
              <Text className="mt-0.5 font-sans text-[13px] text-bear-sub">
                Выбери день — его еда скопируется в сегодня
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={18} color="#AEB9D9" />
            </Pressable>
          </View>

          {/* Список дней: новые сверху */}
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-3">
            {days.length === 0 ? (
              <Text className="py-10 text-center font-sans text-[14.5px] text-bear-sub">
                Пока нет записей — повторять нечего 🐻
              </Text>
            ) : (
              <View className="gap-1.5 pb-3">
                {days.map((d) => {
                  const isToday = d.key === todayKey
                  const isPicked = picked === d.key
                  return (
                    <Pressable
                      key={d.key}
                      onPress={() => setPicked(isPicked ? null : d.key)}
                      accessibilityRole="button"
                      accessibilityLabel={`Выбрать день ${dayTitle(d.key)}, записей: ${d.count}`}
                      className={`flex-row items-center gap-2.5 rounded-xl px-3 py-2.5 ${
                        isPicked ? 'bg-[#5B7FFF]/15' : 'bg-white/[0.04]'
                      }`}
                    >
                      <View
                        className={`h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isPicked ? 'border-[#8DABFF] bg-[#5B7FFF]/30' : 'border-white/15'
                        }`}
                      >
                        {isPicked && <Check size={14} color="#8DABFF" strokeWidth={3} />}
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className={`font-bold text-[15px] ${isPicked ? 'text-bear-bright' : 'text-bear-text'}`}
                        >
                          {dayTitle(d.key)}
                          {isToday ? ' · сегодня' : ''}
                        </Text>
                        <Text numberOfLines={1} className="font-sans text-[12.5px] text-bear-sub2">
                          {`${d.count} записей · ≈${formatNum(Math.round(d.kcal))} ккал`}
                        </Text>
                      </View>
                    </Pressable>
                  )
                })}
              </View>
            )}
          </ScrollView>

          {/* Кнопка копирования — активна, когда день выбран */}
          <View className="border-t border-bear-line px-4 pt-3">
            <Pressable
              onPress={repeatPicked}
              disabled={!picked}
              accessibilityRole="button"
              accessibilityLabel="Скопировать выбранный день в сегодняшний дневник"
              accessibilityState={{ disabled: !picked }}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-3 ${
                picked ? 'bg-[#5B7FFF] active:opacity-80' : 'bg-white/5'
              }`}
            >
              <Copy size={17} color={picked ? '#FFFFFF' : '#8B96B8'} />
              <Text
                className={`font-bold text-[15.5px] ${picked ? 'text-white' : 'text-bear-sub2'}`}
              >
                {picked
                  ? `Скопировать в сегодня (${dayTitle(picked)})`
                  : 'Выбери день выше'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
