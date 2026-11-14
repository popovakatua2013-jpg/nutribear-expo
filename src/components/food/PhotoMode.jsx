// Живой режим «Сканер» и «Галерея»: фото блюда → нейросеть напрямую
// (ключ и адрес — в src/lib/ai-config.js) → результат в SelectedFood.
// source: 'camera' — камера, 'library' — галерея телефона.
// При первом входе в «Сканер еды» показывается обучающее окно
// «Как фотографировать еду» (образец — окно конкурента, скриншот Кати
// от 11.11): от качества фото зависит точность распознавания.
// ОФЛАЙН-ОЧЕРЕДЬ (отзыв Кирилла из RuStore, скриншот Кати от 11.11:
// «опять прошу программу поддерживала офлайн съёмку, после подключения
// к сети чтобы фото автоматически отправлялись на анализ»): если сети
// нет, фото уходит в usePhotoQueueStore — как только интернет
// появляется, первое фото из очереди распознаётся само, без тапа,
// и открывается обычное окно подтверждения порции. Приоритет — у фото,
// снятого вручную прямо сейчас; очередь обрабатывается по одному
// фото за вход, чтобы не заваливать пользователя горой результатов.

import { useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, CloudUpload, Images, Info, RefreshCcw, ScanSearch } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { scanFoodImage, isOfflineError } from '@/lib/food-ai'
import { openSettingsSoon } from '@/lib/appSettings'
import { useIsOnline } from '@/lib/useIsOnline'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useProStore } from '@/store/useProStore'
import { useAiUsageStore, aiRemaining } from '@/store/useAiUsageStore'
import { usePhotoQueueStore, MAX_ATTEMPTS } from '@/store/usePhotoQueueStore'
import { PhotoGuideModal } from './PhotoGuideModal'

