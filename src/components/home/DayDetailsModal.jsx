// Сводка дня по тапу на клетку календаря: вес, калории против цели,
// шаги, вода, тренировки, опыт. Данные — дневная история + взвешивания.
// Кнопка «Закрыть» закреплена внизу окна — видна всегда, даже когда
// список строк не влезает на небольшом экране (крестик в шапке тоже
// остался). Прокручивается только список строк.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { fmtSleep } from '@/lib/data/sleep'
import { dayData, dayStatus } from '@/lib/data/calendar'
import { dayKeyOf } from '@/store/useHistoryStore'

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

function Row({ icon, label, value, tone }) {
  return (
    <View className="flex-row items-center justify-between border-b border-white/5 py-2.5">
      <Text className="font-medium text-[17.5px] text-bear-sub">
        {icon} {label}
      </Text>
      <Text className={`font-bold text-[17.5px] ${tone || 'text-bear-text'}`}>{value}</Text>
    </View>
  )
}

export function DayDetailsModal({ open, onClose, dayKey, history, goals, weights }) {
  const d = dayData(history, dayKey, null)
  const status = dayStatus(d, goals.kcal)
  // Взвешивания хранятся с ISO-датой (UTC): сравнение по локальному
  // ключу дня — ночная запись (00:00–03:00) попадает в свой день,
  // а не в предыдущий
  const weight = (weights || []).find((w) => {
    const t = new Date(w.date)
    return !Number.isNaN(t.getTime()) && dayKeyOf(t) === dayKey
  })
  const empty = !d.kcal && !d.steps && !d.waterMl && !d.burned && !d.sleepMin && !weight

  const dt = dayKey ? new Date(`${dayKey}T00:00:00`) : null
  const title = dt ? `${dt.getDate()} ${MONTHS[dt.getMonth()]} · ${WD[dt.getDay()]}` : ''

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="flex-1">
              <Text className="font-bold text-[20px] text-bear-text">{title}</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Закрыть сводку дня"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X hitSlop={10} size={20} color="#A5AECB" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
            <View className="px-5 pb-4 pt-1">
              {empty ? (
                <Text className="py-6 text-center font-sans text-[17.5px] leading-relaxed text-bear-sub">
                  Записей в этот день нет.{'\n'}
                  Как только что-то добавите — здесь появится сводка.
                </Text>
              ) : (
                <View>
                  <Row
                    icon="⚖️"
                    label="Вес"
                    value={weight ? `${weight.kg} кг` : '—'}
                  />
                  <Row
                    icon="🍽️"
                    label="Калории (цель — текущая)"
                    value={`${formatNum(d.kcal)} / ${formatNum(goals.kcal)}`}
                    tone={status === 'over' ? 'text-rose-400' : status === 'ok' ? 'text-emerald-400' : 'text-bear-text'}
                  />
                  <Row icon="👟" label="Шаги" value={formatNum(d.steps)} />
                  <Row icon="💧" label="Вода" value={`${formatNum(d.waterMl)} мл`} />
                  <Row
                    icon="🏋️"
                    label="Сожжено на тренировках"
                    value={d.burned ? `+${formatNum(d.burned)} ккал` : '—'}
                  />
                  {/* Сон за ночь этого дня (день пробуждения): «—» — ночей
                      не записано, как у остальных строк */}
                  <Row icon="😴" label="Сон" value={d.sleepMin ? fmtSleep(d.sleepMin) : '—'} />
                  <Row icon="⭐" label="Опыт" value={`+${formatNum(d.xp)}`} />
                </View>
              )}
            </View>
          </ScrollView>

          {/* Закрыть — закреплено внизу: на небольшом экране кнопка
              не прячется за краем вместе со списком строк */}
          <View className="border-t border-bear-line px-5 pb-4 pt-3">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть сводку дня"
              className="items-center rounded-2xl bg-white/10 py-3 active:opacity-70"
            >
              <Text className="font-bold text-[17.5px] text-bear-text">Закрыть</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}