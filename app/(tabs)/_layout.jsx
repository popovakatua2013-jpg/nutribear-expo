// Нижняя навигация: Главная / Активность / ИМТ / Ещё
// (магазин удалён по запросу). Активная вкладка — иконка
// в фиолетовой «пилюле» с мягкой подсветкой, неактивные —
// серые, без подложки: сразу видно, где вы находитесь.

import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Footprints, House, Menu, Scale } from 'lucide-react-native'

const TABS = [
  { name: 'index', label: 'Главная', Icon: House },
  { name: 'activity', label: 'Активность', Icon: Footprints },
  { name: 'bmi', label: 'ИМТ', Icon: Scale },
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
        height: 27,
        borderRadius: 14,
        backgroundColor: focused ? 'rgba(123,108,246,0.18)' : 'transparent',
        borderWidth: focused ? 1 : 0,
        borderColor: 'rgba(167,139,250,0.28)',
      }}
    >
      <Icon size={20} color={color} />
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
            tabBarIcon: ({ color, focused }) => <TabIcon Icon={Icon} color={color} focused={focused} />,
          }}
        />
      ))}
    </Tabs>
  )
}
