// Живой режим «Голос»: запись фразы про еду → нейросеть напрямую
// (речь через voiceModel из .env, блюдо и граммы — через модель) → выбор из вариантов.

import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { Mic, Square } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { recognizeVoiceAudio, recognizeVoiceText } from '@/lib/food-ai'
import { useToast } from '../ui/Toast'

export function VoiceMode({ onPick }) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const timerRef = useRef(null)
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [busy, setBusy] = useState(false)
  const [heard, setHeard] = useState('')
  const [results, setResults] = useState([])
  const [error, setError] = useState('')
  const [phrase, setPhrase] = useState('')
  const { toast } = useToast()

  useEffect(() => () => clearInterval(timerRef.current), [])

  async function startRecording() {
    setError('')
    setResults([])
    setHeard('')
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) {
        setError('Нужно разрешение на микрофон (Настройки → Приложения → Expo Go)')
        return
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      })
      await recorder.prepareToRecordAsync()
      recorder.record()
      setRecording(true)
      setSeconds(0)
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e) {
      setError('Не удалось начать запись: ' + String(e?.message || e))
    }
  }

  async function stopAndRecognize() {
    if (recording && !busy) {
      clearInterval(timerRef.current)
      setRecording(false)
      setBusy(true)
      try {
        await recorder.stop()
        await setAudioModeAsync({ allowsRecording: false })
        const uri = recorder.uri
        if (!uri) throw new Error('Запись не сохранилась')
        // Читаем файл как base64 и отправляем на сервер
        const res = await fetch(uri)
        const blob = await res.blob()
        const reader = new FileReader()
        const audioBase64 = await new Promise((resolve, reject) => {
          reader.onloadend = () => {
            const s = String(reader.result || '')
            resolve(s.includes(',') ? s.split(',')[1] : s)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        const data = await recognizeVoiceAudio(audioBase64)
        setHeard(data.text || '')
        setResults(data.items || [])
        if (data.grams) toast({ title: `⚖️ Распознан вес: ${data.grams} г` })
      } catch (e) {
        setError(String(e?.message || e))
      } finally {
        setBusy(false)
      }
    }
  }

  async function recognizeTyped() {
    const t = phrase.trim()
    if (!t || busy) return
    setBusy(true)
    setError('')
    try {
      const data = await recognizeVoiceText(t)
      setHeard(data.text || t)
      setResults(data.items || [])
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
      <View className="mb-3 flex-row items-center gap-2">
        <Mic size={18} color="#7DD3FC" />
        <Text className="font-bold text-[15px] text-bear-text">Голосовой ввод</Text>
      </View>

      <View className="items-center rounded-2xl border border-white/10 bg-white/[0.03] py-6">
        <Pressable
          onPress={recording ? stopAndRecognize : startRecording}
          disabled={busy}
          accessibilityLabel={recording ? 'Остановить запись' : 'Начать запись'}
          className="h-[76px] w-[76px] items-center justify-center rounded-full"
          style={{ elevation: 6 }}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={recording ? ['#EF4444', '#B91C1C'] : ['#4D7CFE', '#A45BFF']}
            style={{ transform: [{ scale: busy ? 0.9 : 1 }] }}
          >
            <View className="h-[76px] w-[76px] items-center justify-center rounded-full">
              {recording ? (
                <Square size={26} color="#FFFFFF" />
              ) : (
                <Mic size={30} color="#FFFFFF" />
              )}
            </View>
          </LinearGradient>
        </Pressable>
        <Text className="mt-3 font-semibold text-[13px] text-bear-text">
          {busy ? 'Распознаём…' : recording ? `Идёт запись · ${mmss}` : 'Нажмите и скажите'}
        </Text>
        <Text className="mt-1 px-6 text-center text-[11px] text-bear-sub">
          Например: «Тарелка овсянки 250 граммов»
        </Text>
      </View>

      {heard ? (
        <Text className="mt-3 text-[12px] text-bear-sub">Распознано: «{heard}»</Text>
      ) : null}

      {error ? (
        <Text className="mt-3 text-[12px] leading-[17px] text-[#f87171]">{error}</Text>
      ) : null}

      {results.length > 0 && (
        <View className="mt-3 gap-2">
          {results.map((it, i) => (
            <Pressable
              key={`r${i}`}
              onPress={() => onPick(it)}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 active:bg-white/10"
            >
              <Text className="text-xl">{it.emoji || '🍽'}</Text>
              <View className="min-w-0 flex-1">
                <Text numberOfLines={1} className="font-semibold text-[13.5px] text-bear-text">
                  {it.name}
                </Text>
                <Text className="text-[11px] text-bear-sub">
                  {it.kcal100 ? `${it.kcal100} ккал / 100 г` : 'калорийность уточните'}
                  {it.source === 'off' ? ' · Open Food Facts' : ''}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}

      <Text className="mt-3 text-[11px] leading-[16px] text-bear-sub">
        Голос распознаёт нейросеть (нужна строка EXPO_PUBLIC_AI_VOICE_MODEL в файле .env).
        Без неё используйте ввод фразы текстом ниже.
      </Text>
      <TextInput
        value={phrase}
        onChangeText={setPhrase}
        placeholder="Или введите фразу текстом…"
        placeholderTextColor="#8B96B8"
        className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] text-bear-text"
      />
      <Pressable
        onPress={recognizeTyped}
        disabled={busy || !phrase.trim()}
        className={`mt-2 items-center rounded-2xl border border-white/10 bg-white/5 py-3 active:bg-white/10 ${busy || !phrase.trim() ? 'opacity-50' : ''}`}
      >
        <Text className="font-semibold text-[13px] text-bear-text">
          Распознать текстом ↓
        </Text>
      </Pressable>
    </ScrollView>
  )
}
