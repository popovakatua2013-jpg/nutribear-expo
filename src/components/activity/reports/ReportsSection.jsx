// Секция «Отчёты»: празднование цели по весу, карточки итогов за период
// (с Δ% к прошлому периоду) и недельное сравнение. Период выбирается
// один раз — в шапке «Общей сводки» выше по экрану (раньше одинаковый
// переключатель 7/30/90 дублировался здесь вторым рядом).

import { Text, View } from 'react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'
import { WeeksChart } from './WeeksChart'

export function ReportsSection({ today, days }) {
  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
        Отчёты
      </Text>

      <GoalCelebration />
      <ReportCards today={today} days={days} />
      <WeeksChart today={today} />
    </View>
  )
}
