// Модалка «Все приёмы пищи»: общий обзор дневника за сегодня,
// редактирование граммовки, удаление и добавление блюд.
// Все перекусы (Перекус 2, 3…) живут внутри одной карточки
// «Перекус/Полдник» — отдельными блоками больше не показываются:
// в карточке кнопка «Добавить блюдо» и ниже — «Добавить перекус».

import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Pencil, Plus, Trash2, X } from 'lucide-react-native'
import { MEALS } from '@/lib/data/meals'
import { formatNum } from '@/lib/format'
import { dayBju, totalConsumed } from '@/lib/data/diary'
import { bjuLine } from '@/lib/data/bju'
import { useFoodStore } from '@/store/useFoodStore'
import { targetsFromKcal } from '@/lib/data/goals'
import { EditEntryModal } from '../food/EditEntryModal'

function EntryRow({ mealId, mealName, entry, onEdit }) {
  const removeEntry = useFoodStore((s) => s.removeEntry)

  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-bear-card px-3 py-2">
      <Text className="shrink-0 text-[13px]">{entry.emoji}</Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-medium text-[12px] text-bear-bright">
          {entry.name}
        </Text>
        <Text className="font-sans text-[10px] text-bear-sub2">
          {`${entry.grams} г · ${formatNum(entry.kcal)} · ${bjuLine(entry)}${
            entry.time ? ` · ${entry.time}` : ''
          }`}
        </Text>
      </View>
      <Pressable
        onPress={() => onEdit(entry)}
        accessibilityLabel={`Изменить вес «${entry.name}»`}
        accessibilityRole="button"
        className="shrink-0 rounded p-1"
      >
        <Pencil size={13} color="#5C668A" />
      </Pressable>
      <Pressable
        onPress={() => removeEntry(mealId, entry.id)}
        accessibilityLabel={`Удалить «${entry.name}» из «${mealName}»`}
        accessibilityRole="button"
        className="shrink-0 rounded p-1"
      >
        <Trash2 size={13} color="#5C668A" />
      </Pressable>
    </View>
  )
}

export function AllMealsModal({ open, onClose, kcal, onAddToMeal }) {
  const entries = useFoodStore((s) => s.entries)
  const customMeals = useFoodStore((s) => s.customMeals)
  const [edit, setEdit] = useState(null) // {mealId, entry, mealName}

  function close() {
    setEdit(null)
    onClose()
  }

  const targets = targetsFromKcal(kcal)
  const dailyTarget = kcal
  const dayTotal = totalConsumed(entries)
  const day = dayBju(entries)
  const meals = MEALS // доп. перекусы сливаются в карточку «Перекус/Полдник»

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Заголовок */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <Text className="font-bold text-[15px] text-bear-text">
                Все приёмы пищи
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                {`За сегодня: ${formatNum(dayTotal)} / ${formatNum(dailyTarget)} ккал${
                  dayTotal > 0 ? ` · ${bjuLine(day)}` : ''
                }`}
              </Text>
            </View>
            <Pressable onPress={close} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#8A94B3" />
            </Pressable>
          </View>

          {/* Секции приёмов */}
          <ScrollView
            contentContainerStyle={{ padding: 20, gap: 16 }}
            showsVerticalScrollIndicator={false}
          >
            {meals.map((meal) => {
              const isSnack = meal.id === 'snack'
              const mealEntries = entries[meal.id] || []
              // Доп. перекусы («Перекус 2», «Перекус 3»…) — внутри этой же
              // карточки; у записей сохраняем их настоящий mealId,
              // чтобы правка и удаление работали как раньше
              const extraGroups = isSnack
                ? customMeals.map((m) => ({ id: m.id, list: entries[m.id] || [] }))
                : []
              const extraCount = extraGroups.reduce((s, g) => s + g.list.length, 0)
              const consumed =
                mealEntries.reduce((s, e) => s + e.kcal, 0) +
                extraGroups.reduce(
                  (s, g) => s + g.list.reduce((x, e) => x + e.kcal, 0),
                  0
                )
              const target = targets[meal.id] ?? targets.snack

              return (
                <View
                  key={meal.id}
                  accessibilityLabel={`Приём пищи ${meal.name}`}
                  className="rounded-2xl border border-white/5 bg-white/[0.03] p-3"
                >
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="min-w-0 flex-1 font-bold text-[13px] text-bear-text">
                      {meal.emoji ? `${meal.emoji} ` : ''}
                      {meal.name}
                    </Text>
                    <View className="flex-row shrink-0 items-center gap-1">
                      <Text className="font-sans text-[11px] text-bear-sub">
                        {`${formatNum(consumed)} / ${formatNum(target)} ккал`}
                      </Text>
                      {meal.id.startsWith('custom-') && (
                        <Pressable
                          onPress={() => handleRemoveCustom(meal)}
                          accessibilityLabel={`Удалить «${meal.name}»`}
                          accessibilityRole="button"
                          className="rounded p-1 active:opacity-60"
                        >
                          <Trash2 size={14} color="#f87171" />
                        </Pressable>
                      )}
                    </View>
                  </View>

                  <View className="mt-2 gap-1">
                    {mealEntries.map((entry) => (
                      <EntryRow
                        key={entry.id}
                        mealId={meal.id}
                        mealName={meal.name}
                        entry={entry}
                        onEdit={(e) => setEdit({ mealId: meal.id, entry: e, mealName: meal.name })}
                      />
                    ))}
                    {extraGroups.flatMap((g) =>
                      g.list.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          mealId={g.id}
                          mealName={meal.name}
                          entry={entry}
                          onEdit={(e) => setEdit({ mealId: g.id, entry: e, mealName: meal.name })}
                        />
                      ))
                    )}
                  </View>

                  {!mealEntries.length && !extraCount && (
                    <Text className="mt-2 font-sans text-[11px] text-bear-dim">
                      Пока ничего не добавлено
                    </Text>
                  )}

                  <Pressable
                    onPress={() => onAddToMeal(meal.id)}
                    accessibilityRole="button"
                    className="mt-2.5 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#5B7FFF]/30 bg-[#5B7FFF]/10 py-2 active:bg-[#5B7FFF]/20"
                  >
                    <Plus size={14} color="#8DABFF" />
                    <Text className="font-semibold text-xs text-[#8DABFF]">
                      Добавить блюдо
                    </Text>
                  </Pressable>

                  {isSnack && (
                    <Pressable
                      onPress={() => onAddToMeal(meal.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Добавить перекус"
                      className="mt-1.5 flex-row items-center justify-center gap-1 rounded-xl border border-dashed border-white/15 py-2 active:border-[#5B7FFF]/50"
                    >
                      <Plus size={13} color="#8A94B3" />
                      <Text className="font-semibold text-[11px] text-bear-sub">
                        Добавить перекус
                      </Text>
                    </Pressable>
                  )}
                </View>
              )
            })}
          </ScrollView>
        </View>
      </View>

      {/* Редактирование граммовки записи */}
      {open && edit && (
        <EditEntryModal
          key={edit.entry.id}
          open={Boolean(edit)}
          onClose={() => setEdit(null)}
          mealId={edit.mealId}
          entry={edit.entry}
          mealName={edit.mealName}
        />
      )}
    </Modal>
  )
}
