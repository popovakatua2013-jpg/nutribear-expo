// Финальный (5-й) шаг: разрешения — push, синхронизация здоровья,
// шагомер, камера. Бывший 9-й шаг «Всё готово!» убран: кнопка
// «Начать» сразу применяет план к целям/профилю и завершает онбординг.
// Окно «Добавить приём пищи» после онбординга больше НЕ открывается:
// после регистрации — сразу главная страница (отзыв Кати)

import { Pressable, Switch, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Bell, Watch, Camera, Footprints } from 'lucide-react-native'
import { Pedometer } from 'expo-sensors'
import { ObShell } from './ObShell'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useToast } from '../../ui/Toast'
import { applyOnboarding } from '@/lib/data/onboarding-apply'

const SWITCH_COLORS = { true: '#4D7CFE', false: 'rgba(255,255,255,0.15)' }
const row = 'flex-row items-center gap-3 rounded-2xl border border-white/5 bg-bear-card p-4'

export function PermissionsStep({ onBack }) {
  const answers = useOnboardingStore((s) => s.answers)
  const plan = useOnboardingStore((s) => s.plan)
  const finish = useOnboardingStore((s) => s.finish)
  const permissions = useOnboardingStore((s) => s.permissions)
  const sync = useOnboardingStore((s) => s.sync)
  const setPermission = useOnboardingStore((s) => s.setPermission)
  const toggleSync = useOnboardingStore((s) => s.toggleSync)
  const pedometerEnabled = useActivityStore((s) => s.pedometerEnabled)
  const setPedometerEnabled = useActivityStore((s) => s.setPedometerEnabled)
  const { toast } = useToast()

  // Завершение онбординга: план применяется здесь же (шаг «Всё готово!»
  // удалён); после завершения — сразу главная, без автозапуска окна
  // «Добавить приём пищи» (отзыв Кати)
  function done() {
    if (plan) applyOnboarding(answers, plan)
    finish()
  }

  function askPush() {
    if (permissions.push === 'granted') return
    setPermission('push', 'granted')
  }

  // Тумблер шагомера настоящий: включаем только с разрешением
  // на физическую активность (Android 10+)
  async function togglePedometer(v) {
    if (v) {
      try {
        const available = await Pedometer.isAvailableAsync()
        const perm = available ? await Pedometer.requestPermissionsAsync() : null
        if (!available || !perm?.granted) {
          toast({
            title: '👟 Шагомер недоступен',
            description: 'На этом устройстве нет счётчика шагов или нет разрешения',
          })
          return
        }
      } catch {
        toast({ title: '👟 Шагомер недоступен', description: 'Не удалось получить данные с датчика' })
        return
      }
    }
    setPedometerEnabled(v)
    if (sync.pedometer !== v) toggleSync('pedometer') // зеркало в онбординге
  }

  return (
    <ObShell
      sub="Шаг 5 из 5"
      title="Настроим уведомления"
      onBack={onBack}
      footer={
        <Pressable onPress={done} className="overflow-hidden rounded-2xl" accessibilityLabel="Начать">
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
            <Text className="py-3.5 text-center font-bold text-[20px] text-white">Начать</Text>
          </LinearGradient>
        </Pressable>
      }
    >
      <View className="gap-3">
        <View className={row}>
          <Bell size={22} color="#fbbf24" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[17.5px] text-bear-text">Push-напоминания</Text>
            <Text className="font-sans text-[15px] text-bear-sub2">
              «Пора залогировать обед?» и вода по интервалу
            </Text>
          </View>
          <Text
            onPress={askPush}
            className={`rounded-full px-3.5 py-2 font-bold text-[16.5px] ${
              permissions.push === 'granted'
                ? 'bg-[#4ade80]/15 text-[#4ade80]'
                : 'bg-[#4D7CFE] text-white'
            }`}
          >
            {permissions.push === 'granted' ? 'Включено' : 'Разрешить'}
          </Text>
        </View>

        <View className={row}>
          <Watch size={22} color="#38bdf8" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[17.5px] text-bear-text">Google Fit / Apple Health</Text>
            <Text className="font-sans text-[15px] text-bear-sub2">
              Синхронизируйте шаги — активность дня всегда под рукой
            </Text>
          </View>
        </View>

        <View className="gap-2.5 rounded-2xl border border-white/5 bg-bear-card/60 p-4">
          {[['gfit', 'Google Fit'], ['ahealth', 'Apple Health']].map(([k, label]) => (
            <View key={k} className="flex-row items-center justify-between">
              <Text className="font-sans text-[17.5px] text-[#aab4d4]">{label}</Text>
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
              <Footprints size={18} color="#EEF2FB" />
              <Text className="font-sans text-[17.5px] text-[#aab4d4]">Встроенный шагомер</Text>
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

        <View className={row}>
          <Camera size={22} color="#a78bfa" />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[17.5px] text-bear-text">Камера</Text>
            <Text className="font-sans text-[15px] text-bear-sub2">
              Спросим при первом сканировании штрихкода, не раньше
            </Text>
          </View>
        </View>
      </View>
    </ObShell>
  )
}
