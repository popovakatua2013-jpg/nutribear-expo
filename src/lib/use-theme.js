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
