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
// не ViewGroup), классы flex-row/items-center на нём не срабатывают.
// Рабочий шаблон на её устройстве (проверено скринами): градиент —
// родитель, у которого в className только размеры/рамка в style, а
// раскладку ведёт внутренний обычный View (лампочка в шапке, аватар
// в ProfileEditor). Подложка absoluteFill внутри обычного View на её
// устройстве не отрисовалась — не используем.
//
// 10.11, отзыв Кати: «добавить возможность прикрепить файлы» — под
// полем сообщения кнопка со скрепкой открывает системный выбор файлов
// (expo-document-picker — любые файлы: скрин, видео, лог), выбранные
// файлы — чипы с именем и крестиком. Письмо собирает
// expo-mail-composer (mailto вложения не умеет): тема, текст,
// подпись и файлы едут вместе; если почты на телефоне нет — прежний
// тост с адресом. Сам адрес всегда есть в политике конфиденциальности.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import Constants from 'expo-constants'
import * as DocumentPicker from 'expo-document-picker'
import * as MailComposer from 'expo-mail-composer'
import { LinearGradient } from 'expo-linear-gradient'
import {
  Bug,
  CircleQuestionMark,
  CreditCard,
  Lightbulb,
  Lock,
  MessageCircle,
  Paperclip,
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
  // Выбранная тема, текст и вложения — черновик сохраняется, пока
  // приложение живо: случайно закрыли — текст и файлы не потерялись
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState([])

  // Выбор файлов: системный проводник (любые файлы — скрины, видео,
  // логи), несколько сразу; повтор — дубликаты по пути не добавляем
  async function pickFiles() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
      })
      if (res.canceled || !res.assets?.length) return
      const picked = res.assets.map((a) => ({
        uri: a.uri,
        name: a.name || 'файл',
      }))
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => f.uri))
        return [...prev, ...picked.filter((f) => !seen.has(f.uri))]
      })
    } catch {
      toast({ title: 'Не удалось открыть выбор файлов' })
    }
  }

  function removeFile(uri) {
    setFiles((prev) => prev.filter((f) => f.uri !== uri))
  }

  // Письмо собирает expo-mail-composer — только он умеет вкладывать
  // файлы (mailto не может). Если почта не настроена/не открылась —
  // прежний тост с адресом (тексты не менялись)
  function send() {
    const text = message.trim()
    const body = `${text || 'Опишите, пожалуйста, подробнее.'}${signature()}`
    const fail = () =>
      toast({
        title: '📮 Почта не открылась',
        description: `Напишите нам сами: ${EMAIL}`,
      })
    MailComposer.isAvailableAsync()
      .then((available) => {
        if (!available) return fail()
        return MailComposer.composeAsync({
          recipients: [EMAIL],
          subject: `[NutriBear] ${topic.subject}`,
          body,
          attachments: files.map((f) => f.uri),
        }).catch(fail)
      })
      .catch(fail)
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
                        {/* Рабочий шаблон (проверено на устройстве Кати):
                            у градиента — только рамка в style, раскладку
                            ведёт внутренний обычный View с теми же
                            классами, что у невыбранной пилюли, — размеры
                            совпадают и при выборе ничего не прыгает */}
                        {active ? (
                          <LinearGradient
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            colors={['#8B5CF6', '#6D5AE6']}
                            style={{ borderRadius: 999 }}
                          >
                            <View className="flex-row items-center justify-center gap-2 px-2 py-3">
                              <Icon size={17} color="#FFFFFF" />
                              <Text
                                numberOfLines={1}
                                maxFontSizeMultiplier={1.15}
                                className="font-semibold text-[14.5px] text-white"
                              >
                                {t.label}
                              </Text>
                            </View>
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

            {/* Вложения — кнопка со скрепкой открывает выбор файлов,
                выбранные — чипы с именем и крестиком (отзыв Кати от
                10.11: «добавить возможность прикрепить файлы») */}
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={pickFiles}
                accessibilityRole="button"
                accessibilityLabel="Прикрепить файл"
                className="flex-row items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.04] px-3 py-2 active:opacity-80"
              >
                <Paperclip size={14} color="#8D97BC" />
                <Text
                  maxFontSizeMultiplier={1.15}
                  className="font-semibold text-[13px] text-bear-sub"
                >
                  Прикрепить файл
                </Text>
              </Pressable>
              {files.map((f) => (
                <View
                  key={f.uri}
                  className="max-w-[210px] flex-row items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.06] px-3 py-2"
                >
                  <Paperclip size={13} color="#8D97BC" />
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.15}
                    className="shrink text-[13px] text-bear-sub"
                  >
                    {f.name}
                  </Text>
                  <Pressable
                    onPress={() => removeFile(f.uri)}
                    accessibilityRole="button"
                    accessibilityLabel={`Убрать файл ${f.name}`}
                    hitSlop={8}
                    className="ml-0.5"
                  >
                    <X size={14} color="#A5AECB" />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Отправить — крупная градиентная кнопка с самолётиком
                (градиент — родитель, раскладку ведёт внутренний View) */}
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
                style={{ flex: 1, borderRadius: 999 }}
              >
                <View className="h-[54px] flex-row items-center justify-center gap-2">
                  <Send size={19} color="#FFFFFF" />
                  <Text className="font-bold text-[17px] text-white">Отправить</Text>
                </View>
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
}
