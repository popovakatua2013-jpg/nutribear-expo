// Окно «Вода»: фоновая сцена с мишкой, прогресс-кольцо, карточки
// ёмкостей (4 в ряд, карандашик у каждой). Тумблер напоминаний — в шапке

import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Droplets } from 'lucide-react-native'
import { VesselCard } from './VesselCard'
import { WaterRing } from './WaterRing'
import { ReminderToggle, ReminderIntervals } from './WaterReminder'
import { useActivityStore } from '@/store/useActivityStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useToast } from '../ui/Toast'
import { WATER_GLASS } from '@/lib/data/activity'
import { formatNum } from '@/lib/format'

const SCENE = require('../../../assets/images/water-bear.png')

export function WaterModal({ open, onClose, goalMl, ml }) {
  const vessels = useActivityStore((s) => s.vessels)
  const addWater = useActivityStore((s) => s.addWater)
  const reminder = useActivityStore((s) => s.reminder)
  const goals = useGoalsStore((s) => s.goals)
  const { toast } = useToast()

  const glasses = Math.round(ml / WATER_GLASS)
  const glassesGoal = Math.max(1, Math.round(goalMl / WATER_GLASS))
  const pct = Math.min(100, Math.round((ml / Math.max(1, goalMl)) * 100))

  function drink(v) {
    addWater(v.ml)
    toast({
      title: `💧 ${v.label} — ${v.ml} мл`,
      description: `${pct}% → ${Math.min(100, Math.round(((ml + v.ml) / Math.max(1, goals.waterMl)) * 100))}% нормы`,
    })
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10">
          {/* Градиентный фон окна */}
          <LinearGradient
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={['#16234A', '#131E3A', '#101A36']}
          >
            {/* Сцена с мишкой прибита к низу окна */}
            <View pointerEvents="none" className="absolute inset-x-0 bottom-0 h-[200px]">
              <Image
                source={SCENE}
                style={{ width: '100%', height: '100%', resizeMode: 'cover', opacity: 0.9 }}
              />
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                colors={['#131E3A', 'rgba(19,30,58,0.3)', 'transparent']}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 90 }}
              />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 }}>
              <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Droplets size={18} color="#38BDF8" />
                    <Text className="font-bold text-[15px] text-bear-text">Вода</Text>
                  </View>
                  <Text className="mt-0.5 font-sans text-xs text-bear-sub">
                    Выпито {formatNum(ml)} из {formatNum(goalMl)} мл
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <ReminderToggle />
                  <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
                    <X size={20} color="#8A94B3" />
                  </Pressable>
                </View>
              </View>

              {reminder.enabled && (
                <View className="px-5 pt-3">
                  <ReminderIntervals />
                </View>
              )}

              <View className="px-5 pt-4">
                <View className="flex-row items-center gap-4">
                  <WaterRing pct={pct} glasses={glasses} glassesGoal={glassesGoal} />
                  <Text className="flex-1 font-sans text-[12px] leading-relaxed text-bear-sub">
                    Нажмите на ёмкость, чтобы записать выпитую воду.{'\n'}
                    Карандашик меняет название и объём.
                  </Text>
                </View>

                <View className="mt-4 flex-row gap-2">
                  {vessels.map((v) => (
                    <VesselCard key={v.id} vessel={v} onDrink={drink} />
                  ))}
                </View>
              </View>
            </ScrollView>
          </LinearGradient>
        </View>
      </View>
    </Modal>
  )
}
