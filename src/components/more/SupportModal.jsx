// Окно «Написать нам» на «Ещё» (отзыв Кати: «пользователи смогут писать
// разработчикам о предложениях, лагах, оплате и других вопросах»).
// ОТКРЫВАЕТСЯ СРАЗУ по тапу на строку «Поддержка и помощь» — без
// кнопок-тем в строке меню и без адреса в списке (отзыв Кати от 10.11:
// «да, сразу открывалась»): выбор темы теперь только в самом окне,
// как на скрине-образце. Письмо уходит в почтовое приложение на адрес
// оператора из политики конфиденциальности (OPERATOR.email в
// lib/data/legal); в письмо подставляются тема и текст пользователя +
// служебная подпись с версией приложения и платформой — разработчику
// проще разобраться. Почтового редактора внутри приложения нет (и не
// нужно); если почта на телефоне не настроена — тост с адресом, сам
// адрес всегда есть в политике конфиденциальности.
//
// Вид окна — по скрину чужого приложения от Кати 10.11 («сделай так»):
// шапка с лампочкой в градиентном чипе, заголовок «Написать нам» и
// подзаголовок; темы — плитки 2×2 с иконками (выбранная — градиентная);
// поле «Ваше сообщение» со счётчиком 0/2000; крупная градиентная кнопка
// «Отправить» с самолётиком; внизу пометка «Ваше обращение в
// безопасности» с замком.
//
// 10.11, отзыв Кати: «при нажатии на выбрать тему кнопки съезжают» —
// у активной плитки и «Отправить» иконка с текстом вставали столбиком
// и вылезали за пилюлю. Причина: expo-linear-gradient на Android не
// удерживает flex-раскладку своих детей (нативный LinearGradientView —
// не ViewGroup). Теперь градиент везде только фон-подложка
// (absoluteFillObject внутри обычного View), раскладку ведёт обычный
// View — как в ProfileEditor и BodyChip; у плитки в обоих состояниях
// одно дерево и одинаковая рамка (у выбранной — прозрачная), поэтому
// при выборе ничего не прыгает.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
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
  MessageCircle,
  Send,
  X,
} from 'lucide-react-native'
import { OPERATOR } from '@/lib/data/legal'
import { useToast } from '../ui/Toast'

const EMAIL = OPERATOR.email

// Темы обращения: subject — готовая тема письма; icon — иконка плитки
const TOPICS = [
  { id: 'idea', label: 'Предложение', subject: 'Предложение по приложению', icon: MessageCircle },
  { id: 'bug', label: 'Баг или ошибка', subject: 'Баг или ошибка в приложении', icon: Bug },
  { id: 'pay', label: 'Оплата и чеки', subject: 'Вопрос по оплате и чекам', icon: CreditCard },
  { id: 'other', label: 'Другое', subject: 'Вопрос в поддержку NutriBear', icon: CircleQuestionMark },
]

// Служебная подпись письма: версия и платформа — чтобы отвечать быстрее
function signature() {
  const version = Constants?.expoConfig?.version || '—'
  return `\n\n—\nNutriBear ${version} · ${Platform.OS === 'ios' ? 'iOS' : 'Android'}`
}

// Окно письма: open/onClose приходит снаружи — строка «Поддержка и
// помощь» на «Ещё» открывает его сразу по тапу
export function SupportModal({ open = false, onClose }) {
  const { toast } = useToast()
  // Выбранная тема и текст обращения — черновик сохраняется, пока
  // приложение живо: случайно закрыли — текст не потерялся
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')

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
    onClose?.()
  }

  return (
    <Modal
      visible={open}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={() => onClose?.()}
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
            >
              {/* раскладку ведёт обычный View — LinearGradient на Android
                  не удерживает выравнивание детей */}
              <View className="h-[52px] w-[52px] items-center justify-center">
                <Lightbulb size={26} color="#FFD66B" />
              </View>
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
              onPress={() => onClose?.()}
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
                        {/* Пилюля — обычный View: дерево одно в обоих состояниях
                            и рамка всегда 1px (у выбранной — прозрачная), при
                            выборе ничего не пересобирается и не съезжает.
                            Градиент у выбранной — фон-подложка absoluteFill:
                            LinearGradient на Android не удерживает раскладку
                            своих детей (иконка и текст вставали столбиком) */}
                        <View
                          className={`flex-row items-center justify-center gap-2 overflow-hidden rounded-full border px-2 py-3 ${
                            active
                              ? 'border-transparent'
                              : 'border-white/[0.12] bg-white/[0.04]'
                          }`}
                        >
                          {active ? (
                            <LinearGradient
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              colors={['#8B5CF6', '#6D5AE6']}
                              style={StyleSheet.absoluteFillObject}
                            />
                          ) : null}
                          <Icon size={17} color={active ? '#FFFFFF' : '#8D97BC'} />
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.15}
                            className={`font-semibold text-[14.5px] ${
                              active ? 'text-white' : 'text-bear-sub'
                            }`}
                          >
                            {t.label}
                          </Text>
                        </View>
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
              {/* градиент — фон-подложка, раскладку ведёт обычный View
                  (LinearGradient на Android не удерживает детей) */}
              <View className="flex-1 flex-row items-center justify-center gap-2 overflow-hidden rounded-full">
                <LinearGradient
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  colors={['#8B5CF6', '#6D28D9']}
                  style={StyleSheet.absoluteFillObject}
                />
                <Send size={19} color="#FFFFFF" />
                <Text className="font-bold text-[17px] text-white">Отправить</Text>
              </View>
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
}
