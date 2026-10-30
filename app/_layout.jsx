// Корневой макет: шрифты Inter и тосты.
// Пока онбординг не завершён — показываем флоу онбординга вместо
// приложения (как в веб-версии: status !== 'done').

import '../global.css'

import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter'
import { ToastProvider } from '@/components/ui/Toast'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { startRolloverWatcher } from '@/lib/rollover'
import { startReminderAgent } from '@/lib/reminders'

// Гидратация persist-стора онбординга из AsyncStorage
function useOnboardingHydrated() {
  const [hydrated, setHydrated] = useState(
    () => useOnboardingStore.persist.hasHydrated()
  )
  useEffect(() => {
    const unsub = useOnboardingStore.persist.onFinishHydration(() =>
      setHydrated(true)
    )
    if (useOnboardingStore.persist.hasHydrated()) setHydrated(true)
    return unsub
  }, [])
  return hydrated
}

function SplashBear() {
  // Нейтральный экран, пока восстанавливаются данные (без мигания)
  return (
    <View className="flex-1 items-center justify-center bg-bear-bg">
      <Text className="text-[56px]">🐻</Text>
    </View>
  )
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  })
  const hydrated = useOnboardingHydrated()
  const obStatus = useOnboardingStore((s) => s.status)

  useEffect(() => {
    if (error) console.warn('Шрифты не загрузились:', error)
  }, [error])

  // Авто-переход на новый день: при запуске, возврате из фона и через полночь
  useEffect(() => startRolloverWatcher(), [])

  // Агент напоминаний: планирует уведомления о воде и приёмах пищи
  useEffect(() => startReminderAgent(), [])

  if (!loaded || !hydrated) return <SplashBear />

  // Онбординг не завершён — флоу вместо приложения
  if (obStatus !== 'done') {
    return (
      <ToastProvider>
        <StatusBar style="light" />
        <OnboardingFlow />
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A1020' } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ToastProvider>
  )
}
