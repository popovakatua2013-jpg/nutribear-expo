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
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — темы и адрес встраиваются в строку меню «Поддержка и помощь».
// Окно письма — редизайн по отзыву Кати 09.11: шапка с чипом выбранной
// темы, круглая кнопка закрытия, поле со счётчиком символов, крупная
// кнопка «Отправить»; подсказка «Письмо уйдёт на …» убрана — адрес
// и так виден в карточке, лишний текст в окне не нужен.

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
  { id: 'bug', emoji: '🐞', label: 'Баг или ошибка', subject: 'Баг или ошибка в приложении' },
  { id: 'pay', emoji: '💳', label: 'Оплата и чеки', subject: 'Вопрос по оплате и чекам' },
  { id: 'other', emoji: '❓', label: 'Другое', subject: 'Вопрос в поддержку NutriBear' },
]

// Служебная подпись письма: версия и платформа — чтобы отвечать быстрее
function signature() {
  const version = Constants?.expoConfig?.version || '—'
  return `\n\n—\nNutriBear ${version} · ${Platform.OS === 'ios' ? 'iOS' : 'Android'}`
}

export function SupportCard({ embedded = false }) {
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

  // Темы обращения: тап — окно письма с выбранной темой
  const topicsRow = (
    <View className={`flex-row flex-wrap gap-1.5 ${embedded ? 'mt-0.5' : 'mt-3'}`}>
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
  )

  // Адрес виден всегда: если почта на телефоне не настроена,
  // письмо можно отправить из любого почтового приложения
  const emailRow = (
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
    </View>
  )

  // Окно письма: тема + текст + отправка через почтовое приложение.
  // Без подсказки «Письмо уйдёт на …» (отзыв Кати): адрес и так виден
  // в строке «Поддержка и помощь», а в окне — лишний текст
  const composeModal = (
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
        <View
          accessibilityLabel="Окно письма в поддержку"
          className="w-full overflow-hidden rounded-3xl border border-white/10 bg-bear-pop"
        >
          {/* Шапка: чип выбранной темы + заголовок + круглая кнопка закрытия */}
          <View className="flex-row items-center gap-3 border-b border-white/[0.07] px-5 pb-4 pt-5">
            <View
              className="h-[42px] w-[42px] items-center justify-center rounded-[14px]"
              style={{ backgroundColor: 'rgba(123,108,246,0.18)' }}
            >
              <Text className="text-[20px]">{topic.emoji}</Text>
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
                Написать нам
              </Text>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                className="font-sans text-[13px] text-bear-dim"
              >
                {topic.label}
              </Text>
            </View>
            <Pressable
              onPress={() => setComposeOpen(false)}
              accessibilityLabel="Закрыть письмо"
              accessibilityRole="button"
              className="h-[30px] w-[30px] items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <X size={16} color="#A5AECB" />
            </Pressable>
          </View>

          <View className="p-5">
            {/* Темы — можно поменять прямо в окне */}
            <View className="flex-row flex-wrap gap-1.5">
              {TOPICS.map((t) => {
                const active = t.id === topic.id
                return (
                  <Pressable
                    key={t.id}
                    onPress={() => setTopic(t)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`Тема: ${t.label}`}
                    className={`flex-row items-center gap-1 rounded-full px-3 py-2 active:opacity-80 ${
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
              className="mt-3 min-h-[130px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 font-sans text-[16px] leading-snug text-bear-text"
              style={{ textAlignVertical: 'top' }}
            />

            {/* Счётчик символов — тихий, справа под полем */}
            <Text
              maxFontSizeMultiplier={1.1}
              className="mt-1 text-right font-sans text-[12px] text-bear-dim"
            >
              {message.length} / 1500
            </Text>

            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel="Отправить письмо в поддержку"
              className="mt-3 h-[50px] flex-row items-center justify-center gap-2 rounded-2xl active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Send size={18} color="#FFFFFF" />
              <Text className="font-bold text-[17px] text-white">Отправить</Text>
            </Pressable>

            <Text
              maxFontSizeMultiplier={1.2}
              className="mt-2.5 text-center font-sans text-[12.5px] leading-snug text-bear-dim"
            >
              Дальше откроется почта — там нажмите «Отправить»
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )

  // Встроено в строку меню — темы и адрес (окно письма — общее)
  if (embedded) {
    return (
      <View accessibilityLabel="Поддержка">
        {topicsRow}
        {emailRow}
        {composeModal}
      </View>
    )
  }

  return (
    <View accessibilityLabel="Поддержка" className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4">
      {/* Шапка: чип + заголовок + подсказка; справа — крупный робот,
          как на шаблоне */}
      <View className="flex-row items-center gap-2.5">
        <BodyChip icon={<Text className="text-[19px]">💬</Text>} />
        <View className="min-w-0 flex-1">
          <Text className="font-extrabold text-[20px] tracking-tight text-bear-text">
            Поддержка и помощь
          </Text>
          <Text
            numberOfLines={2}
            maxFontSizeMultiplier={1.2}
            className="font-sans text-[13.5px] leading-snug text-bear-dim"
          >
            Ответы на вопросы и советы
          </Text>
        </View>
        <Text maxFontSizeMultiplier={1.1} className="shrink-0 text-[34px]" accessibilityLabel="Робот-помощник">
          🤖
        </Text>
      </View>

      {topicsRow}
      {emailRow}
      {composeModal}
    </View>
  )
}
