// Карточка «Дневник питания» в разделе «Ещё» — настройки дневника.
// Первая настройка — режим остатка калорий (отзыв Кати: «строгий
// остаток по умолчанию» + «переключатель в настройках дневника — сама
// выбираешь режим»). ВЫКЛ (по умолчанию) — строгий остаток:
// цель − съедено, сожжённое не возвращается — его оценка по шагам и
// тренировкам часто завышена. ВКЛ — активность возвращается в остаток:
// цель − съедено + сожжено, как в MyFitnessPal/Samsung Health.
// Значение живёт в goals.countBurned (useGoalsStore) — сводка
// «Съедено за сегодня» на Главной переключается мгновенно.

import { Switch, Text } from 'react-native'
import { Utensils } from 'lucide-react-native'
import { useGoalsStore } from '@/store/useGoalsStore'
import { CollapsibleCard } from '../ui/CollapsibleCard'

export function DiarySettingsCard() {
  const countBurned = useGoalsStore((s) => Boolean(s.goals.countBurned))
  const setGoals = useGoalsStore((s) => s.setGoals)

  return (
    <CollapsibleCard
      storageKey="diary"
      accessibilityLabel="Дневник питания"
      icon={<Utensils size={20} color="#C4B5FD" />}
      title="Дневник питания"
      right={
        <Switch
          accessibilityLabel="Учитывать сожжённые калории в остатке"
          value={countBurned}
          onValueChange={(v) => setGoals({ countBurned: v })}
          trackColor={{ true: '#7B6CF6', false: 'rgba(255,255,255,0.15)' }}
          thumbColor="#fff"
        />
      }
    >
      <Text className="font-bold text-[16px] text-bear-text">
        {countBurned ? 'Тренировки возвращают калории' : 'Тренировки не возвращают калории'}
      </Text>
      {/* Простым языком (отзыв Кати: «написать подсказку для
          пользователя простым языком») — без формул в лоб */}
      <Text className="mt-1 font-sans text-[15.5px] leading-snug text-bear-sub">
        {countBurned
          ? 'Сожгли на прогулке или тренировке — эти калории вернутся в ваш остаток на Главной: потратили 200, значит можете съесть на 200 больше. Так же считают MyFitnessPal и Samsung Health.'
          : 'Считаем только съеденное: от вашей нормы отнимается еда, а «сожжённое» на шагах и тренировках не возвращается. Приложения часто преувеличивают сожжённое — так проще не перебрать и честнее видеть дефицит.'}
      </Text>
      <Text className="mt-2 font-sans text-[14px] leading-snug text-bear-sub2">
        Переключатель сверху решает, возвращать ли потраченные калории в остаток на Главной.
      </Text>
    </CollapsibleCard>
  )
}
