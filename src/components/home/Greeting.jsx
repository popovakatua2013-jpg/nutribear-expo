// Компактная приветственная шапка главной: круглый аватар с мишкой,
// приветствие по времени суток («Доброе утро»), чип с сегодняшней
// датой и чип ТЕКУЩЕГО ВЕСА (правка Кати 27.11: «шапку не видно
// текущий вес» — вес теперь виден в шапке главной, цифра — акцентом
// активной темы). Строку статуса под приветствием («До нормы осталось
// N ккал») убрали по отзыву Кати — она дублировала блок «Осталось
// N ккал» в сводке «Съедено за сегодня».

import { Image, Pressable, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { Scale, WifiOff } from 'lucide-react-native'
import { useIsOnline } from '@/lib/useIsOnline'
import { useThemeColors } from '@/lib/use-theme'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { formatNum } from '@/lib/format'
import { hapticFeedback } from '@/lib/haptics'
import { requestScrollToWeight } from '@/lib/navEvents'

const BEAR = require('../../../assets/images/bear.webp')

const WEEKDAYS = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб']
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

function greetingByHour(h) {
  if (h < 5) return 'Доброй ночи'
  if (h < 12) return 'Доброе утро'
  if (h < 18) return 'Добрый день'
  return 'Добрый вечер'
}

export function Greeting() {
  const themeColors = useThemeColors()
  const now = new Date()
  const online = useIsOnline()
  const dateLabel = `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`
  // Текущий вес в шапке (правка Кати 27.11: «шапку не видно текущий вес»):
  // тап по чипу — вкладка «Тело» (динамика веса). Цифра — АКЦЕНТом темы
  // («цифра веса не соответствует темам» — больше никаких фикс-цветов)
  const weightKg = useProfileStore((s) => s.weightKg)
  const haptics = useUiPrefsStore((s) => s.haptics)
  const router = useRouter()

  // Тап по чипу веса — на вкладку «Тело» и скролл к «Динамике веса»
  // (тот же механизм, что у карточки «Вес» в отчётах)
  const openBody = () => {
    hapticFeedback('selection')
    router.navigate('/bmi')
    requestScrollToWeight()
  }

  return (
    <View
      accessibilityLabel="Приветствие"
      className="flex-row items-center gap-3"
    >
      <View className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-bear-line bg-bear-overlay">
        <Image
          source={BEAR}
          accessibilityLabel="Медвежонок — маскот дневника"
          resizeMode="cover"
          style={{ width: '100%', height: '100%' }}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.25}
          className="font-extrabold text-[22px] leading-tight tracking-tight text-bear-text"
        >
          {greetingByHour(now.getHours())}! 👋
        </Text>
      </View>

      {/* Чипы справа: «Офлайн» (когда нет сети) над чипом с датой */}
      <View className="shrink-0 items-end gap-1">
        {!online && (
          // Чип «Офлайн» — «предупреждение» активной темы (четвёртый круг:
          // «все значки — согласно темам»), вместо чужого янтаря #F59E0B
          <View
            accessibilityLabel="Нет подключения к интернету"
            className="flex-row items-center gap-1 rounded-full border px-2 py-1.5"
            style={{
              borderColor: themeColors.warn,
              backgroundColor: themeColors.accentFaint,
            }}
          >
            <WifiOff size={15} color={themeColors.warn} strokeWidth={2.5} />
            <Text maxFontSizeMultiplier={1.2} className="font-bold text-[15px]" style={{ color: themeColors.warn }}>
              Офлайн
            </Text>
          </View>
        )}
        <View
          className="rounded-full border border-bear-accentBorder bg-bear-accentFaint px-3 py-1.5"
        >
          <Text maxFontSizeMultiplier={1.25} className="font-medium text-[15px] text-bear-bright">
            {dateLabel}
          </Text>
        </View>
        {/* Чип текущего веса: цифра акцентом темы, тап — к динамике веса
            (правка Кати 27.11: «шапку не видно текущий вес») */}
        <Pressable
          onPress={openBody}
          accessibilityRole="button"
          accessibilityLabel={
            weightKg != null
              ? `Текущий вес ${formatNum(weightKg)} килограммов — открыть динамику веса`
              : 'Вес не записан — открыть динамику веса'
          }
          className="flex-row items-center gap-1 rounded-full border px-2.5 py-1 active:opacity-70"
          style={{
            borderColor: themeColors.accentBorder,
            backgroundColor: themeColors.accentFaint,
          }}
        >
          <Scale size={13} color={themeColors.accentBright} strokeWidth={2.5} />
          <Text
            maxFontSizeMultiplier={1.2}
            numberOfLines={1}
            className="font-bold text-[14px]"
            style={{ color: themeColors.accentBright }}
          >
            {weightKg != null ? `${formatNum(weightKg)} кг` : 'записать вес'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
