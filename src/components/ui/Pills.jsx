// Универсальный переключатель-«пилюли»: периоды (7/30/90), показатели
// (шаги/калории/…), минуты в тренировках, «Сегодня/Вчера» в форме
// тренировки. Раньше этот паттерн был скопирован в четырёх местах с чуть
// разными отступами и цветами. Активная пилюля — ГРАДИЕНТ АКТИВНОЙ ТЕМЫ
// (правка Кати 25.11: «За какой день сегодня/вчера — не перекрашено»:
// раньше активная пилюля всегда была фирменным сине-фиолетовым
// градиентом BRAND, в неоновых темах выбивалась), неактивная —
// приглушённая подложка темы.
//
// Пункт с disabled: true — «заблокирован»: приглушённые цвета и замок
// (отзыв Кати: динамика за 30/90 дней открывается, только когда
// пользователь дойдёт до 30-го/90-го дня ведения дневника — зачем
// 90 дней тому, кто на 7-м). Тап по заблокированной пилюле ничего
// не выбирает — подсказку показывает вызывающий экран.
// Правка Кати 27.11 («не видно под замком надпись 30 дн 90 дн»):
// общий opacity 0.5 топил и подпись, и замок на тёмных темах до
// полной невидимости — вместо него рамка accentBorder: пилюля читается
// как заблокированная, но подпись остаётся разборчивой (dim)

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock } from 'lucide-react-native'
import { useThemeColors } from '@/lib/use-theme'


export function Pills({ items, value, onChange, size = 'sm', accessibilityLabel, color }) {
  const themeColors = useThemeColors()
  // Отступы и размер текста отдельно: у заблокированного пункта рядом
  // с текстом стоит замок, и строка собирается из иконки + текста
  const pad = size === 'sm' ? { box: 'px-2.5 py-1.5', text: 'text-[15px]' } : { box: 'px-3 py-1.5', text: 'text-[16px]' }
  // Цвет активной пилюли: свой у конкретного пункта (it.color), иначе
  // акцент активной темы; градиент — свечение темы, как у кнопок на «Главной»
  const grad = color
    ? [color, `${color}99`]
    : [themeColors.accentBright, themeColors.accent]
  const ink = themeColors.accentOn

  return (
    <View className="flex-row flex-wrap gap-1.5" accessibilityLabel={accessibilityLabel}>
      {items.map((it) => {
        const active = it.id === value
        const locked = !!it.disabled
        const pill = (
          <View
            className={`flex-row items-center gap-1 ${pad.box}`}
            style={locked ? { borderWidth: 1, borderColor: themeColors.accentBorder } : null}
          >
            {locked && <Lock size={11} color={active ? ink : themeColors.dim} />}
            <Text
              className={`${pad.text} font-semibold ${active ? '' : 'text-bear-dim'}`}
              style={active ? { color: ink } : null}
            >
              {it.label}
            </Text>
          </View>
        )
        return (
          <Pressable
            key={it.id}
            onPress={() => {
              if (!locked) onChange(it.id)
            }}
            accessibilityLabel={`${accessibilityLabel ? accessibilityLabel + ' ' : ''}${it.label}${locked ? ' — пока недоступно' : ''}`}
            accessibilityRole="button"
            accessibilityState={{ selected: active, disabled: locked }}
            className="overflow-hidden rounded-full"
          >
            {active ? (
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                colors={it.color ? [it.color, `${it.color}99`] : grad}
              >
                {pill}
              </LinearGradient>
            ) : (
              <View className="bg-bear-accentFaint">{pill}</View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
