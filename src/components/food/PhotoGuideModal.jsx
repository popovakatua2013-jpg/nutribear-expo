// Обучающее окно «Как фотографировать еду» — по образцу окна конкурента
// (скриншот Кати от 11.11 из приложения-дневника): 4 подсказки, как
// снимать блюдо, чтобы ИИ точнее определил продукты и калории, плюс
// пример хорошего фото. Показывается один раз при первом входе в
// «Сканер еды»; вызвать снова — кнопка «Как фотографировать?» на пустом
// экране режима (PhotoMode).

import { Modal, Pressable, ScrollView, Text, View, Image } from 'react-native'
import { ArrowDownToLine, Camera, Hand, Salad, Scan, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Пример «хорошего» фото: вид сверху, всё блюдо в кадре, рука для масштаба
const EXAMPLE = require('../../../assets/images/photo-guide-example.webp')

const TIPS = [
  {
    icon: ArrowDownToLine,
    title: 'Снимайте сверху',
    text: 'Камера над тарелкой, а не сбоку — так точнее анализ',
  },
  {
    icon: Scan,
    title: 'Всё блюдо в кадре',
    text: 'Тарелка целиком, края не обрезаны',
  },
  {
    icon: Salad,
    title: 'Покажите все ингредиенты',
    text: 'Чем больше еды видно, тем точнее калории',
  },
  {
    icon: Hand,
    title: 'Рука — для масштаба',
    text: 'Положите руку рядом с тарелкой: ИИ поймёт размер порции',
  },
]

export function PhotoGuideModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Тап по тёмному фону тоже закрывает (отзыв Кати: окна закрываются
          крестиком; фон — как дополнительный способ, крестик на месте) */}
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 px-4"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel="Подсказка: как фотографировать еду"
          className="w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop"
        >
          <ScrollView bounces={false} contentContainerStyle={{ padding: 20 }}>
            {/* Шапка: иконка камеры, заголовок, крестик */}
            <View className="flex-row items-center gap-2">
              <Camera size={20} color="#7DD3FC" />
              <Text className="min-w-0 flex-1 font-bold text-[20px] text-bear-text">
                Как фотографировать еду
              </Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть подсказку"
                hitSlop={10}
                className="p-1"
              >
                <X size={22} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-1 text-[15.5px] leading-[19px] text-bear-sub">
              Чтобы мишка точнее определил блюдо и калории
            </Text>

            {/* Четыре подсказки — как в окне конкурента */}
            <View className="mt-4 gap-2">
              {TIPS.map((tip) => (
                <View
                  key={tip.title}
                  className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#7DD3FC]/15">
                    <tip.icon size={19} color="#7DD3FC" />
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="font-semibold text-[15.5px] text-bear-text">
                      {tip.title}
                    </Text>
                    <Text className="mt-0.5 text-[13.5px] leading-[17px] text-bear-sub">
                      {tip.text}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Пример хорошего фото — как у конкурента реальный снимок блюда */}
            <Image
              source={EXAMPLE}
              className="mt-4 h-[190px] w-full rounded-2xl border border-white/10"
              resizeMode="cover"
            />
            <Text className="mt-1.5 text-center text-[13.5px] leading-[17px] text-bear-sub">
              Пример: так калории посчитаются точнее всего
            </Text>

            {/* Кнопка «Понятно» — фирменный градиент, как у «Распознать» */}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Понятно, закрыть подсказку"
              className="mt-4 overflow-hidden rounded-2xl active:opacity-80"
            >
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
                style={{ paddingVertical: 14, alignItems: 'center' }}
              >
                <Text className="font-bold text-[17.5px] text-white">Понятно</Text>
              </LinearGradient>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
