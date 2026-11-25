// Палитра вкладки «План» — СТРОИТСЯ ИЗ АКТИВНОЙ ТЕМЫ (правка Кати
// 25.11: «вкладка план полностью не в теме»: раньше здесь был
// статичный набор «Классики» — фон #0A1020, карточки #121B33,
// фиолетовые кнопки #7B6CF6, и при переключении на неон вкладка
// оставалась в старых цветах).
//
// Просьба Кати от 09.11 («сделай вкладку план одним цветом что и
// остальное приложение включая кнопки») теперь выполняется БУКВАЛЬНО:
// значения берутся из той же палитры bear.*, что и остальные вкладки
// (tailwind.config.js → src/lib/themes.js), а кнопки/рамки/точки
// светятся акцентом активной темы.
//
// Хук usePlanPalette (ниже) возвращает те же СТРУКТУРЫ P и C, что
// раньше были статичными экспортами — компоненты вкладки меняют одну
// строку импорта на вызов хука, весь остальной код (P.card,
// colors.accent, …) работает как был.

import { useMemo } from 'react'
import { useThemeColors } from '@/lib/use-theme'

// Палитра «Плана» из цветов темы c (THEME_TOKENS). Имена ключей —
// прежние (P.text3, P.tile, P.accentInk, …) — их используют десятки
// мест вкладки
export function buildPlanPalette(c) {
  return {
    bg: c.bg, // фон вкладки — как у всех экранов (bear.bg)
    card: c.card, // карточки разделов (bear.card)
    tile: c.card2, // плитки-иконки, неактивные чипы, тумблеры
    tileSoft: c.accentFaint, // строки внутри карточек — тинт темы
    deep: c.deep, // тёмная поверхность (кружок выбора цели)
    line: c.line, // границы (bear.line)
    text: c.text,
    text2: c.sub,
    text3: c.dim,
    accent: c.accent, // КНОПКИ приложения (заливка: «Подробнее», «В дневник», чекбоксы)
    accentInk: c.accentOn, // текст и иконки НА акцентной кнопке
    accentSoft: c.accentFaint2, // мягкие подложки темы
    accentBorder: c.accentBorder, // рамки темы
    accentText: c.accentBright, // акцентный текст/иконки/точки на тёмном
    blue: c.nutP, // Белки — как в «Дневнике» (NutrientCell)
    orange: c.nutF, // Жиры (+ перебор нормы)
    purple: c.nutC, // Углеводы
    green: c.nutFib, // Клетчатка (график)
    pink: c.nutSug, // Сахар (график)
    red: c.bad, // точка на колокольчике
  }
}

// Палитра для ОКОН вкладки «План» (голодание, добавление блюда,
// граммовка, покупки) — прежние ключи surface/surface2/cyan/cyanSoft.
// Файлы этих окон вызывают usePlanPalette().C (раньше — import { C })
export function buildPlanModalPalette(c) {
  const P = buildPlanPalette(c)
  return {
    ...P,
    surface: c.pop, // подложка активной карточки (bear.pop)
    surface2: c.card2,
    cyan: c.link, // ссылки/второстепенные акценты (bear.link)
    cyanSoft: c.accentFaint,
  }
}

// Хук для компонентов вкладки: const { P, C } = usePlanPalette()
// (или только P / только C — как удобно). Пересобирается при смене темы
export function usePlanPalette() {
  const c = useThemeColors()
  return useMemo(() => ({ P: buildPlanPalette(c), C: buildPlanModalPalette(c) }), [c])
}

// «1 товар / 2 товара / 5 товаров» — для шапки списка покупок
export function goodsWord(n) {
  const m10 = Math.abs(Math.round(n)) % 10
  const m100 = Math.abs(Math.round(n)) % 100
  if (m10 === 1 && m100 !== 11) return 'товар'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'товара'
  return 'товаров'
}
