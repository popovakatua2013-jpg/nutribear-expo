// Окно «Правовая информация»: вкладки «Политика конфиденциальности»
// и «Пользовательское соглашение», кнопка связи с поддержкой.
// Открывается из «О приложении» и из согласия при регистрации.

import { useEffect, useState } from 'react'
import { Linking, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { FileText, Mail, ShieldCheck, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { OPERATOR, PRIVACY_SECTIONS, TERMS_SECTIONS } from '@/lib/data/legal'

const TABS = [
  { id: 'privacy', label: 'Политика', Icon: ShieldCheck, sections: PRIVACY_SECTIONS },
  { id: 'terms', label: 'Соглашение', Icon: FileText, sections: TERMS_SECTIONS },
]

export function LegalModal({ open, onClose, initialTab = 'privacy' }) {
  const [tabId, setTabId] = useState(initialTab)

  // При каждом открытии — вкладка, которую попросили показать
  useEffect(() => {
    if (open) setTabId(initialTab)
  }, [open, initialTab])

  const tab = TABS.find((t) => t.id === tabId) || TABS[0]

  function writeSupport() {
    Linking.openURL(`mailto:${OPERATOR.email}?subject=NutriBear%20—%20поддержка`)
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[88%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="flex-1">
              <Text className="font-bold text-[15px] text-bear-text">Правовая информация</Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Редакция от {OPERATOR.effective}
              </Text>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#8A94B3" />
            </Pressable>
          </View>

          {/* Вкладки */}
          <View className="flex-row gap-1.5 px-5 pt-3">
            {TABS.map((t) => {
              const active = t.id === tabId
              const pill = (
                <Text className={`px-3 py-1.5 font-semibold text-[12px] ${active ? 'text-white' : 'text-bear-dim'}`}>
                  {t.label}
                </Text>
              )
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTabId(t.id)}
                  accessibilityLabel={`Показать ${t.label}`}
                  className="overflow-hidden rounded-full"
                >
                  {active ? (
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                      {pill}
                    </LinearGradient>
                  ) : (
                    <View className="bg-white/5">{pill}</View>
                  )}
                </Pressable>
              )
            })}
          </View>

          {/* Текст документа */}
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 12 }}>
            {tab.sections.map((s) => (
              <View key={s.title} className="mb-4">
                <Text className="font-bold text-[13.5px] text-bear-text">{s.title}</Text>
                {s.paragraphs.map((p, i) => (
                  <Text key={i} className="mt-1.5 font-sans text-[12px] leading-relaxed text-bear-sub">
                    {p}
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>

          {/* Поддержка */}
          <View className="border-t border-bear-line px-5 pb-5 pt-3">
            <Pressable
              onPress={writeSupport}
              accessibilityRole="button"
              accessibilityLabel="Написать в поддержку"
              className="flex-row items-center justify-center gap-2 rounded-2xl bg-white/5 py-3 active:opacity-80"
            >
              <Mail size={15} color="#8DABFF" />
              <Text className="font-semibold text-[12.5px] text-[#8DABFF]">
                Поддержка: {OPERATOR.email}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
