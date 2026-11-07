// Модалка добавления блюда: выбор приёма пищи и способа добавления.
// В хабе — скруглённое поле поиска и отдельное окно базы продуктов.
// Тело монтируется с key = mealId — состояние поиска сбрасывается само.
// Под вкладками приёмов — две пилюли с иконками «Сегодня / Вчера»
// (как на референс-скриншоте): приём после полуночи уходит во вчера,
// а не в чужой день. Подсказка под заголовком удалена по запросу —
// плитки говорят сами за себя.

import { useEffect, useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { Calendar, ChevronDown, ChevronLeft, Clock, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { MealTabs } from './MealTabs'
import { AddHub } from './AddHub'
import { BaseMode } from './BaseMode'
import { BarcodeMode } from './BarcodeMode'
import { LabelMode } from './LabelMode'
import { PhotoMode } from './PhotoMode'
import { VoiceMode } from './VoiceMode'
import { SelectedFood } from './SelectedFood'
import { MEALS } from '@/lib/data/meals'
import { useFoodStore } from '@/store/useFoodStore'

// Пилюля выбора дня с иконкой и шевроном — как на референс-скриншоте:
// календарь «Сегодня», часы «Вчера»; активная подсвечена фиолетовым
function DayPill({ active, icon: Icon, label, onPress }) {
  const tint = active ? '#C4B5FD' : '#8B96B8'
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={`Записать за: ${label}`}
      className={`flex-row items-center gap-1.5 rounded-full border px-3.5 py-2 active:opacity-80 ${
        active ? 'border-[#7B6CF6]/70 bg-[#7B6CF6]/20' : 'border-white/10 bg-white/[0.04]'
      }`}
    >
      <Icon size={15} color={tint} />
      <Text
        className={`font-semibold text-[14.5px] ${active ? 'text-bear-text' : 'text-bear-sub'}`}
      >
        {label}
      </Text>
      <ChevronDown size={14} color={tint} />
    </Pressable>
  )
}

export function AddFoodModal({ open, onClose, mealId, onMealIdChange, initialPick = null, onPickConsumed = () => {} }) {
  const insets = useSafeAreaInsets()
  const customMeals = useFoodStore((s) => s.customMeals)
  // Базовые приёмы; свои перекусы («Перекус 2», «Перекус 3»…) в пилюли
  // НЕ добавляем (отзыв Кати: «Перекус 2 встаёт криво — если можно, туда
  // не добавлять перекус 2, 3, 4 и т.д.») — пять пилюль в строке
  // ломали вёрстку, а запись в свои перекусы и так идёт через «+» их
  // секции на Главной. Исключение: если окно открыто ЦЕЛЬНО в свой
  // перекус (тап по «+» его секции) — показываем его одной пилюлей,
  // чтобы цель записи была видна
  const selectedCustom = customMeals.find((m) => m.id === mealId)
  const meals = selectedCustom
    ? [...MEALS, { id: selectedCustom.id, name: selectedCustom.name, short: selectedCustom.name }]
    : MEALS
  const [mode, setMode] = useState('hub')
  const [picked, setPicked] = useState(null)
  // За какой день записываем: 0 = сегодня, 1 = вчера. Выбор действует
  // на все способы добавления из этого окна (чипы, комбо, быстрая
  // запись, подтверждение порции); при закрытии сбрасывается на сегодня
  const [dayOff, setDayOff] = useState(0)

  const meal = meals.find((m) => m.id === mealId) || meals[0]

  // Рецепт, выбранный в отдельном окне «Рецепты» («Записать»): окно
  // добавления открывается сразу на экране порции этого рецепта
  useEffect(() => {
    if (open && initialPick) {
      setPicked(initialPick)
      onPickConsumed()
    }
  }, [open, initialPick, onPickConsumed])

  function close() {
    setMode('hub')
    setPicked(null)
    setDayOff(0)
    onClose()
  }

  function back() {
    setMode('hub')
    setPicked(null)
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      {/* Клавиатура больше не накрывает окно: контейнер сжимается на высоту
          клавиатуры (как в ИИ-чате), вся панель остаётся видна над ней */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/60 px-3"
        style={{ paddingBottom: 12 + insets.bottom }}
      >
        <View className="h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {picked ? (
            <SelectedFood
              key={picked.name}
              mealId={mealId}
              meal={meal}
              item={picked}
              dayOff={dayOff}
              onDayOffChange={setDayOff}
              onBack={back}
              onClose={close}
            />
          ) : (
            <>
              {/* Заголовок + вкладки приёмов */}
              <View className="border-b border-bear-line px-5 pb-3 pt-4">
                <View className="flex-row items-center justify-between">
                  <View className="min-w-0 flex-1 pr-2">
                    <Text className="font-bold text-[20px] text-bear-text">
                      Добавить приём пищи
                    </Text>
                  </View>
                  <Pressable onPress={close} accessibilityLabel="Закрыть" className="p-1">
                    <X hitSlop={10} size={22} color="#A5AECB" />
                  </Pressable>
                </View>
                <MealTabs meals={meals} mealId={mealId} onChange={onMealIdChange} />

                {/* За какой день записываем: две пилюли с иконками (календарь
                    «Сегодня», часы «Вчера») — как на референс-скриншоте.
                    Действует на все способы ниже, на экране порции выбор
                    можно поменять */}
                <View className="mt-2.5 flex-row items-center gap-2">
                  <DayPill
                    active={dayOff === 0}
                    icon={Calendar}
                    label="Сегодня"
                    onPress={() => setDayOff(0)}
                  />
                  <DayPill
                    active={dayOff === 1}
                    icon={Clock}
                    label="Вчера"
                    onPress={() => setDayOff(1)}
                  />
                </View>
              </View>

              {/* Тело: хаб способов / выбранный режим */}
              <View className="min-h-0 flex-1 px-5 pb-4 pt-3">
                {mode !== 'hub' && (
                  <Pressable
                    onPress={() => setMode('hub')}
                    accessibilityRole="button"
                    className="mb-3 flex-row items-center gap-1 self-start"
                  >
                    <ChevronLeft size={18} color="#A5AECB" />
                    <Text className="font-semibold text-[16.5px] text-bear-sub">
                      Все способы
                    </Text>
                  </Pressable>
                )}

                {mode === 'hub' && (
                  <AddHub mealId={mealId} dayOff={dayOff} onPick={setPicked} onSelect={setMode} />
                )}
                {mode === 'barcode' && <BarcodeMode onPick={setPicked} />}
                {mode === 'scan' && <PhotoMode source="camera" onPick={setPicked} />}
                {mode === 'voice' && <VoiceMode onPick={setPicked} />}
                {mode === 'gallery' && <PhotoMode source="library" onPick={setPicked} />}
                {mode === 'label' && <LabelMode onPick={setPicked} />}
              </View>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
