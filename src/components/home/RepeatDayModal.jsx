// Модалка «Повторить день»: выбираешь любой из последних дней с записями
// (новые сверху) — и все его блюда копируются в сегодняшний дневник,
// каждый в свой приём пищи. Замена старой кнопки «копировать вчера»:
// теперь день виден списком, с числом записей и калориями.
// Если в сегодняшнем дневнике уже есть еда — сначала спросим
// «добавить к имеющимся?», а в тосте «День повторён» есть кнопка
// «Отменить» — убирает только что скопированные блюда.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { CalendarDays, Check, Copy, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '@/components/ui/Toast'
import { readdRow } from '@/lib/data/readd'
import { tapGuard } from '@/lib/tap-guard'
import { formatNum } from '@/lib/format'
import { useThemeColors } from '@/lib/use-theme'


// Ключ дня «ГГГГ-ММ-ДД» — только такие попадают в список. Строки
// журнала из совсем старых версий приложения могли не иметь поля day —
// раньше они собирались под ключом undefined и ломали отрисовку списка
const VALID_DAY_RE = /^\d{4}-\d{2}-\d{2}$/

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

export function RepeatDayModal({ visible, onClose, onCopied }) {
  const themeColors = useThemeColors()
  const history = useFoodStore((s) => s.history)
  const entries = useFoodStore((s) => s.entries)
  const diaryDay = useFoodStore((s) => s.dayKey) // локальный день дневника
  const addEntry = useFoodStore((s) => s.addEntry)
  const removeEntry = useFoodStore((s) => s.removeEntry)
  const { toast } = useToast()
  const insets = useSafeAreaInsets()
  const [picked, setPicked] = useState(null)

  const todayKey = dayKey(Date.now())

  // Журнал читается из AsyncStorage с задержкой: если открыть модалку
  // сразу после запуска приложения, список ещё пуст и выглядит как
  // «записей нет», хотя они есть (отзыв Кати: «выбрать вчерашний день
  // нет возможности хотя записи есть»). Ждём гидратацию — пустой
  // список показываем только после неё
  const [hydrated, setHydrated] = useState(useFoodStore.persist.hasHydrated())
  useEffect(() => {
    if (hydrated) return
    const off = useFoodStore.persist.onFinishHydration(() => setHydrated(true))
    return off
  }, [hydrated])

  // Дни с записями, новые сверху. Сегодня НЕ предлагаем (повторять день
  // сам в себя бессмысленно — так и задумано по комментарию выше),
  // исключаем его из журнала. Если дневник ещё живёт вчерашним днём
  // (день не сбросился — например, приложение не открывали после
  // полуночи), его еда лежит в entries под ключом diaryDay ≠ сегодня:
  // предлагаем и её. Если после всего список пуст, но в сегодняшнем
  // дневнике есть блюда — предлагаем повторить сегодняшний набор
  const days = useMemo(() => {
    const map = new Map()
    for (const row of history) {
      if (!VALID_DAY_RE.test(row?.day || '')) continue
      if (row.day === todayKey) continue
      if (!map.has(row.day)) map.set(row.day, { count: 0, kcal: 0 })
      const agg = map.get(row.day)
      agg.count += 1
      agg.kcal += row.kcal || 0
    }
    // Дневник остался на прошлом дне: его записи — тоже «вчерашняя еда»,
    // которую можно повторить (в журнале они есть, но сумма/число
    // записей из entries полнее)
    if (diaryDay && VALID_DAY_RE.test(diaryDay) && diaryDay !== todayKey) {
      const own = Object.values(entries || {}).flat()
      if (own.length) {
        if (!map.has(diaryDay)) map.set(diaryDay, { count: 0, kcal: 0 })
        const agg = map.get(diaryDay)
        agg.count += own.length
        agg.kcal += own.reduce((s, e) => s + (e.kcal || 0), 0)
      }
    }
    if (map.size === 0) {
      const todays = Object.values(entries || {}).flat()
      if (todays.length) {
        map.set(todayKey, {
          count: todays.length,
          kcal: todays.reduce((s, e) => s + (e.kcal || 0), 0),
        })
      }
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([key, agg]) => ({ key, ...agg }))
  }, [history, entries, diaryDay, todayKey])

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
        'В сегодняшних приёмах уже есть еда',
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

  // Защита от двойного тапа — двойной тап по «Повторить день» успевал
  // скопировать весь день второй раз (урок из отзывов конкурента)
  const copyOnce = useRef(tapGuard()).current

  function doCopy(rows) {
    copyOnce(() => {
      // Собираем id только что добавленных записей — по ним работает «Отменить»
      const added = []
      rows.forEach((r) => {
        try {
          const e = readdRow(addEntry, r.mealId, r)
          if (e?.id) added.push({ mealId: r.mealId, id: e.id })
        } catch {}
      })
      // Приёмы, куда пришла еда, — карточка раскроет их, чтобы результат
      // был виден сразу (иначе всё спрятано в свёрнутых секциях)
      const mealIds = [...new Set(added.map((a) => a.mealId).filter(Boolean))]
      if (mealIds.length && typeof onCopied === 'function') onCopied(mealIds)
      toast({
        title: '📋 День повторён',
        description: `Добавлено записей: ${added.length}`,
        action: added.length
          ? { label: 'Отменить', onPress: () => undoCopy(added) }
          : undefined,
      })
      setPicked(null)
      onClose()
    })
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
          className="max-h-[80%] overflow-hidden rounded-3xl border border-bear-line bg-bear-pop"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          {/* Шапка */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <CalendarDays size={19} color={themeColors.link} />
                <Text className="font-bold text-[20px] text-bear-text">Повторить день</Text>
              </View>
              <Text className="mt-0.5 font-sans text-[15px] text-bear-sub">
                Выбери день — его еда скопируется в сегодня
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bear-overlay active:opacity-70"
            >
              <X hitSlop={10} size={18} color={themeColors.soft} />
            </Pressable>
          </View>

          {/* Список дней: новые сверху */}
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1 px-4 pt-3">
            {days.length === 0 ? (
              <Text className="py-10 text-center font-sans text-[16.5px] text-bear-sub">
                {!hydrated
                  ? 'Загружаем журнал приёмов…'
                  : `Пока нет прошлых дней с записями — повторять нечего 🐻\nЗаписи появляются, когда добавляешь еду`}
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
                      // Выбор подсвечен рамкой И заливкой — раньше только
                      // слабая заливка, и выбранный день визуально не менялся
                      // (отзыв Кати: «выбрать вчерашний день нет возможности»)
                      className={`flex-row items-center gap-2.5 rounded-xl border px-3 py-2.5 ${
                        isPicked
                          ? 'border-bear-accentSoft bg-bear-accentFaint2'
                          : 'border-transparent bg-bear-overlay'
                      }`}
                    >
                      <View
                        className={`h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                          isPicked ? 'border-bear-accentSoft bg-bear-accentFaint3' : 'border-bear-line'
                        }`}
                      >
                        {isPicked && <Check size={14} color={themeColors.link} strokeWidth={3} />}
                      </View>
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          className={`font-bold text-[17px] ${isPicked ? 'text-bear-bright' : 'text-bear-text'}`}
                        >
                          {dayTitle(d.key)}
                          {isToday ? ' · сегодня' : ''}
                        </Text>
                        <Text numberOfLines={1} className="font-sans text-[15px] text-bear-sub2">
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
              accessibilityLabel="Скопировать выбранный день в сегодняшние приёмы пищи"
              accessibilityState={{ disabled: !picked }}
              className={`flex-row items-center justify-center gap-2 rounded-2xl py-3 ${
                picked ? 'bg-bear-accent active:opacity-80' : 'bg-bear-overlay'
              }`}
            >
              <Copy size={17} color={picked ? '#FFFFFF' : themeColors.dim} />
              <Text
                className={`font-bold text-[17.5px] ${picked ? 'text-white' : 'text-bear-sub2'}`}
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
