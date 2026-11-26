// Окно «Написать нам» на «Ещё» (отзыв Кати: «пользователи смогут писать
// разработчикам о предложениях, лагах, оплате и других вопросах»).
// ОТКРЫВАЕТСЯ СРАЗУ по тапу на строку «Поддержка и помощь» — без
// кнопок-тем в строке меню и без адреса в списке (отзыв Кати от 10.11:
// «да, сразу открывалась»): выбор темы теперь только в самом окне,
// как на скрине-образце.
//
// ОТПРАВКА ПРЯМО ИЗ ПРИЛОЖЕНИЯ (отзыв Кати 21.11: «сейчас тап поддержка
// - написать нам - отправить - переходит на электронную почту и уже
// оттуда создает обращение. А я хочу чтобы прямо из приложения
// пользователь отправлял обращение»). Обращение уходит на наш
// Cloudflare Worker (адрес — EXPO_PUBLIC_AI_PROXY_URL из .env, путь
// POST /v1/support): воркер пересылает его владельцу в Telegram
// (секреты TG_BOT_TOKEN/TG_CHAT_ID живут в Cloudflare, в бандл APK
// они НЕ попадают). Пользователь жмёт «Отправить» — и всё, почтовое
// приложение не открывается. Поле «Контакт для ответа» — ОБЯЗАТЕЛЬНОЕ
// (решение Кати 21.11: «так сделаем»): при прямой отправке обращение
// приходит в Telegram без «от пользователя», и без контакта отвечать
// некому. Без заполненного контакта «Отправить» не срабатывает.
// Вложения едут тем же запросом (multipart руками через lib/multipart).
//
// ЗАПАСНОЙ ПОЧТОВЫЙ ПОТОК — не потерять сообщение:
//  • воркер ответил 503 support_not_configured — канал Telegram ещё не
//    настроен (секреты TG_* не залиты): молча открываем почту, как
//    раньше, без пугающих тостов;
//  • сеть/сервер — тост «не получилось отправить из приложения» и
//    почта с готовым письмом. Без вложений — прямой mailto через
//    Linking: работает даже когда expo-mail-composer недоступен в
//    Expo Go. С вложениями — композер; mailto доставит хотя бы текст.
//    Причину сбоя показываем в тосте — диагностика с телефона без
//    консоли (отзыв Кати 21.11: с картинкой прямая отправка падала
//    в почту, причина была не видна)
//  Адрес поддержки всегда есть и в политике конфиденциальности
//  (OPERATOR.email в lib/data/legal).
//
// Вид окна — по скрину чужого приложения от Кати 10.11 («сделай так»):
// шапка с лампочкой в градиентном чипе, заголовок «Написать нам» и
// подзаголовок; темы — плитки 2×2 с иконками (выбранная — градиентная);
// поле «Ваше сообщение» со счётчиком 0/2000; крупная градиентная кнопка
// «Отправить» с самолётиком (при отправке — индикатор, повторный тап
// заблокирован); внизу пометка «Ваше обращение в безопасности» с замком.
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
//
// 21.11, отзыв Кати (скрин 14:09): «клавиатура закрывает экран, нет
// возможности нажать кнопку отправить; нужно чтобы сообщение открывало
// почту пользователя и обращение создавалось оттуда». Два фикса:
//   1. behavior="height" на Android не сжал прозрачную Modal — кнопка
//      уехала под клавиатуру. Теперь ручной отступ useKeyboardGuard
//      (как в «Записать вес») + окно в ScrollView: при открытой
//      клавиатуре якорится вниз (flex-end) — «Отправить» и пометка
//      видны всегда, шапку и темы прокручиваем; при закрытой — окно
//      центрируется как раньше.
//   2. Без вложений — прямой mailto через Linking: система сама
//      поднимает почту пользователя с готовым письмом (тема, текст,
//      подпись с версией) — работает даже когда expo-mail-composer
//      в Expo Go недоступен. С вложениями — композер; если и он не
//      вышел, mailto доставит хотя бы текст (без файлов).

