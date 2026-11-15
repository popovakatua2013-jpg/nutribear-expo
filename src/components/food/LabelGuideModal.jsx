// Обучающее окно «Как снимать этикетку» — по образцу окон «Как
// фотографировать еду» и «Как сканировать штрихкод» (просьба Кати
// 16.11: «похожую подсказку как с тарелкой и штрихкодом сделай для
// этикетки»). 4 подсказки + пример: нарисованная таблица пищевой
// ценности — как настоящая этикетка крупным планом. Показывается один
// раз при первом входе в режим «Этикетка»; вернуть — ссылка «Как
// снимать этикетку?» под описанием режима.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { ArrowDownToLine, ScanSearch, Sun, X, Zap } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

const TIPS = [
  {
    icon: ScanSearch,
    title: 'Таблица целиком в кадре',
    text: '«Пищевая ценность» от первой до последней строки',
  },
  {
    icon: ArrowDownToLine,
    title: 'Снимайте прямо, без наклона',
    text: 'Камера параллельно тексту — строки не искажаются',
  },
  {
    icon: Sun,
    title: 'Хороший свет, без бликов',
    text: 'Отражения на плёнке прячут цифры — чуть поверните пачку',
  },
  {
    icon: Zap,
    title: 'Крупно и резко',
    text: 'Подойдите ближе: чем крупнее строки, тем точнее мишка прочитает',
  },
]

// Мок этикетки: белая карточка с таблицей «Пищевая ценность» — как
// настоящий ярлык на упаковке крупным планом
function LabelMock() {
  const ROWS = [
    ['Энергетическая ценность', '240 ккал'],
    ['Белки', '12 г'],
    ['Жиры', '9 г'],
    ['Углеводы', '26 г'],
  ]
  return (
    <View
      accessibilityLabel="Пример: таблица пищевой ценности на этикетке"
      className="rounded-2xl border border-white/10 bg-white px-4 py-3"
    >
      <Text className="text-center font-bold text-[13px] text-gray-900">
        Пищевая ценность
      </Text>
      <Text className="mt-0.5 text-center text-[10.5px] text-gray-500">
        содержание в 100 г продукта
      </Text>
      <View className="mt-2">
        {ROWS.map(([k, v]) => (
          <View
            key={k}
            className="flex-row items-center justify-between border-t border-gray-200 py-1.5"
          >
            <Text className="text-[12px] text-gray-700">{k}</Text>
            <Text className="font-semibold text-[12px] text-gray-900">{v}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

export function LabelGuideModal({ visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Тап по тёмному фону тоже закрывает — как в соседних подсказках */}
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 px-4"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel="Подсказка: как снимать этикетку"
          className="w-full max-w-[420px] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop"
        >
          <ScrollView bounces={false} contentContainerStyle={{ padding: 20 }}>
            {/* Шапка: иконка этикетки, заголовок, крестик */}
            <View className="flex-row items-center gap-2">
              <ScanSearch size={20} color="#7DD3FC" />
              <Text className="min-w-0 flex-1 font-bold text-[20px] text-bear-text">
                Как снимать этикетку
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
              Чтобы мишка точно прочитал пищевую ценность
            </Text>

            {/* Четыре подсказки — как в окнах конкурента */}
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

            {/* Пример: таблица пищевой ценности крупным планом */}
            <View className="mt-4">
              <LabelMock />
            </View>
            <Text className="mt-1.5 text-center text-[13.5px] leading-[17px] text-bear-sub">
              Пример: этикетка крупным планом, все строки читаются
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
