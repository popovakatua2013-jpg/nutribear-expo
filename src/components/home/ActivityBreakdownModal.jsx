// Окно «Активность за сегодня» — открывается тапом по плитке
// «Активность» на главной (отзыв Кати от 10.11: «блок не открывается —
// там должно быть видно, что именно посчитано в активность»).
// В плитке «Активность» сидят две вещи: тренировки за сегодня
// (записи из блока «Тренировки»: вид, минуты, ккал) и шаги
// (≈0,04 ккал за шаг — KCAL_PER_STEP, стандартная оценка шагомера).
// Окно честно показывает обе части и итог; долгий тап по плитке
// по-прежнему правит цель сжигания.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Flame, Footprints, X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { KCAL_PER_STEP } from '@/lib/data/activity'

export function ActivityBreakdownModal({
  open,
  onClose,
  logs = [], // тренировки за сегодня [{ id, name, emoji, minutes, kcal }]
  steps = 0,
  burned = 0, // итог: тренировки + шаги (totalBurned)
  burnGoal = 0,
}) {
  const stepsKcal = Math.round((steps || 0) * KCAL_PER_STEP)
  const exMin = logs.reduce((s, e) => s + (Number(e.minutes) || 0), 0)

  return (
    <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-black/60 px-6"
        onPress={onClose}
        accessibilityLabel="Закрыть окно"
      >
        <Pressable
          onPress={() => {}}
          className="max-h-[80%] w-full overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5"
          accessibilityLabel="Активность за сегодня"
        >
          {/* Шапка */}
          <View className="flex-row items-center justify-between">
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <View
                className="h-9 w-9 shrink-0 items-center justify-center rounded-full"
                style={{ backgroundColor: 'rgba(167,139,250,0.18)' }}
              >
                <Flame size={18} color="#C4B5FD" />
              </View>
              <Text numberOfLines={1} className="font-bold text-[20px] text-bear-text">
                Активность за сегодня
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X hitSlop={10} size={22} color="#A5AECB" />
            </Pressable>
          </View>

          {/* Итог: сколько сожжено и из чего складывается */}
          <Text className="mt-3 font-sans text-[15px] text-bear-sub">
            В «Активность» входит всё, что сожгло калории за день:
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} className="mt-2.5">
            {/* Тренировки */}
            <Text className="font-semibold text-[15px] text-bear-text">
              🏋️ Тренировки{logs.length > 0 ? ` · ${logs.length}` : ''}
              {logs.length > 0 && exMin > 0 ? ` · ${exMin} мин` : ''}
            </Text>
            {logs.length === 0 ? (
              <Text className="mt-1 font-sans text-[14.5px] text-bear-dim">
                За сегодня тренировок нет — запишите в блоке «Тренировки» ниже
              </Text>
            ) : (
              <View className="mt-1.5 gap-1.5">
                {logs.map((e) => (
                  <View
                    key={e.id}
                    className="flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2"
                  >
                    <Text className="text-[18px]">{e.emoji || '🏃'}</Text>
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-[15px] text-bear-text">
                      {e.name}
                    </Text>
                    <Text className="shrink-0 font-sans text-[13.5px] text-bear-sub">
                      {Number(e.minutes) > 0 ? `${Number(e.minutes)} мин · ` : ''}
                      {Math.round(Number(e.kcal) || 0)} ккал
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Шаги */}
            <Text className="mt-3 font-semibold text-[15px] text-bear-text">🚶 Шаги</Text>
            <View className="mt-1.5 flex-row items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2">
              <Footprints size={18} color="#34D399" />
              <Text className="min-w-0 flex-1 font-semibold text-[15px] text-bear-text">
                {formatNum(steps)} шагов
              </Text>
              <Text className="shrink-0 font-sans text-[13.5px] text-bear-sub">≈ {stepsKcal} ккал</Text>
            </View>
            <Text className="mt-1 font-sans text-[13px] text-bear-dim">
              Считаем по шагомеру: примерно 0,04 ккал за шаг
            </Text>
          </ScrollView>

          {/* Итоговая строка */}
          <View className="mt-3 flex-row items-center justify-between rounded-2xl bg-white/[0.06] px-3.5 py-2.5">
            <Text className="font-bold text-[15.5px] text-bear-text">Итого сожжено</Text>
            <Text className="font-extrabold text-[17px] text-bear-text">
              {formatNum(burned)} ккал
              {burnGoal > 0 ? (
                <Text className="font-sans text-[13.5px] text-bear-sub"> из {formatNum(burnGoal)}</Text>
              ) : null}
            </Text>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
