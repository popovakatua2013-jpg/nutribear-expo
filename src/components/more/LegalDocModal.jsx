// Полноэкранное окно правового документа — по скринам чужого приложения
// (Катя, 10.11): тап по строке «Политика конфиденциальности» на «Ещё» →
// открывается экран, в шапке — название документа, под ней загружается
// сам текст. Отдельное окно на каждый документ (политика / соглашение /
// дисклеймер / о приложении) вместо одного окна с вкладками — как в
// стандартных приложениях.

import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { X } from 'lucide-react-native'
import Constants from 'expo-constants'
import {
  OPERATOR,
  PRIVACY_SECTIONS,
  TERMS_SECTIONS,
  MEDICAL_SECTIONS,
  ABOUT_SECTIONS,
} from '@/lib/data/legal'
import { BUILD_HASH } from '@/lib/version'

const VERSION = Constants?.expoConfig?.version || '1.0'

const DOCS = {
  // «О приложении» (отзыв Кати 18.11): вместо даты редакции — версия
  // и ID сборки, как в стандартных приложениях
  about: {
    title: 'О приложении',
    sections: ABOUT_SECTIONS,
    subtitle: `Версия ${VERSION} · ID: ${BUILD_HASH || 'dev'}`,
  },
  privacy: { title: 'Политика конфиденциальности', sections: PRIVACY_SECTIONS },
  terms: { title: 'Пользовательское соглашение', sections: TERMS_SECTIONS },
  medical: { title: 'Медицинский дисклеймер', sections: MEDICAL_SECTIONS },
}

export function LegalDocModal({ doc, onClose }) {
  const insets = useSafeAreaInsets()
  // Помним последний открытый документ: пока окно закрывается анимацией,
  // название и текст не должны исчезать
  const [lastDoc, setLastDoc] = useState('privacy')
  useEffect(() => {
    if (doc) setLastDoc(doc)
  }, [doc])
  const d = DOCS[lastDoc] || DOCS.privacy

  return (
    <Modal visible={Boolean(doc)} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-bear-bg" style={{ paddingTop: insets.top }}>
        {/* Шапка: название документа + закрыть */}
        <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-bold text-[20px] text-bear-text">
              {d.title}
            </Text>
            <Text
              maxFontSizeMultiplier={1.25}
              className="mt-0.5 font-sans text-[15px] text-bear-sub"
            >
              {d.subtitle || `Редакция от ${OPERATOR.effective}`}
            </Text>
          </View>
          <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1" hitSlop={8}>
            <X size={22} color="#A5AECB" />
          </Pressable>
        </View>

        {/* Текст документа */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}
        >
          {d.sections.map((s) => (
            <View key={s.title} className="mb-4">
              <Text className="font-bold text-[18px] text-bear-text">{s.title}</Text>
              {s.paragraphs.map((p, i) => (
                <Text
                  key={i}
                  className="mt-1.5 font-sans text-[16.5px] leading-relaxed text-bear-sub"
                >
                  {p}
                </Text>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  )
}
