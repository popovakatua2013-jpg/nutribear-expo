// Экран ИИ-чата — отдельный маршрут /ai-chat вместо модалки.
// В главном окне (обычные экраны) клавиатура обрабатывается так:
// нативное ужатие окна ловим по onLayout (ужалось — ручной паддинг
// не добавляем, чтобы не задвоить), иначе поднимаем ввод на высоту
// клавиатуры из keyboardDidShow. iOS — стандартный behavior padding.
// История диалога живёт в useAiChatStore и переживает закрытие экрана.
//
// ВАЖНО (скриншот Кати от 11.11 22:52: поле ввода выглядывает из-под
// клавиатуры на ~четверть — паддинг применялся, но его не хватало
// ровно на высоту панели навигации). Причина: на Android 15 с
// edge-to-edge окно не ужимается (adjustResize отключён системой),
// а высоту клавиатуры RN отдаёт как imeInsets.bottom − barInsets.bottom
// (исходник RN: ReactRootView.checkForKeyboardEvents), т.е. БЕЗ полосы
// навигации. Но клавиатура в edge-to-edge рисуется за прозрачным
// навбаром и закрывает его тоже, значит реальная заслонка =
// высота от RN + insets.bottom. Поэтому к ручному паддингу всегда
// добавляем insets.bottom обратно.

import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ArrowLeft, Send, Trash2, WifiOff } from 'lucide-react-native'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOffline } from '@/lib/useOffline'
import { askNutritionist, buildCompanionSystem, offlineReply } from '@/lib/chat'
import { useAiChatStore, AI_GREETING } from '@/store/useAiChatStore'
import { useCompanionStore, COMPANIONS } from '@/store/useCompanionStore'
import { useProStore } from '@/store/useProStore'
import { useAiUsageStore, aiRemaining } from '@/store/useAiUsageStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { totalConsumed } from '@/lib/data/diary'

// Текст сообщения построчно: переносы из ответа ИИ (и многострочного
// ввода) гарантированно видны — каждая строка свой Text, пустая
// строка даёт абзацный отступ
function MessageText({ content, className }) {
  const lines = String(content || '').split('\n')
  return (
    <>
      {lines.map((ln, i) => (
        <Text key={i} className={className}>
          {ln || ' '}
        </Text>
      ))}
    </>
  )
}

