// Экран «Ещё»: профиль, цель питания, данные и информация о приложении

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { GoalPicker } from '@/components/more/GoalPicker'
import { MealRemindersCard } from '@/components/more/MealRemindersCard'
import { WeighReminderCard } from '@/components/more/WeighReminderCard'
import { SyncCard } from '@/components/more/SyncCard'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { ConsoleHelpCard } from '@/components/more/ConsoleHelpCard'
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
        {/* Шапка экрана: иконка-чип + заголовок + подзаголовок */}
        <View className="flex-row items-center gap-3">
          <View className="h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
            <Settings size={19} color="#A78BFA" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-extrabold text-[19px] tracking-tight text-bear-text">
              Ещё
            </Text>
            <Text maxFontSizeMultiplier={1.25} className="font-sans text-[11.5px] text-bear-dim">
              Профиль, цель питания и данные
            </Text>
          </View>
        </View>

        <ProfileEditor />
        <GoalPicker />
        <MealRemindersCard />
        <WeighReminderCard />
        <SyncCard />
        <DataPortability />
        <DataActions />
        <ConsoleHelpCard />
        <AboutCard />
      </ScrollView>
    </View>
  )
}
