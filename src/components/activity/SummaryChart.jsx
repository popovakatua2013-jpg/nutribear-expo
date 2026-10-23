// Зелёный график шагов: 7 дней — по дням недели, 30/90 — по неделям.
// Реальные данные сегодня подмешиваются в последнюю точку.

import { useMemo } from 'react'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { history, weeklyHistory } from '@/lib/data/activity'

function yTick(v) {
  return v >= 1000 ? `${Math.round(v / 1000)}к` : `${v}`
}

// Реальные данные сегодня подмешиваются в последнюю точку:
// в дневном режиме — замена строки, в недельном — прибавление к корзине
function blendToday(rows, today, weekly) {
  return rows.map((row, i) => {
    if (i !== rows.length - 1) return row
    if (!weekly) {
      return { ...row, ...today } // подпись дня недели остаётся (Пн…Вс)
    }
    return {
      ...row,
      steps: row.steps + (today.steps || 0),
      kcal: row.kcal + (today.kcal || 0),
      waterMl: row.waterMl + (today.waterMl || 0),
      xp: row.xp + (today.xp || 0),
    }
  })
}

export function SummaryChart({ today, days, weekly }) {
  const rows = useMemo(
    () => blendToday(weekly ? weeklyHistory(days) : history(days), today, weekly),
    [days, weekly, today]
  )

  return <SvgAreaChart data={rows.map((r) => ({ label: r.label, value: r.steps }))} color="#4ade80" height={190} yFmt={yTick} />
}
