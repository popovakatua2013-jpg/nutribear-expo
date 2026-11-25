// Мягкое напоминание мишки во вкладке Тело: если вес не записывался
// дольше порога из настроек (блок «Напоминания» → строка «Мишка пинает»:
// тумблер + порог 5/7/10 дней) — тонкая полоска над «Динамикой веса».
// Тап по полоске открывает окно записи веса. Пока вес свежий — полоски
// нет вовсе, ничего не давит. Тумблер выключен — полоски нет вообще.
// Крестик (просьба Кати 24.11: «уведомление замеров — добавить крестик,
// закрыть, смахнуть»): закрывает полоску насовсем — она вернётся только
// после записи НОВОГО веса и следующего порога дней без записи.

import { DeviceEventEmitter, Image, Pressable, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useThemeColors } from '@/lib/use-theme'
import { daysSince } from '@/lib/goal'
import { pluralDays } from '@/lib/format'

const BEAR = require('../../../assets/images/bear.webp')

export function WeightNudge() {
  const themeColors = useThemeColors()
  const weights = useProfileStore((s) => s.weights)
  // Тумблер и порог — из блока «Напоминания» на «Ещё» (строка «Мишка пинает»)
  const nudgeOn = useUiPrefsStore((s) => s.weighNudgeOn !== false)
  const nudgeDays = useUiPrefsStore((s) => s.weighNudgeDays || 7)
  // Дата последнего веса на момент закрытия крестиком: полоска не показывается,
  // пока последний вес тот же (запись нового веса сбрасывает напоминание)
  const dismissedAt = useUiPrefsStore((s) => s.weighNudgeDismissedAt)
  const dismissWeighNudge = useUiPrefsStore((s) => s.dismissWeighNudge)

  // Выключено тумблером или нечего напоминать (вес только что заведён
  // в онбординге)
  if (!nudgeOn) return null
  if (!weights.length || !weights[0]?.date) return null
  const lastWeightDate = weights[0].date
  if (dismissedAt === lastWeightDate) return null
  const days = daysSince(lastWeightDate)
  if (!(days > nudgeDays)) return null

  return (
    // Поверхность — из активной темы (bodyCard + bodyLine), как у
    // блока «Динамика веса» под полоской: напоминание не выбивается
    <Pressable
      onPress={() => DeviceEventEmitter.emit('nutribear/open-weight')}
      accessibilityRole="button"
      accessibilityLabel={`Вес не записывался ${days} ${pluralDays(days)} — записать вес`}
      className="flex-row items-center gap-2.5 rounded-2xl px-3.5 py-2.5 active:opacity-80"
      style={{
        backgroundColor: themeColors.bodyCard,
        borderColor: themeColors.bodyLine,
        borderWidth: 1,
      }}
    >
      <Image
        source={BEAR}
        accessibilityLabel="Медвежонок-напоминалка"
        resizeMode="contain"
        style={{ width: 34, height: 34 }}
      />
      <View className="min-w-0 flex-1">
        <Text className="font-semibold text-[17px] leading-snug text-bear-text">
          Медвежонок соскучился по весам 🐻
        </Text>
        <Text className="mt-0.5 font-sans text-[15px] leading-snug text-bear-sub">
          Последнее взвешивание было {days} {pluralDays(days)} назад — раз в неделю самое точное
        </Text>
      </View>
      <Text className="shrink-0 font-bold text-[16.5px] text-bear-link">Записать →</Text>
      {/* Крестик: закрыть напоминание (вернётся после нового веса) */}
      <Pressable
        onPress={() => dismissWeighNudge(lastWeightDate)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Закрыть напоминание о весе"
        className="shrink-0 rounded-full p-1"
        style={{ backgroundColor: themeColors.accentFaint }}
      >
        <X size={16} color={themeColors.sub} strokeWidth={2.5} />
      </Pressable>
    </Pressable>
  )
}
