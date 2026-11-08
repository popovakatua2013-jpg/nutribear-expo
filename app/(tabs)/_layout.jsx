// Нижняя навигация: Главная / Дневник / Тело / План / Ещё.
// «План» — питание на неделю (маршрут /workouts сохранён).
// «Покупки» — НЕ вкладка (решение Кати: убрать отдельную вкладку с
// нижней панели): маршрут /shopping остаётся, но скрыт из панели
// (href: null) — экран открывается с карточки «Список покупок» на
// вкладке «План». Активная вкладка — иконка
// в фиолетовой «пилюле» с мягкой подсветкой, неактивные —
// серые, без подложки: сразу видно, где вы находитесь.

import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookOpen, CalendarDays, House, Menu, PersonStanding, ShoppingCart } from 'lucide-react-native'

const TABS = [
  { name: 'index', label: 'Главная', Icon: House },
  { name: 'activity', label: 'Дневник', Icon: BookOpen },
  { name: 'bmi', label: 'Тело', Icon: PersonStanding },
  // «План»: меню на неделю (маршрут /workouts сохранён, чтобы не
  // ломать возможные ссылки); иконка — календарь недели:
  // план-лист не понравился визуально (отзыв Кати)
  { name: 'workouts', label: 'План', Icon: CalendarDays },
  // «Покупки»: маршрут остаётся (/shopping — с карточки на «Плане»),
  // но из нижней панели убран по решению Кати (hidden → href: null)
  { name: 'shopping', label: 'Покупки', Icon: ShoppingCart, hidden: true },
  { name: 'more', label: 'Ещё', Icon: Menu },
]

// Пилюля активной вкладки: фиксированный размер, чтобы
// иконки не прыгали при переключении
function TabIcon({ Icon, color, focused }) {
  return (
    <View
      className="items-center justify-center"
      style={{
        width: 46,
        height: 30,
        borderRadius: 15,
        backgroundColor: focused ? 'rgba(123,108,246,0.18)' : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: 'rgba(167,139,250,0.28)',
      }}
    >
      <Icon size={22} color={color} />
    </View>
  )
}

export default function TabsLayout() {
  // В SDK 58 Android работает edge-to-edge: системная нижняя панель
  // (жесты/кнопки) рисуется поверх приложения — добавляем её высоту
  // в панель вкладок, иначе она перекрывает меню
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#A78BFA',
        tabBarInactiveTintColor: '#8B96B8',
        tabBarStyle: {
          backgroundColor: '#0C1327',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 68 + insets.bottom,
          paddingBottom: 7 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11.5, fontFamily: 'Inter_600SemiBold' },
        sceneStyle: { backgroundColor: '#0A1020' },
      }}
    >
      {TABS.map(({ name, label, Icon, hidden }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            // hidden — маршрут жив, но иконки в панели нет («Покупки»)
            ...(hidden ? { href: null } : {}),
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={Icon} color={color} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  )
}
