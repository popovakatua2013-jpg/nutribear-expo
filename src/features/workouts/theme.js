// src/features/workouts/theme.js — токены дизайн-системы вкладки «Тренировки»
// Палитра и сетка — из референса вкладки (ТЗ, раздел 4). Шрифты — Inter
// приложения (400/600/800 загружены в корневом layout), чтобы вкладка
// не выбивалась из типографики NutriBear.

export const colors = {
  bg: '#0A0C10',
  surface: '#14181F',
  surface2: '#1B212B',
  card: '#171C24',
  line: '#232B37',
  text: '#F2F5F7',
  text2: '#8B95A5',
  text3: '#5A6472',
  accent: '#C8FF3D',
  accentInk: '#101400',
  accentSoft: 'rgba(200,255,61,0.14)',
  accentBorder: 'rgba(200,255,61,0.25)',
  cyan: '#3DDCF2',
  cyanSoft: 'rgba(61,220,242,0.13)',
  orange: '#FF7A45',
  orangeSoft: 'rgba(255,122,69,0.15)',
}

/** Шаг сетки — 4pt, боковые поля экрана — 20pt */
export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 22,
}

export const radius = {
  field: 14,
  row: 16,
  card: 18,
  screen: 20,
}

/** Типографическая шкала. В приложении загружены три начертания Inter
 *  (400/600/800): «700» даём как Inter_600SemiBold, как в tailwind-конфиге */
export const F = {
  400: 'Inter_400Regular',
  600: 'Inter_600SemiBold',
  700: 'Inter_600SemiBold',
  800: 'Inter_800ExtraBold',
}

export const type = {
  display: { fontSize: 30, fontWeight: '800', fontFamily: F[800] },
  metric: { fontSize: 23, fontWeight: '800', fontFamily: F[800] },
  title: { fontSize: 17, fontWeight: '800', fontFamily: F[800] },
  body: { fontSize: 14, fontWeight: '400', fontFamily: F[400] },
  caption: { fontSize: 12, fontWeight: '600', fontFamily: F[600] },
  tab: { fontSize: 10.5, fontWeight: '700', fontFamily: F[700] },
}

/** Цвета бейджей уровней */
export const levelStyles = {
  beginner: { bg: 'rgba(61,220,242,0.14)', color: colors.cyan },
  intermediate: { bg: 'rgba(200,255,61,0.13)', color: colors.accent },
  advanced: { bg: 'rgba(255,122,69,0.15)', color: colors.orange },
}

/** Пороги интенсивности календаря, минуты */
export const CALENDAR_THRESHOLDS = { l1: 15, l2: 30 }

/** Длительность анимаций, мс */
export const motion = {
  press: 150,
  chip: 180,
  list: 240,
  ring: 600,
  bars: 400,
  counters: 500,
  stagger: 40,
}
