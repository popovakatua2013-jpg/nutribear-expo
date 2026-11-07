// Единый реестр показателей дневника — один источник правды для
// итоговых карточек «Отчётов», календаря-теплокарты, истории
// по дням и шерингового «Итогов».
// Раньше одинаковые массивы METRICS копировались в трёх файлах и
// расходились: «Ккал» vs «Калории», разные цвета и форматы.
// Отдельного реестра «для отчётов» больше нет: REPORT_METRICS был
// чистым алиасом METRICS и только путал (два имени одного массива).
// «Опыт» из списка убран: организм его не использует, а в интерфейсе
// он только путал. Значение по-прежнему пишется в историю дней —
// данные не теряются, если опыт понадобится позже.
// «Сон» вернулся в реестр вместе с настоящим трекером (ввод «лёг/встал»,
// поле sleepMin — минуты за день пробуждения): окно истории, теплокарта
// и сравнение периодов работают для него как для остальных показателей.

import { Droplets, Flame, Footprints, MoonStar, Scale, Sparkles } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { formatLiters } from '@/lib/data/reports'
import { fmtSleep } from '@/lib/data/sleep'

// gen — родительный падеж для подзаголовка окна истории
// («Динамика шагов за 30 дней»)
export const METRICS = [
  {
    key: 'steps',
    label: 'Шаги',
    gen: 'шагов',
    Icon: Footprints,
    color: '#4ade80',
    invert: false, // рост — хорошо
    yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}к` : `${Math.round(v)}`),
    fmt: (v) => formatNum(v),
  },
  {
    key: 'kcal',
    label: 'Калории',
    gen: 'калорий',
    Icon: Flame,
    color: '#f87171',
    invert: true, // рост — переедание, отмечается красным
    yFmt: (v) => `${Math.round(v)}`,
    fmt: (v) => formatNum(v),
  },
  {
    key: 'waterMl',
    label: 'Вода',
    gen: 'воды',
    Icon: Droplets,
    color: '#38bdf8',
    invert: false,
    yFmt: (v) => (v >= 1000 ? `${Math.round(v / 1000)}л` : `${Math.round(v)}`),
    fmt: (v) => formatLiters(v),
  },
  {
    key: 'burned',
    label: 'Сожжено',
    gen: 'сожжённых калорий',
    Icon: Sparkles,
    color: '#fb923c',
    invert: false,
    yFmt: (v) => `${Math.round(v)}`,
    fmt: (v) => formatNum(v),
  },
  {
    key: 'sleepMin',
    label: 'Сон',
    gen: 'сна',
    Icon: MoonStar,
    color: '#c084fc',
    invert: false, // больше сна — хорошо (до верхней границы нормы)
    yFmt: (v) => `${Math.round(v / 60)}ч`, // ось столбиков истории — часы
    fmt: (v) => fmtSleep(v), // «7 ч 30 мин»
  },
]

// «Вес» — НЕ в массиве METRICS: дневная история (useHistoryStore) вес не
// хранит (он живёт в useProfileStore.weights), а шеринговые карточки
// перебирают METRICS и в дневных итогах веса нет. Как единый дескриптор
// для окна истории «Вес · история» (Катя: история — для ВСЕХ карточек)
// вес описан отдельным экспортом: тот же набор полей, что у METRICS,
// и цвет карточки «Вес» в «Отчётах» (#a78bfa).
export const WEIGHT_METRIC = {
  key: 'weight',
  label: 'Вес',
  gen: 'веса',
  Icon: Scale,
  color: '#a78bfa',
  invert: false, // тон Δ веса считает само окно (к здоровому диапазону)
  yFmt: (v) => `${Math.round(v)}`,
  fmt: (v) => `${(Math.round((v || 0) * 10) / 10).toFixed(1).replace('.', ',')} кг`,
}