import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
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
import { useKeyboardGuard } from '@/lib/useKeyboardGuard'
import { supportMailtoUrl } from '@/lib/supportMailto'
import { SUPPORT_LIMITS } from '@/lib/supportLimits'
import { isDirectSupportAvailable, sendSupportDirect } from '@/lib/supportSend'
import { useToast } from '../ui/Toast'
import { useThemeColors } from '@/lib/use-theme'


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
  const themeColors = useThemeColors()
  const { toast } = useToast()
  // Отступ под клавиатуру считает useKeyboardGuard (behavior="height"
  // на Android прозрачную Modal не сжимает — скрин Кати 21.11)
  const kb = useKeyboardGuard()
  const kbOpen = kb.padBottom > 0 || kb.shrunk
  // Выбранная тема, текст, контакт и вложения — черновик сохраняется,
  // пока приложение живо: случайно закрыли — не потерялись. Успешно
  // отправили — черновик очищаем
  const [topic, setTopic] = useState(TOPICS[0])
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [files, setFiles] = useState([])
  // true между тапом «Отправить» и ответом воркера: на кнопке индикатор,
  // повторные тапы заблокированы — иначе по 3 письма за нервный тап
  const [sending, setSending] = useState(false)

  // Выбор файлов: системный проводник (любые файлы — скрины, видео,
  // логи), несколько сразу; повтор — дубликаты по пути не добавляем;
  // больше SUPPORT_LIMITS.FILES_MAX не даём — столько же принимает
  // воркер (лимиты совпадают, см. supportLimits.js)
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
      const room = SUPPORT_LIMITS.FILES_MAX - files.length
      if (room <= 0) {
        toast({ title: `Вложений не больше ${SUPPORT_LIMITS.FILES_MAX}`, description: 'Сначала уберите лишние крестиком' })
        return
      }
      if (picked.length > room) {
        toast({ title: `Вложений не больше ${SUPPORT_LIMITS.FILES_MAX}`, description: `Добавили первые ${room}` })
      }
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => f.uri))
        return [...prev, ...picked.filter((f) => !seen.has(f.uri)).slice(0, room)]
      })
    } catch {
      toast({ title: 'Не удалось открыть выбор файлов' })
    }
  }

  function removeFile(uri) {
    setFiles((prev) => prev.filter((f) => f.uri !== uri))
  }

  // Отправка (отзыв Кати 21.11: «я хочу чтобы прямо из приложения
  // пользователь отправлял обращение»).
  //
  // Шаг 1 — ПРЯМАЯ ОТПРАВКА: если известен адрес воркера
  // (EXPO_PUBLIC_AI_PROXY_URL), обращение уходит туда целиком — текст,
  // тема, контакт и вложения, — воркер пересылает его владельцу в
  // Telegram. Успех — тост, черновик очищаем, окно закрываем; почта
  // НЕ открывается.
  //   503 support_not_configured — канал Telegram ещё не настроен:
  //   молча проваливаемся в почтовый поток ниже, без пугающих тостов.
  //   Сетевой сбой/отказ сервера — короткий тост «открываем почту»
  //   и тот же почтовый поток: сообщение пользователя не теряется.
  // Шаг 2 — ЗАПАСНОЙ ПОЧТОВЫЙ ПОТОК (как было): без вложений — прямой
  // mailto через Linking (система сама поднимает почту с готовым
  // письмом, работает и в Expo Go), с вложениями — композер; если и он
  // не вышел (почта не настроена) — mailto без файлов, а если и это
  // не вышло — тост с адресом (он всегда есть и в политике).
  async function send() {
    const text = message.trim()
    // Пустое обращение никуда не уходит: в Telegram оно пришло бы
    // пустышкой, а почта бы открылась с «Опишите, пожалуйста…»
    if (!text) {
      toast({ title: 'Сначала напишите сообщение' })
      return
    }
    // Контакт обязателен (решение Кати 21.11: «так сделаем») — без
    // него на обращение некому ответить: в Telegram оно приходит
    // без «от пользователя», и адрес ответа взять неоткуда. Окно
    // остаётся открытым — человек дописывает контакт и жмёт ещё раз
    const replyContact = contact.trim()
    if (!replyContact) {
      toast({
        title: 'Укажите контакт для ответа',
        description: 'Почта или @телеграм — чтобы мы могли ответить',
      })
      return
    }
    const subject = `[NutriBear] ${topic.subject}`
    const body = `${text}${signature()}`
    const fail = () =>
      toast({
        title: '📮 Почта не открылась',
        description: `Напишите нам сами: ${EMAIL}`,
      })
    const mailto = () =>
      Linking.openURL(supportMailtoUrl({ email: EMAIL, subject, body }))

    // ── Шаг 1: прямо из приложения на наш сервер ─────────────────
    let directFailed = false
    let directFailedReason = ''
    if (isDirectSupportAvailable() && !sending) {
      setSending(true)
      try {
        const res = await sendSupportDirect({
          topicLabel: topic.label,
          message: text,
          contact: replyContact,
          files,
        })
        if (!res.notConfigured) {
          const extra =
            res.filesFailed > 0
              ? ` Текст доставлен, вложений не прошло: ${res.filesFailed} — пришлите их на ${EMAIL}`
              : ''
          toast({
            title: '✅ Обращение отправлено',
            description: `Ответим на ${replyContact}.${extra}`,
          })
          // Успех — черновик больше не нужен, чтобы случайное
          // повторное открытие не отправило дубль
          setMessage('')
          setContact('')
          setFiles([])
          onClose?.()
          return
        }
        // notConfigured — молча идём в почтовый поток (шаг 2)
      } catch (e) {
        if (e && e.local) {
          // Проблема известна и исправима здесь (лимиты вложений):
          // показываем текст и оставляем окно открытым — пользователь
          // уберёт лишний файл и нажмёт «Отправить» ещё раз
          toast({ title: 'Не получилось отправить', description: e.message })
          return
        }
        // Сеть/сервер: откатываемся на почту — сообщение не потеряется.
        // Причину показываем в тосте запасного потока (диагностика с
        // телефона — без консоли и логов)
        console.warn('[support] прямая отправка не удалась:', e)
        directFailed = true
        directFailedReason = (e && e.message) || ''
      } finally {
        setSending(false)
      }
    }

    // ── Шаг 2: запасной почтовый поток (как было) ─────────────────
    try {
      if (files.length > 0) {
        if (directFailed) {
          toast({
            title: 'Не получилось отправить из приложения',
            description: directFailedReason
              ? `Открыли почту с готовым письмом. Причина: ${directFailedReason}`
              : 'Открыли почту с готовым письмом',
          })
        }
        const available = await MailComposer.isAvailableAsync()
        if (!available) throw new Error('почта недоступна')
        await MailComposer.composeAsync({
          recipients: [EMAIL],
          subject,
          body,
          attachments: files.map((f) => f.uri),
        })
      } else {
        await mailto()
        toast(
          directFailed
            ? {
                title: '📮 Не получилось отправить из приложения',
                description:
                  'Открыли вашу почту с готовым письмом — нажмите «Отправить»' +
                  (directFailedReason ? `. Причина: ${directFailedReason}` : ''),
              }
            : {
                title: '📮 Открываем вашу почту',
                description: 'Письмо уже заполнено — проверьте и нажмите «Отправить»',
              }
        )
      }
      onClose?.()
    } catch {
      if (files.length > 0) {
        try {
          await mailto()
          toast({
            title: '📮 Открываем вашу почту',
            description: 'Без вложений — пришлите файлы отдельным письмом',
          })
          onClose?.()
          return
        } catch {
          // ниже — общий тост с адресом
        }
      }
      fail()
    }
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        onLayout={kb.onLayout}
        className="flex-1 bg-black/60"
        style={kb.padBottom > 0 ? { paddingBottom: kb.padBottom + 12 } : null}
      >
        {/* Окно выше высоты над клавиатурой, поэтому оно в ScrollView:
            при открытой клавиатуре якорится вниз — «Отправить» и пометка
            о безопасности видны всегда, шапка и темы прокручиваются;
            при закрытой — центрируется как раньше. keyboardShouldPersistTaps
            — тап по «Отправить» срабатывает, не пряча клавиатуру */}
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: kbOpen ? 'flex-end' : 'center',
            paddingHorizontal: 24,
            paddingVertical: 24,
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            accessibilityLabel="Окно письма в поддержку"
            className="w-full overflow-hidden rounded-3xl border border-bear-line bg-bear-pop"
          >
          {/* Шапка: лампочка в градиентном чипе + заголовок с подзаголовком
              + круглая кнопка закрытия (по скрину Кати от 10.11) */}
          <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}
              style={{ borderRadius: 16 }}
            >
              {/* раскладку ведёт обычный View — LinearGradient на Android
                  не удерживает выравнивание детей */}
              <View className="h-[52px] w-[52px] items-center justify-center">
                <Lightbulb size={26} color={themeColors.warn} />
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
              className="h-[34px] w-[34px] items-center justify-center rounded-full bg-bear-overlay2 active:bg-bear-overlay2"
            >
              <X size={18} color={themeColors.sub} />
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
                            colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}
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
                          <View className="flex-row items-center justify-center gap-2 rounded-full border border-bear-line bg-bear-overlay px-2 py-3">
                            <Icon size={17} color={themeColors.dim} />
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
              maxLength={2000}
              placeholder="Расскажите, что вы думаете…"
              placeholderTextColor={themeColors.dim}
              accessibilityLabel="Текст обращения в поддержку"
              className="mt-2 min-h-[120px] rounded-2xl border border-bear-line bg-bear-overlay px-4 py-3.5 font-sans text-[16px] leading-snug text-bear-text"
              style={{ textAlignVertical: 'top' }}
            />

            {/* Счётчик символов — справа под полем, «N / 2000» как на скрине */}
            <Text
              maxFontSizeMultiplier={1.1}
              className="mt-1 text-right font-sans text-[12.5px] text-bear-dim"
            >
              {message.length} / 2000
            </Text>

            {/* Контакт для ответа — ОБЯЗАТЕЛЬНЫЙ (решение Кати 21.11:
                «так сделаем»): при прямой отправке обращение приходит
                в Telegram без «от пользователя», без контакта отвечать
                некому. Один ввод — почта или @ник в Telegram; на
                клавиатуре — e-mail-набор */}
            <Text maxFontSizeMultiplier={1.15} className="mt-3 font-bold text-[15px] text-bear-text">
              Контакт для ответа:
            </Text>
            <TextInput
              value={contact}
              onChangeText={setContact}
              maxLength={SUPPORT_LIMITS.CONTACT_MAX}
              placeholder="Почта или @телеграм — чтобы мы могли ответить"
              placeholderTextColor={themeColors.dim}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              accessibilityLabel="Контакт для ответа — почта или ник в Telegram, обязательно для отправки"
              className="mt-2 h-[48px] rounded-2xl border border-bear-line bg-bear-overlay px-4 font-sans text-[16px] text-bear-text"
            />

            {/* Вложения — кнопка со скрепкой открывает выбор файлов,
                выбранные — чипы с именем и крестиком (отзыв Кати от
                10.11: «добавить возможность прикрепить файлы») */}
            <View className="mt-2 flex-row flex-wrap items-center gap-2">
              <Pressable
                onPress={pickFiles}
                accessibilityRole="button"
                accessibilityLabel="Прикрепить файл"
                className="flex-row items-center gap-1.5 rounded-full border border-bear-line bg-bear-overlay px-3 py-2 active:opacity-80"
              >
                <Paperclip size={14} color={themeColors.dim} />
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
                  className="max-w-[210px] flex-row items-center gap-1.5 rounded-full border border-bear-line bg-bear-overlay px-3 py-2"
                >
                  <Paperclip size={13} color={themeColors.dim} />
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
                    <X size={14} color={themeColors.sub} />
                  </Pressable>
                </View>
              ))}
            </View>

            {/* Отправить — крупная градиентная кнопка с самолётиком
                (градиент — родитель, раскладку ведёт внутренний View).
                Пока идёт отправка — индикатор и «Отправляем…», тапы
                заблокированы (disabled), чтобы не насоздавать дублей */}
            <Pressable
              onPress={send}
              disabled={sending}
              accessibilityRole="button"
              accessibilityLabel={
                sending ? 'Обращение отправляется, подождите' : 'Отправить обращение в поддержку'
              }
              accessibilityState={{ busy: sending }}
              className={`mt-2 h-[54px] flex-row ${sending ? 'opacity-70' : 'active:opacity-80'}`}
            >
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}
                style={{ flex: 1, borderRadius: 999 }}
              >
                <View className="h-[54px] flex-row items-center justify-center gap-2">
                  {sending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Send size={19} color="#FFFFFF" />
                  )}
                  <Text className="font-bold text-[17px] text-white">
                    {sending ? 'Отправляем…' : 'Отправить'}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>

            <View className="mt-2.5 flex-row items-center justify-center gap-1.5">
              <Lock size={14} color={themeColors.dim} />
              <Text maxFontSizeMultiplier={1.2} className="font-sans text-[13px] text-bear-dim">
                Ваше обращение в безопасности
              </Text>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  )
}
