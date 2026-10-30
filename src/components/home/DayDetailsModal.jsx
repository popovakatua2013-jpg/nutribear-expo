// Сводка дня по тапу на клетку календаря: вес, калории против цели,
// шаги, вода, тренировки, опыт. Данные — дневная история + взвешивания.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { dayData, dayStatus } from '@/lib/data/calendar'

const MONTHS = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]
const WD = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

function Row({ icon, label, value, tone }) {
  return (
    <View className="flex-row items-center justify-between border-b border-white/5 py-2.5">
      <Text className="font-medium text-[13px] text-bear-sub">
        {icon} {label}
      </Text>
      <Text className={`font-bold text-[13px] ${tone || 'text-bear-text'}`}>{value}</Text>
    </View>
  )
}

export function DayDetailsModal({ open, onClose, dayKey, history, goals, weights }) {
  const d = dayData(history, dayKey, null)
  const status = dayStatus(d, goals.kcal)
  const weight = (weights || []).find((w) => String(w.date || '').slice(0, 10) === dayKey)
  const empty = !d.kcal && !d.steps && !d.waterMl && !d.burned && !weight

  const dt = dayKey ? new Date(`${dayKey}T00:00:00`) : null
  const title = dt ? `${dt.getDate()} ${MONTHS[dt.getMonth()]} · ${WD[dt.getDay()]}` : ''

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="flex-1">
              <Text className="font-bold text-[15px] text-bear-text">{title}</Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">Сводка дня</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Закрыть сводку дня"
              accessibilityRole="button"
              className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={18} color="#A5AECB" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="px-5 pb-6 pt-1">
              {empty ? (
                <Text className="py-6 text-center font-sans text-[13px] leading-relaxed text-bear-sub">
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
                  <Row icon="⭐" label="Опыт" value={`+${formatNum(d.xp)}`} />
                </View>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}