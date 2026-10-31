// Единый реестр показателей дневника — один источник правды для
// «Общей сводки», карточек «Отчётов» и «Сравнения по неделям».
// Раньше одинаковые массивы METRICS копировались в трёх файлах и
// расходились: «Ккал» vs «Калории», разные цвета и форматы.

import { Droplets, Flame, Footprints, Sparkles, Star } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { formatLiters } from '@/lib/data/reports'

export const METRICS = [
  {
    key: 'steps',
    label: 'Шаги',
    Icon: Footprints,
    color: '#4ade80',
    invert: false, // рост — хорошо
    yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}к` : `${Math.round(v)}`),
    fmt: (v) => formatNum(v),
  },
  {
    key: 'kcal',
    label: 'Калории',
    Icon: Flame,
    color: '#f87171',
    invert: true, // рост — переедание, отмечается красным
    yFmt: (v) => `${Math.round(v)}`,
    fmt: (v) => formatNum(v),
  },
  {
    key: 'waterMl',
    label: 'Вода',
    Icon: Droplets,
    color: '#38bdf8',
    invert: false,
    yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}л` : `${Math.round(v)}`),
    fmt: (v) => formatLiters(v),
  },
  {
    key: 'burned',
    label: 'Сожжено',
    Icon: Sparkles,
    color: '#fb923c',
    invert: false,
    yFmt: (v) => `${Math.round(v)}`,
    fmt: (v) => formatNum(v),
  },
  {
    key: 'xp',
    label: 'Опыт',
    Icon: Star,
    color: '#a78bfa',
    invert: false,
    yFmt: (v) => (v >= 10000 ? `${(v / 1000).toFixed(1).replace('.', ',')}к` : `${Math.round(v)}`),
    fmt: (v) => `+${formatNum(v)}`,
  },
]

export function metricById(id) {
  return METRICS.find((m) => m.key === id) || METRICS[0]
}

// Показатели отчётов и недельного сравнения — все пять, включая
// «Сожжено»: это вся активность дня (тренировки + шаги), данные
// в историю пишутся полностью, скрывать её в отчётах больше нет причин
export const REPORT_METRICS = METRICS