export function PhotoMode({ source, onPick }) {
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  // Мягкое синее сообщение о работе очереди — отдельно от красных ошибок
  const [note, setNote] = useState('')

  // Живой статус сети и очередь офлайн-фото
  const online = useIsOnline()
  const queued = usePhotoQueueStore((s) => s.items)
  const addToQueue = usePhotoQueueStore((s) => s.add)
  const removeQueued = usePhotoQueueStore((s) => s.remove)
  const markFailedQueued = usePhotoQueueStore((s) => s.markFailed)
  // Защита от двойного запуска автопрогонки (эффект перезапускается
  // на каждое изменение очереди/сети/занятости)
  const runningRef = useRef(false)

  // Обучающее окно «Как фотографировать еду»
  const photoGuideSeen = useUiPrefsStore((s) => s.photoGuideSeen)
  const setPhotoGuideSeen = useUiPrefsStore((s) => s.setPhotoGuideSeen)
  const [guideOpen, setGuideOpen] = useState(false)

  // Дневной лимит ИИ-фото (этап 1 монетизации): общий пул «блюдо +
  // этикетка», бесплатно 3 в день; Premium — безлимит. Автопрогонка
  // очереди тоже тратит запросы — подчиняется тому же лимиту
  const pro = useProStore((s) => s.pro)
  const photoLeft = useAiUsageStore((s) => aiRemaining(s, 'photo', pro))

  // Автопоказ — один раз на устройство, только при входе в «Сканер еды»
  // (подсказки про съёмку; в галерее их вызывают кнопкой ниже). Флаг в
  // useUiPrefsStore — переживает перезапуск приложения.
  useEffect(() => {
    if (source === 'camera' && !photoGuideSeen) setGuideOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function closeGuide() {
    setGuideOpen(false)
    setPhotoGuideSeen(true) // больше не показываем автоматически
  }

  const isCamera = source === 'camera'
  const Icon = isCamera ? Camera : Images

  async function pickPhoto() {
    setError('')
    const perm = isCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError(isCamera
        ? 'Нужно разрешение на камеру (Настройки → Приложения → Expo Go)'
        : 'Нужно разрешение на фото (Настройки → Приложения → Expo Go)')
      // Сами открываем настройки телефона (отзыв Кати: переход сразу)
      openSettingsSoon()
      return
    }
    const res = isCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.4, exif: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.4,
          exif: false,
        })
    if (!res.canceled && res.assets?.[0]?.uri) {
      setPhoto(res.assets[0].uri)
    }
  }

  async function recognize() {
    if (!photo || busy) return
    const usage = useAiUsageStore.getState()
    if (!usage.canUse('photo', pro)) {
      setError(
        'Дневной лимит бесплатных распознаваний фото исчерпан (3 в день). ' +
          'Premium снимает лимит: безлимитный чат, фото и голос. ' +
          'Записи в дневник без ИИ работают как всегда.'
      )
      return
    }
    setBusy(true)
    setError('')
    setNote('')
    try {
      const items = await scanFoodImage(photo)
      // Списываем ТОЛЬКО успешное распознавание
      useAiUsageStore.getState().record('photo')
      onPick(items[0])
    } catch (e) {
      if (isOfflineError(e)) {
        // Сети нет: снимок не пропадает — уходит в очередь и распознается
        // сам при появлении интернета (отзыв Кирилла из RuStore)
        const added = addToQueue(photo)
        setPhoto(null)
        setNote(
          added
            ? 'Нет интернета — фото сохранено в очередь. Как только сеть появится, приложение само его распознает.'
            : 'Нет интернета — это фото уже ждёт в очереди. Приложение само распознает его при появлении сети.'
        )
      } else {
        setError(String(e?.message || e))
      }
    } finally {
      setBusy(false)
    }
  }

  // Автопрогонка очереди: экран пуст, сеть есть, в очереди есть фото,
  // которому пора на распознавание → распознаём само, без тапа. Один
  // успех за вход: onPick открывает окно подтверждения порции, остальные
  // фото дождутся следующего входа в сканер. Сетевая ошибка попытку не
  // тратит — фото просто остаётся в очереди до возвращения сети;
  // прочие ошибки считаем в attempts и откладываем повтор на полторы
  // минуты (каждый запрос стоит денег — тем же фото не долбим), после
  // MAX_ATTEMPTS фото покидает очередь
  const [queueTick, setQueueTick] = useState(0)

  useEffect(() => {
    if (!online || busy || photo || runningRef.current) return
    if (!queued.length) return
    // Лимит исчерпан (free) — очередь подождёт: каждый автозапрос стоит
    // денег, завтра лимит обновится и очередь сама распознается
    if (!useAiUsageStore.getState().canUse('photo', pro)) return
    // первое фото, которому пора (после не-сетевой ошибки повтор
    // разрешён не раньше nextAttemptAt)
    const now = Date.now()
    const next = queued.find((it) => !it.nextAttemptAt || now >= it.nextAttemptAt)
    if (!next) {
      // все фото «пержат» — самый ранний retry дёрнет тик, и эффект
      // пересмотрит очередь
      const earliest = Math.min(
        ...queued.map((it) => it.nextAttemptAt || 0).filter(Boolean)
      )
      const timer = setTimeout(
        () => setQueueTick((x) => x + 1),
        Math.max(1000, earliest - now)
      )
      return () => clearTimeout(timer)
    }
    runningRef.current = true
    ;(async () => {
      try {
        setPhoto(next.uri)
        setNote('Распознаём фото из очереди…')
        try {
          const items = await scanFoodImage(next.uri)
          removeQueued(next.id)
          setNote('')
          onPick(items[0])
        } catch (e) {
          if (isOfflineError(e)) {
            // сеть пропала во время распознавания — фото остаётся в очереди
            setPhoto(null)
            setNote('Интернет пропал — фото осталось в очереди, распознаем при появлении сети')
          } else {
            markFailedQueued(next.id)
            if ((next.attempts || 0) + 1 >= MAX_ATTEMPTS) {
              removeQueued(next.id)
              setPhoto(null)
              setNote('')
              setError(`Фото из очереди не удалось распознать (${String(e?.message || e)}) — оно удалено из очереди`)
            } else {
              setPhoto(null)
              setNote('Фото из очереди пока не распозналось — попробуем ещё раз через минуту-другую')
            }
          }
        }
      } finally {
        runningRef.current = false
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, queued, photo, busy, queueTick, pro, photoLeft])

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
      <View className="mb-3 flex-row items-center gap-2">
        <Icon size={20} color="#7DD3FC" />
        <Text className="font-bold text-[20px] text-bear-text">
          {isCamera ? 'Сканер еды' : 'Фото из галереи'}
        </Text>
      </View>

      {photo ? (
        <View>
          <Image
            source={{ uri: photo }}
            className="h-[200px] w-full rounded-2xl border border-white/10"
            resizeMode="cover"
          />
          <Text className="mt-2 text-[15px] leading-[17px] text-bear-sub">
            Проверьте фото перед отправкой: если блюдо не в кадре или снимок размыт —
            нажмите «Другое фото» и переснимите.
          </Text>
        </View>
      ) : (
        <View className="h-[200px] w-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03]">
          <ScanSearch size={36} color="#8B96B8" />
          <Text className="mt-2 px-6 text-center text-[16.5px] text-bear-sub">
            Сфотографируйте блюдо — ИИ определит продукт и калорийность
          </Text>
          {/* Кнопка повторного вызова обучающего окна (отзыв Кати:
              подсказки со скриншота конкурента должны быть всегда доступны) */}
          <Pressable
            onPress={() => setGuideOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Как фотографировать еду: открыть подсказку"
            className="mt-2.5 flex-row items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3.5 py-2 active:bg-white/10"
          >
            <Info size={14} color="#7DD3FC" />
            <Text className="font-semibold text-[14.5px] text-bear-sub">
              Как фотографировать?
            </Text>
          </Pressable>
        </View>
      )}

      {error ? (
        <Text className="mt-3 text-[16.5px] leading-[19px] text-[#f87171]">{error}</Text>
      ) : null}
      {note ? (
        <Text className="mt-3 text-[15.5px] leading-[19px] text-[#93C5FD]">{note}</Text>
      ) : null}

      {/* Остаток дневного лимита ИИ-фото: только для бесплатного тарифа */}
      {!pro ? (
        <Text className="mt-3 text-[14.5px] leading-[18px] text-bear-dim">
          {photoLeft > 0
            ? `ИИ-распознаваний фото осталось сегодня: ${photoLeft} из 3 · Premium — безлимит`
            : 'Дневной лимит ИИ-фото исчерпан — Premium — безлимит. Ввод без ИИ (поиск, штрих-код, свои продукты) работает как всегда.'}
        </Text>
      ) : null}

      {/* Очередь офлайн-фото: сколько ждёт и что с ней будет (отзыв
          Кирилла из RuStore — «офлайн съёмка, после подключения к сети
          чтобы фото автоматически отправлялись на анализ») */}
      {queued.length > 0 && (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl border border-[#7B6CF6]/30 bg-[#7B6CF6]/10 px-3.5 py-2.5">
          <CloudUpload size={16} color="#C4B5FD" />
          <Text
            numberOfLines={3}
            maxFontSizeMultiplier={1.2}
            className="min-w-0 flex-1 font-sans text-[14px] leading-[18px] text-bear-sub"
          >
            {`В очереди: ${queued.length} фото — распознаем автоматически, как только появится интернет`}
          </Text>
        </View>
      )}

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={pickPhoto}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 active:bg-white/10"
        >
          <RefreshCcw size={18} color="#AEB9D9" />
          <Text className="font-semibold text-[17.5px] text-bear-text">
            {photo ? 'Другое фото' : isCamera ? 'Сделать фото' : 'Выбрать фото'}
          </Text>
        </Pressable>
        <Pressable
          onPress={recognize}
          disabled={!photo || busy}
          className={`flex-1 overflow-hidden rounded-2xl ${!photo || busy ? 'opacity-40' : ''}`}
        >
          {/* раскладка — только через style: className на сторонних
              компонентах (expo-linear-gradient) NativeWind не применяет */}
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 14,
            }}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ScanSearch size={18} color="#FFFFFF" />
            )}
            <Text className="font-bold text-[17.5px] text-white">
              {busy ? 'Распознаём…' : 'Распознать'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Text className="mt-3 text-[15px] leading-[18px] text-bear-sub">
        Фото отправляется нейросети прямо с телефона. Нет интернета — фото
        сохранится в очередь: приложение само распознает его, когда сеть
        появится.
      </Text>

      {/* Обучающее окно «Как фотографировать еду» */}
      <PhotoGuideModal visible={guideOpen} onClose={closeGuide} />
    </ScrollView>
  )
}
