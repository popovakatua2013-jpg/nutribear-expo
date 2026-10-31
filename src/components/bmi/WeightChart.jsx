// Зелёный график «Динамика веса»: линия с точками и заливкой,
// по осям — дни недели (Пн…Вс) и вес в килограммах.
// Если цель по весу задана — золотой пунктир «цель».

import { memo } from 'react'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { fmtDecimal } from '@/lib/data/bmi'

function WeightChartImpl({ data, goalKg = null }) {
  return (
    <SvgAreaChart
      data={data.map((d) => ({ label: d.label, value: d.kg }))}
      color="#4ade80"
      height={150}
      yFmt={(v) => `${Math.round(v)}`}
      goalLine={goalKg}
    />
  )
}

// memo: график не должен перерисовываться при вводе в модалке
export const WeightChart = memo(WeightChartImpl)
