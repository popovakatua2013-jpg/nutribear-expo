// Живой режим «Голос»: запись фразы про еду → нейросеть напрямую
// (речь через voiceModel из .env, блюдо и граммы — через модель) → выбор из вариантов.
// Отзыв Кати 27.11: «текст распознает, но отсутствует кнопка добавить» —
// список распознанного был простынёй карточек без явной кнопки: непонятно,
// что карточки тапабельны, а «Добавить» жил на следующем экране порции.
// Теперь: (1) у каждой карточки — плюс-подсказка и крестик (лишнюю позицию
// можно убрать сразу: нейросеть иногда приписывает блюда, которых не было
// во фразе); (2) внизу окна — ЗАКРЕПЛЁННАЯ кнопка «Добавить всё в „Ужин“»:
// видна всегда, сколько бы позиций ни распозналось, тап добавляет весь
// список в дневник с распознанной граммовкой; тап по отдельной карточке,
// как раньше, открывает экран порции («своя граммовка и комментарий»).

import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio'
import { Mic, Plus, Square, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { recognizeVoiceAudio, recognizeVoiceText, estimateItemKcal } from '@/lib/food-ai'
import { kcalForPortion } from '@/lib/data/foods'
import { buildFood } from '@/lib/data/pick'
import { toBuildItem } from '@/lib/data/to-item'
import { formatNum } from '@/lib/format'
import { tapGuard } from '@/lib/tap-guard'
import { useToast } from '../ui/Toast'
import { openSettingsSoon } from '@/lib/appSettings'
import { useProStore } from '@/store/useProStore'
import { useAiUsageStore, aiRemaining } from '@/store/useAiUsageStore'
import { FREE_LIMITS } from '@/lib/entitlements'
import { useFoodStore } from '@/store/useFoodStore'
import { useThemeColors } from '@/lib/use-theme'

// 1 позиция / 2 позиции / 5 позиций — для тоста кнопки «Добавить всё»
function pluralPositions(n) {
  const m10 = n % 10
  const m100 = n % 100
  if (m10 === 1 && m100 !== 11) return 'позиция'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'позиции'
  return 'позиций'
}

export function VoiceMode({ onPick, mealId, mealName = '', dayOff = 0, onClose = () => {} }) {
  const themeColors = useThemeColors()
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
  // Запись в дневник — для кнопки «Добавить всё» (отзыв Кати 27.11:
  // «отсутствует кнопка добавить»). Защита от двойного тапа — как на
  // экране порции (tapGuard), иначе два быстрых тапа дублируют записи
  const addEntry = useFoodStore((s) => s.addEntry)
  const addAllOnce = useRef(tapGuard()).current

  // Дневной лимит голосовых распознаваний (этап 1 монетизации):
  // 10 записей в день бесплатно, Premium — безлимит. ЛИМИТИТСЯ ТОЛЬКО
  // ЗАПИСЬ: распознавание напечатанной фразы не трогаем — там есть
  // бесплатный путь разбора простых фраз, и дневник остаётся
  // полноценным без ИИ (матрица 14.11)
  const pro = useProStore((s) => s.pro)
  const voiceLeft = useAiUsageStore((s) => aiRemaining(s, 'voice', pro))

  useEffect(() => () => clearInterval(timerRef.current), [])

  async function startRecording() {
    setError('')
    setResults([])
    setHeard('')
    // Лимит проверяем ДО записи — чтобы не записывать зря: фразы всё
    // равно можно ввести текстом ниже (без ИИ-затрат на аудио)
    if (!useAiUsageStore.getState().canUse('voice', pro)) {
      setError(
        'Дневной лимит бесплатных голосовых распознаваний исчерпан (' +
          FREE_LIMITS.voice + ' в день). Premium снимает лимит — а ввести фразу ' +
          'текстом ниже можно всегда.'
      )
      return
    }
    try {
      const perm = await requestRecordingPermissionsAsync()
      if (!perm.granted) {
        setError('Нужно разрешение на микрофон (Настройки → Приложения → Expo Go)')
        // Сами открываем настройки телефона (отзыв Кати: переход сразу)
        openSettingsSoon()
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
        // Списываем ТОЛЬКО успешное распознавание
        useAiUsageStore.getState().record('voice')
        setHeard(data.text || '')
        setResults(data.items || [])
        // Тост о весе — только для одной позиции: при нескольких вес у
        // каждой свой и показывается прямо на карточках (отзыв Кати:
        // «где итоговый коллораж, как считались калории?»)
        if (data.grams && (data.items || []).length === 1) {
          toast({ title: `⚖️ Распознан вес: ${data.grams} г` })
        }
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

  // Убрать позицию из распознанного (крестик на карточке): нейросеть
  // иногда приписывает лишнее блюдо («Яйцо варёное» во фразе про грудку
  // с гречкой) — теперь лишнее удаляется одним тапом до записи в дневник
  function removeItem(i) {
    setResults((prev) => prev.filter((_, j) => j !== i))
  }

  // «Добавить всё в „Ужин“»: весь распознанный список — в дневник одной
  // кнопкой. Граммовка — распознанная (или типовая порция базы), калории
  // считаются как на экране порции: калорийность на 100 г × вес. Тап по
  // отдельной карточке по-прежнему открывает экран порции — там можно
  // поправить граммовку и добавить комментарий
  function addAll() {
    addAllOnce(() => {
      if (!results.length) return
      let totalKcal = 0
      for (const it of results) {
        // Формат как в SelectedFood: у ИИ и базы — kcal100, свои — kcal
        const baseItem = it.kcal100 != null ? it : toBuildItem(it)
        const food = buildFood(baseItem)
        const grams = Math.max(
          1,
          Math.min(2000, Math.round(Number(it.grams || it.defaultGrams || 100)) || 100)
        )
        const kcal = kcalForPortion(food, grams)
        totalKcal += kcal
        addEntry(mealId, { food, grams, kcal, desc: it.desc }, dayOff)
      }
      toast({
        title: `${results.length} ${pluralPositions(results.length)} — в «${mealName}»`,
        description: `≈ ${formatNum(totalKcal)} ккал${dayOff ? ' · записано за вчера' : ''}`,
      })
      onClose()
    })
  }

  const mmss = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

  return (
    <View className="flex-1">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
        <View className="mb-3 flex-row items-center gap-2">
          <Mic size={20} color={themeColors.accentSoft} />
          <Text className="font-bold text-[20px] text-bear-text">Голосовой ввод</Text>
        </View>

        <View className="items-center rounded-2xl border border-bear-line bg-bear-overlay py-6">
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
              colors={
                recording
                  ? ['#EF4444', '#B91C1C'] // запись — тревожный красный (семантика)
                  : [themeColors.accentBright, themeColors.accent]
              }
              style={{ transform: [{ scale: busy ? 0.9 : 1 }] }}
            >
              <View className="h-[76px] w-[76px] items-center justify-center rounded-full">
                {recording ? (
                  <Square size={28} color="#FFFFFF" />
                ) : (
                  <Mic size={32} color="#FFFFFF" />
                )}
              </View>
            </LinearGradient>
          </Pressable>
          <Text className="mt-3 font-semibold text-[17.5px] text-bear-text">
            {busy ? 'Распознаём…' : recording ? `Идёт запись · ${mmss}` : 'Нажмите и скажите'}
          </Text>
          <Text className="mt-1 px-6 text-center text-[15px] text-bear-sub">
            Например: «Тарелка овсянки 250 граммов»
          </Text>
        </View>

        {heard ? (
          <Text className="mt-3 text-[16.5px] text-bear-sub">Распознано: «{heard}»</Text>
        ) : null}

        {error ? (
          <Text className="mt-3 text-[16.5px] leading-[19px] text-bear-bad">{error}</Text>
        ) : null}

        {results.length > 0 && (
          <View className="mt-3 gap-2">
            <Text className="text-[13.5px] leading-[17px] text-bear-dim">
              Тап по блюду — своя граммовка и комментарий, крестик — убрать лишнее.
              Кнопка «Добавить всё» внизу запишет весь список сразу
            </Text>
            {results.map((it, i) => {
              // Итоговый калораж позиции: калорийность на 100 г × вес порции.
              // Вес не распознался — честно показываем «на 100 г» без итога
              const kcal = estimateItemKcal(it)
              return (
                <Pressable
                  key={`r${i}`}
                  onPress={() => onPick(it)}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.name}. Открыть порцию`}
                  className="flex-row items-center gap-2.5 rounded-2xl border border-bear-line bg-bear-overlay px-4 py-3 active:bg-bear-overlay2"
                >
                  <View className="min-w-0 flex-1">
                    <Text numberOfLines={1} className="font-semibold text-[18px] text-bear-text">
                      {it.name}
                    </Text>
                    <Text className="text-[15px] text-bear-sub">
                      {kcal != null
                        ? `≈ ${kcal} ккал · ${it.grams || it.defaultGrams} г`
                        : `${it.kcal100 ? `${it.kcal100} ккал / 100 г` : 'калорийность уточните'} · вес уточните`}
                      {it.source === 'off' ? ' · Open Food Facts' : ''}
                    </Text>
                  </View>
                  {/* Плюс — подсказка «карточку можно добавить» (отзыв
                      Кати: кнопки добавить не было видно) */}
                  <Plus size={18} color={themeColors.accentSoft} />
                  <Pressable
                    onPress={() => removeItem(i)}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel={`Убрать ${it.name} из списка`}
                    className="h-8 w-8 items-center justify-center rounded-full bg-bear-overlay2 active:opacity-60"
                  >
                    <X size={16} color={themeColors.sub} />
                  </Pressable>
                </Pressable>
              )
            })}

            {/* Итоговый калораж по всей фразе: сумма позиций с распознанным
                весом + расшифровка, как считали (отзыв Кати) */}
            {(() => {
              const kcalList = results.map(estimateItemKcal)
              const known = kcalList.filter((k) => k != null)
              if (!known.length) return null
              const total = known.reduce((s, k) => s + k, 0)
              const without = kcalList.length - known.length
              return (
                <View className="mt-1 rounded-2xl border border-bear-accentBorder bg-bear-accentFaint px-4 py-3">
                  <Text className="font-bold text-[17px] text-bear-text">
                    Итого по фразе: ≈ {total} ккал
                    {without ? ` (+${without} без веса)` : ''}
                  </Text>
                  <Text className="mt-0.5 text-[13.5px] leading-[17px] text-bear-sub">
                    Как считаем: калорийность на 100 г × вес порции. Граммовку
                    можно поправить на следующем шаге — цифры пересчитаются
                  </Text>
                </View>
              )
            })()}
          </View>
        )}

        <Text className="mt-3 text-[15px] leading-[18px] text-bear-sub">
          Голос распознаёт нейросеть. Если кнопка не сработала — введите фразу текстом ниже.
        </Text>

        {/* Остаток дневного лимита голоса: только для бесплатного тарифа;
            текстовый ввод ниже не лимитирован — дневник работает всегда */}
        {!pro ? (
          <Text className="mt-2 text-[13.5px] leading-[17px] text-bear-dim">
            {voiceLeft > 0
              ? `Голосовых распознаваний осталось сегодня: ${voiceLeft} из ${FREE_LIMITS.voice} · Premium — безлимит`
              : 'Дневной лимит голоса исчерпан — Premium — безлимит. Ввод текстом ниже работает как всегда.'}
          </Text>
        ) : null}
        <TextInput
          value={phrase}
          onChangeText={setPhrase}
          placeholder="Или введите фразу текстом…"
          placeholderTextColor={themeColors.dim}
          className="mt-2 rounded-2xl border border-bear-line bg-bear-overlay px-4 py-2.5 text-[17.5px] text-bear-text"
        />
        <Pressable
          onPress={recognizeTyped}
          disabled={busy || !phrase.trim()}
          className={`mt-2 items-center rounded-2xl border border-bear-line bg-bear-overlay py-3 active:bg-bear-overlay2 ${busy || !phrase.trim() ? 'opacity-50' : ''}`}
        >
          <Text className="font-semibold text-[17.5px] text-bear-text">
            Распознать текстом ↓
          </Text>
        </Pressable>
      </ScrollView>

      {/* ЗАКРЕПЛЁННАЯ кнопка «Добавить всё»: живёт вне прокрутки, поэтому
          видна и при длинном списке распознанного (отзыв Кати 27.11:
          «текст распознает, но отсутствует кнопка добавить»). Цвет —
          акцент темы, как у «Добавить в „Ужин“» на экране порции */}
      {results.length > 0 && (
        <View className="border-t border-bear-line pt-3">
          <Pressable
            onPress={addAll}
            accessibilityRole="button"
            accessibilityLabel={`Добавить все распознанные блюда в приём пищи ${mealName}`}
            className="rounded-2xl py-3.5 active:opacity-80"
            style={{ backgroundColor: themeColors.accent }}
          >
            <Text className="text-center font-bold text-[19px]" style={{ color: themeColors.accentOn }}>
              {dayOff ? `Добавить всё за вчера в «${mealName}»` : `Добавить всё в «${mealName}»`}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}