export default function AiChatScreen() {
  const messages = useAiChatStore((s) => s.messages)
  const text = useAiChatStore((s) => s.text)
  const busy = useAiChatStore((s) => s.busy)
  const setMessages = useAiChatStore((s) => s.setMessages)
  const setText = useAiChatStore((s) => s.setText)
  const setBusy = useAiChatStore((s) => s.setBusy)
  const reset = useAiChatStore((s) => s.reset)

  // Офлайн-детектор: общий хук (тот же, что у полоски «Нет сети»).
  // isInternetReachable бывает null (нет данных) — считаем это сетью,
  // чтобы не пугать ложно
  const offline = useOffline()
  const insets = useSafeAreaInsets()
  const listRef = useRef(null)

  // Данные для офлайн-ответов
  const entries = useFoodStore((s) => s.entries)
  const waterMl = useActivityStore((s) => s.waterMl)
  const extraSteps = useActivityStore(selectTotalSteps) // датчик + ручные
  const goals = useGoalsStore((s) => s.goals)
  const weightKg = useProfileStore((s) => s.weightKg)
  const heightCm = useProfileStore((s) => s.heightCm)
  const profileName = useProfileStore((s) => s.name)
  const profileSex = useProfileStore((s) => s.sex)

  // Выбранный медведь: аватар и имя в шапке/у ответов, приветствие его
  // характера, системный промпт с личным контекстом (см. buildCompanionSystem)
  const companionId = useCompanionStore((s) => s.companionId)
  const companion = COMPANIONS.find((c) => c.id === companionId) || COMPANIONS[0]

  // Лимит бесплатного тарифа (этап 1 монетизации): 15 сообщений ИИ в день.
  // Premium снимает лимит; офлайн-помощник лимитам не подчиняется —
  // ответы по дневнику доступны всегда
  const pro = useProStore((s) => s.pro)
  const chatLeft = useAiUsageStore((s) => aiRemaining(s, 'chat', pro))

  // Свежее приветствие характера: если в диалоге пока только дефолтное
  // приветствие (новая сессия или сразу после «Очистить»), подставляем
  // текст выбранного медведя — начатый диалог не трогаем
  useEffect(() => {
    const s = useAiChatStore.getState()
    if (s.messages.length === 1 && s.messages[0].content === AI_GREETING.content) {
      s.setMessages([{ role: 'assistant', greeting: true, content: companion.greeting }])
    }
  }, [companionId])

  // Высота клавиатуры на Android — отдаётся контейнеру в paddingBottom.
  // RN отдаёт её БЕЗ полосы навигации (imeInsets − barInsets), навбар
  // добавляем сами при рендере (см. шапку файла). 0 — клавиатура
  // закрыта или окно ужалось само (нативный resize)
  const [kbPad, setKbPad] = useState(0)
  // true — окно ужалось под клавиатуру само: система подняла ввод сама,
  // ручной паддинг не добавляем (иначе задвоим высоту)
  const [winShrunk, setWinShrunk] = useState(false)
  // Зеркала для слушателей клавиатуры (замыкание видит свежие значения)
  const shrunkRef = useRef(false)
  const lastH = useRef(null)

  // Android: следим за высотой контейнера — ужатие/возврат окна
  // означает, что клавиатуру обработала система (adjustResize)
  const onRootLayout = (e) => {
    const h = Math.round(e.nativeEvent.layout.height)
    const prev = lastH.current
    lastH.current = h
    if (prev == null || Math.abs(h - prev) < 40) return
    shrunkRef.current = h < prev
    setWinShrunk(shrunkRef.current)
    setKbPad(0)
  }

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: false })
  }, [])

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true })
  }, [messages, busy])

  // Клавиатура открылась — доскроллливаем к последнему сообщению
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(showEvt, () =>
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    )
    return () => sub.remove()
  }, [])

  // Android: высоту клавиатуры берём из события и отдаём контейнеру в
  // paddingBottom — ТОЛЬКО если окно не ужалось само (см. шапку файла)
  useEffect(() => {
    if (Platform.OS !== 'android') return undefined
    const show = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!shrunkRef.current) setKbPad(e?.endCoordinates?.height || 0)
    })
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbPad(0))
    return () => {
      show.remove()
      hide.remove()
    }
  }, [])

  function buildContext() {
    const bmiH = heightCm > 0 ? heightCm / 100 : 0
    return {
      eaten: totalConsumed(entries),
      goal: goals.kcal,
      waterMl,
      waterGoal: goals.waterMl,
      steps: extraSteps,
      stepsGoal: goals.steps,
      weightKg,
      heightCm,
      bmi: bmiH ? Math.round((weightKg / (bmiH * bmiH)) * 10) / 10 : null,
      // Имя и пол — медведь обращается по имени и в правильном роде
      name: profileName,
      sex: profileSex,
    }
  }

  async function send() {
    const content = text.trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setText('')
    setBusy(true)
    try {
      let reply
      // Офлайн-ответ помечаем — под пузырём видна подпись «🧸 офлайн-режим»,
      // чтобы не путать встроенного помощника с настоящим ИИ
      let isOffline = false
      // Сработал дневной лимит бесплатного тарифа (отдельная подпись —
      // «лимит исчерпан», не путать с «нет сети»)
      let limitHit = false
      if (offline) {
        // Сети нет — сразу офлайн-помощник, без зависающей попытки запроса
        reply = offlineReply(content, buildContext())
        isOffline = true
      } else if (!useAiUsageStore.getState().canUse('chat', pro)) {
        // Лимит исчерпан — дневник не блокируем: отвечает встроенный
        // помощник по дневнику (бесплатно), настоящий ИИ вернётся завтра
        // или с Premium. Запрос не списывается — он и не уходил
        reply = offlineReply(content, buildContext())
        isOffline = true
        limitHit = true
      } else {
        try {
          // Системный промпт: характер медведя + цифры дня (имя, калории,
          // вода, шаги, вес) — онлайн-ИИ отвечает лично про твой дневник
          reply = await askNutritionist(next, 25000, buildCompanionSystem(buildContext()))
          // Списываем ТОЛЬКО успешный запрос — сгоревший на ошибке сети
          // запрос денег не стоит
          useAiUsageStore.getState().record('chat')
        } catch {
          reply = offlineReply(content, buildContext())
          isOffline = true
        }
      }
      setMessages([
        ...next,
        {
          role: 'assistant',
          content: reply,
          ...(isOffline ? { offline: true } : {}),
          ...(limitHit ? { limit: true } : {}),
        },
      ])
    } catch {
      setMessages([
        ...next,
        { role: 'assistant', content: '😅 Что-то пошло не так. Попробуйте ещё раз.' },
      ])
    } finally {
      setBusy(false)
    }
  }

  // «Очистить чат» из шапки: диалог начинается заново с приветствия
  function clearChat() {
    Alert.alert('Очистить чат?', 'Диалог начнётся заново — история сообщений удалится.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: reset },
    ])
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      onLayout={Platform.OS === 'android' ? onRootLayout : undefined}
      className="flex-1 bg-[#131e3a]"
      style={{
        paddingTop: insets.top,
        // Окно ужалось само — системе больше ничего не нужно; иначе
        // ручной паддинг = высота клавиатуры от RN + полоса навигации
        // (RN отдаёт высоту без навбара, а клавиатура закрывает и его),
        // а без клавиатуры — отступ под жестовую панель навигации
        paddingBottom: winShrunk ? 0 : kbPad > 0 ? kbPad + insets.bottom : insets.bottom,
      }}
    >
      {/* Шапка: назад, аватар и имя медведя, очистить */}
      <View className="flex-row items-center justify-between border-b border-white/5 px-3 pb-3.5 pt-2">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Закрыть чат"
          accessibilityRole="button"
          hitSlop={6}
          className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <ArrowLeft size={20} color="#AEB9D9" />
        </Pressable>
        <View className="min-w-0 flex-1 flex-row items-center gap-2.5 pl-2">
          <Image
            source={companion.image}
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              backgroundColor: `${companion.color}22`,
            }}
            accessibilityLabel={`${companion.name} — аватар помощника`}
          />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-extrabold text-[21px] text-bear-text">
              {companion.name}
            </Text>
            <Text numberOfLines={1} className="mt-0.5 text-[15px] text-[#8a94b3]">
              Нутрициолог NutriBear — отвечает сразу
            </Text>
          </View>
        </View>
        <Pressable
          onPress={clearChat}
          accessibilityLabel="Очистить чат — начать диалог заново"
          accessibilityRole="button"
          hitSlop={6}
          className="ml-1 h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <Trash2 size={19} color="#AEB9D9" />
        </Pressable>
      </View>

      {/* Офлайн-чип: серая полоска под шапкой вместо слепых попыток */}
      {offline && (
        <View
          accessibilityLabel="Нет сети"
          className="mx-4 mt-3 flex-row items-center gap-2 rounded-2xl bg-white/[0.05] px-3.5 py-2"
        >
          <WifiOff size={16} color="#8B96B8" />
          <Text className="flex-1 font-sans text-[16px] text-[#8a94b3]">
            Нет сети — ИИ отключён. Отвечает офлайн-помощник по вашему дневнику
          </Text>
        </View>
      )}

      {/* Диалог */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => `m${i}`}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingVertical: 16, gap: 10 }}
        onContentSizeChange={() =>
          listRef.current?.scrollToEnd({ animated: false })
        }
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <View
            className={`flex-row ${item.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {item.role === 'user' ? (
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
                className="min-w-[110px] rounded-2xl rounded-br-md px-3.5 py-2.5"
                style={{ maxWidth: '85%' }}
              >
                <MessageText
                  content={item.content}
                  className="text-[19px] leading-[22px] text-white"
                />
              </LinearGradient>
            ) : (
              // Ответ медведя: аватар напарника слева от пузыря, под
              // пузырём — подпись «офлайн-режим» для офлайн-ответов
              <View className="flex-row items-start gap-2" style={{ maxWidth: '88%' }}>
                <Image
                  source={companion.image}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 9,
                    backgroundColor: `${companion.color}22`,
                  }}
                  accessibilityLabel={`${companion.name} — аватар ответа`}
                />
                <View className="min-w-0 flex-1">
                  <View className="min-w-[110px] rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5">
                    <MessageText
                      content={item.content}
                      className="text-[19px] leading-[22px] text-[#dbe3f8]"
                    />
                  </View>
                  {item.limit ? (
                    <Text className="mt-1 px-1 text-[12.5px] leading-[16px] text-[#5c668a]">
                      🧸 дневной лимит ИИ исчерпан — отвечает встроенный помощник. Premium — безлимит
                    </Text>
                  ) : item.offline ? (
                    <Text className="mt-1 px-1 text-[12.5px] text-[#5c668a]">
                      🧸 офлайн-режим — отвечает встроенный помощник по дневнику
                    </Text>
                  ) : null}
                </View>
              </View>
            )}
          </View>
        )}
        ListFooterComponent={
          busy ? (
            <Text className="px-1 pt-1 text-[15px] text-[#5c668a]">
              Печатает…
            </Text>
          ) : null
        }
      />

      {/* Остаток дневного лимита ИИ: только для бесплатного тарифа и
          только при сети (офлайн-помощник и так безлимитный) */}
      {!pro && !offline ? (
        <Text
          accessibilityLabel={
            chatLeft > 0
              ? `Осталось сообщений ИИ сегодня: ${chatLeft}`
              : 'Дневной лимит ИИ исчерпан'
          }
          className="mb-1 px-4 text-[12.5px] text-[#5c668a]"
        >
          {chatLeft > 0
            ? `ИИ-чата осталось: ${chatLeft} сообщений сегодня · Premium — безлимит`
            : 'Дневной лимит ИИ исчерпан — отвечает встроенный помощник · Premium — безлимит'}
        </Text>
      ) : null}

      {/* Ввод */}
      <View className="flex-row items-center gap-2 border-t border-white/5 p-4">
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          editable={!busy}
          placeholder="Спросите о питании…"
          placeholderTextColor="#8B96B8"
          accessibilityLabel="Сообщение ИИ-помощнику"
          multiline
          className="max-h-[96px] min-h-[42px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[19px] text-bear-text"
        />
        <Pressable
          onPress={send}
          disabled={busy || !text.trim()}
          accessibilityLabel="Отправить"
          className={`h-[42px] w-[42px] items-center justify-center rounded-2xl overflow-hidden ${busy || !text.trim() ? 'opacity-50' : ''}`}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
            style={[StyleSheet.absoluteFillObject]}
          />
          <Send size={19} color="#FFFFFF" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}
