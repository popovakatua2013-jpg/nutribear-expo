// Модалка «Гид по порциям»: обучение ориентирам «на глаз» —
// ладонь белка, горсть гарнира и т.д.

import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { PORTIONS } from '@/lib/data/portions'

export function PortionsModal({ visible, onClose }) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View
          className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <Text className="font-bold text-[15px] text-bear-text">
                ✋ Гид по порциям
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Ориентиры без весов: размер порции — как ваша рука
              </Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={16} color="#AEB9D9" />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            className="px-4 pt-3"
            style={{ maxHeight: 380 }}
          >
            <View className="gap-2">
              {PORTIONS.map((p) => (
                <View
                  key={p.title}
                  className="flex-row items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3.5"
                >
                  <Text className="text-[22px] leading-[26px]">{p.emoji}</Text>
                  <View className="min-w-0 flex-1">
                    <Text className="font-bold text-[13px] text-bear-text">{p.title}</Text>
                    <Text className="mt-0.5 font-sans text-[11px] leading-relaxed text-bear-sub2">
                      {p.text}
                    </Text>
                    <Text className="mt-1 font-semibold text-[11px] text-[#8DABFF]">
                      {p.grams}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
