// Главный экран-приветствие: мишка с вилкой и ножом,
// динамический текст и градиентная кнопка «Добавить приём пищи»

import { Image, Pressable, Text, View } from 'react-native'
import { Plus } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { formatNum } from '@/lib/format'

const BEAR = require('../../../assets/images/bear-hero.png')

// Текст меняется в зависимости от прогресса за день
function heroText(consumed, target) {
  if (consumed <= 0) {
    return {
      title: 'Пора поесть!',
      subtitle: 'Добавьте первое блюдо, чтобы начать дневник питания.',
    }
  }
  const pct = target > 0 ? (consumed / target) * 100 : 0
  if (pct < 50) {
    return { title: 'Отличное начало!', subtitle: 'Так держать! Добавляйте блюда и следите за планом.' }
  }
  if (pct < 100) {
    return { title: 'Вы почти у цели!', subtitle: 'Совсем немного осталось до дневной нормы калорий.' }
  }
  if (pct <= 115) {
    return { title: 'Норма выполнена! 🎉', subtitle: 'Дневная цель достигнута. Отличная работа!' }
  }
  return { title: 'Норма превышена', subtitle: 'Немного перебрали — завтра обязательно получится!' }
}

export function BearHero({ consumed = 0, target = 0, onAdd }) {
  const text = heroText(consumed, target)

  return (
    <View
      accessibilityLabel="Приветствие дневника питания"
      className="overflow-hidden rounded-[28px] border border-bear-line"
    >
      <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} colors={['#17224A', '#101A34', '#0D1428']}>
        <Image
          source={BEAR}
          accessibilityLabel="Милый медвежонок держит вилку и нож перед пустой тарелкой"
          resizeMode="contain"
          className="mt-2 self-center"
          style={{ width: 300, height: 300 }}
        />

        <View className="px-6 pb-6 pt-1">
          <Text className="text-center font-extrabold text-[26px] leading-tight tracking-tight text-bear-text">
            {text.title}
          </Text>
          <Text className="mx-auto mt-2 max-w-[290px] text-center font-sans text-[13.5px] leading-relaxed text-[#93A0C2]">
            {text.subtitle}
          </Text>

          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel="Добавить приём пищи"
            className="mt-5 flex-row items-center self-center rounded-full py-3.5 pl-4 pr-7 active:opacity-80"
            style={{ backgroundColor: '#7B6CF6' }}
          >
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
              className="absolute inset-0 rounded-full"
            />
            <View className="h-7 w-7 items-center justify-center rounded-full bg-white/25">
              <Plus size={16} color="#fff" strokeWidth={2.5} />
            </View>
            <Text className="ml-2.5 font-semibold text-[15px] text-white">
              Добавить приём пищи
            </Text>
          </Pressable>
          <Text className="mt-1 text-center font-sans text-[10px] text-bear-dim">
            {formatNum(consumed)} из {formatNum(target)} ккал за сегодня
          </Text>
        </View>
      </LinearGradient>
    </View>
  )
}
