// Панель «План питания» 1 в 1 с макетом: единая неоновая панель
// (светящаяся кайма + сине-индиго градиент) с шапкой — плитка с приборами,
// заголовок, подзаголовок, круглая чаша справа, — компактными рядами
// приёмов пищи (фото, название, «X / Y ккал», яркая цветная полоска
// прогресса и цветной акцент на левом крае) и футером
// «Всего за день: X / Y ккал». Тап по ряду — добавить блюдо.

import { useState } from 'react'
import { Image, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Sun } from 'lucide-react-native'
import { MealCard } from './MealCard'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { useFoodStore } from '@/store/useFoodStore'
import { mealConsumed, totalConsumed } from '@/lib/data/diary'
import { MEALS } from '@/lib/data/meals'
import { targetsFromKcal } from '@/lib/data/goals'
import { useGoalsStore } from '@/store/useGoalsStore'
import { formatNum } from '@/lib/format'

// Цвета акцентов и полосок прогресса по приёмам пищи — как в макете
const ACCENTS = {
  breakfast: { accent: '#FF3D7F', bar: ['#FF9EC4', '#FF3D8E'] },
  lunch: { accent: '#38C6FF', bar: ['#67E3F9', '#2E9BFF'] },
  dinner: { accent: '#34D399', bar: ['#8CF5B0', '#22C973'] },
  snack: { accent: '#A78BFA', bar: ['#CDBAFF', '#8E4BFF'] },
}

export function MealPlanCard({ onAdd, onRemove, onViewAll }) {
  const entries = useFoodStore((s) => s.entries)
  const goals = useGoalsStore((s) => s.goals)
  const [historyOpen, setHistoryOpen] = useState(false)

  const targets = targetsFromKcal(goals.kcal)
  const dayKcal = totalConsumed(entries)

  return (
    <View
      accessibilityLabel="План питания на сегодня"
      style={{
        shadowColor: '#7C5CFC',
        shadowOpacity: 0.45,
        shadowRadius: 34,
        shadowOffset: { width: 0, height: 10 },
      }}
    >
      {/* Светящаяся кайма панели — как у блока «Ваши цели» */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['rgba(168,152,255,0.90)', 'rgba(105,116,238,0.22)', 'rgba(158,138,255,0.62)']}
        style={{ borderRadius: 21, padding: 1.5 }}
      >
        {/* Тело панели: насыщенный сине-индиго, светлее сверху (как в макете) */}
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['#20327E', '#0D1B5A', '#0A1348']}
          style={{ borderRadius: 20, padding: 10 }}
        >
          {/* Круглая чаша в правом верхнем углу — как в макете */}
          <Image
            source={require('../../../assets/images/plan-bowl.png')}
            style={{
              position: 'absolute',
              top: -10,
              right: 4,
              width: 72,
              height: 72,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.14)',
            }}
          />

          <PlanHeader onViewAll={onViewAll} onHistory={() => setHistoryOpen(true)} rightInset={80} />

          <View className="gap-2">
            {MEALS.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                target={targets[meal.id]}
                consumed={mealConsumed(entries, meal.id)}
                entries={entries[meal.id] || []}
                accent={ACCENTS[meal.id]}
                onAdd={() => onAdd(meal.id)}
                onRemove={(entryId) => onRemove(meal.id, entryId)}
                onShowAll={onViewAll}
              />
            ))}
          </View>

          {/* Футер: итого за день — как в макете */}
          <View
            style={{
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.08)',
              marginTop: 10,
              marginBottom: 8,
            }}
          />
          <View className="flex-row items-center px-1 pb-0.5">
            <Sun size={13} color="#8F9BC7" />
            <Text
              maxFontSizeMultiplier={1.15}
              className="ml-1.5 font-sans text-[11.5px] text-bear-sub2"
            >
              Всего за день:
            </Text>
            <Text
              maxFontSizeMultiplier={1.15}
              className="ml-1.5 font-bold text-[13px] text-bear-text"
            >
              {`${formatNum(dayKcal)}\u00A0/\u00A0${formatNum(goals.kcal)} ккал`}
            </Text>
          </View>

          <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />
        </LinearGradient>
      </LinearGradient>
    </View>
  )
}
