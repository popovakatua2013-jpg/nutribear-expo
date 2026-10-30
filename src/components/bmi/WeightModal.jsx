// Модалка записи веса и роста: Сохранить → история веса + пересчёт ИМТ.
// Третье поле — цель по весу (необязательно): пустое поле и существующая
// цель = цель убирается. Цель видна в «Динамике веса» прогрессом.
// Под цель предлагаем норму веса для роста одним тапом и после сохранения
// цели предлагаем пересчитать дневную норму калорий (дефицит/профицит).

import { useState } from 'react'
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useToast } from '../ui/Toast'
import {
  fmtDecimal,
  healthyRange,
} from '@/lib/data/bmi'
import { recommendedKcal } from '@/lib/goal'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'

export function WeightModal({ open, onClose, height, weight, goalWeight, onSave }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        {open && (
          <WeightBody
            key={`${height}-${weight}-${goalWeight ?? 'x'}`}
            height={height}
            weight={weight}
            goalWeight={goalWeight}
            onSave={onSave}
            onClose={onClose}
          />
        )}
      </View>
    </Modal>
  )
}

function WeightBody({ height, weight, goalWeight, onSave, onClose }) {
  const { toast } = useToast()
  const [heightCm, setHeightCm] = useState(String(height))
  const [kg, setKg] = useState(String(weight))
  const [goal, setGoal] = useState(goalWeight == null ? '' : String(goalWeight))

  // Русская запятая тоже десятичный разделитель: «72,5» → 72.5
  const parseNum = (v) => Number(String(v).trim().replace(',', '.'))
  const hRaw = parseNum(heightCm)
  const wRaw = parseNum(kg)
  const valid =
    Number.isFinite(hRaw) && hRaw >= 80 && hRaw <= 250 &&
    Number.isFinite(wRaw) && wRaw >= 25 && wRaw <= 300
  const h = Math.round(hRaw)
  const w = Math.round(wRaw * 10) / 10

  // Цель: пустое поле — не менять; было и стало пустым — убрать (null).
  // Заполненное поле обязано быть валидным, иначе кнопка заблокирована
  const hasGoalText = goal.trim() !== ''
  const goalRaw = parseNum(goal)
  const goalValid =
    !hasGoalText || (Number.isFinite(goalRaw) && goalRaw >= 25 && goalRaw <= 300)
  const goalKg = hasGoalText ? Math.round(goalRaw * 10) / 10 : null
  const goalChanged = hasGoalText ? goalKg !== goalWeight : goalWeight != null

  // Подсказка цели: середина здорового диапазона веса для этого роста
  const suggestRange =
    Number.isFinite(hRaw) && hRaw >= 80 && hRaw <= 250 ? healthyRange(hRaw) : null
  const suggestKg = suggestRange ? Math.round((suggestRange.min + suggestRange.max) / 2) : 0

  // Пересчёт дневной нормы под цель: дефицит ≈ 500 ккал (≈ −0,5 кг/нед),
  // профицит ≈ +300; ниже безопасного пола не опускаемся (lib/goal.js).
  // Спрашиваем только когда считаем заметно иначе, чем в целях сейчас
  function maybeRecalcKcal(goal, weight, height) {
    const prof = useProfileStore.getState()
    const target = recommendedKcal({
      sex: prof.sex,
      age: prof.age,
      heightCm: height,
      weightKg: weight,
      activityId: prof.activityId,
      goalId: goal < weight ? 'lose' : goal > weight ? 'gain' : 'keep',
    })
    const current = useGoalsStore.getState().goals.kcal
    if (Math.abs(current - target) < 10) return
    Alert.alert(
      'Пересчитать норму калорий?',
      `Для цели ${fmtDecimal(goal)} кг рекомендуем около ${target} ккал в день. Сейчас в целях ${current} ккал.`,
      [
        { text: 'Не менять', style: 'cancel' },
        {
          text: 'Пересчитать',
          onPress: () => useGoalsStore.getState().setGoals({ kcal: target }),
        },
      ]
    )
  }

  function handleSave() {
    if (!valid || !goalValid) return
    const weightChanged = w !== weight
    onSave({ heightCm: h, weightKg: w, weightChanged, goalKg: goalChanged ? goalKg : undefined })
    let description = weightChanged
      ? `${fmtDecimal(w)} кг · ИМТ обновлён`
      : `Рост ${h} см`
    if (goalChanged && goalKg != null) description += ` · цель ${fmtDecimal(goalKg)} кг`
    toast({
      title: weightChanged ? '⚖️ Вес записан!' : '📏 Данные сохранены',
      description,
    })
    onClose()
    if (goalChanged && goalKg != null) maybeRecalcKcal(goalKg, w, h)
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-bold text-[15px] text-bear-text">Записать вес</Text>
          <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
            Обновите рост и текущий вес — ИМТ пересчитается сам
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
          <X size={20} color="#A5AECB" />
        </Pressable>
      </View>

      <Text className="mt-4 font-medium text-xs text-bear-sub">Рост, см</Text>
      <TextInput
        value={heightCm}
        onChangeText={setHeightCm}
        keyboardType="number-pad"
        textAlign="center"
        accessibilityLabel="Рост в сантиметрах"
        className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white"
      />

      <Text className="mt-3 font-medium text-xs text-bear-sub">Вес, кг</Text>
      <TextInput
        value={kg}
        onChangeText={setKg}
        keyboardType="decimal-pad"
        textAlign="center"
        accessibilityLabel="Вес в килограммах"
        className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white"
      />

      <View className="mt-3 flex-row items-center justify-between">
        <Text className="font-medium text-xs text-bear-sub">Цель, кг (необязательно)</Text>
        {goalWeight != null && goal.trim() === '' && (
          <Text className="font-sans text-[10px] text-bear-dim">пусто — цель будет убрана</Text>
        )}
      </View>
      <TextInput
        value={goal}
        onChangeText={setGoal}
        keyboardType="decimal-pad"
        textAlign="center"
        placeholder="—"
        placeholderTextColor="#8B96B8"
        accessibilityLabel="Целевой вес в килограммах"
        className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[14px] text-white"
      />

      {/* Подсказка: здоровый диапазон для роста и цель в один тап */}
      {suggestRange && goal.trim() === '' && (
        <View className="mt-2 flex-row items-center justify-between rounded-xl bg-white/[0.04] px-3 py-2">
          <Text className="min-w-0 flex-1 font-sans text-[10.5px] leading-snug text-bear-sub2">
            Норма при росте {Math.round(hRaw)} см: {suggestRange.min}–{suggestRange.max} кг
          </Text>
          <Pressable
            onPress={() => setGoal(String(suggestKg))}
            accessibilityRole="button"
            accessibilityLabel={`Подставить цель около ${suggestKg} килограммов`}
            className="ml-2 rounded-full bg-white/10 px-2.5 py-1 active:opacity-70"
          >
            <Text className="font-semibold text-[11px] text-[#8DABFF]">≈ {suggestKg} кг</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        onPress={handleSave}
        disabled={!valid || !goalValid}
        className={`mt-5 overflow-hidden rounded-2xl ${!valid || !goalValid ? 'opacity-50' : ''}`}
      >
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
          <Text className="py-3.5 text-center font-bold text-sm text-white">Сохранить</Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}
