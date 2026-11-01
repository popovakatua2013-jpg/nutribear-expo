// ИИ-чат «конвертик»: плавающая кнопка на главной (крупная, заметная)
// и модалка диалога с ИИ-нутрициологом (порт веб-версии AiChat.jsx).
// Клавиатура не перекрывает чат: на Android весь контейнер сжимается
// (behavior height — внутри модалки системный resize не работает),
// при открытии клавиатуры список доскроллливается к вводу.
// Сообщения — полноценные блоки: пузырь не уже 110px, шрифт крупнее.
// Сначала пробуем настоящий ИИ (веб-версия на ПК, /api/chat),
// если сервера нет — отвечает офлайн-помощник по данным дневника.

import { useEffect, useRef, useState } from 'react'
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Mail, Send, WifiOff, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOffline } from '@/lib/useOffline'
import { askNutritionist, offlineReply } from '@/lib/chat'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, selectTotalSteps } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useProfileStore } from '@/store/useProfileStore'
import { totalConsumed } from '@/lib/data/diary'

const GREETING = {
  role: 'assistant',
  content:
    'Привет! Я ИИ-помощник NutriBear 🐻 Спросите про питание, калории, воду или привычки — помогу!',
}

export function AiChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([GREETING])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  // Офлайн-детектор: общий хук (тот же, что у полоски «Нет сети» на весь
  // экран). isInternetReachable бывает null (нет данных) — считаем это
  // сетью, чтобы не пугать ложно
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
    }
  }

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() =>
        listRef.current?.scrollToEnd({ animated: false })
      )
    }
  }, [open])

  useEffect(() => {
    listRef.current?.scrollToEnd({ animated: true })
  }, [messages, busy])

  // Клавиатура открылась — доскроллливаем к последнему сообщению,
  // иначе на Android строки ввода не видно за клавиатурой
  useEffect(() => {
    if (!open) return undefined
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const sub = Keyboard.addListener(showEvt, () =>
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }))
    )
    return () => sub.remove()
  }, [open])

  async function send() {
    const content = text.trim()
    if (!content || busy) return
    const next = [...messages, { role: 'user', content }]
    setMessages(next)
    setText('')
    setBusy(true)
    try {
      let reply
      if (offline) {
        // Сети нет — сразу офлайн-помощник, без зависающей попытки запроса
        reply = offlineReply(content, buildContext())
      } else {
        try {
          reply = await askNutritionist(next)
        } catch {
          reply = offlineReply(content, buildContext())
        }
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply }])
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: '😅 Что-то пошло не так. Попробуйте ещё раз.' },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      {/* Плавающая кнопка над панелью вкладок — крупная, чтобы легко
          находилась и нажималась (60px, иконка 26) */}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityLabel="Открыть ИИ-чат"
        className="absolute bottom-6 right-4 h-[60px] w-[60px] items-center justify-center rounded-full active:opacity-80"
        style={{
          elevation: 6,
          shadowColor: '#4D7CFE',
          shadowOpacity: 0.45,
          shadowRadius: 10,
        }}
      >
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['#4D7CFE', '#A45BFF']}
          style={[StyleSheet.absoluteFillObject, { borderRadius: 30 }]}
        />
        <Mail size={26} color="#FFFFFF" strokeWidth={2.2} />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 bg-[#131e3a]"
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-white/5 px-5 pb-3.5 pt-4">
            <View className="flex-1">
              <Text className="font-extrabold text-[16px] text-bear-text">
                ИИ-помощник
              </Text>
              <Text className="mt-0.5 text-[11px] text-[#8a94b3]">
                Нутрициолог NutriBear — отвечает сразу
              </Text>
            </View>
            <Pressable
              onPress={() => setOpen(false)}
              accessibilityLabel="Закрыть чат"
              className="h-9 w-9 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={18} color="#AEB9D9" />
            </Pressable>
          </View>

          {/* Офлайн-чип: серая полоска под шапкой вместо слепых попыток */}
          {offline && (
            <View
              accessibilityLabel="Нет сети"
              className="mx-4 mt-3 flex-row items-center gap-2 rounded-2xl bg-white/[0.05] px-3.5 py-2"
            >
              <WifiOff size={14} color="#8B96B8" />
              <Text className="flex-1 font-sans text-[11.5px] text-[#8a94b3]">
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
                    colors={['#4D7CFE', '#A45BFF']}
                    className="min-w-[110px] rounded-2xl rounded-br-md px-3.5 py-2.5"
                    style={{ maxWidth: '85%' }}
                  >
                    <Text className="text-[14px] leading-[20px] text-white">
                      {item.content}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View
                    className="rounded-2xl rounded-bl-md bg-white/[0.06] px-3.5 py-2.5"
                    style={{ maxWidth: '85%' }}
                  >
                    <Text className="text-[14px] leading-[20px] text-[#dbe3f8]">
                      {item.content}
                    </Text>
                  </View>
                )}
              </View>
            )}
            ListFooterComponent={
              busy ? (
                <Text className="px-1 pt-1 text-[11px] text-[#5c668a]">
                  Печатает…
                </Text>
              ) : null
            }
          />

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
              className="max-h-[96px] min-h-[42px] flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-bear-text"
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
                colors={['#4D7CFE', '#A45BFF']}
                style={[StyleSheet.absoluteFillObject]}
              />
              <Send size={17} color="#FFFFFF" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  )
}
