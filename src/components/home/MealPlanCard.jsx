// Карточка «Приёмы пищи» — классический дневник прямо под шапкой (по
// просьбе Кати: внесённые блюда раньше были видны только в окне «Все
// приёмы пищи», теперь каждый приём — отдельная секция на главной,
// как в классических приложениях). В шапке секции видно: сколько блюд
// в категории и сколько из рекомендованных калорий съедено («340 /
// 454 ккал»), полоска заполнения приёма. По умолчанию ВСЕ секции
// свёрнуты — видно только шапку (отзыв Кати: раскрытые списки делали
// дневник громоздким), тап по заголовку разворачивает список блюд с
// правкой (карандаш) и удалением (корзина), «+» и кнопка «Добавить
// блюдо» добавляют еду. Рекомендованные ккал по приёмам считаются
// от дневной нормы (targetsFromKcal: пропорции 25/35/30/10) и видны
// парой «X / Y» в каждой секции; строку-легенду «Норма N ккал:
// завтрак … · обед …» убрали по запросу. Управление (повтор дня,
// история, порции) — в шапке, «Все» открывает старое окно со сводкой
// БЖУ. Поверхность — в стиле вкладки «Тело» (фиолетовая bear-bodyCard
// + обводка bear-bodyLine).

import { useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from 'lucide-react-native'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { EditEntryModal } from '../food/EditEntryModal'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { MEALS } from '@/lib/data/meals'
import { dishesWord, formatNum } from '@/lib/format'
import { animateExpandCollapse } from '@/lib/anim'
import { targetsFromKcal } from '@/lib/data/goals'

const MAX = 1.2
// диаметр круглого фото приёма; радиус = половина
const THUMB = 40

// Однострочный текст, который при нехватке ширины сжимается, а не режется
function Fit({ className, children, max = 1.15, min = 0.8 }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={min}
      maxFontSizeMultiplier={max}
      className={className}
    >
      {children}
    </Text>
  )
}

// Итоги по приёму: блюда основного списка + доп. перекусы («Перекус 2,
// 3…»), которые живут внутри карточки «Перекус/Полдник»
function mealTotals(meal, entries, customMeals) {
  const mealEntries = entries[meal.id] || []
  const extraGroups =
    meal.id === 'snack'
      ? customMeals.map((m) => ({ id: m.id, list: entries[m.id] || [] }))
      : []
  const count = mealEntries.length + extraGroups.reduce((s, g) => s + g.list.length, 0)
  const consumed =
    mealEntries.reduce((s, e) => s + e.kcal, 0) +
    extraGroups.reduce((s, g) => s + g.list.reduce((x, e) => x + e.kcal, 0), 0)
  return { mealEntries, extraGroups, count, consumed }
}

// Строка блюда внутри раскрытой секции: эмодзи, название, граммовка,
// калории и время; карандаш — правка веса (с настоящим mealId — у доп.
// перекусов он свой), корзина — удалить
function DishRow({ mealId, mealName, entry, onEdit }) {
  const removeEntry = useFoodStore((s) => s.removeEntry)

  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-bear-card px-2.5 py-2">
      <Text className="shrink-0 text-[16.5px]">{entry.emoji}</Text>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-medium text-[15.5px] text-bear-bright"
        >
          {entry.name}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-sans text-[13.5px] text-bear-sub2"
        >
          {`${entry.grams > 0 ? `${entry.grams} г · ` : ''}${formatNum(entry.kcal)} ккал${
            entry.time ? ` · ${entry.time}` : ''
          }`}
        </Text>
      </View>
      <Pressable
        onPress={() => onEdit(entry, mealId)}
        accessibilityLabel={`Изменить вес «${entry.name}»`}
        accessibilityRole="button"
        className="shrink-0 rounded p-1"
      >
        <Pencil size={14} color="#8B96B8" />
      </Pressable>
      <Pressable
        onPress={() => removeEntry(mealId, entry.id)}
        accessibilityLabel={`Удалить «${entry.name}» из «${mealName}»`}
        accessibilityRole="button"
        className="shrink-0 rounded p-1"
      >
        <Trash2 size={14} color="#8B96B8" />
      </Pressable>
    </View>
  )
}

