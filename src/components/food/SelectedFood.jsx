// Экран подтверждения: граммовка выбранной еды и добавление в приём.
// Для распознанного ИИ (фото/голос/открытая база) — кнопка ✏️ «Исправить»:
// окно правки названия/ккал/БЖУ на 100 г, если распознавание ошиблось.

import { useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronLeft, Pencil, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { kcalForPortion } from '@/lib/data/foods'
import { buildFood } from '@/lib/data/pick'
import { bjuForPortion, bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { tapGuard } from '@/lib/tap-guard'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '../ui/Toast'
import { GramsPicker } from '../home/GramsPicker'
import { Pills } from '../ui/Pills'
import { toBuildItem } from '@/lib/data/to-item'
import { EditAiFoodModal } from './EditAiFoodModal'

// Что можно править кнопкой ✏️: ИИ, этикетка, Open Food Facts и свои
// продукты ошибаются редко, но поправить под себя можно всегда
const EDITABLE_SOURCES = ['ai', 'off', 'base', 'user', 'label']

export function SelectedFood({ mealId, meal, item, dayOff = 0, onDayOffChange, onBack, onClose }) {
  const insets = useSafeAreaInsets()
  const addEntry = useFoodStore((s) => s.addEntry)
  const { toast } = useToast()
  const [grams, setGrams] = useState(String(item.defaultGrams || 100))
  // Защита от двойного тапа: второй тап успевал сработать до перерисовки
  // — в дневнике оказывались дубли (урок из отзывов конкурента, отзыв
  // Елены: «сохраняются сразу три дублирующиеся записи»)
  const addOnce = useRef(tapGuard()).current

  // Рецепты и внешние источники уже в формате kcal100, база — в формате kcal
  const baseItem = item.kcal100 != null ? item : toBuildItem(item)
  const canEdit = EDITABLE_SOURCES.includes(baseItem.source)

  // Черновик правок распознанного (null = показываем как распозналось)
  const [draft, setDraft] = useState(null)
  const [editOpen, setEditOpen] = useState(false)
  const eff = draft ? { ...baseItem, ...draft } : baseItem

  const food = buildFood(eff)
  const gramsNum = Math.max(1, Math.min(2000, Math.round(Number(grams) || 0)))
  const previewKcal = kcalForPortion(food, gramsNum)
  const previewBju = bjuForPortion(food, gramsNum)

  // Применяем правки из окна «Исправить блюдо» — предпросмотр пересчитается сам
  function applyEdit(next) {
    setDraft({
      name: next.name,
      kcal100: next.kcal100,
      p: next.p,
      f: next.f,
      c: next.c,
      fib: next.fib, // клетчатка/сахар — для рейтинга питания
      sug: next.sug,
      desc: next.desc,
    })
    toast({
      title: '✏️ Исправлено',
      description: `${next.name}: ${next.kcal100} ккал / 100 г`,
    })
  }

  function handleAdd() {
    addOnce(() => {
      addEntry(mealId, { food, grams: gramsNum, kcal: previewKcal, desc: eff.desc }, dayOff)
      toast({
        title: `${food.emoji} ${food.name} — в «${meal.name}»`,
        description: `${gramsNum} г · ≈${formatNum(previewKcal)} ккал · ${bjuLine(
          previewBju
        )}${dayOff ? ' · записано за вчера' : ''}`,
      })
      onClose()
    })
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerClassName="px-5 pt-4 pb-4" showsVerticalScrollIndicator={false}>
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={onBack}
            accessibilityRole="button"
            accessibilityLabel="Назад к списку"
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5"
          >
            <ChevronLeft size={22} color="#AEB9D9" />
          </Pressable>
          <Text className="shrink-0 text-2xl">{food.emoji}</Text>
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-bold text-[21px] text-bear-text">
              {food.name}
            </Text>
            <Text className="font-sans text-[16.5px] leading-snug text-bear-sub">
              {`${food.kcal} ккал / 100 г · Б ${food.p} · Ж ${food.f} · У ${food.c}`}
            </Text>
          </View>
          {canEdit && (
            <Pressable
              onPress={() => setEditOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="Исправить распознанное блюдо"
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
            >
              <Pencil size={18} color="#AEB9D9" />
            </Pressable>
          )}
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 active:bg-white/10"
          >
            <X size={20} color="#AEB9D9" />
          </Pressable>
        </View>

        {canEdit && (
          <Text className="mt-2 text-[15px] leading-[18px] text-bear-sub">
            Распознал(и) неверно? Нажмите ✏️ — исправьте название, калории и БЖУ
            перед добавлением.
          </Text>
        )}

        {eff.desc ? (
          <Text className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-[16.5px] leading-[19px] text-bear-sub">
            📝 {eff.desc}
          </Text>
        ) : null}

        <View className="mt-4">
          <GramsPicker grams={grams} onChange={setGrams} />
        </View>

        <View className="mt-4 rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/10 px-4 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans text-[16px] text-bear-soft">Итого калорий</Text>
            <Text className="font-extrabold text-[22px] text-white">
              ≈ {formatNum(previewKcal)} <Text className="font-medium text-[16px] text-bear-sub">ккал</Text>
            </Text>
          </View>
          <Text className="mt-1 text-right font-sans text-[15px] text-bear-sub">
            {bjuLine(previewBju)}
          </Text>
        </View>
      </ScrollView>

      <View
        className="border-t border-bear-line p-5 pt-3.5"
        style={{ paddingBottom: 20 + insets.bottom }}
      >
        {/* За какой день: выбор из шапки виден и здесь — приём после
            полуночи уходит во вчера, поменять можно прямо перед добавлением */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="font-sans text-[15px] text-bear-sub">За какой день?</Text>
          <Pills
            items={[
              { id: 0, label: 'Сегодня' },
              { id: 1, label: 'Вчера' },
            ]}
            value={dayOff}
            onChange={onDayOffChange}
            size="sm"
            accessibilityLabel="День приёма пищи"
          />
        </View>
        <Pressable
          onPress={handleAdd}
          className="rounded-2xl py-3.5 active:opacity-80"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <Text className="text-center font-bold text-[19px] text-white">
            {dayOff ? `Добавить за вчера в «${meal.name}»` : `Добавить в «${meal.name}»`}
          </Text>
        </Pressable>
      </View>

      {/* Окно правки распознанного (монтируется только при открытии —
          поля всегда показывают актуальные значения) */}
      {editOpen && (
        <EditAiFoodModal
          open
          onClose={() => setEditOpen(false)}
          item={eff}
          grams={gramsNum}
          onApply={applyEdit}
        />
      )}
    </View>
  )
}
