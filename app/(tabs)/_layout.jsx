// Нижняя навигация: Главная / Активность / ИМТ / Магазин / Ещё
// (та же структура, что в веб-версии)

import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Footprints, House, Menu, Scale, ShoppingCart } from 'lucide-react-native'

const TABS = [
  { name: 'index', label: 'Главная', Icon: House },
  { name: 'activity', label: 'Активность', Icon: Footprints },
  { name: 'bmi', label: 'ИМТ', Icon: Scale },
  { name: 'shop', label: 'Магазин', Icon: ShoppingCart },
  { name: 'more', label: 'Ещё', Icon: Menu },
]

export default function TabsLayout() {
  // В SDK 58 Android работает edge-to-edge: системная нижняя панель
  // (жесты/кнопки) рисуется поверх приложения — добавляем её высоту
  // в панель вкладок, иначе она перекрывает меню
  const insets = useSafeAreaInsets()

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#5C668A',
        tabBarStyle: {
          backgroundColor: '#0C1327',
          borderTopColor: 'rgba(255,255,255,0.06)',
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 10, fontFamily: 'Inter_600SemiBold' },
        sceneStyle: { backgroundColor: '#0A1020' },
      }}
    >
      {TABS.map(({ name, label, Icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarIcon: ({ color }) => <Icon size={22} color={color} />,
          }}
        />
      ))}
    </Tabs>
  )
}
