// Этап 11. Разрешения — в контексте, по одному: push-напоминания,
// синхронизация здоровья (Google Fit / Apple Health / шагомер), камера.

import { Switch, Text, View } from 'react-native'
import { Bell, Watch, Camera, Footprints } from 'lucide-react-native'
import { ObShell } from './ObShell'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const SWITCH_COLORS = { true: '#4D7CFE', false: 'rgba(255,255,255,0.15)' }
const row = 'flex-row items-center gap-3 rounded-2xl border border-white/5 bg-bear-card p-4'

export function PermissionsStep({ onNext, onBack }) {
  const permissions = useOnboardingStore((s) => s.permissions)
  const sync = useOnboardingStore((s) => s.sync)
  const setPermission = useOnboardingStore((s) => s.setPermission)
  const toggleSync = useOnboardingStore((s) => s.toggleSync)

  function askPush() {
    if (permissions.push === 'granted') return
    setPermission('push', 'granted')
  }

  return (
    <ObShell sub="Шаг 11 из 12" title="Настроим уведомления" onBack={onBack} onNext={onNext} nextLabel="Продолжить">
      <View className="gap-3">
        <View className={row}>
          <Bell size={20} color="#fbbf24" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[13px] text-bear-text">Push-напоминания</Text>
            <Text className="font-sans text-[11px] text-bear-sub2">
              «Пора залогировать обед?» и вода по интервалу
            </Text>
          </View>
          <Text
            onPress={askPush}
            className={`rounded-full px-3.5 py-2 font-bold text-[12px] ${
              permissions.push === 'granted'
                ? 'bg-[#4ade80]/15 text-[#4ade80]'
                : 'bg-[#4D7CFE] text-white'
            }`}
          >
            {permissions.push === 'granted' ? 'Включено' : 'Разрешить'}
          </Text>
        </View>

        <View className={row}>
          <Watch size={20} color="#38bdf8" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[13px] text-bear-text">Google Fit / Apple Health</Text>
            <Text className="font-sans text-[11px] text-bear-sub2">
              Синхронизируйте шаги — активность дня всегда под рукой
            </Text>
          </View>
        </View>

        <View className="gap-2.5 rounded-2xl border border-white/5 bg-bear-card/60 p-4">
          {[['gfit', 'Google Fit'], ['ahealth', 'Apple Health']].map(([k, label]) => (
            <View key={k} className="flex-row items-center justify-between">
              <Text className="font-sans text-[13px] text-[#aab4d4]">{label}</Text>
              <Switch
                value={sync[k]}
                onValueChange={() => toggleSync(k)}
                trackColor={SWITCH_COLORS}
                thumbColor="#FFFFFF"
                accessibilityLabel={label}
              />
            </View>
          ))}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Footprints size={16} color="#EEF2FB" />
              <Text className="font-sans text-[13px] text-[#aab4d4]">Встроенный шагомер</Text>
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

        <View className={row}>
          <Camera size={20} color="#a78bfa" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[13px] text-bear-text">Камера</Text>
            <Text className="font-sans text-[11px] text-bear-sub2">
              Спросим при первом сканировании штрихкода, не раньше
            </Text>
          </View>
        </View>
      </View>
    </ObShell>
  )
}
