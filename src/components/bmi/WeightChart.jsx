// Зелёный график «Динамика веса»: линия с точками и заливкой,
// по осям — дни недели (Пн…Вс) и вес в килограммах.
// Если цель по весу задана — золотой пунктир «цель»; над последней
// точкой — плашка значения (lastBadge, как на макете пользователя).

import { memo } from 'react'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { fmtDecimal } from '@/lib/data/bmi'

function WeightChartImpl({ data, goalKg = null, lastBadge = false }) {
  return (
    <SvgAreaChart
      data={data.map((d) => ({ label: d.label, value: d.kg }))}
      color="#4ade80"
      height={150}
      yFmt={(v) => `${Math.round(v)}`}
      goalLine={goalKg}
      lastBadge={lastBadge}
    />
  )
}

// memo: график не должен перерисовываться при вводе в модалке
export const WeightChart = memo(WeightChartImpl)
