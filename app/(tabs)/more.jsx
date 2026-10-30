// Экран «Ещё»: профиль, цель питания, данные и информация о приложении

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { GoalPicker } from '@/components/more/GoalPicker'
import { MealRemindersCard } from '@/components/more/MealRemindersCard'
import { WeighReminderCard } from '@/components/more/WeighReminderCard'
import { SyncCard } from '@/components/more/SyncCard'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { AboutCard } from '@/components/more/AboutCard'

export default function MoreScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-bear-bg">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
          Ещё
        </Text>

        <ProfileEditor />
        <GoalPicker />
        <MealRemindersCard />
        <WeighReminderCard />
        <SyncCard />
        <DataPortability />
        <DataActions />
        <AboutCard />
      </ScrollView>
    </View>
  )
}
