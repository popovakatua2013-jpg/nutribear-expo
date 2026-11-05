// Карточка «Напоминание мишки» в разделе «Ещё»: порог дней (5/7/10),
// после которого во вкладке Тело появляется мягкая полоска-напоминание
// записать вес. Само напоминание — компонент WeightNudge, он читает
// этот же порог из useUiPrefsStore.

import { Pressable, Text, View } from 'react-native'
import { BellRing } from 'lucide-react-native'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { CollapsibleCard } from '../ui/CollapsibleCard'

const OPTIONS = [5, 7, 10]

export function WeighNudgeCard() {
  const days = useUiPrefsStore((s) => s.weighNudgeDays || 7)
  const setWeighNudgeDays = useUiPrefsStore((s) => s.setWeighNudgeDays)

  return (
    <CollapsibleCard
      storageKey="weigh-nudge"
      accessibilityLabel="Напоминание мишки о взвешивании"
      icon={<BellRing size={20} color="#FCD34D" />}
      title="Напоминание мишки"
    >
      <Text className="font-sans text-[14px] leading-snug text-bear-sub">
        Если вес не записывался дольше выбранного срока, во вкладке «Тело» над динамикой
        веса появится мягкое напоминание. Никаких уведомлений — только полоска в приложении.
      </Text>

      <View className="mt-3 flex-row gap-1.5">
        {OPTIONS.map((n) => {
          const active = days === n
          return (
            <Pressable
              key={n}
              onPress={() => setWeighNudgeDays(n)}
              accessibilityRole="button"
              accessibilityLabel={`Напоминать через ${n} дней`}
              className={`flex-1 items-center rounded-xl py-2 active:opacity-70 ${active ? '' : 'bg-white/5'}`}
              style={active ? { backgroundColor: '#7B6CF6' } : null}
            >
              <Text className={`font-bold text-[15.5px] ${active ? 'text-white' : 'text-bear-sub'}`}>
                {`${n} дней`}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <Text className="mt-2 font-sans text-[13px] text-bear-dim">
        Сейчас: напомним, если вес не записывался {days} дней
      </Text>
    </CollapsibleCard>
  )
}
