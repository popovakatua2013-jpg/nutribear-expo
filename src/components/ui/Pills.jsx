// Универсальный переключатель-«пилюли»: периоды (7/30/90), показатели
// (шаги/калории/…), минуты в тренировках. Раньше этот паттерн был
// скопирован в четырёх местах с чуть разными отступами и цветами.
// Активная пилюля — градиент (полный фирменный или в цвет показателя,
// если у пункта задан color), неактивная — серая подложка.
//
// Пункт с disabled: true — «заблокирован»: серый, приглушён, с замком
// (отзыв Кати: динамика за 30/90 дней открывается, только когда
// пользователь дойдёт до 30-го/90-го дня ведения дневника — зачем
// 90 дней тому, кто на 7-м). Тап по заблокированной пилюле ничего
// не выбирает — подсказку показывает вызывающий экран.

import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Lock } from 'lucide-react-native'

const BRAND = ['#4D7CFE', '#8B5CF6', '#A45BFF']

export function Pills({ items, value, onChange, size = 'sm', accessibilityLabel }) {
  // Отступы и размер текста отдельно: у заблокированного пункта рядом
  // с текстом стоит замок, и строка собирается из иконки + текста
  const pad = size === 'sm' ? { box: 'px-2.5 py-1.5', text: 'text-[15px]' } : { box: 'px-3 py-1.5', text: 'text-[16px]' }

  return (
    <View className="flex-row flex-wrap gap-1.5" accessibilityLabel={accessibilityLabel}>
      {items.map((it) => {
        const active = it.id === value
        const locked = !!it.disabled
        const pill = (
          <View
            className={`flex-row items-center gap-1 ${pad.box}`}
            style={locked ? { opacity: 0.5 } : null}
          >
            {locked && <Lock size={11} color={active ? '#FFFFFF' : '#8B96B8'} />}
            <Text className={`${pad.text} font-semibold ${active ? 'text-white' : 'text-bear-dim'}`}>
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
                colors={it.color ? [it.color, `${it.color}99`] : BRAND}
              >
                {pill}
              </LinearGradient>
            ) : (
              <View className="bg-white/5">{pill}</View>
            )}
          </Pressable>
        )
      })}
    </View>
  )
}
