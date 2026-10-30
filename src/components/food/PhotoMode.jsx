// Живой режим «Сканер» и «Галерея»: фото блюда → нейросеть напрямую
// (ключ и адрес — в src/lib/ai-config.js) → результат в SelectedFood.
// source: 'camera' — камера, 'library' — галерея телефона.

import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Images, RefreshCcw, ScanSearch } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { scanFoodImage } from '@/lib/food-ai'

export function PhotoMode({ source, onPick }) {
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

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
    setBusy(true)
    setError('')
    try {
      const items = await scanFoodImage(photo)
      onPick(items[0])
    } catch (e) {
      setError(String(e?.message || e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
      <View className="mb-3 flex-row items-center gap-2">
        <Icon size={18} color="#7DD3FC" />
        <Text className="font-bold text-[15px] text-bear-text">
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
          <Text className="mt-2 text-[11px] leading-[15px] text-bear-sub">
            Проверьте фото перед отправкой: если блюдо не в кадре или снимок размыт —
            нажмите «Другое фото» и переснимите.
          </Text>
        </View>
      ) : (
        <View className="h-[200px] w-full items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/[0.03]">
          <ScanSearch size={34} color="#8B96B8" />
          <Text className="mt-2 px-6 text-center text-[12px] text-bear-sub">
            Сфотографируйте блюдо — ИИ определит продукт и калорийность
          </Text>
        </View>
      )}

      {error ? (
        <Text className="mt-3 text-[12px] leading-[17px] text-[#f87171]">{error}</Text>
      ) : null}

      <View className="mt-4 flex-row gap-2">
        <Pressable
          onPress={pickPhoto}
          className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-3.5 active:bg-white/10"
        >
          <RefreshCcw size={16} color="#AEB9D9" />
          <Text className="font-semibold text-[13px] text-bear-text">
            {photo ? 'Другое фото' : isCamera ? 'Сделать фото' : 'Выбрать фото'}
          </Text>
        </Pressable>
        <Pressable
          onPress={recognize}
          disabled={!photo || busy}
          className={`flex-1 overflow-hidden rounded-2xl ${!photo || busy ? 'opacity-40' : ''}`}
        >
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['#4D7CFE', '#A45BFF']}
            className="flex-row items-center justify-center gap-2 py-3.5"
          >
            {busy ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <ScanSearch size={16} color="#FFFFFF" />
            )}
            <Text className="font-bold text-[13px] text-white">
              {busy ? 'Распознаём…' : 'Распознать'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      <Text className="mt-3 text-[11px] leading-[16px] text-bear-sub">
        Фото отправляется нейросети прямо с телефона — нужен интернет.
        Ключ хранится в файле .env в корне проекта и не публикуется на GitHub.
      </Text>
    </ScrollView>
  )
}
