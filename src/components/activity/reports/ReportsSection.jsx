// Секция «Отчёты»: празднование цели по весу и карточки итогов за
// период (с Δ% к прошлому периоду). Период выбирается один раз —
// в шапке «Сводки» выше по экрану. «Сравнение по неделям» переехало
// в «Сводку» режимом «По неделям» — раньше два блока показывали
// похожие графики с одинаковыми переключателями.

import { Text, View } from 'react-native'
import { GoalCelebration } from './GoalCelebration'
import { ReportCards } from './ReportCards'

export function ReportsSection({ today, days }) {
  return (
    <View accessibilityLabel="Отчёты" className="gap-3">
      <Text className="font-extrabold text-[17px] tracking-tight text-bear-text">
        Отчёты
      </Text>

      <GoalCelebration />
      <ReportCards today={today} days={days} />
    </View>
  )
}
