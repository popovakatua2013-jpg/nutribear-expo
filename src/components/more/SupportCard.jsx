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
// Окно письма — по скрину чужого приложения от Кати 10.11 («сделай
// так»): шапка с лампочкой в градиентном чипе, заголовок «Написать
// нам» и подзаголовок; темы — плитки 2×2 с иконками (выбранная —
// градиентная); поле «Ваше сообщение» со счётчиком 0/2000; крупная
// градиентная кнопка «Отправить» с самолётиком; внизу пометка
// «Ваше обращение в безопасности» с замком. Отправка по-прежнему
// открывает почтовое приложение (mailto) — адрес виден в карточке.

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
import { LinearGradient } from 'expo-linear-gradient'
import {
  Bug,
  CircleQuestionMark,
  CreditCard,
  Lightbulb,
  Lock,
  Mail,
  MessageCircle,
  Send,
  X,
} from 'lucide-react-native'
import { OPERATOR } from '@/lib/data/legal'
import { BodyChip } from '../ui/BodyChip'
import { useToast } from '../ui/Toast'

const EMAIL = OPERATOR.email

// Темы обращения: subject — готовая тема письма; icon — иконка плитки
const TOPICS = [
  { id: 'idea', emoji: '💡', label: 'Предложение', subject: 'Предложение по приложению', icon: MessageCircle },
  { id: 'bug', emoji: '🐞', label: 'Баг или ошибка', subject: 'Баг или ошибка в приложении', icon: Bug },
  { id: 'pay', emoji: '💳', label: 'Оплата и чеки', subject: 'Вопрос по оплате и чекам', icon: CreditCard },
  { id: 'other', emoji: '❓', label: 'Другое', subject: 'Вопрос в поддержку NutriBear', icon: CircleQuestionMark },
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
          {/* Шапка: лампочка в градиентном чипе + заголовок с подзаголовком
              + круглая кнопка закрытия (по скрину Кати от 10.11) */}
          <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={['#8B5CF6', '#6D5AE6']}
              style={{ borderRadius: 16 }}
              className="h-[52px] w-[52px] items-center justify-center"
            >
              <Lightbulb size={26} color="#FFD66B" />
            </LinearGradient>
            <View className="min-w-0 flex-1">
              <Text className="font-extrabold text-[20px] tracking-tight text-bear-text">
                Написать нам
              </Text>
              <Text
                maxFontSizeMultiplier={1.15}
                className="font-sans text-[13px] leading-snug text-bear-dim"
              >
                Поделитесь своей идеей или предложением
              </Text>
            </View>
            <Pressable
              onPress={() => setComposeOpen(false)}
              accessibilityLabel="Закрыть письмо"
              accessibilityRole="button"
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-white/10 active:bg-white/20"
            >
              <X size={18} color="#A5AECB" />
            </Pressable>
          </View>

          <View className="p-5">
            {/* Выбор темы — плитки 2×2 с иконками, выбранная — градиентная
                (по скрину Кати от 10.11); тему можно поменять прямо в окне */}
            <Text maxFontSizeMultiplier={1.15} className="font-bold text-[15px] text-bear-text">
              Выберите тему:
            </Text>
            <View className="mt-2 gap-2">
              {[0, 2].map((row) => (
                <View key={row} className="flex-row gap-2">
                  {TOPICS.slice(row, row + 2).map((t) => {
                    const active = t.id === topic.id
                    const Icon = t.icon
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => setTopic(t)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`Тема: ${t.label}`}
                        className="flex-1 active:opacity-80"
                      >
                        {active ? (
                          <LinearGradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            colors={['#8B5CF6', '#6D5AE6']}
                            style={{ borderRadius: 999 }}
                            className="flex-row items-center justify-center gap-2 px-2 py-3"
                          >
                            <Icon size={17} color="#FFFFFF" />
                            <Text
                              numberOfLines={1}
                              maxFontSizeMultiplier={1.15}
                              className="font-semibold text-[14.5px] text-white"
                            >
                              {t.label}
                            </Text>
                          </LinearGradient>
                        ) : (
                          <View className="flex-row items-center justify-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-2 py-3">
                            <Icon size={17} color="#8D97BC" />
                            <Text
                              numberOfLines={1}
                              maxFontSizeMultiplier={1.15}
                              className="font-semibold text-[14.5px] text-bear-sub"
                            >
                              {t.label}
                            </Text>
                          </View>
                        )}
                      </Pressable>
                    )
                  })}
                </View>
              ))}
            </View>

            {/* Сообщение: поле с единым плейсхолдером и лимитом 2000 —
                как на скрине Кати */}
            <Text maxFontSizeMultiplier={1.15} className="mt-4 font-bold text-[15px] text-bear-text">
              Ваше сообщение:
            </Text>
            <TextInput
              value={message}
              onChangeText={setMessage}
              multiline
              autoFocus
              maxLength={2000}
              placeholder="Расскажите, что вы думаете…"
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Текст обращения в поддержку"
              className="mt-2 min-h-[120px] rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 font-sans text-[16px] leading-snug text-bear-text"
              style={{ textAlignVertical: 'top' }}
            />

            {/* Счётчик символов — справа под полем, «N / 2000» как на скрине */}
            <Text
              maxFontSizeMultiplier={1.1}
              className="mt-1 text-right font-sans text-[12.5px] text-bear-dim"
            >
              {message.length} / 2000
            </Text>

            {/* Отправить — крупная градиентная кнопка с самолётиком */}
            <Pressable
              onPress={send}
              accessibilityRole="button"
              accessibilityLabel="Отправить письмо в поддержку"
              className="mt-2 h-[54px] flex-row active:opacity-80"
            >
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                colors={['#8B5CF6', '#6D28D9']}
                style={{ borderRadius: 999 }}
                className="flex-1 flex-row items-center justify-center gap-2"
              >
                <Send size={19} color="#FFFFFF" />
                <Text className="font-bold text-[17px] text-white">Отправить</Text>
              </LinearGradient>
            </Pressable>

            {/* Пометка о безопасности — как на скрине Кати */}
            <View className="mt-2.5 flex-row items-center justify-center gap-1.5">
              <Lock size={14} color="#8D97BC" />
              <Text maxFontSizeMultiplier={1.2} className="font-sans text-[13px] text-bear-dim">
                Ваше обращение в безопасности
              </Text>
            </View>
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
