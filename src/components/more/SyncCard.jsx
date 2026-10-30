// Синхронизация: Google Fit, Apple Health и встроенный шагомер.
// Шагомер настоящий: expo-sensors Pedometer читает системный счётчик
// шагов (агент src/lib/pedometer.js опрашивает его раз в минуту).
// Тумблеры внешних сервисов пока сохраняются локально.

import { useState } from 'react'
import { Platform, Switch, Text, View } from 'react-native'
import { Watch, Footprints } from 'lucide-react-native'
import { Pedometer } from 'expo-sensors'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useToast } from '../ui/Toast'

const ROWS = [
  { key: 'gfit', label: 'Google Fit', hint: 'шаги и тренировки (Android)' },
  { key: 'ahealth', label: 'Apple Health', hint: 'шаги и тренировки (iOS)' },
]

const SWITCH_COLORS = {
  true: '#4D7CFE',
  false: 'rgba(255,255,255,0.15)',
}

export function SyncCard() {
  const sync = useOnboardingStore((s) => s.sync)
  const toggleSync = useOnboardingStore((s) => s.toggleSync)
  const pedometerEnabled = useActivityStore((s) => s.pedometerEnabled)
  const pedometerSteps = useActivityStore((s) => s.pedometerSteps)
  const setPedometerEnabled = useActivityStore((s) => s.setPedometerEnabled)
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
          toast({
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

  return (
    <View accessibilityLabel="Синхронизация" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center gap-2">
        <Watch size={18} color="#38bdf8" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Синхронизация
        </Text>
      </View>

      <View className="mt-3 gap-2">
        {ROWS.map((r) => (
          <View
            key={r.key}
            className="flex-row items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3"
          >
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[13px] text-bear-text">{r.label}</Text>
              <Text className="font-sans text-[11px] text-bear-sub2">{r.hint}</Text>
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

        <View className="flex-row items-center justify-between rounded-2xl bg-white/[0.03] px-4 py-3">
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Footprints size={16} color="#EEF2FB" />
              <Text className="font-bold text-[13px] text-bear-text">Встроенный шагомер</Text>
            </View>
            <Text className="font-sans text-[11px] text-bear-sub2">
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

      <Text className="mt-3 px-1 font-sans text-[10px] leading-relaxed text-bear-dim">
        {Platform.OS === 'web'
          ? 'Веб-версия работает офлайн: данные не покидают устройство. Шагомер доступен в приложении на телефоне.'
          : 'Приложение работает офлайн: данные не покидают устройство. Встроенный шагомер читает системный счётчик шагов телефона.'}{' '}
        Подключение к внешним сервисам включит синхронизацию шагов, когда
        она станет доступна.
      </Text>
    </View>
  )
}
