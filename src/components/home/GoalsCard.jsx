// Блок «Ваши цели» 1 в 1 с макетом (v7, компактный): единая панель насыщенного
// сине-индиго градиента со светящейся каймой, внутри — шапка (иконка-мишень,
// заголовок, подзаголовок, крупная иллюстрация) и четыре стеклянные карточки
// целей с неоновыми рамками: «Калории», «Вода», «Шаги», «Активность» —
// нормы на день, как в макете («1 800 ккал», «6 ст.», «5 000 шагов», «30 мин»),
// под каждой — живой прогресс-бар: заполняется на процент выполнения цели.
// Иллюстрация рисуется под карточками: мишень заходит за карточку
// «Калории», а корона выглядывает за верх панели — как в макете.
// Нажатие на карточку открывает редактор целей.
// v7: панель ужата до пропорций эталона (шапка 38, панель padding 10,
// зазор 7, иконки целей 15) — блок стал заметно компактнее

import { useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Target, Flame, Droplets, Footprints, Dumbbell } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { GoalRow } from './GoalRow'
import { GoalsArt, GoalsArtCorner } from './GoalsArt'
import { GoalsEditModal } from './GoalsEditModal'

export function GoalsCard({ d }) {
  const [editOpen, setEditOpen] = useState(false)
  const openEdit = () => setEditOpen(true)

  return (
    <View
      accessibilityLabel="Ваши цели"
      style={{
        shadowColor: '#7C5CFC',
        shadowOpacity: 0.45,
        shadowRadius: 34,
        shadowOffset: { width: 0, height: 10 },
      }}
    >
      {/* Светящаяся кайма панели (v7) */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['rgba(168,152,255,0.90)', 'rgba(105,116,238,0.22)', 'rgba(158,138,255,0.62)']}
        style={{ borderRadius: 21, padding: 1.5 }}
      >
        {/* Тело панели: насыщенный сине-индиго, светлее сверху (как в макете).
            Без overflow:hidden — корона мишени выглядывает за верх панели */}
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['#20327E', '#0D1B5A', '#0A1348']}
          style={{ borderRadius: 20, padding: 10, gap: 7 }}
        >
          {/* Иллюстрация — под шапкой и под первой карточкой */}
          <GoalsArt
            width={132}
            height={92}
            style={{ position: 'absolute', top: -12, right: 0 }}
          />
          <GoalsArtCorner
            width={104}
            height={78}
            style={{ position: 'absolute', bottom: -3, left: -3 }}
          />

          {/* Шапка прямо на панели (без отдельной карточки, как в макете) */}
          <View className="flex-row items-center gap-2.5 p-1">
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={['#A78BFA', '#7C3AED']}
              style={{
                height: 38,
                width: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#8B5CF6',
                shadowOpacity: 0.55,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 4 },
              }}
            >
              <Target size={19} color="#FFFFFF" />
            </LinearGradient>

            <View className="min-w-0 flex-1">
              <Text
                maxFontSizeMultiplier={1.25}
                className="font-extrabold text-[17px] leading-tight text-bear-text"
              >
                Ваши цели
              </Text>
              <Text
                numberOfLines={2}
                maxFontSizeMultiplier={1.15}
                className="mt-0.5 font-medium text-[10.5px] leading-snug text-bear-sub"
              >
                {'Маленькие шаги приводят\nк большим результатам'}
              </Text>
            </View>
          </View>

          {/* Четыре цели — стеклянные карточки со свечением.
              Нормы-цели и проценты — как в макете */}
          <GoalRow
            icon={<Flame size={15} color="#FFFFFF" />}
            glow="#FB5E8A"
            iconColors={['#FF7A93', '#E8386D']}
            barColors={['#FF9DB4', '#FF2E6E']}
            label="Калории"
            valueText={`${formatNum(d.kcalTarget)} ккал`}
            pctValue={d.kcalPct}
            onPress={openEdit}
          />
          <GoalRow
            icon={<Droplets size={15} color="#FFFFFF" />}
            glow="#38BDF8"
            iconColors={['#4FC9F4', '#2E7CF6']}
            barColors={['#7DDCFE', '#2E9BFF']}
            label="Вода"
            valueText={`${d.glassesGoal} ст.`}
            pctValue={d.waterPct}
            onPress={openEdit}
          />
          <GoalRow
            icon={<Footprints size={15} color="#FFFFFF" />}
            glow="#4ADE80"
            iconColors={['#5EE08C', '#1FAE5C']}
            barColors={['#8CF5B0', '#22C973']}
            label="Шаги"
            valueText={`${formatNum(d.stepsGoal)} шагов`}
            pctValue={d.stepsPct}
            onPress={openEdit}
          />
          <GoalRow
            icon={<Dumbbell size={15} color="#FFFFFF" />}
            glow="#A78BFA"
            iconColors={['#B39CFC', '#7C3AED']}
            barColors={['#CDBAFF', '#8E4BFF']}
            label="Активность"
            valueText={`${d.minutesGoal} мин`}
            pctValue={d.minutesPct}
            onPress={openEdit}
          />
        </LinearGradient>
      </LinearGradient>

      <GoalsEditModal open={editOpen} onClose={() => setEditOpen(false)} />
    </View>
  )
}
