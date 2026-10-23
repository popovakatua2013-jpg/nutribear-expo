// Общая рамка шага онбординга: шапка с кнопкой «Назад», контент,
// нижняя кнопка «Далее» (или свой футер).

import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ChevronLeft } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

export function ObShell({
  sub,
  title,
  children,
  onBack,
  onNext,
  nextLabel = 'Далее',
  nextDisabled,
  footer,
  scroll = true,
}) {
  const Content = scroll ? ScrollView : View
  // Edge-to-edge в SDK 58: отступы под статус-бар и системную нижнюю панель
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1" style={{ paddingBottom: insets.bottom + 16 }}>
      <View
        className="flex-row items-center gap-3 px-5"
        style={{ paddingTop: insets.top + 8 }}
      >
        {onBack ? (
          <Pressable
            onPress={onBack}
            accessibilityLabel="Назад"
            className="h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
          >
            <ChevronLeft size={20} color="#AEB9D9" />
          </Pressable>
        ) : (
          <View className="h-10 w-10 shrink-0" />
        )}
        <View className="min-w-0 flex-1">
          {sub ? (
            <Text className="font-bold text-[10px] uppercase tracking-[0.14em] text-[#6c8cff]">
              {sub}
            </Text>
          ) : null}
          <Text numberOfLines={1} className="font-extrabold text-[20px] tracking-tight text-bear-text">
            {title}
          </Text>
        </View>
      </View>

      <Content
        className="mt-5 flex-1"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingBottom: 8,
        }}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </Content>

      <View className="px-5 pt-4">
        {footer ??
          (onNext && (
            <Pressable
              onPress={onNext}
              disabled={nextDisabled}
              className={`overflow-hidden rounded-2xl ${nextDisabled ? 'opacity-40' : ''}`}
            >
              <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                <Text className="py-3.5 text-center font-bold text-[15px] text-white">
                  {nextLabel}
                </Text>
              </LinearGradient>
            </Pressable>
          ))}
      </View>
    </View>
  )
}
