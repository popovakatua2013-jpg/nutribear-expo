// Карточка «Оформление»: выбор темы приложения. «Классика» —
// бесплатная тема, прежняя navy-палитра до премиум-оформления
// (правка Кати 28.11: «мне не нравится как выглядит бело-черная тема.
// Давай бесплатную тему сделаем которая была до премиум темы —
// однотонная без эффектов и свечения» — чёрно-белая удалена);
// остальные пять — Premium
// (без подписки премиум-тема не применяется: тап показывает подсказку).
// Правка Кати 27.11: тема «Приглушённая» удалена, подсказка внизу
// списка («Семь тем. Бесплатная — …») удалена — список тем без подписи
// Выбор живёт в useUiPrefsStore.themeId и переживает перезапуск;
// переменные темы прокидываются в корневом макете (use-theme.js).
// Режим embedded: содержимое встраивается в строку меню «Оформление»
// (как PremiumCard, DataPortability и пр.).

import { Pressable, Text, View } from 'react-native'
import { Check, Lock } from 'lucide-react-native'
import { THEMES, THEME_ORDER } from '@/lib/themes'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useProStore } from '@/store/useProStore'
import { useToast } from '../ui/Toast'
import { hapticFeedback } from '@/lib/haptics'
import { useThemeColors } from '@/lib/use-theme'


// Мини-превью темы: полоска фона с «карточкой» и точкой текста —
// пользователь видит оттенок до переключения
function ThemeSwatch({ colors, size = 46 }) {
  return (
    <View
      className="shrink-0 items-center justify-center overflow-hidden rounded-[13px]"
      style={{ width: size, height: size, backgroundColor: colors.bg, borderColor: colors.line, borderWidth: 1 }}
    >
      <View
        style={{
          width: size * 0.62,
          height: size * 0.42,
          borderRadius: 7,
          backgroundColor: colors.card,
        }}
      />
      <View
        style={{
          position: 'absolute',
          top: size * 0.16,
          left: size * 0.14,
          width: size * 0.3,
          height: 3,
          borderRadius: 2,
          backgroundColor: colors.sub,
        }}
      />
    </View>
  )
}

export function ThemeCard({ embedded = false }) {
  const themeColors = useThemeColors()
  const themeId = useUiPrefsStore((s) => s.themeId)
  const setTheme = useUiPrefsStore((s) => s.setTheme)
  const pro = useProStore((s) => s.pro)
  const { toast } = useToast()

  function pick(theme) {
    if (theme.premium && !pro) {
      toast({
        title: `🎨 Тема «${theme.title}» — в Premium`,
        description: 'Оформление открывается с Premium: «Ещё» → «Премиум»',
      })
      return
    }
    hapticFeedback('selection')
    setTheme(theme.id)
    toast({
      title: `🎨 Тема «${theme.title}» включена`,
      description: theme.premium ? 'Спасибо, что вы с нами 👑' : 'Прежняя однотонная палитра приложения',
    })
  }

  const content = (
    <View className="gap-1.5" accessibilityLabel="Оформление">
      {THEME_ORDER.map((id) => {
        const theme = THEMES[id]
        const selected = themeId === id
        const locked = theme.premium && !pro
        return (
          <Pressable
            key={id}
            onPress={() => pick(theme)}
            accessibilityRole="button"
            accessibilityLabel={
              locked
                ? `Тема ${theme.title} — доступна в Premium`
                : `Включить тему ${theme.title}`
            }
            accessibilityState={{ selected }}
            className={`flex-row items-center gap-3 rounded-2xl border px-3 py-2.5 active:opacity-80 ${
              selected ? 'border-bear-accentBorder bg-bear-accentFaint' : 'border-bear-line bg-bear-overlay'
            }`}
          >
            <ThemeSwatch colors={theme.colors} />
            <View className="min-w-0 flex-1">
              <Text className="font-bold text-[16px] text-bear-text">{theme.title}</Text>
              <Text className="mt-0.5 font-sans text-[13px] text-bear-sub2">
                {theme.premium ? 'Premium 👑' : 'бесплатная'}
              </Text>
            </View>
            {locked ? (
              <Lock size={16} color={themeColors.dim} />
            ) : selected ? (
              <Check size={18} color={themeColors.accentBright} strokeWidth={2.5} />
            ) : null}
          </Pressable>
        )
      })}
    </View>
  )

  if (embedded) {
    return <View accessibilityLabel="Оформление">{content}</View>
  }

  return (
    <View
      accessibilityLabel="Оформление"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      {content}
    </View>
  )
}
