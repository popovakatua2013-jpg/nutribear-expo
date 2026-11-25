// Хук темы оформления: возвращает выбранную (с учётом подписки) тему
// и готовый объект CSS-переменных для NativeWind vars(). Обёртка над
// чистым src/lib/themes.js — здесь nativewind и сторы, поэтому в
// Node-тестах файл не используется (тестируется themes.js).
//
// Использование (app/_layout.jsx): <View style={style}> на корне —
// переменные наследуются через React-контекст во всё поддерево,
// включая RN-модалки (это тот же React-дерево).

import { useMemo } from 'react'
import { vars } from 'nativewind'
import { THEMES, resolveThemeId, themeToCssVars, DEFAULT_THEME_ID } from '@/lib/themes'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useProStore } from '@/store/useProStore'

export function useThemeVars() {
  const themeId = useUiPrefsStore((s) => s.themeId)
  const pro = useProStore((s) => s.pro)
  return useMemo(() => {
    const theme = THEMES[resolveThemeId(themeId, pro) || DEFAULT_THEME_ID]
    return { theme, style: vars(themeToCssVars(theme)) }
  }, [themeId, pro])
}

// Цвета активной темы для style-пропсов и иконок: компоненты, где цвет
// задан не классом, а значением (backgroundColor в style, color иконки
// lucide), берут их отсюда — правка Кати 24.11: «при смене тем меняется
// частично вкладки и часть блоков». Возвращает те же токены, что и
// bear.* в tailwind.config.js; работает в любом поддереве — это простые
// значения, а не CSS-переменные
export function useThemeColors() {
  const themeId = useUiPrefsStore((s) => s.themeId)
  const pro = useProStore((s) => s.pro)
  return useMemo(
    () => THEMES[resolveThemeId(themeId, pro) || DEFAULT_THEME_ID].colors,
    [themeId, pro]
  )
}

// Флаг «без эффектов» (тема «Чёрно-белая», просьба Кати 26.11: «одну
// бесплатную черно-белую без каких либо эффектов»): true — компоненты
// эффектов (NeonCard, GradientTile, SoftGlow, CollapsibleCard) рисуют
// плоские поверхности без свечения, ореолов и градиентов. У остальных
// тем флаг не задан → false
export function useThemePlain() {
  const themeId = useUiPrefsStore((s) => s.themeId)
  const pro = useProStore((s) => s.pro)
  return useMemo(
    () => Boolean(THEMES[resolveThemeId(themeId, pro) || DEFAULT_THEME_ID].plain),
    [themeId, pro]
  )
}
