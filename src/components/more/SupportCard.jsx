// «Поддержка» на «Ещё» (отзыв Кати: «пользователи смогут писать
// разработчикам о предложениях, лагах, оплате и других вопросах»).
// Выбор темы — предложение, лаг или ошибка, оплата и чеки, другое —
// и письмо в почтовом приложении на адрес оператора из политики
// конфиденциальности (OPERATOR.email в lib/data/legal). В письмо
// подставляются тема и текст пользователя + служебная подпись с
// версией приложения и платформой — разработчику проще разобраться.
// Почтового редактора внутри приложения нет (и не нужно): открывается
// почтовое приложение устройства через mailto; если почта не настроена —
// подсказка с адресом, адрес всегда виден и в самой карточке.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import Constants from 'expo-constants'
import { Mail, Send, X } from 'lucide-react-native'
import { OPERATOR } from '@/lib/data/legal'
import { BodyChip } from '../ui/BodyChip'
import { useToast } from '../ui/Toast'

const EMAIL = OPERATOR.email

// Темы обращения: subject — готовая тема письма
const TOPICS = [
  { id: 'idea', emoji: '💡', label: 'Предложение', subject: 'Предложение по приложению' },
  { id: 'bug', emoji: '🐞', label: 'Лаг или ошибка', subject: 'Лаг или ошибка в приложении' },
  { id: 'pay', emoji: '💳', label: 'Оплата и чеки', subject: 'Вопрос по оплате и чекам' },
  { id: 'other', emoji: '❓', label: 'Другое', subject: 'Вопрос в поддержку NutriBear' },
]

// Служебная подпись письма: версия и платформа — чтобы отвечать быстрее
function signature() {
  const version = Constants?.expoConfig?.version || '—'
  return `\n\n—\nNutriBear ${version} · ${Platform.OS === 'ios' ? 'iOS' : 'Android'}`
}

export function SupportCard() {
  const { toast } = useToast()
  // Окно письма: выбранная тема и текст обращения
  const [composeOpen, setComposeOpen] = useState(false)
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')

  function openCompose(t) {
    setTopic(t)
    setMessage('')
    setComposeOpen(true)
  }

  function send() {
    const text = message.trim()
    const body = `${text || 'Опишите, пожалуйста, подробнее.'}${signature()}`
    const url = `mailto:${EMAIL}?subject=${encodeURIComponent(`[NutriBear] ${topic.subject}`)}&body=${encodeURIComponent(body)}`
    Linking.openURL(url).catch(() => {
      toast({
        title: '📮 Почта не открылась',
        description: `Напишите нам сами: ${EMAIL}`,
      })
    })
    setComposeOpen(false)
  }

  return (
    <View accessibilityLabel="Поддержка" className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4">
      {/* Шапка: чип-робот + заголовок + подсказка (как на шаблоне) */}
      <View className="flex-row items-center gap-2.5">
        <BodyChip icon={<Text className="text-[19px]">🤖</Text>} />
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[20px] tracking-tight text-bear-text">
            Поддержка и помощь
          </Text>
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[13.5px] leading-snug text-bear-dim"
          >
            Отвечаем на вопросы и советы — читаем всё
          </Text>
        </View>
      </View>

      {/* Темы обращения: тап — окно письма с выбранной темой */}
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {TOPICS.map((t) => (
          <Pressable
            key={t.id}
            onPress={() => openCompose(t)}
            accessibilityRole="button"
            accessibilityLabel={`Написать в поддержку: ${t.label}`}
            className="flex-row items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 active:bg-white/10"
          >
            <Text className="text-[15px]">{t.emoji}</Text>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              className="font-semibold text-[14.5px] text-bear-soft"
            >
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Адрес виден всегда: если почта на телефоне не настроена,
          письмо можно отправить из любого почтового приложения */}
      <View className="mt-3 flex-row items-center gap-1.5 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3 py-2.5">
        <Mail size={15} color="#8DABFF" />
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.15}
          className="min-w-0 flex-1 font-sans text-[14.5px] text-bear-sub"
        >
          {EMAIL}
        </Text>
        <Text maxFontSizeMultiplier={1.15} className="shrink-0 font-sans text-[12.5px] text-bear-dim">
          из политики конфиденциальности
        </Text>
      </View>

      {/* Окно письма: тема + текст + отправка через почтовое приложение */}
      <Modal
        visible={composeOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setComposeOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 items-center justify-center bg-black/60 px-6"
        >
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <Text className="font-bold text-[20px] text-bear-text">Написать нам</Text>
              <Pressable
                onPress={() => setComposeOpen(false)}
                accessibilityLabel="Закрыть письмо"
                accessibilityRole="button"
                className="p-1"
              >
                <X hitSlop={10} size={20} color="#A5AECB" />
              </Pressable>
            </View>

            {/* Темы — можно поменять прямо в окне */}
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {TOPICS.map((t) => {
                const active = t.id === topic.id
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTopic(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Тема: ${t.label}`}
                    className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-80 ${
                      active ? '' : 'border border-white/10 bg-white/[0.05]'
                    }`}
                    style={active ? { backgroundColor: '#7B6CF6' } : null}
                  >
                    <Text className="text-[14px]">{t.emoji}</Text>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.15}
                      className={`font-semibold text-[13.5px] ${active ? 'text-white' : 'text-bear-sub'}`}
                    >
                      {t.label}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              className="mt-3 font-sans text-[13.5px] text-bear-dim"
            >
              Письмо уйдёт на {EMAIL}
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              autoFocus
              maxLength={1500}
              placeholder={
                topic.id === 'bug'
                  ? 'Что случилось? Что нажимали, что ожидали, что вышло…'
                  : topic.id === 'idea'
                    ? 'Расскажите вашу идею — что добавить или изменить?'
                    : topic.id === 'pay'
                      ? 'Опишите вопрос по оплате: что купили, что не работает…'
                      : 'Ваш вопрос или сообщение…'
              }
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Текст обращения в поддержку"
              className="mt-1.5 min-h-[110px] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-[16px] text-bear-text"
              style={{ textAlignVertical: 'top' }}
            />

            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel="Отправить письмо в поддержку"
              className="mt-4 h-[46px] flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Send size={17} color="#FFFFFF" />
              <Text className="font-bold text-[17px] text-white">Отправить</Text>
            </Pressable>
            <Text
              maxFontSizeMultiplier={1.2}
              className="mt-2 text-center font-sans text-[12.5px] leading-snug text-bear-dim"
            >
              Откроется ваше почтовое приложение — останется нажать «Отправить»
            </Text>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  )
}