// Секция одного приёма пищи: фото + название + счётчик блюд, справа —
// «съедено / рекомендовано ккал» и шеврон; тап по заголовку сворачивает
// и разворачивает список блюд, «+» добавляет без раскрытия
function MealSection({ meal, target, totals, open, onToggle, onAdd, onEdit }) {
  const { mealEntries, extraGroups, count, consumed } = totals
  const pct = target > 0 ? Math.round((consumed / target) * 100) : 0
  const barPct = Math.min(100, Math.max(0, pct))
  const over = pct > 100 // перебор нормы — полоска янтарная

  return (
    <View className="rounded-2xl border border-white/[0.06] bg-white/[0.04]">
      {/* заголовок секции */}
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={
          open
            ? `Свернуть приём «${meal.name}», внесено ${count} ${dishesWord(count)}`
            : `Развернуть приём «${meal.name}», внесено ${count} ${dishesWord(count)} из ${formatNum(target)} килокалорий`
        }
        className="min-w-0 flex-row items-center gap-2.5 px-3 pb-1.5 pt-2.5 active:opacity-80"
      >
        <View className="relative shrink-0" style={{ width: THUMB, height: THUMB }}>
          {/* круглое фото: borderRadius на самой картинке — надёжнее
              всего на Android, ничего не вылезает за углы */}
          <Image
            source={meal.image}
            resizeMode="cover"
            style={{ width: THUMB, height: THUMB, borderRadius: THUMB / 2 }}
          />
          {/* галочка «внесено» — фиолетовый кружок на фото */}
          {count > 0 && (
            <View
              className="absolute items-center justify-center rounded-full bg-[#7B6CF6]"
              style={{ width: 17, height: 17, right: -2, bottom: -2, borderWidth: 2, borderColor: '#0C1327' }}
            >
              <Check size={13} color="#FFFFFF" strokeWidth={3.5} />
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Fit className="font-semibold text-[17.5px] leading-tight text-bear-text">
            {meal.short || meal.name}
          </Fit>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="mt-0.5 font-sans text-[13px] text-bear-sub2"
          >
            {count > 0 ? `${count} ${dishesWord(count)}` : 'Пока пусто'}
          </Text>
        </View>

        {/* съедено из рекомендованного — столбиком: числа + подпись */}
        <View className="shrink-0 items-end">
          <Fit
            max={1.1}
            className="font-semibold text-[15.5px] leading-tight text-bear-bright"
          >
            {`${formatNum(consumed)} / ${formatNum(target)}`}
          </Fit>
          <Text
            maxFontSizeMultiplier={1.1}
            className="font-sans text-[11px] leading-tight text-bear-dim"
          >
            ккал
          </Text>
        </View>

        {open ? (
          <ChevronUp size={15} color="#98A2C2" />
        ) : (
          <ChevronDown size={15} color="#98A2C2" />
        )}

        {/* быстрое добавление без раскрытия секции */}
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          hitSlop={4}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Plus size={15} color="#8DABFF" />
        </Pressable>
      </Pressable>

      {/* полоска заполнения приёма: доля от рекомендованных ккал */}
      <View className="mx-3 mb-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <View
          className="h-1 rounded-full"
          style={{ width: `${barPct}%`, backgroundColor: over ? '#F59E0B' : '#7B6CF6' }}
        />
      </View>

      {/* блюда — только у раскрытой секции */}
      {open && (
        <View className="gap-1 px-2.5 pb-2.5">
          {mealEntries.map((entry) => (
            <DishRow
              key={entry.id}
              mealId={meal.id}
              mealName={meal.name}
              entry={entry}
              onEdit={onEdit}
            />
          ))}
          {extraGroups.flatMap((g) =>
            g.list.map((entry) => (
              <DishRow
                key={entry.id}
                mealId={g.id}
                mealName={meal.name}
                entry={entry}
                onEdit={onEdit}
              />
            ))
          )}

          {!count && (
            <Text className="px-1 py-1 font-sans text-[14px] text-bear-dim">
              Пока ничего не добавлено
            </Text>
          )}

          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
            className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#5B7FFF]/30 bg-[#5B7FFF]/10 py-2 active:bg-[#5B7FFF]/20"
          >
            <Plus size={15} color="#8DABFF" />
            <Text className="font-semibold text-[15px] text-[#8DABFF]">
              Добавить блюдо
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

export function MealPlanCard({ onAdd, onViewAll }) {
  const entries = useFoodStore((s) => s.entries)
  const customMeals = useFoodStore((s) => s.customMeals)
  const kcalGoal = useGoalsStore((s) => s.goals.kcal)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [edit, setEdit] = useState(null) // {mealId, entry, mealName}
  // Ручное сворачивание: по умолчанию все секции свёрнуты — видно только
  // шапку (отзыв Кати); тап запоминает выбор пользователя
  const [expanded, setExpanded] = useState({})

  // Рекомендованные ккал по приёмам от дневной нормы
  const targets = targetsFromKcal(kcalGoal)

  function isOpen(meal) {
    return Boolean(expanded[meal.id])
  }

  function toggle(meal) {
    animateExpandCollapse()
    setExpanded((s) => ({ ...s, [meal.id]: !isOpen(meal) }))
  }

  return (
    <View
      accessibilityLabel="Приёмы пищи на сегодня"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      <PlanHeader
        onViewAll={onViewAll}
        onHistory={() => setHistoryOpen(true)}
      />

      {/* секции приёмов, одна под другой */}
      <View className="gap-2">
        {MEALS.map((meal) => (
          <MealSection
            key={meal.id}
            meal={meal}
            target={targets[meal.id] ?? targets.snack}
            totals={mealTotals(meal, entries, customMeals)}
            open={isOpen(meal)}
            onToggle={() => toggle(meal)}
            onAdd={() => onAdd(meal.id)}
            onEdit={(entry, mealId) =>
              setEdit({ mealId: mealId || meal.id, entry, mealName: meal.name })
            }
          />
        ))}
      </View>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Редактирование граммовки записи прямо с главной */}
      {edit && (
        <EditEntryModal
          key={edit.entry.id}
          open={Boolean(edit)}
          onClose={() => setEdit(null)}
          mealId={edit.mealId}
          entry={edit.entry}
          mealName={edit.mealName}
        />
      )}
    </View>
  )
}
