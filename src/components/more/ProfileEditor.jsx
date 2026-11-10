// Карточка «Профиль» — компактный герой-блок вкладки «Ещё».
// Отзыв Кати от 11.11: блок сделать компактнее («уже»), убрать
// «выпадающее окно» (раскрытие формы внутри карточки). Теперь тап
// по блоку сразу открывает отдельное окно редактирования — как
// «Записать вес» на «Теле»: поля «Имя / Рост / Вес» и закреплённая
// внизу кнопка «Сохранить профиль». Сохранение сворачивает окно сразу.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Pencil, UserRound, X } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useToast } from '../ui/Toast'
import { fmtDecimal } from '@/lib/data/bmi'

const FIELD =
  'mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-[19px] text-white'

export function ProfileEditor() {
  const name = useProfileStore((s) => s.name)
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)

  const [open, setOpen] = useState(false)

  // Буква имени в аватаре, пока имени нет — человечек
  const initial = (name || '').trim().charAt(0).toUpperCase()

  return (
    <View
      accessibilityLabel="Профиль"
      className="overflow-hidden rounded-3xl border border-bear-bodyLine bg-bear-bodyCard"
    >
      {/* Компактная шапка: аватар + имя + рост • вес + карандаш.
          Никакого раскрытия внутри блока — тап сразу открывает
          отдельное окно редактирования (отзыв Кати от 11.11) */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Редактировать профиль: имя, рост, вес"
        className="flex-row items-center gap-3 px-4 py-3.5 active:opacity-80"
      >
        <View className="h-12 w-12 items-center justify-center overflow-hidden rounded-full">
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#8B5CF6', '#6D28D9']}>
            <View className="h-12 w-12 items-center justify-center">
              {initial ? (
                <Text className="font-extrabold text-[21px] text-white">{initial}</Text>
              ) : (
                <UserRound size={22} color="#FFFFFF" />
              )}
            </View>
          </LinearGradient>
        </View>

        <View className="min-w-0 flex-1">
          {/* Имя — в заголовок блока; без имени — «Профиль» */}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.2}
            className="font-extrabold text-[19px] tracking-tight text-bear-text"
          >
            {name || 'Профиль'}
          </Text>
          <Text
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[15px] text-bear-sub"
          >
            {heightCm} см • {fmtDecimal(weightKg)} кг
          </Text>
        </View>

        {/* Карандаш «изменить» — как у тренировок на «Главной» */}
        <Pencil size={20} color="#6C8CFF" />
      </Pressable>

      <ProfileModal open={open} onClose={() => setOpen(false)} />
    </View>
  )
}

// Окно редактирования: тот же шаблон, что «Записать вес» (дно экрана,
// затемнение, клавиатура не перекрывает поля на iOS, ключ сбрасывает
// форму при каждом открытии). Сохранение сворачивает окно сразу
// (отзыв Кати: «нажать сохранить профиль — должно сразу сворачивать»).
function ProfileModal({ open, onClose }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60 px-3 pb-3"
      >
        {open && <ProfileBody onClose={onClose} />}
      </KeyboardAvoidingView>
    </Modal>
  )
}

function ProfileBody({ onClose }) {
  const name = useProfileStore((s) => s.name)
  const heightCm = useProfileStore((s) => s.heightCm)
  const weightKg = useProfileStore((s) => s.weightKg)
  const setProfile = useProfileStore((s) => s.setProfile)
  const addWeight = useProfileStore((s) => s.addWeight)
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: name || '',
    heightCm: String(heightCm),
    weightKg: String(weightKg),
  })
  const patch = (p) => setForm((f) => ({ ...f, ...p }))

  function save() {
    // Русская запятая тоже десятичный разделитель: «72,5» → 72.5
    const parseNum = (v) => Number(String(v).trim().replace(',', '.'))
    const hRaw = parseNum(form.heightCm)
    const wRaw = parseNum(form.weightKg)
    if (
      !Number.isFinite(hRaw) || hRaw < 80 || hRaw > 250 ||
      !Number.isFinite(wRaw) || wRaw < 25 || wRaw > 300
    ) {
      toast({
        title: '⚠️ Проверьте данные',
        description: 'Рост 80–250 см, вес 25–300 кг — например 72,5',
      })
      return
    }
    const h = Math.round(hRaw)
    const w = Math.round(wRaw * 10) / 10
    const weightChanged = w !== weightKg
    setProfile({ name: form.name.trim().slice(0, 24), heightCm: h })
    if (weightChanged) addWeight(w)
    // Окно сворачивается сразу после сохранения
    onClose()
    toast({
      title: '✅ Профиль сохранён',
      description:
        weightChanged
          ? `Вес ${fmtDecimal(w)} кг`
          : `${form.name.trim() || 'Без имени'} · ${h} см · ${fmtDecimal(weightKg)} кг`,
    })
  }

  return (
    <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop p-5">
      <View className="flex-row items-center justify-between">
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[20px] text-bear-text">Редактировать профиль</Text>
          <Text className="mt-0.5 font-sans text-[15px] text-bear-sub">
            Рост и вес влияют на ИМТ и расчёты
          </Text>
        </View>
        <Pressable onPress={onClose} accessibilityLabel="Закрыть профиль" className="p-1">
          <X hitSlop={10} size={22} color="#A5AECB" />
        </Pressable>
      </View>

      {/* Поля прокручиваются, кнопка закреплена внизу окна */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flexShrink: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="mt-4 font-medium text-[16px] text-bear-sub">Имя</Text>
        <TextInput
          value={form.name}
          onChangeText={(v) => patch({ name: v })}
          textAlign="center"
          maxLength={24}
          accessibilityLabel="Имя"
          className={FIELD}
        />

        <View className="mt-3 flex-row gap-3">
          <View className="min-w-0 flex-1">
            <Text className="font-medium text-[16px] text-bear-sub">Рост, см</Text>
            <TextInput
              value={form.heightCm}
              onChangeText={(v) => patch({ heightCm: v })}
              keyboardType="number-pad"
              textAlign="center"
              accessibilityLabel="Рост в сантиметрах"
              className={FIELD}
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-medium text-[16px] text-bear-sub">Вес, кг</Text>
            <TextInput
              value={form.weightKg}
              onChangeText={(v) => patch({ weightKg: v })}
              keyboardType="decimal-pad"
              textAlign="center"
              accessibilityLabel="Вес в килограммах"
              className={FIELD}
            />
          </View>
        </View>
      </ScrollView>

      {/* Сохранить — закреплено внизу: видна всегда, даже когда
          клавиатура открыта */}
      <Pressable onPress={save} className="mt-3 overflow-hidden rounded-2xl">
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
          <Text className="py-3.5 text-center font-bold text-[19px] text-white">
            Сохранить профиль
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}
