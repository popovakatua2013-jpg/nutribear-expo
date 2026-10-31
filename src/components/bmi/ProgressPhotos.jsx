// Карточка «Фото прогресса» во вкладке «ИМТ»: снимки тела до/после —
// видеть прогресс глазами, а не только цифрой на весах. Фото хранятся
// только на устройстве (папка приложения), попадают в резервную копию
// и стираются кнопкой «Стереть все данные».
// Кнопка «+» предлагает камеру или галерею; снимок обрезается в квадрат
// (ровное сравнение) и ужимается до 720 px.

import { useState } from 'react'
import { Alert, Image, Modal, Pressable, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Trash2, X } from 'lucide-react-native'
import { useProgressPhotosStore } from '@/store/useProgressPhotosStore'
import { deletePhotoFile, savePhoto } from '@/lib/photos'
import { useToast } from '../ui/Toast'

const MAX = 1.25

// «24.10» из ISO-даты
const shortDay = (iso) =>
  new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })

export function ProgressPhotos() {
  const items = useProgressPhotosStore((s) => s.items)
  const addPhoto = useProgressPhotosStore((s) => s.addPhoto)
  const removePhoto = useProgressPhotosStore((s) => s.removePhoto)
  const { toast } = useToast()
  const [preview, setPreview] = useState(null) // фото в полноэкранном просмотре

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

  function removePreview() {
    if (!preview) return
    Alert.alert('Удалить фото?', 'Снимок будет удалён с устройства безвозвратно.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: () => {
          deletePhotoFile(preview.uri)
          removePhoto(preview.id)
          setPreview(null)
          toast({ title: '🗑 Фото удалено' })
        },
      },
    ])
  }

  return (
    <View
      accessibilityLabel="Фото прогресса"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Фото прогресса
        </Text>
        <Pressable
          onPress={onAdd}
          accessibilityLabel="Добавить фото прогресса"
          accessibilityRole="button"
          className="h-7 w-7 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Camera size={15} color="rgba(255,255,255,0.8)" />
        </Pressable>
      </View>

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
            <Text maxFontSizeMultiplier={MAX} className="mt-1.5 font-semibold text-[11px] text-bear-soft">
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
            <Text maxFontSizeMultiplier={MAX} className="mt-1.5 font-semibold text-[11px] text-[#8DABFF]">
              Сейчас · {shortDay(newest.date)}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Вся лента снимков: тап — просмотр и удаление */}
      {items.length > 0 ? (
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
      ) : (
        <Text maxFontSizeMultiplier={MAX} className="mt-2 font-sans text-[11.5px] leading-snug text-bear-sub2">
          Снимайте фигуру раз в пару недель в одном и том же ракурсе —
          здесь появится сравнение «до/после». Фото остаются только на
          вашем устройстве.
        </Text>
      )}

      {/* Полноэкранный просмотр снимка */}
      <Modal visible={Boolean(preview)} transparent animationType="fade" onRequestClose={() => setPreview(null)}>
        <View className="flex-1 bg-black/90 px-5 pt-12 pb-8">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-[13px] text-white/80">
              {preview ? `Фото · ${shortDay(preview.date)}` : ''}
            </Text>
            <Pressable
              onPress={() => setPreview(null)}
              accessibilityLabel="Закрыть фото"
              className="rounded-full bg-white/10 p-2"
            >
              <X size={20} color="#FFFFFF" />
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
            accessibilityLabel="Удалить фото"
            accessibilityRole="button"
            className="mt-4 flex-row items-center justify-center gap-2 rounded-2xl border border-rose-400/30 bg-rose-400/10 py-3 active:opacity-80"
          >
            <Trash2 size={17} color="#fb7185" />
            <Text className="font-bold text-[13px] text-rose-300">Удалить фото</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  )
}
