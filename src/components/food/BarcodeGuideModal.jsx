// Обучающее окно «Как сканировать штрихкод» — по образцу окна конкурента
// (скриншот Кати 16.11 из чужого приложения): 4 подсказки + ДВА примера
// рядом (штрихкод и квадратный код «Честный знак»). Примеры нарисованы
// View-моками — настоящие снимки не нужны: главное — показать, как
// выглядит код на упаковке. Показывается один раз при первом входе в
// «Сканер штрихкода»; вернуть — кнопка (i) рядом с фонариком.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { Barcode, Camera, Focus, Scan, Sun, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useThemeColors } from '@/lib/use-theme'


const TIPS = [
  {
    icon: Barcode,
    title: 'Наведите камеру на код',
    text: 'Штрихкод или квадратный код «Честный знак» на упаковке',
  },
  {
    icon: Focus,
    title: 'Держите код в рамке',
    text: 'Не двигайте телефон — сканер сработает сам',
  },
  {
    icon: Sun,
    title: 'Код должен быть освещён',
    text: 'Слабо видно или блик — включите фонарик кнопкой справа',
  },
  {
    icon: Camera,
    title: 'Продукт не нашёлся?',
    text: 'Сфотографируйте этикетку — режим «Этикетка» рядом',
  },
]

// Мок штрихкода: фиксированный набор полос разной ширины + цифры внизу
function BarcodeMock() {
  const BARS = [3, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 2, 1, 1, 3]
  return (
    <View
      accessibilityLabel="Пример: штрихкод на упаковке"
      className="flex-1 items-center justify-center rounded-2xl border border-bear-line bg-white px-2 py-4"
    >
      <View className="h-[52px] flex-row items-stretch">
        {BARS.map((w, i) => (
          <View
            key={i}
            style={{
              width: w * 2.4,
              marginRight: 2,
              backgroundColor: '#111827',
            }}
          />
        ))}
      </View>
      <Text className="mt-1.5 font-semibold text-[11px] tracking-[2.5px] text-gray-800">
        4 601 234 567 890
      </Text>
    </View>
  )
}

// Мок квадратного кода «Честный знак»: сетка 11×11 с «поисковыми»
// квадратами по углам, как у Data Matrix
const QR_ROWS = [
  '11111010011',
  '10001001001',
  '10101011011',
  '10101010110',
  '10001010100',
  '11111010011',
  '00000000110',
  '11010110010',
  '01101010101',
  '10110100110',
  '01001011010',
]

function SquareCodeMock() {
  return (
    <View
      accessibilityLabel="Пример: квадратный код «Честный знак»"
      className="flex-1 items-center justify-center rounded-2xl border border-bear-line bg-white p-3"
    >
      <View>
        {QR_ROWS.map((row, y) => (
          <View key={y} className="flex-row">
            {row.split('').map((cell, x) => (
              <View
                key={x}
                style={{
                  width: 9,
                  height: 9,
                  backgroundColor: cell === '1' ? '#111827' : '#FFFFFF',
                }}
              />
            ))}
          </View>
        ))}
      </View>
    </View>
  )
}

export function BarcodeGuideModal({ visible, onClose }) {
  const themeColors = useThemeColors()
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Тап по тёмному фону тоже закрывает — как в окне «Как фотографировать еду» */}
      <Pressable
        className="flex-1 items-center justify-center bg-black/70 px-4"
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="alert"
          accessibilityLabel="Подсказка: как сканировать штрихкод"
          className="w-full max-w-[420px] overflow-hidden rounded-3xl border border-bear-line bg-bear-pop"
        >
          <ScrollView bounces={false} contentContainerStyle={{ padding: 20 }}>
            {/* Шапка: иконка сканера, заголовок, крестик */}
            <View className="flex-row items-center gap-2">
              <Scan size={20} color={themeColors.accentSoft} />
              <Text className="min-w-0 flex-1 font-bold text-[20px] text-bear-text">
                Как сканировать штрихкод
              </Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Закрыть подсказку"
                hitSlop={10}
                className="p-1"
              >
                <X size={22} color={themeColors.sub} />
              </Pressable>
            </View>
            <Text className="mt-1 text-[15.5px] leading-[19px] text-bear-sub">
              Чтобы мишка нашёл продукт в открытой базе
            </Text>

            {/* Четыре подсказки — как в окне конкурента */}
            <View className="mt-4 gap-2">
              {TIPS.map((tip) => (
                <View
                  key={tip.title}
                  className="flex-row items-center gap-3 rounded-2xl border border-bear-line bg-bear-overlay px-3 py-2.5"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-xl bg-bear-accentFaint2">
                    <tip.icon size={19} color={themeColors.accentSoft} />
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

            {/* Два примера рядом — как у конкурента: штрихкод и квадратный код */}
            <View className="mt-4 flex-row gap-2">
              <BarcodeMock />
              <SquareCodeMock />
            </View>
            <Text className="mt-1.5 text-center text-[13.5px] leading-[17px] text-bear-sub">
              Примеры: обычный штрихкод и квадратный «Честный знак»
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
                colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}
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
