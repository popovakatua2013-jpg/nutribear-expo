// Единый реестр показателей дневника — один источник правды для
// графиков «Отчётов», их итоговых карточек и «Сравнения по неделям».
// Раньше одинаковые массивы METRICS копировались в трёх файлах и
// расходились: «Ккал» vs «Калории», разные цвета и форматы.
// Отдельного реестра «для отчётов» больше нет: REPORT_METRICS был
// чистым алиасом METRICS и только путал (два имени одного массива).
// «Опыт» из списка убран: организм его не использует, а в интерфейсе
// он только путал. Значение по-прежнему пишется в историю дней —
// данные не теряются, если опыт понадобится позже.

import { Droplets, Flame, Footprints, Sparkles } from 'lucide-react-native'
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
]
