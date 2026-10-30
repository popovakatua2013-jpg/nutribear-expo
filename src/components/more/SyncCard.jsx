// Синхронизация: Google Fit, Apple Health и встроенный шагомер.
// Переключатели внешних сервисов сохраняются локально.

import { Platform, Switch, Text, View } from 'react-native'
import { Watch, Footprints } from 'lucide-react-native'
import { useOnboardingStore } from '@/store/useOnboardingStore'

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
              ручные добавления на странице «Активность»
            </Text>
          </View>
          <Switch
            value={sync.pedometer}
            onValueChange={() => toggleSync('pedometer')}
            trackColor={SWITCH_COLORS}
            thumbColor="#FFFFFF"
            accessibilityLabel="Встроенный шагомер"
          />
        </View>
      </View>

      <Text className="mt-3 px-1 font-sans text-[10px] leading-relaxed text-bear-dim">
        {Platform.OS === 'web'
          ? 'Веб-версия работает офлайн: данные не покидают устройство.'
          : 'Приложение работает офлайн: данные не покидают устройство.'}{' '}
        Подключение к внешним сервисам включит синхронизацию шагов, когда
        она станет доступна.
      </Text>
    </View>
  )
}
