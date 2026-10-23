// Хаб способов добавления еды: широкая плитка «База продуктов»
// и 4 карточки с иконками (сканер, голос, галерея, рецепты).
// Сканер и галерея открывают камеру/фото, голос — микрофон,
// рецепты — создание своего рецепта.

import { Pressable, Text, View } from 'react-native'
import { Camera, ChefHat, ChevronRight, Images, LayoutGrid, Mic } from 'lucide-react-native'

const TILES = [
  { id: 'scan', label: 'Сканер', Icon: Camera, color: '#4D7CFE' },
  { id: 'voice', label: 'Голос', Icon: Mic, color: '#A45BFF' },
  { id: 'gallery', label: 'Галерея', Icon: Images, color: '#0EA5E9' },
  { id: 'recipes', label: 'Рецепты', Icon: ChefHat, color: '#F59E0B' },
]

export function AddHub({ onSelect }) {
  return (
    <View>
      <Pressable
        onPress={() => onSelect('base')}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3.5 active:bg-white/10"
      >
        <View
          className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <LayoutGrid size={16} color="#FFFFFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[13.5px] text-bear-text">База продуктов</Text>
          <Text className="font-sans text-[11px] text-bear-sub">
            Найти и выбрать блюдо
          </Text>
        </View>
        <ChevronRight size={16} color="#5C668A" />
      </Pressable>

      <View className="mt-2 flex-row flex-wrap gap-2">
        {TILES.map(({ id, label, Icon, color }) => (
          <Pressable
            key={id}
            onPress={() => onSelect(id)}
            accessibilityRole="button"
            accessibilityLabel={label}
            className="h-[96px] rounded-2xl border border-white/10 bg-white/[0.04] p-3 active:bg-white/10"
            style={{ width: '48.5%' }}
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: color }}
            >
              <Icon size={17} color="#FFFFFF" />
            </View>
            <Text className="absolute inset-x-3 bottom-2.5 font-bold text-[12.5px] text-bear-text">
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
