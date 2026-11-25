// Форма своего продукта: название, ккал и БЖУ на 100 г, клетчатка/сахар,
// обычная порция. Создаётся в окне «База продуктов», сохраняется навсегда
// (AsyncStorage) и участвует в поиске наравне со встроенной базой.
// Эмодзи-картинки продуктов убраны (отзыв Кати 21.11: «не нужны иконки
// нигде») — в данных остаётся нейтральный «⭐», старые записи с эмодзи
// совместимы: они просто нигде не показываются.

import { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Star, X } from 'lucide-react-native'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { useToast } from '../ui/Toast'
import { findFoodDuplicate } from '@/lib/data/pick'
import { useThemeColors } from '@/lib/use-theme'


// Строка инпута → число (запятая тоже работает), с запасным значением
function parseNum(text, fallback, min, max) {
  const n = Number(String(text).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10))
}

export function UserFoodForm({ open, onClose, initial }) {
  const themeColors = useThemeColors()
  const addUserFood = useUserFoodsStore((s) => s.add)
  const updateUserFood = useUserFoodsStore((s) => s.update)
  const userItems = useUserFoodsStore((s) => s.items)
  const { toast } = useToast()

  const [name, setName] = useState(initial?.name ?? '')
  const [kcal, setKcal] = useState(initial ? String(initial.kcal) : '')
  const [p, setP] = useState(initial ? String(initial.p ?? 0) : '')
  const [f, setF] = useState(initial ? String(initial.f ?? 0) : '')
  const [c, setC] = useState(initial ? String(initial.c ?? 0) : '')
  const [fib, setFib] = useState(initial ? String(initial.fib ?? 0) : '')
  const [sug, setSug] = useState(initial ? String(initial.sug ?? 0) : '')
  const [grams, setGrams] = useState(String(initial?.defaultGrams ?? 100))

  function doSave(kcalN) {
    const data = {
      name,
      emoji: initial?.emoji || '⭐',
      kcal: kcalN,
      p: parseNum(p, 0, 0, 100),
      f: parseNum(f, 0, 0, 100),
      c: parseNum(c, 0, 0, 100),
      fib: parseNum(fib, 0, 0, 50),
      sug: parseNum(sug, 0, 0, 100),
      defaultGrams: parseNum(grams, 100, 5, 2000),
    }
    if (initial?.id) {
      updateUserFood(initial.id, data)
      toast({ title: '✏️ Продукт обновлён', description: data.name })
    } else {
      addUserFood(data)
      toast({ title: '⭐ Продукт сохранён', description: `${data.name} · в поиске и базе` })
    }
    onClose()
  }

  function save() {
    const kcalN = parseNum(kcal, 0, 0, 950)
    if (!name.trim()) {
      toast({ title: '⭐ Впишите название', description: 'Например: Сырники бабушки' })
      return
    }
    if (kcalN < 1) {
      toast({ title: '⭐ Впишите калории', description: 'Ккал на 100 г, например 250' })
      return
    }
    // Дубликат по названию (свои или встроенная база): свой продукт
    // с именем встроенного перебивает его в поиске — свои в результатах
    // раньше. Отзыв Кати 21.11: свой «Сырники» (380 ккал/100 г) затер
    // встроенный (183 ккал/100 г) — тапнула первый результат
    const dup = findFoodDuplicate(name, userItems, initial?.id || null)
    if (dup) {
      Alert.alert(
        'Такой продукт уже есть',
        dup.from === 'own'
          ? `«${dup.name}» уже есть в «Моих продуктах» (${dup.kcal} ккал/100 г). Второй продукт с тем же названием перебьёт его в поиске. Всё равно сохранить?`
          : `«${dup.name}» есть во встроенной базе (${dup.kcal} ккал/100 г${dup.micros ? ', с витаминами и минералами' : ''}). Свой продукт с тем же названием перебьёт его в поиске — проверьте, что калории верные. Всё равно сохранить?`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Всё равно сохранить', style: 'destructive', onPress: () => doSave(kcalN) },
        ]
      )
      return
    }
    doSave(kcalN)
  }

  const field = 'min-w-0 flex-1 rounded-2xl border border-bear-line bg-white/5 py-2.5 text-center text-[19px] text-bear-text'

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/60 px-3 pb-3"
      >
        <View className="max-h-[92%] overflow-hidden rounded-3xl border border-bear-line bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="flex-row items-center gap-2">
              <View
                className="h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: themeColors.accent }}
              >
                <Star size={16} color={themeColors.accentOn} />
              </View>
              <Text className="font-bold text-[20px] text-bear-text">
                {initial ? 'Изменить продукт' : 'Свой продукт'}
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X hitSlop={10} size={22} color={themeColors.sub} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Название */}
            <Text className="font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Название
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={60}
              placeholder="Например: Сырники бабушки"
              placeholderTextColor={themeColors.dim}
              accessibilityLabel="Название своего продукта"
              className="mt-1.5 rounded-2xl border border-bear-line bg-white/5 px-4 py-2.5 text-[19px] text-bear-text"
            />

            {/* Эмодзи-картинки продуктов убраны (отзыв Кати 21.11:
                «не нужны иконки нигде») — форма без пикера «Картинка» */}

            {/* Ккал */}
            <Text className="mt-3.5 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Калории на 100 г
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={kcal}
                onChangeText={setKcal}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="250"
                placeholderTextColor={themeColors.dim}
                accessibilityLabel="Калории на 100 грамм"
                className={field}
              />
              <Text className="shrink-0 font-sans text-[19px] text-bear-sub">ккал</Text>
            </View>

            {/* БЖУ */}
            <Text className="mt-3.5 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Белки / жиры / углеводы на 100 г (необязательно)
            </Text>
            <View className="mt-1.5 flex-row gap-2">
              {[
                { label: 'Б, г', value: p, set: setP },
                { label: 'Ж, г', value: f, set: setF },
                { label: 'У, г', value: c, set: setC },
              ].map((fld) => (
                <View key={fld.label} className="min-w-0 flex-1">
                  <TextInput
                    value={fld.value}
                    onChangeText={fld.set}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="0"
                    placeholderTextColor={themeColors.dim}
                    accessibilityLabel={fld.label}
                    className={field}
                  />
                  <Text className="mt-1 text-center font-sans text-[15px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Клетчатка/сахар */}
            <Text className="mt-3.5 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Клетчатка и сахар на 100 г (для рейтинга)
            </Text>
            <View className="mt-1.5 flex-row gap-2">
              {[
                { label: 'Клетчатка, г', value: fib, set: setFib },
                { label: 'Сахар, г', value: sug, set: setSug },
              ].map((fld) => (
                <View key={fld.label} className="min-w-0 flex-1">
                  <TextInput
                    value={fld.value}
                    onChangeText={fld.set}
                    keyboardType="number-pad"
                    maxLength={5}
                    placeholder="0"
                    placeholderTextColor={themeColors.dim}
                    accessibilityLabel={fld.label}
                    className={field}
                  />
                  <Text className="mt-1 text-center font-sans text-[15px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Порция */}
            <Text className="mt-3.5 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Обычная порция
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={grams}
                onChangeText={setGrams}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Обычная порция в граммах"
                className={field}
              />
              <Text className="shrink-0 font-sans text-[19px] text-bear-sub">г</Text>
            </View>

            <Pressable
              onPress={save}
              accessibilityRole="button"
              accessibilityLabel="Сохранить свой продукт"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: themeColors.accent }}
            >
              <Text className="text-center font-bold text-[19px]" style={{ color: themeColors.accentOn }}>
                {initial ? 'Сохранить' : 'Добавить в базу'}
              </Text>
            </Pressable>
            <Text className="mt-2 text-center font-sans text-[15px] text-bear-sub">
              Продукт запомнится и будет в поиске и в базе продуктов
            </Text>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
