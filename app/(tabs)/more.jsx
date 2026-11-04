// Экран «Ещё»: профиль, цель питания, данные и информация о приложении.
// Шапка экрана — с мягкой неоновой дымкой, как на вкладке «Тело»
// (единый стиль страниц)

import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Settings } from 'lucide-react-native'
import { ProfileEditor } from '@/components/more/ProfileEditor'
import { GoalPicker } from '@/components/more/GoalPicker'
import { MealRemindersCard } from '@/components/more/MealRemindersCard'
import { WeighReminderCard } from '@/components/more/WeighReminderCard'
import { WeighNudgeCard } from '@/components/more/WeighNudgeCard'
import { HapticsCard } from '@/components/more/HapticsCard'
import { SyncCard } from '@/components/more/SyncCard'
import { DataPortability } from '@/components/more/DataPortability'
import { DataActions } from '@/components/more/DataActions'
import { AboutCard } from '@/components/more/AboutCard'
import { SoftGlow } from '@/components/ui/SoftGlow'
import { BodyChip } from '@/components/ui/BodyChip'

export default function MoreScreen() {
  const insets = useSafeAreaInsets()

  return (
    <View className="flex-1 bg-bear-bg">
      {/* Неоновая дымка в шапке — единый стиль страниц (как на «Теле») */}
      <SoftGlow id="glowMoreTR" w={190} h={160} peak={0.26} color="#7C3AED" style={{ top: -26, right: -46 }} />
      <SoftGlow id="glowMoreL" w={120} h={150} peak={0.12} color="#4D7CFE" style={{ top: 60, left: -40 }} />
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingHorizontal: 16,
          gap: 16,
          paddingBottom: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Шапка экрана: иконка-чип (стиль «Тела») + заголовок + подзаголовок */}
        <View className="flex-row items-center gap-3">
          <BodyChip icon={<Settings size={19} />} size={40} />
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
        <WeighNudgeCard />
        <HapticsCard />
        <SyncCard />
        <DataPortability />
        <DataActions />
        <AboutCard />
      </ScrollView>
    </View>
  )
}
