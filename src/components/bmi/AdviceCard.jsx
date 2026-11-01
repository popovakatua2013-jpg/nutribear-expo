// Модалка «Рекомендации»: текст и советы по категории ИМТ.
// Открывается с вкладки «ИМТ» — кнопкой «Подробнее», стрелкой
// на трофейном баннере и тапом по кольцу. Кнопка «К рекомендациям»
// закрывает модалку и скроллит к блоку советов на вкладке
// (передаётся как onRecommendations, если не задана — не рисуется).

import { Modal, ScrollView, Text, View, Pressable } from 'react-native'
import { ArrowDown, X } from 'lucide-react-native'
import { bmiCategory, RECOMMENDATIONS } from '@/lib/data/bmi'

export function AdviceModal({ bmi, open, onClose, onRecommendations }) {
  const cat = bmiCategory(bmi)
  const rec = RECOMMENDATIONS[cat.id]

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
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
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#A5AECB" />
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

            {/* Кнопка «К рекомендациям»: закрыть модалку и показать блок
                советов на вкладке (рисуется, только если передан обработчик) */}
            {onRecommendations && (
              <Pressable
                onPress={onRecommendations}
                accessibilityRole="button"
                accessibilityLabel="К рекомендациям — перейти к блоку советов"
                className="mt-4 flex-row items-center justify-center gap-1.5 rounded-2xl py-3 active:opacity-75"
                style={{
                  backgroundColor: 'rgba(168,85,247,0.16)',
                  borderColor: 'rgba(168,85,247,0.35)',
                  borderWidth: 1,
                }}
              >
                <Text className="font-semibold text-[13px] text-[#D8B4FE]">
                  К рекомендациям
                </Text>
                <ArrowDown size={14} color="#D8B4FE" />
              </Pressable>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
