// Мягкое напоминание мишки во вкладке Тело: если вес не записывался
// дольше порога из настроек («Ещё» → «Напоминание мишки», 5/7/10 дней) —
// тонкая полоска над «Динамикой веса» с медвежонком.
// Тап по полоске открывает окно записи веса. Пока вес свежий — полоски
// нет вовсе, ничего не давит.

import { DeviceEventEmitter, Image, Pressable, Text, View } from 'react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { daysSince } from '@/lib/goal'
import { pluralDays } from '@/lib/format'

const BEAR = require('../../../assets/images/bear.webp')

export function WeightNudge() {
  const weights = useProfileStore((s) => s.weights)
  // Порог настраивается в «Ещё» (карточка «Напоминание мишки»): 5/7/10 дней
  const nudgeDays = useUiPrefsStore((s) => s.weighNudgeDays || 7)

  // Нет записей — напоминать не о чем (вес только что заведён в онбординге)
  if (!weights.length || !weights[0]?.date) return null
  const days = daysSince(weights[0].date)
  if (!(days > nudgeDays)) return null

  return (
    <Pressable
      onPress={() => DeviceEventEmitter.emit('nutribear/open-weight')}
      accessibilityRole="button"
      accessibilityLabel={`Вес не записывался ${days} ${pluralDays(days)} — записать вес`}
      className="flex-row items-center gap-2.5 rounded-2xl border border-white/5 bg-bear-card px-3.5 py-2.5 active:opacity-80"
    >
      <Image
        source={BEAR}
        accessibilityLabel="Медвежонок-напоминалка"
        resizeMode="contain"
        style={{ width: 34, height: 34 }}
      />
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-[12.5px] leading-snug text-bear-text">
          Медвежонок соскучился по весам 🐻
        </Text>
        <Text className="mt-0.5 font-sans text-[11px] leading-snug text-bear-sub">
          Последнее взвешивание было {days} {pluralDays(days)} назад — раз в неделю самое точное
        </Text>
      </View>
      <Text className="shrink-0 font-bold text-[12px] text-[#8DABFF]">Записать →</Text>
    </Pressable>
  )
}
