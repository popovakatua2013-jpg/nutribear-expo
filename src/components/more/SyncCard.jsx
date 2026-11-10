// Шаги и здоровье: Google Fit, Apple Health, Health Connect и встроенный
// шагомер. Шагомер настоящий: expo-sensors Pedometer читает системный
// счётчик шагов (агент src/lib/pedometer.js опрашивает его раз в минуту).
// Health Connect (Android) — системный «банк здоровья»: шаги собираются
// в фоне даже при закрытом приложении, с историей и часами/браслетами.
// Тумблеры внешних сервисов пока сохраняются локально.
// Длинное пояснение в сноске (офлайн, шагомер, Health Connect) убрано
// по отзыву Кати («если эти данные по закону нужны — перепиши их в
// документы»): хранение данных теперь описано в документе «Политика
// конфиденциальности» (окно «Ещё → Правовые документы»), в карточке —
// одна короткая строка. Режим embedded (редизайн «Ещё» в групповое
// меню): без своей карточки и шапки — содержимое встраивается в строку
// меню «Шаги и здоровье».

import { useState } from 'react'
import { Platform, Switch, Text, View } from 'react-native'
import { Watch, Footprints, HeartPulse } from 'lucide-react-native'
import { Pedometer } from 'expo-sensors'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useActivityStore } from '@/store/useActivityStore'
import {
  hcAvailability,
  hcOpenSettings,
  hcRequestStepsPermission,
  hcImportStepsHistory,
  HC_UNAVAILABLE,
  HC_UPDATE_REQUIRED,
} from '@/lib/healthConnect'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'
import { toastAndOpenSettings, openAppSettings } from '@/lib/appSettings'

const ROWS = [
  { key: 'gfit', label: 'Google Fit', hint: 'шаги и тренировки (Android)' },
  { key: 'ahealth', label: 'Apple Health', hint: 'шаги и тренировки (iOS)' },
]

// Единый акцент всех переключателей — #7B6CF6 (унификация цвета
// по отзыву Кати от 11.11)
const SWITCH_COLORS = {
  true: '#7B6CF6',
  false: 'rgba(255,255,255,0.15)',
}

