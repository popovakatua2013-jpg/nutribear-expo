// Корневой макет: шрифты Inter и тосты.
// Пока онбординг не завершён — показываем флоу онбординга вместо
// приложения (как в веб-версии: status !== 'done').
// Шрифты: 3 начертания вместо 5 (400/600/800) — минус ~600 КБ из
// бандла: классы .font-medium и .font-bold перенаправлены на 400/600
// в tailwind.config.js, визуальная разница минимальна.

import '../global.css'

import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ToastProvider } from '@/components/ui/Toast'
import { OfflineBar } from '@/components/ui/OfflineBar'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { LegacyConsentScreen } from '@/components/onboarding/LegacyConsentScreen'
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
  // Нейтральный экран, пока восстанавливаются данные (без мигания).
  // Колесико загрузки — по отзыву Кати: чтобы при запуске было видно,
  // что приложение грузится, а не зависло.
  return (
    <View className="flex-1 items-center justify-center bg-bear-bg">
      <Text className="text-[56px]">🐻</Text>
      <ActivityIndicator
        size="large"
        color="#6C8CFF"
        style={{ marginTop: 28 }}
      />
    </View>
  )
}

// Экран-диагностика: если при запуске что-то упало, показываем
// человеческое объяснение с шагами вместо системного
// «Something went wrong». Зависимостей у экрана минимум —
// только react-native, чтобы он работал даже когда сломалось
// что-то из библиотек приложения.
//
// Тексты для обычного пользователя (не разработчика): без технических
// терминов среды разработки, пакетных файлов и отладочных окон. Каждая
// ветка — короткое человеческое объяснение + что сделать. Везде в конце —
// почта поддержки whitelinepay@yandex.ru (на случай если не помогло).
function hintsForError(message) {
  const m = (message || '').toLowerCase()
  if (
    m.includes('unable to resolve') ||
    m.includes('cannot find module') ||
    m.includes('не удаётся разрешить') ||
    m.includes('не удается разрешить')
  ) {
    return [
      'NutriBear не смог загрузить свои компоненты.',
      '1) Полностью закройте NutriBear и запустите его снова.',
      '2) Если не помогло — нажмите «Сбросить данные» ниже.',
      '3) В крайнем случае напишите на whitelinepay@yandex.ru — поможем.',
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
      '2) Нажмите «Попробовать снова».',
    ]
  }
  if (m.includes('json') || m.includes('parse') || m.includes('syntaxerror')) {
    return [
      'Сбой при чтении данных приложения.',
      '1) Полностью закройте NutriBear и запустите его снова.',
      '2) Если не помогло — нажмите «Сбросить данные» ниже.',
      '3) В крайнем случае напишите на whitelinepay@yandex.ru — поможем.',
    ]
  }
  return [
    'Обычно помогает перезапуск:',
    '1) Полностью закройте NutriBear и запустите его снова.',
    '2) Если не помогло — нажмите «Сбросить данные» ниже.',
    '3) В крайнем случае напишите на whitelinepay@yandex.ru — поможем.',
  ]
}

