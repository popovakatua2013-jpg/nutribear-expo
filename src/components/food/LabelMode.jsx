// Режим «Этикетка»: фото таблицы пищевой ценности с упаковки →
// нейросеть читает строки «на 100 г» → значения подставляются в
// экран подтверждения порции. Точнее, чем распознавание всего блюда.

import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Images, RefreshCcw, ScanSearch } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { scanNutritionLabel } from '@/lib/food-ai'
import { useToast } from '../ui/Toast'

export function LabelMode({ onPick }) {
  const { toast } = useToast()
  const [photo, setPhoto] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function pickPhoto(useCamera) {
    setError('')
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!perm.granted) {
      setError(
        useCamera
          ? 'Нужно разрешение на камеру (Настройки → Приложения → Expo Go)'
          : 'Нужно разрешение на фото (Настройки → Приложения → Expo Go)'
      )
      return
    }
    const res = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.5, exif: false })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.5,
          exif: false,
        })
    if (res.canceled || !res.assets?.[0]?.uri) return
    const uri = res.assets[0].uri
    setPhoto(uri)
    await recognize(uri)
  }

  async function recognize(uri) {
    setBusy(true)
    setError('')
    try {
      const item = await scanNutritionLabel(uri)
      toast({
        title: '🏷️ Этикетка распознана',
        description: `${item.name}: ${item.kcal100} ккал / 100 г — проверьте значения`,
      })
      onPick(item)
    } catch (e) {
      setError(e?.message || 'Не удалось прочитать этикетку — попробуйте ещё раз')
    } finally {
      setBusy(false)
    }
  }

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 12 }} showsVerticalScrollIndicator={false}>
      <Text className="px-1 font-sans text-[12px] leading-[17px] text-bear-sub">
        Сфотографируйте таблицу пищевой ценности с упаковки — калории и БЖУ на 100 г
        подставятся сами. Распознанные значения можно поправить перед добавлением.
      </Text>

      {!photo ? (
        <View className="mt-3 gap-2">
          <Pressable
            onPress={() => pickPhoto(true)}
            accessibilityRole="button"
            accessibilityLabel="Снять этикетку камерой"
            className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 active:bg-white/10"
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: '#0EA5E9' }}
            >
              <Camera size={17} color="#FFFFFF" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[13px] text-bear-text">Снять этикетку</Text>
              <Text className="font-sans text-[11px] text-bear-sub">Камера — таблицу крупным планом</Text>
            </View>
          </Pressable>
          <Pressable
            onPress={() => pickPhoto(false)}
            accessibilityRole="button"
            accessibilityLabel="Выбрать фото этикетки из галереи"
            className="flex-row items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 active:bg-white/10"
          >
            <View
              className="h-9 w-9 items-center justify-center rounded-xl"
              style={{ backgroundColor: '#0EA5E9' }}
            >
              <Images size={17} color="#FFFFFF" />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[13px] text-bear-text">Из галереи</Text>
              <Text className="font-sans text-[11px] text-bear-sub">Уже снятое фото упаковки</Text>
            </View>
          </Pressable>
        </View>
      ) : (
        <View className="mt-3">
          <Image
            source={{ uri: photo }}
            style={{ width: '100%', height: 200, borderRadius: 16 }}
            resizeMode="cover"
          />
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            colors={['#0EA5E9', '#2563EB']}
            style={{ position: 'absolute', top: 10, left: 10, borderRadius: 10, padding: 6 }}
          >
            <ScanSearch size={16} color="#FFFFFF" />
          </LinearGradient>
        </View>
      )}

      {busy && (
        <View className="mt-4 flex-row items-center justify-center gap-2">
          <ActivityIndicator color="#38BDF8" />
          <Text className="font-sans text-[12.5px] text-bear-sub">Читаем этикетку…</Text>
        </View>
      )}

      {error ? (
        <View className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
          <Text className="font-sans text-[12px] leading-[17px] text-bear-text">{error}</Text>
          <Pressable
            onPress={() => recognize(photo)}
            accessibilityRole="button"
            accessibilityLabel="Повторить распознавание"
            className="mt-2 flex-row items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2 active:bg-white/10"
          >
            <RefreshCcw size={13} color="#AEB9D9" />
            <Text className="font-semibold text-[12px] text-bear-soft">Попробовать ещё раз</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  )
}