export function SyncCard({ embedded = false }) {
  const sync = useOnboardingStore((s) => s.sync)
  const toggleSync = useOnboardingStore((s) => s.toggleSync)
  const pedometerEnabled = useActivityStore((s) => s.pedometerEnabled)
  const pedometerSteps = useActivityStore((s) => s.pedometerSteps)
  const setPedometerEnabled = useActivityStore((s) => s.setPedometerEnabled)
  const healthConnectEnabled = useActivityStore((s) => s.healthConnectEnabled)
  const setHealthConnectEnabled = useActivityStore((s) => s.setHealthConnectEnabled)
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  // Включение шагомера: проверяем датчик и разрешение на активность
  // (Android 10+ требует ACTIVITY_RECOGNITION), только потом включаем
  async function togglePedometer(v) {
    if (busy) return
    if (v) {
      setBusy(true)
      try {
        const available = await Pedometer.isAvailableAsync()
        if (!available) {
          toast({
            title: '👟 Шагомер недоступен',
            description: 'На этом устройстве нет системного счётчика шагов',
          })
          return
        }
        const perm = await Pedometer.requestPermissionsAsync()
        if (!perm?.granted) {
          // Отказали в разрешении — показываем тост и сами открываем
          // настройки телефона (отзыв Кати: переход сразу, автоматически)
          toastAndOpenSettings(toast, {
            title: '👟 Нужно разрешение',
            description: 'Разрешите доступ к физической активности в настройках телефона',
          })
          return
        }
      } catch {
        toast({
          title: '👟 Шагомер недоступен',
          description: 'Не удалось получить данные с датчика',
        })
        return
      } finally {
        setBusy(false)
      }
    }
    setPedometerEnabled(v)
    toast({
      title: v ? '👟 Шагомер включён' : 'Шагомер выключен',
      description: v ? 'Шаги с датчика телефона прибавляются к дневной цели' : undefined,
    })
  }

  // Подключение Health Connect: проверяем доступность, запрашиваем
  // разрешение «Шаги» и сразу импортируем историю за прошлые дни.
  // Системное окно разрешения показывает сам Health Connect.
  async function toggleHealthConnect(v) {
    if (busy) return
    if (!v) {
      setHealthConnectEnabled(false)
      toast({ title: 'Health Connect отключён' })
      return
    }
    setBusy(true)
    try {
      const avail = await hcAvailability()
      if (avail === HC_UNAVAILABLE) {
        toast({
          title: '🩺 Health Connect не найден',
          description:
            'Установите приложение Health Connect из Google Play — в нём хранятся шаги телефона и часов',
        })
        return
      }
      if (avail === HC_UPDATE_REQUIRED) {
        toast({
          title: '🩺 Обновите Health Connect',
          description: 'Открываем настройки — обновите приложение Health Connect и попробуйте снова',
        })
        await hcOpenSettings()
        return
      }
      const ok = await hcRequestStepsPermission()
      if (!ok) {
        toast({
          title: '🩺 Нужно разрешение',
          description: 'Разрешите чтение шагов в окне Health Connect (данные не покидают телефон)',
        })
        // Разрешение «Шаги» живёт в настройках самого Health Connect —
        // открываем их автоматически; не получилось — настройки телефона
        setTimeout(async () => {
          const opened = await hcOpenSettings()
          if (!opened) openAppSettings()
        }, 900)
        return
      }
      setHealthConnectEnabled(true)
      const imported = await hcImportStepsHistory({ days: 14 })
      toast({
        title: '🩺 Health Connect подключён',
        description:
          imported > 0
            ? `Шаги с системы — в фоне и с историей. Импортировано дней: ${imported}`
            : 'Шаги с системы — в фоне, даже когда приложение закрыто',
      })
    } finally {
      setBusy(false)
    }
  }

  const rows = (
    <View className="mt-1 gap-2">
      {ROWS.map((r) => (
        <View
          key={r.key}
          className="flex-row items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3"
        >
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[17.5px] text-bear-text">{r.label}</Text>
            <Text className="font-sans text-[15px] text-bear-sub2">{r.hint}</Text>
          </View>
          <Switch
            value={sync[r.key]}
            onValueChange={() => toggleSync(r.key)}
            trackColor={SWITCH_COLORS}
            thumbColor="#FFFFFF"
            accessibilityLabel={r.label}
          />
        </View>
      ))}

      {Platform.OS === 'android' && (
        <View className="flex-row items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <HeartPulse size={18} color="#F0ABFC" />
              <Text className="font-bold text-[17.5px] text-bear-text">Health Connect</Text>
            </View>
            <Text className="font-sans text-[15px] text-bear-sub2">
              {healthConnectEnabled
                ? 'шаги с системы: фон + история телефона и часов'
                : 'шаги телефона и часов — даже при закрытом приложении'}
            </Text>
          </View>
          <Switch
            value={healthConnectEnabled}
            onValueChange={toggleHealthConnect}
            trackColor={SWITCH_COLORS}
            thumbColor="#FFFFFF"
            accessibilityLabel="Health Connect"
          />
        </View>
      )}

      <View className="flex-row items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Footprints size={18} color="#EEF2FB" />
            <Text className="font-bold text-[17.5px] text-bear-text">Встроенный шагомер</Text>
          </View>
          <Text className="font-sans text-[15px] text-bear-sub2">
            {pedometerEnabled
              ? `сегодня с датчика: ${pedometerSteps} шагов + ручные`
              : 'считает шаги сам, плюс ручные добавления'}
          </Text>
        </View>
        <Switch
          value={pedometerEnabled}
          onValueChange={togglePedometer}
          trackColor={SWITCH_COLORS}
          thumbColor="#FFFFFF"
          accessibilityLabel="Встроенный шагомер"
        />
      </View>
    </View>
  )

  const footnote = (
    <Text className="mt-3 px-1 font-sans text-[13.5px] leading-relaxed text-bear-dim">
      {Platform.OS === 'web'
        ? 'Работает офлайн — данные не покидают устройство. Шагомер доступен в приложении на телефоне.'
        : 'Работает офлайн — данные о шагах и здоровье хранятся только на телефоне. Подробнее — в «Правовых документах» ниже.'}
    </Text>
  )

  // Встроено в строку меню — только содержимое
  if (embedded) {
    return (
      <View accessibilityLabel="Шаги и здоровье">
        {rows}
        {footnote}
      </View>
    )
  }

  return (
    <CollapsibleCard
      storageKey="sync"
      accessibilityLabel="Шаги и здоровье"
      icon={<Watch size={20} color="#38bdf8" />}
      title="Шаги и здоровье"
      summary={
        pedometerEnabled
          ? 'Шагомер вкл'
          : healthConnectEnabled
            ? 'Health Connect'
            : undefined
      }
    >
      {rows}
      {footnote}
    </CollapsibleCard>
  )
}
