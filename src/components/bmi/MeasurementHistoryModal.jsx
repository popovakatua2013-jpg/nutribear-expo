// Окно «История замеров» — журнал ВСЕХ записей по дням.
// Вопрос Кати (скрин 07.11): «Ввожу начальные данные — повторно данные,
// где хранится история?» Журнал всегда лежал в хранилище телефона
// (measurements[key] = [{ id, date, cm }], новые сверху): по нему
// считаются «Сейчас», «Изменение» (к предыдущей записи) и линия
// «Динамики», он попадает в резервную копию. Но ПОСМОТРЕТЬ список
// записей было негде — тап по строке открывает окно ввода. Теперь
// в футере таблицы кнопка «История»: записи сгруппированы по дням,
// у каждой — время и корзина (опечатку можно удалить: «Сейчас»,
// «Изменение» и «Динамика» пересчитаются автоматически). Записи
// скрытых замеров (снятые галочки) тоже живые данные — видны здесь
// с пометкой «скрыт».

import { useMemo } from 'react'
import { Alert, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { History, Trash2, X } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { fmtDecimal } from '@/lib/data/bmi'
import { useToast } from '../ui/Toast'

// «7 ноября 2026» — заголовок дня в журнале
const dayTitle = (d) =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)

// «18:41» — время записи
const dayTime = (d) =>
  new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d)

export function MeasurementHistoryModal({ open, onClose, items = [] }) {
  const { toast } = useToast()
  const measurements = useProfileStore((s) => s.measurements)
  const hiddenKeys = useProfileStore((s) => s.hiddenMeasurements)
  const removeMeasurement = useProfileStore((s) => s.removeMeasurement)

  // Журнал: все записи всех замеров → группы по дням, свежие сверху.
  // День группируем по МЕСТНОЙ дате (getFullYear/getMonth/getDate):
  // toISOString даёт UTC и при +3 часовом сдвиге унёс бы запись
  // 23:30 в следующие сутки
  const groups = useMemo(() => {
    const rows = []
    items.forEach((m) => {
      ;(measurements[m.key] || []).forEach((e) => {
        const d = new Date(e.date)
        if (!e || Number.isNaN(d.getTime())) return
        rows.push({
          id: e.id,
          key: m.key,
          label: m.label,
          color: m.color,
          Icon: m.Icon,
          cm: e.cm,
          date: d,
          hidden: hiddenKeys.includes(m.key),
        })
      })
    })
    rows.sort((a, b) => b.date.getTime() - a.date.getTime())
    const out = []
    rows.forEach((r) => {
      const dk = `${r.date.getFullYear()}-${r.date.getMonth()}-${r.date.getDate()}`
      let g = out[out.length - 1]
      if (!g || g.dayKey !== dk) {
        g = { dayKey: dk, title: dayTitle(r.date), rows: [] }
        out.push(g)
      }
      g.rows.push({ ...r, time: dayTime(r.date) })
    })
    return out
  }, [items, measurements, hiddenKeys])

  function confirmRemove(row) {
    Alert.alert(
      'Удалить запись?',
      `${row.label}: ${fmtDecimal(row.cm)} см. «Сейчас» и «Изменение» в карточке пересчитаются`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            if (removeMeasurement(row.key, row.id)) {
              toast({
                title: '🗑 Запись удалена',
                description: `${row.label}: ${fmtDecimal(row.cm)} см`,
              })
            }
          },
        },
      ]
    )
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        {open && (
          <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center gap-2.5">
              <View className="h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.06]">
                <History size={19} color="#8DABFF" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[20px] text-bear-text">История замеров</Text>
                <Text
                  numberOfLines={2}
                  maxFontSizeMultiplier={1.2}
                  className="mt-0.5 font-sans text-[14px] text-bear-sub"
                >
                  Все записи с датами — по ним считаются «Сейчас» и «Изменение»
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть историю"
                className="p-1"
              >
                <X hitSlop={10} size={22} color="#A5AECB" />
              </Pressable>
            </View>

            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ paddingBottom: 4 }}>
              {groups.length === 0 ? (
                <Text className="mt-6 text-center font-sans text-[15px] text-bear-dim">
                  Записей нет — сохраните замеры через «+ Добавить»
                </Text>
              ) : (
                groups.map((g) => (
                  <View key={g.dayKey} className="mt-3">
                    <Text
                      maxFontSizeMultiplier={1.2}
                      className="font-bold text-[13px] uppercase tracking-wide text-bear-dim"
                    >
                      {g.title}
                    </Text>
                    {g.rows.map((r) => (
                      <View
                        key={`${r.key}-${r.id}`}
                        className="mt-1.5 flex-row items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.04] px-2.5 py-2"
                      >
                        <View
                          className="items-center justify-center"
                          style={{ width: 26, height: 26, borderRadius: 9, backgroundColor: `${r.color}22` }}
                        >
                          <r.Icon size={14} color={r.color} />
                        </View>
                        <View className="min-w-0 flex-1">
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                            className="font-semibold text-[15px] text-bear-text"
                          >
                            {r.hidden ? `${r.label} · скрыт` : r.label}
                          </Text>
                          <Text
                            maxFontSizeMultiplier={1.2}
                            className="font-sans text-[12px] text-bear-dim"
                          >
                            {r.time}
                          </Text>
                        </View>
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.8}
                          maxFontSizeMultiplier={1.2}
                          className="shrink-0 font-bold text-[15.5px] text-bear-text"
                        >
                          {`${fmtDecimal(r.cm)} см`}
                        </Text>
                        <Pressable
                          onPress={() => confirmRemove(r)}
                          accessibilityRole="button"
                          accessibilityLabel={`Удалить запись: ${r.label}, ${fmtDecimal(r.cm)} сантиметров`}
                          hitSlop={6}
                          className="shrink-0 rounded p-1 active:opacity-60"
                        >
                          <Trash2 size={16} color="#98A2C2" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  )
}
