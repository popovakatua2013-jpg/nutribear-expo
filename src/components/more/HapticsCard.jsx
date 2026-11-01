// Карточка «Вибрация» в разделе «Ещё»: вкл/выкл вибро-отклика
// в приложении (сейчас — тап по кольцу ИМТ; новые отклики должны
// читать тот же флаг haptics из useUiPrefsStore)

import { Switch, Text } from 'react-native'
import { Vibrate } from 'lucide-react-native'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { CollapsibleCard } from '../ui/CollapsibleCard'

export function HapticsCard() {
  const haptics = useUiPrefsStore((s) => s.haptics)
  const setHaptics = useUiPrefsStore((s) => s.setHaptics)

  return (
    <CollapsibleCard
      storageKey="haptics"
      accessibilityLabel="Вибро-отклик"
      icon={<Vibrate size={18} color="#C4B5FD" />}
      title="Вибрация"
      right={
        <Switch
          accessibilityLabel="Включить вибро-отклик"
          value={haptics}
          onValueChange={setHaptics}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      }
    >
      <Text className="font-sans text-[11.5px] leading-snug text-bear-sub">
        {haptics
          ? 'Лёгкий вибро-отклик на нажатия — например, при тапе по кольцу ИМТ.'
          : 'Приложение не будет вибрировать на нажатия.'}
      </Text>
    </CollapsibleCard>
  )
}
