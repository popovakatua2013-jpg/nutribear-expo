// Корневой макет: шрифты Inter и тосты.
// Пока онбординг не завершён — показываем флоу онбординга вместо
// приложения (как в веб-версии: status !== 'done').

import '../global.css'

import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
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
import { startPedometerAgent } from '@/lib/pedometer'

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

// Экран-диагностика: если при запуске что-то упало, показываем
// человеческое объяснение с шагами вместо системного
// «Something went wrong». Зависимостей у экрана минимум —
// только react-native, чтобы он работал даже когда сломалось
// что-то из библиотек приложения.
function hintsForError(message) {
  const m = (message || '').toLowerCase()
  if (
    m.includes('unable to resolve') ||
    m.includes('cannot find module') ||
    m.includes('не удаётся разрешить') ||
    m.includes('не удается разрешить')
  ) {
    return [
      'Похоже, библиотеки не установлены или повреждены.',
      '1) Полностью закройте Expo Go.',
      '2) На компьютере запустите update.bat — он переустановит библиотеки.',
      '3) Снова откройте проект в Expo Go.',
    ]
  }
  if (
    m.includes('network') ||
    m.includes('enotfound') ||
    m.includes('enetunreach') ||
    m.includes('timed out')
  ) {
    return [
      'Похоже, нет доступа к интернету.',
      '1) Проверьте Wi-Fi или мобильный интернет.',
      '2) Телефон и компьютер должны быть в одной сети.',
      '3) Нажмите «Попробовать снова».',
    ]
  }
  if (m.includes('json') || m.includes('parse') || m.includes('syntaxerror')) {
    return [
      'Сбой при чтении данных или кода.',
      '1) Закройте Expo Go и запустите update.bat на компьютере.',
      '2) Если не помогло — пришлите мне текст из серого окна.',
    ]
  }
  return [
    'Обычно помогает перезапуск:',
    '1) Полностью закройте Expo Go и откройте проект заново.',
    '2) На компьютере запустите update.bat.',
    '3) Если не помогло — пришлите мне текст из серого окна.',
  ]
}

// Точка входа для expo-router: ловит ошибку любого экрана
// и показывает диагностику. retry перезапускает упавший экран.
export function ErrorBoundary({ error, retry }) {
  const message =
    (error && (error.message || String(error))) || 'Неизвестная ошибка'
  const steps = hintsForError(message)

  return (
    <View className="flex-1 bg-bear-bg" style={{ paddingTop: 72, paddingHorizontal: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 46 }}>🐻</Text>
        <Text className="mt-3 font-extrabold text-[21px] tracking-tight text-bear-text">
          Мишка споткнулся
        </Text>
        <Text className="mt-1.5 font-sans text-[13px] leading-relaxed text-bear-sub2">
          NutriBear не смог запуститься. Вот что можно сделать:
        </Text>

        <Text maxFontSizeMultiplier={1.3} className="mt-4 font-bold text-[14px] text-bear-text">
          {steps[0]}
        </Text>
        {steps.slice(1).map((s, i) => (
          <Text
            key={i}
            maxFontSizeMultiplier={1.3}
            className="mt-1 font-sans text-[13px] leading-relaxed text-bear-sub2"
          >
            {s}
          </Text>
        ))}

        <Pressable
          onPress={retry}
          accessibilityRole="button"
          accessibilityLabel="Попробовать снова"
          className="mt-5 items-center rounded-2xl px-4 py-3.5 active:opacity-80"
          style={{ backgroundColor: '#4D7CFE' }}
        >
          <Text className="font-bold text-[14px] text-white">Попробовать снова</Text>
        </Pressable>

        <View className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3.5">
          <Text selectable className="font-sans text-[11px] leading-snug text-bear-dim">
            {message}
          </Text>
        </View>
        <Text className="mt-2 font-sans text-[11px] text-bear-dim">
          Текст выше — технические детали. Пришлите его мне, и я починю быстрее.
        </Text>
        <View style={{ height: 48 }} />
      </ScrollView>
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

  // Агент напоминаний: планирует уведомления о воде и приёмах пищи.
  // try/catch — страховка: даже если окружение не даёт модуля
  // уведомлений, макет и всё приложение продолжают работать
  useEffect(() => {
    try {
      return startReminderAgent()
    } catch (e) {
      console.warn('Агент напоминаний не запущен:', e)
    }
  }, [])

  // Агент шагомера: раз в минуту читает системный счётчик шагов
  useEffect(() => startPedometerAgent(), [])

  // Если шрифты не загрузились — работаем системным шрифтом,
  // а не зависаем на заставке навсегда
  const fontsReady = loaded || !!error
  if (!fontsReady || !hydrated) return <SplashBear />

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