// Точка входа для expo-router: ловит ошибку любого экрана
// и показывает диагностику. retry перезапускает упавший экран.
export function ErrorBoundary({ error, retry }) {
  const message =
    (error && (error.message || String(error))) || 'Неизвестная ошибка'
  const steps = hintsForError(message)

  // «Сбросить данные» — крайняя мера, когда цикл падает на одной и
  // той же ошибке при запуске (битый стор в AsyncStorage). Стираем
  // все ключи NutriBear и перезапускаем — онбординг покажется заново,
  // но у пользователя остаётся рабочее приложение, а не «Мишка споткнулся»
  // навсегда. Состояние покупки (useProStore) при этом НЕ трогаем —
  // см. правило проекта: «Состояние покупки не сбрасывается "Стереть
  // все данные"». Фото в файловой системе не затрагиваем — они не в
  // AsyncStorage
  const [resetting, setResetting] = useState(false)
  function wipeAndRetry() {
    Alert.alert(
      'Сбросить данные приложения?',
      'Это крайняя мера — если приложение постоянно падает при запуске. '
        + 'Сотрутся дневник, история, вода, вес, тренировки. Онбординг '
        + 'показывается заново. Покупка Premium сохраняется. Фотографии '
        + 'на устройстве не затрагиваются. Действие нельзя отменить.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить и перезапустить',
          style: 'destructive',
          onPress: async () => {
            try {
              setResetting(true)
              const keys = await AsyncStorage.getAllKeys()
              // Удаляем все ключи приложения, КРОМЕ покупки (useProStore).
              // Ключи покупки — nutribear-pro-v1 и любой persistent-флаг
              // покупки. Состояние стора в памяти не трогаем — persist
              // сам перечитает с диска
              const toRemove = (keys || []).filter(
                (k) => typeof k === 'string'
                  && k.startsWith('nutribear-')
                  && k !== 'nutribear-pro-v1'
              )
              if (toRemove.length) {
                await AsyncStorage.multiRemove(toRemove)
              }
            } catch (e) {
              console.warn('Не удалось сбросить данные:', e)
            } finally {
              setResetting(false)
              retry()
            }
          },
        },
      ]
    )
  }

  return (
    <View className="flex-1 bg-bear-bg" style={{ paddingTop: 72, paddingHorizontal: 20 }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 46 }}>🐻</Text>
        <Text className="mt-3 font-extrabold text-[27px] tracking-tight text-bear-text">
          Мишка споткнулся
        </Text>
        <Text className="mt-1.5 font-sans text-[17.5px] leading-relaxed text-bear-sub2">
          NutriBear не смог запуститься. Вот что можно сделать:
        </Text>

        <Text maxFontSizeMultiplier={1.3} className="mt-4 font-bold text-[19px] text-bear-text">
          {steps[0]}
        </Text>
        {steps.slice(1).map((s, i) => (
          <Text
            key={i}
            maxFontSizeMultiplier={1.3}
            className="mt-1 font-sans text-[17.5px] leading-relaxed text-bear-sub2"
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
          <Text className="font-bold text-[19px] text-white">
            {resetting ? 'Сбрасываем…' : 'Попробовать снова'}
          </Text>
        </Pressable>

        <Pressable
          onPress={wipeAndRetry}
          accessibilityRole="button"
          accessibilityLabel="Сбросить данные приложения"
          className="mt-2 items-center rounded-2xl border border-white/10 px-4 py-3 active:opacity-80"
        >
          <Text className="font-bold text-[17px] text-bear-sub2">
            Сбросить данные и перезапустить
          </Text>
          <Text className="mt-0.5 font-sans text-[14.5px] text-bear-dim">
            крайняя мера — дневник и история удалятся, Premium сохранится
          </Text>
        </Pressable>

        <View className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-3.5">
          <Text selectable className="font-sans text-[15px] leading-snug text-bear-dim">
            {message}
          </Text>
        </View>
        <Text className="mt-2 font-sans text-[15px] text-bear-dim">
          Технические детали ошибки показаны выше. Если перезапуск и сброс
          данных не помогли — пришлите этот текст на whitelinepay@yandex.ru,
          и мы поможем.
        </Text>
        <Pressable
          onPress={() =>
            Linking.openURL(
              'mailto:whitelinepay@yandex.ru?subject=' +
                encodeURIComponent('NutriBear — ошибка запуска')
            ).catch(() => {})
          }
          accessibilityRole="button"
          accessibilityLabel="Написать в поддержку"
          className="mt-3 items-center rounded-2xl border border-white/10 px-4 py-3 active:opacity-80"
        >
          <Text className="font-bold text-[17px] text-bear-sub2">
            Написать в поддержку
          </Text>
          <Text className="mt-0.5 font-sans text-[14.5px] text-bear-dim">
            whitelinepay@yandex.ru
          </Text>
        </Pressable>
        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  )
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_800ExtraBold,
  })
  const hydrated = useOnboardingHydrated()
  const obStatus = useOnboardingStore((s) => s.status)
  // 152-ФЗ: все 4 согласия отмечены? Хук — до условных возвратов ниже
  // (правила хуков React). Новым пользователям согласия даются на
  // первом шаге онбординга (ConsentBlock под выбором цели в
  // WelcomeStep) — отдельной страницы перед входом больше нет
  // (отзыв Кати 19.11: «опд на всю страницу»). Исключение — старые
  // установки: онбординг у них уже завершён, а согласий в сохранённых
  // данных нет, поэтому при запуске один раз показывается компактный
  // LegacyConsentScreen (без страницы текста, без реквизитов —
  // они в Политике конфиденциальности).
  const consentOk = useOnboardingStore(
    (s) => !!(s.consent?.pd && s.consent?.health && s.consent?.crossBorder && s.consent?.policy)
  )

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

  // Онбординг завершён, но согласий нет (старые установки) —
  // компактный экран согласия вместо приложения
  if (obStatus === 'done' && !consentOk) {
    return (
      <ToastProvider>
        <StatusBar style="light" />
        <LegacyConsentScreen />
        <OfflineBar />
      </ToastProvider>
    )
  }

  // Онбординг не завершён — флоу вместо приложения
  if (obStatus !== 'done') {
    return (
      <ToastProvider>
        <StatusBar style="light" />
        <OnboardingFlow />
        <OfflineBar />
      </ToastProvider>
    )
  }

  return (
    <ToastProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A1020' } }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      {/* Полоска «Нет сети» поверх всех экранов: тонкая, некликабельная */}
      <OfflineBar />
    </ToastProvider>
  )
}
