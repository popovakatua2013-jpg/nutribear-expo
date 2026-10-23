// Карточка «Рекомендации»: динамический текст по категории ИМТ,
// клик по карточке открывает подробные советы

import { useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { bmiCategory, RECOMMENDATIONS } from '@/lib/data/bmi'

export function AdviceCard({ bmi }) {
  const [open, setOpen] = useState(false)
  const cat = bmiCategory(bmi)
  const rec = RECOMMENDATIONS[cat.id]

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Рекомендации — открыть подробные советы"
        className="flex-row items-center gap-4 rounded-3xl border border-white/5 bg-bear-card p-5 active:opacity-80"
      >
        <Text className="text-[40px]">💡</Text>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[15px] tracking-tight text-bear-text">
            Рекомендации
          </Text>
          <Text className="mt-1 font-sans text-[13px] leading-relaxed text-bear-soft">
            {rec.main}
          </Text>
        </View>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            <View className="flex-row items-start justify-between px-5 pb-1 pt-5">
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[15px] text-bear-text">
                  💡 Рекомендации
                </Text>
                <Text className="mt-1 font-sans text-[13px] leading-relaxed text-bear-soft">
                  {rec.main}
                </Text>
              </View>
              <Pressable onPress={() => setOpen(false)} accessibilityLabel="Закрыть" className="p-1">
                <X size={20} color="#8A94B3" />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}>
              <Text className="mt-2 font-semibold text-xs" style={{ color: cat.color }}>
                Ваша категория: {cat.label} ({cat.range})
              </Text>
              <View className="mt-3 gap-2">
                {rec.tips.map((tip) => (
                  <View
                    key={tip}
                    className="flex-row items-start gap-2.5 rounded-xl bg-white/[0.04] px-3.5 py-2.5"
                  >
                    <View
                      className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <Text className="min-w-0 flex-1 font-sans text-[13px] text-bear-soft">
                      {tip}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  )
}
