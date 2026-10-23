// Строка цели в карточке «Ваши цели»: иконка, название и норма,
// под ними прогресс-бар

import { Text, View } from 'react-native'

export function GoalRow({ icon, color, label, goalText, pctValue }) {
  const w = Math.max(0, Math.min(100, pctValue || 0))
  return (
    <View>
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: color }}
        >
          {icon}
        </View>
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="font-bold text-[13px] leading-tight text-bear-text">
            {label}
          </Text>
          <Text
            numberOfLines={1}
            className="font-medium text-[11px] leading-tight text-bear-sub2"
          >
            {goalText}
          </Text>
        </View>
      </View>
      <View className="ml-[46px] mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
        <View
          className="h-full rounded-full"
          style={{ width: `${w}%`, backgroundColor: color }}
        />
      </View>
    </View>
  )
}
