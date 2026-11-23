// Нижняя навигация: Главная / Отчёты / Тело / План / Ещё.
// Вкладка «Отчёты» (была «Дневник», переименовано по аудиту Кати
// 16.11: дневник питания живёт на «Главной», вкладка показывает
// статистику периода — название должно совпадать с содержимым).
// «План» — питание на неделю (маршрут /workouts сохранён).
// «Покупки» — НЕ вкладка: раньше её прятали через href: null, но
// expo-router исключает такие экраны из linking и переход на /shopping
// падал на «Главную» (баг Кати). Теперь «Покупки» — отдельная страница
// app/shopping.jsx (стек над вкладками), открывается с карточки
// «Список покупок» на «Плане». Активная вкладка — иконка
// в акцентной «пилюле» активной темы, неактивные — серые,
// без подложки: сразу видно, где вы находитесь.

import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { CalendarDays, ChartColumn, House, Menu, PersonStanding } from 'lucide-react-native'
import { useThemeVars, useThemeColors } from '@/lib/use-theme'

const TABS = [
  { name: 'index', label: 'Главная', Icon: House },
  { name: 'activity', label: 'Отчёты', Icon: ChartColumn },
  { name: 'bmi', label: 'Тело', Icon: PersonStanding },
  // «План»: меню на неделю (маршрут /workouts сохранён, чтобы не
  // ломать возможные ссылки); иконка — календарь недели:
  // план-лист не понравился визуально (отзыв Кати)
  { name: 'workouts', label: 'План', Icon: CalendarDays },
  { name: 'more', label: 'Ещё', Icon: Menu },
]

// Пилюля активной вкладки: фиксированный размер, чтобы
// иконки не прыгали при переключении
function TabIcon({ Icon, color, focused }) {
  const themeColors = useThemeColors()
  return (
    <View
      className="items-center justify-center"
      style={{
        width: 46,
        height: 30,
        borderRadius: 15,
        backgroundColor: focused ? themeColors.accentFaint3 : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: themeColors.accentBorder,
      }}
    >
      <Icon size={22} color={color} />
    </View>
  )
}

export default function TabsLayout() {
  const themeColors = useThemeColors()
  // В SDK 58 Android работает edge-to-edge: системная нижняя панель
  // (жесты/кнопки) рисуется поверх приложения — добавляем её высоту
  // в панель вкладок, иначе она перекрывает меню
  const insets = useSafeAreaInsets()
  // Тема оформления (Premium-фича 23.11): фон панели и сцены — из
  // активной темы; цвет иконок и подсветка активной пилюли — тоже из
  // темы (правка Кати 24.11: «при смене тем меняется частично вкладки»)
  const { theme } = useThemeVars()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeColors.accentBright,
        tabBarInactiveTintColor: themeColors.dim,
        tabBarStyle: {
          backgroundColor: theme.colors.deep,
          borderTopColor: theme.colors.line,
          height: 68 + insets.bottom,
          paddingBottom: 7 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold' },
        sceneStyle: { backgroundColor: theme.colors.bg },
      }}
    >
      {TABS.map(({ name, label, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={Icon} color={color} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  )
}
