// Отдельное окно «Рецепты» — открывается из раскрывающегося списка
// «Добавить еду» (отзыв Кати: «отдельное окно для добавления рецептов
// и где можно посмотреть уже добавленные; перенести со вкладки
// "Добавить приём пищи", где блоки с ИИ-распознаванием»). Внутри —
// готовый RecipeMode: список своих рецептов с просмотром карточки
// (выход, порции, КБЖУ), создание и правка формы; запись рецепта в
// приём пищи — кнопкой «Записать» в карточке: окно закрывается и
// открывает окно добавления еды с выбранным рецептом (порция по
// умолчанию — одна порция рецепта).

import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChefHat, X } from 'lucide-react-native'
import { RecipeMode } from './RecipeMode'

export function RecipesModal({ onClose = () => {}, onLogRecipe = () => {} }) {
  const insets = useSafeAreaInsets()

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      {/* Клавиатура не накрывает окно: панель поднимается целиком */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-end bg-black/60 px-3"
        style={{ paddingBottom: 12 + insets.bottom }}
      >
        <View className="h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка окна — в стиле «Базы продуктов» */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            {/* flex-1: длинный подзаголовок распирал строку и выталкивал
                крестик за паддинг — он прижимался к краю окна и обрезался
                пополам (отзыв Кати от 10.11: «уехал крестик») */}
            <View className="min-w-0 flex-1 flex-row items-center gap-2">
              <View
                className="h-9 w-9 items-center justify-center rounded-lg"
                style={{ backgroundColor: '#22C55E' }}
              >
                <ChefHat size={17} color="#FFFFFF" />
              </View>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-bold text-[20px] text-bear-text">
                  Рецепты
                </Text>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.2}
                  className="font-sans text-[13.5px] text-bear-dim"
                >
                  Свои рецепты: создайте или посмотрите добавленные
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Закрыть рецепты"
              accessibilityRole="button"
              className="p-1"
            >
              <X hitSlop={10} size={22} color="#A5AECB" />
            </Pressable>
          </View>

          <View className="min-h-0 flex-1 px-5 pb-4 pt-3">
            <RecipeMode
              onPick={(item) => {
                // «Записать» в карточке рецепта: окно закрывается,
                // рецепт открывается в окне добавления еды (порция,
                // приём пищи, граммовка — там)
                onLogRecipe(item)
              }}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
