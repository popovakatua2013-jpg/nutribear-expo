// Модалка добавления блюда: выбор приёма пищи и способа добавления.
// В хабе — строка поиска над плитками и отдельное окно базы продуктов.
// Тело монтируется с key = mealId — состояние поиска сбрасывается само.

import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { ChevronLeft, X } from 'lucide-react-native'
import { MealTabs } from './MealTabs'
import { AddHub } from './AddHub'
import { RecipeMode } from './RecipeMode'
import { PhotoMode } from './PhotoMode'
import { VoiceMode } from './VoiceMode'
import { SelectedFood } from './SelectedFood'
import { useFoodStore } from '@/store/useFoodStore'
import { MEALS } from '@/lib/data/meals'

export function AddFoodModal({ open, onClose, mealId, onMealIdChange }) {
  const customMeals = useFoodStore((s) => s.customMeals)
  const [mode, setMode] = useState('hub')
  const [picked, setPicked] = useState(null)

  const meals = [...MEALS, ...customMeals]
  const meal = meals.find((m) => m.id === mealId) || meals[0]

  function close() {
    setMode('hub')
    setPicked(null)
    onClose()
  }

  function back() {
    setMode('hub')
    setPicked(null)
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {picked ? (
            <SelectedFood
              key={picked.name}
              mealId={mealId}
              meal={meal}
              item={picked}
              onBack={back}
              onClose={close}
            />
          ) : (
            <>
              {/* Заголовок + вкладки приёмов */}
              <View className="border-b border-bear-line px-5 pb-3 pt-4">
                <View className="flex-row items-center justify-between">
                  <View className="min-w-0 flex-1 pr-2">
                    <Text className="font-bold text-[15px] text-bear-text">
                      Добавить приём пищи
                    </Text>
                    <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                      Поиск, сканер, голос, галерея или свои рецепты
                    </Text>
                  </View>
                  <Pressable onPress={close} accessibilityLabel="Закрыть" className="p-1">
                    <X size={20} color="#8A94B3" />
                  </Pressable>
                </View>
                <MealTabs meals={meals} mealId={mealId} onChange={onMealIdChange} />
              </View>

              {/* Тело: хаб способов / выбранный режим */}
              <View className="min-h-0 flex-1 px-5 pb-4 pt-3">
                {mode !== 'hub' && (
                  <Pressable
                    onPress={() => setMode('hub')}
                    accessibilityRole="button"
                    className="mb-3 flex-row items-center gap-1 self-start"
                  >
                    <ChevronLeft size={16} color="#8A94B3" />
                    <Text className="font-semibold text-[12px] text-bear-sub">
                      Все способы
                    </Text>
                  </Pressable>
                )}

                {mode === 'hub' && (
                  <AddHub mealId={mealId} onPick={setPicked} onSelect={setMode} />
                )}
                {mode === 'scan' && <PhotoMode source="camera" onPick={setPicked} />}
                {mode === 'voice' && <VoiceMode onPick={setPicked} />}
                {mode === 'gallery' && <PhotoMode source="library" onPick={setPicked} />}
                {mode === 'recipes' && <RecipeMode onPick={setPicked} />}
              </View>
            </>
          )}
        </View>
      </View>
    </Modal>
  )
}
