// Нижняя навигация: Главная / Дневник / ИМТ / Организм / Ещё.
// Активная вкладка — иконка
// в фиолетовой «пилюле» с мягкой подсветкой, неактивные —
// серые, без подложки: сразу видно, где вы находитесь.

import { View } from 'react-native'
import { Tabs } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { BookOpen, House, Menu, PersonStanding, Scale, Sparkles } from 'lucide-react-native'

const TABS = [
  { name: 'index', label: 'Главная', Icon: House },
  { name: 'activity', label: 'Дневник', Icon: BookOpen },
  { name: 'bmi', label: 'Тело', Icon: PersonStanding },
  { name: 'organism', label: 'Организм', Icon: Sparkles },
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
          height: 64 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
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
