// Карточка «Фото прогресса» во вкладке «Тело»: снимки тела до/после —
// видеть прогресс глазами, а не только цифрой на весах. Фото хранятся
// только на устройстве (папка приложения), попадают в резервную копию
// и стираются кнопкой «Стереть все данные».
// Фото свёрнуты по умолчанию (запрос: постоянно висящие снимки
// раздражают) — вместо них строка «N фото скрыто · последнее …» с
// крошечным превью-квадратиком последнего снимка слева от текста:
// сразу понятно, что именно скрыто (запрос пользователя); тап по
// заголовку или строке разворачивает ленту. При добавлении
// нового снимка лента разворачивается сама — видно результат.
// Кнопка «+» предлагает камеру или галерею; снимок обрезается в квадрат
// (ровное сравнение) и ужимается до 720 px. Удаление — двойным тапом
// по кнопке в просмотре (без Alert-окна).

import { useEffect, useRef, useState } from 'react'
import { Alert, Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { LinearGradient } from 'expo-linear-gradient'
import { Camera, ChevronDown, ChevronRight, Trash2, X } from 'lucide-react-native'
import { useProgressPhotosStore } from '@/store/useProgressPhotosStore'
import { deletePhotoFile, savePhoto } from '@/lib/photos'
import { useToast } from '../ui/Toast'

const MAX = 1.25

// Поверхность — та же фиолетовая (bodyCard + bodyLine), что у остальных
// блоков «Тела»: карточка больше не выбивается navy-фоном
const CARD = {
  backgroundColor: 'rgba(29,18,64,0.82)',
  borderColor: 'rgba(168,85,247,0.30)',
  borderWidth: 1,
}

// Сколько секунд кнопка удаления ждёт второй тап, прежде чем сброситься
const DELETE_CONFIRM_MS = 2600

// «24.10» из ISO-даты
const shortDay = (iso) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

export function ProgressPhotos() {
  const items = useProgressPhotosStore((s) => s.items)
  const addPhoto = useProgressPhotosStore((s) => s.addPhoto)
  const removePhoto = useProgressPhotosStore((s) => s.removePhoto)
  const { toast } = useToast()
  const [preview, setPreview] = useState(null) // фото в полноэкранном просмотре
  // Лента свёрнута по умолчанию: снимки не висят на виду постоянно.
  // Разворачивается тапом по заголовку/строке-сводке и при добавлении фото
  const [expanded, setExpanded] = useState(false)
  // Удаление двойным тапом вместо Alert: первый тап — кнопка просит
  // «нажмите ещё раз», второй — удаляет. Смена фото/закрытие — сброс
  const [confirmDel, setConfirmDel] = useState(false)
  const delTimer = useRef(null)

  const newest = items[0]
  const oldest = items.length > 1 ? items[items.length - 1] : null

  async function pick(source) {
    // Разрешения просим заранее — с человеческим объяснением
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm?.granted) {
        toast({
          title: 'Нужно разрешение',
          description:
            source === 'camera'
              ? 'Разрешите доступ к камере в настройках телефона'
              : 'Разрешите доступ к фото в настройках телефона',
        })
        return
      }
    } catch {
      // запрос не поддерживается (например, веб) — пробуем открыть как есть
    }
    const opts = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    }
    const req =
      source === 'camera'
        ? ImagePicker.launchCameraAsync(opts)
        : ImagePicker.launchImageLibraryAsync(opts)
    req
      .then(async (res) => {
        if (res.canceled) return
        const uri = res.assets?.[0]?.uri
        if (!uri) return
        try {
          const saved = await savePhoto(uri)
          addPhoto(saved)
          setExpanded(true) // только что снятое видно сразу — лента разворачивается
          toast({
            title: '📸 Фото добавлено',
            description: items.length === 0 ? 'Это ваше фото «до» — продолжайте!' : undefined,
          })
        } catch {
          toast({ title: 'Не удалось сохранить фото' })
        }
      })
      .catch(() => toast({ title: 'Не удалось открыть камеру или галерею' }))
  }

  function onAdd() {
    Alert.alert('Добавить фото', undefined, [
      { text: 'Камера', onPress: () => pick('camera') },
      { text: 'Из галереи', onPress: () => pick('library') },
      { text: 'Отмена', style: 'cancel' },
    ])
  }

  // Смена фото в просмотре — сбрасываем состояние «нажмите ещё раз»
  useEffect(() => {
    setConfirmDel(false)
    return () => {
      if (delTimer.current) clearTimeout(delTimer.current)
    }
  }, [preview?.id])

  function removePreview() {
    if (!preview) return
    if (!confirmDel) {
      // Первый тап: предупреждаем на самой кнопке и даём пару секунд
      setConfirmDel(true)
      if (delTimer.current) clearTimeout(delTimer.current)
      delTimer.current = setTimeout(() => setConfirmDel(false), DELETE_CONFIRM_MS)
      return
    }
    if (delTimer.current) clearTimeout(delTimer.current)
    setConfirmDel(false)
    deletePhotoFile(preview.uri)
    removePhoto(preview.id)
    setPreview(null)
    toast({ title: '🗑 Фото удалено' })
  }

  return (
    <View
      accessibilityLabel="Фото прогресса"
      className="rounded-3xl p-5"
      style={CARD}
    >
      <View className="flex-row items-center justify-between gap-2">
        {/* Заголовок — тап разворачивает/сворачивает ленту (когда есть фото) */}
        <Pressable
          onPress={() => items.length > 0 && setExpanded((v) => !v)}
          disabled={items.length === 0}
          accessibilityRole={items.length > 0 ? 'button' : undefined}
          accessibilityLabel={
            items.length > 0
              ? expanded
                ? 'Свернуть фото прогресса'
                : `Развернуть фото прогресса: ${items.length} фото`
              : 'Фото прогресса'
          }
          className="min-w-0 flex-1 flex-row items-center gap-1.5 active:opacity-70"
        >
          <Text className="font-bold text-[18px] tracking-tight text-bear-text">
            Фото прогресса
          </Text>
          {items.length > 0 &&
            (expanded ? (
              <ChevronDown size={18} color="#8B96B8" />
            ) : (
              <ChevronRight size={18} color="#8B96B8" />
            ))}
        </Pressable>
        {/* Крупная цветная кнопка фотоаппарата — заметная, как главная
            кнопка карточки (раньше была серой 28px и терялась) */}
        <Pressable
          onPress={onAdd}
          accessibilityLabel="Добавить фото прогресса"
          accessibilityRole="button"
          className="h-11 w-11 items-center justify-center overflow-hidden rounded-full active:opacity-80"
          style={{
            elevation: 5,
            shadowColor: '#8B5CF6',
            shadowOpacity: 0.5,
            shadowRadius: 9,
          }}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['#A855F7', '#7C3AED']}
            style={[StyleSheet.absoluteFillObject, { borderRadius: 22 }]}
          />
          <Camera size={23} color="#FFFFFF" strokeWidth={2.2} />
        </Pressable>
      </View>

      {/* Свёрнуто: вместо снимков — тихая строка-сводка с крошечным
          превью последнего снимка: понятно, что именно скрыто */}
      {items.length > 0 && !expanded ? (
        <Pressable
          onPress={() => setExpanded(true)}
          accessibilityRole="button"
          accessibilityLabel="Показать фото прогресса"
          className="mt-3 flex-row items-center gap-2.5 rounded-2xl border border-white/5 bg-white/[0.03] px-3 py-2 active:opacity-70"
        >
          {/* Крошечный превью-квадратик последнего снимка (34 px) */}
          <Image
            source={{ uri: newest.uri }}
            accessibilityLabel="Превью последнего фото"
            style={{ width: 34, height: 34, borderRadius: 10 }}
            resizeMode="cover"
          />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="min-w-0 flex-1 font-sans text-[14px] text-bear-sub2"
          >
            {items.length === 1
              ? `1 фото скрыто · снято ${shortDay(newest.date)}`
              : `${items.length} фото скрыто · последнее ${shortDay(newest.date)}`}
          </Text>
          <Text className="shrink-0 font-semibold text-[13px] text-[#8DABFF]">Показать</Text>
        </Pressable>
      ) : items.length > 0 ? (
        <>
          {/* Сравнение до/после: самое старое и самое свежее фото */}
          {oldest && newest && oldest.id !== newest.id ? (
        <View className="mt-3 flex-row gap-2.5">
          <View className="min-w-0 flex-1">
            <Image
              source={{ uri: oldest.uri }}
              accessibilityLabel="Фото до"
              style={{ width: '100%', aspectRatio: 1, borderRadius: 14 }}
              resizeMode="cover"
            />
            <Text maxFontSizeMultiplier={MAX} className="mt-1.5 font-semibold text-[13px] text-bear-soft">
              До · {shortDay(oldest.date)}
            </Text>
          </View>
          <View className="min-w-0 flex-1">
            <Image
              source={{ uri: newest.uri }}
              accessibilityLabel="Фото сейчас"
              style={{ width: '100%', aspectRatio: 1, borderRadius: 14 }}
              resizeMode="cover"
            />
            <Text maxFontSizeMultiplier={MAX} className="mt-1.5 font-semibold text-[13px] text-[#8DABFF]">
              Сейчас · {shortDay(newest.date)}
            </Text>
          </View>
        </View>
      ) : null}

          {/* Вся лента снимков: тап — просмотр и удаление */}
          <View className="mt-3 flex-row flex-wrap" style={{ gap: 6 }}>
            {items.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => setPreview(p)}
                accessibilityLabel={`Фото от ${shortDay(p.date)} — открыть`}
                style={{ width: '31%', aspectRatio: 1 }}
                className="overflow-hidden rounded-xl active:opacity-80"
              >
                <Image source={{ uri: p.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <Text maxFontSizeMultiplier={MAX} className="mt-2 font-sans text-[14px] leading-snug text-bear-sub2">
          Снимайте фигуру раз в пару недель в одном и том же ракурсе —
          здесь появится сравнение «до/после». Фото остаются только на
          вашем устройстве и не видны, пока вы сами их не откроете.
        </Text>
      )}

      {/* Полноэкранный просмотр снимка */}
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View className="flex-1 bg-black/90 px-5 pt-12 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-[15.5px] text-white/80">
              {preview ? `Фото · ${shortDay(preview.date)}` : ''}
            </Text>
            <Pressable
              onPress={() => setPreview(null)}
              accessibilityLabel="Закрыть фото"
              className="rounded-full bg-white/10 p-2"
            >
              <X hitSlop={10} size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          {preview ? (
            <Image
              source={{ uri: preview.uri }}
              style={{ flex: 1, borderRadius: 18, marginTop: 12 }}
              resizeMode="contain"
            />
          ) : null}
          <Pressable
            onPress={removePreview}
            accessibilityLabel={
              confirmDel ? 'Нажмите ещё раз, чтобы удалить фото' : 'Удалить фото'
            }
            accessibilityRole="button"
            className={`mt-4 flex-row items-center justify-center gap-2 rounded-2xl py-3 active:opacity-80 ${
              confirmDel
                ? 'border border-rose-400 bg-rose-400/25'
                : 'border border-rose-400/30 bg-rose-400/10'
            }`}
          >
            <Trash2 size={19} color="#fb7185" />
            <Text className="font-bold text-[15.5px] text-rose-300">
              {confirmDel ? 'Точно удалить? Нажмите ещё раз' : 'Удалить фото'}
            </Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}
