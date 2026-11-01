// Мини-история ИМТ по неделям: открывается тапом по бейджу
// «В норме N недель» под кольцом. Для каждой из последних 8 недель —
// снимок ИМТ на конец недели: последнее измерение «на тот день или
// раньше»; недель до первой записи касаемся честно — «нет данных»,
// никаких вымышленных значений. Цвет точки — по категории ИМТ.
// Стрик из бейджа — недели подряд, когда ИМТ в «Норме».

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { calcBmi, bmiCategory, fmtDecimal, shortDate } from '@/lib/data/bmi'

// Короткие названия категорий — чтобы строка помещалась в один ряд
const SHORT = {
  low: 'Дефицит',
  norm: 'Норма',
  over: 'Лишний вес',
  obese1: 'Ожирение',
  obese2: 'Ожирение',
}

const WEEKS = 8

export function StreakHistoryModal({ open, onClose, weightKg, weights, heightCm }) {
  // Измерения по возрастанию времени — для поиска «на тот день или раньше»
  const asc = (weights || [])
    .map((r) => ({ t: new Date(r.date).getTime(), kg: r.kg }))
    .sort((a, b) => a.t - b.t)

  // Снимок на конец каждой недели: сегодня, неделю назад, две… (новые сверху)
  const rows = []
  for (let k = 0; k < WEEKS; k++) {
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() - k * 7)
    const tEnd = end.getTime()
    let kg = null
    for (const r of asc) {
      if (r.t <= tEnd) kg = r.kg
      else break
    }
    const bmi = kg != null ? calcBmi(kg, heightCm) : 0
    const cat = bmiCategory(bmi)
    rows.push({ label: shortDate(end), kg, bmi, cat })
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <Text className="font-bold text-[15px] text-bear-text">
                Как менялся твой ИМТ
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Снимок на конец каждой из последних {WEEKS} недель
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть историю ИМТ"
              className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={16} color="#AEB9D9" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            <View className="gap-1.5">
              {rows.map((row) => (
                <View
                  key={row.label}
                  className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5"
                >
                  <Text className="w-[42px] shrink-0 font-sans text-[11px] text-bear-dim">
                    {row.label}
                  </Text>
                  {row.kg != null ? (
                    <>
                      <View
                        className="h-[9px] w-[9px] shrink-0 rounded-full"
                        style={{
                          backgroundColor: row.cat.color,
                          shadowColor: row.cat.color,
                          shadowOpacity: 0.8,
                          shadowRadius: 5,
                        }}
                      />
                      <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
                        {`${fmtDecimal(row.bmi)} · ${SHORT[row.cat.id] || row.cat.label}`}
                      </Text>
                    </>
                  ) : (
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[12px] text-bear-sub">
                      Нет данных — до первой записи
                    </Text>
                  )}
                </View>
              ))}
            </View>

            <Text className="mt-3 px-1 font-sans text-[10.5px] leading-snug text-bear-sub">
              🛡 Бейдж у кольца показывает стрик — недели подряд, когда ИМТ в «Норме».
              Держи вес — стрик растёт каждую неделю.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
