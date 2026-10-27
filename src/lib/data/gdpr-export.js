// GDPR: полный экспорт данных пользователя в JSON
// (право на переносимость данных). В RN вместо скачивания файла —
// системное окно «Поделиться» (файл можно сохранить куда угодно).

import { Share } from 'react-native'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useShopStore } from '@/store/useShopStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useRecipesStore } from '@/store/useRecipesStore'

// Снимок всех данных приложения (персональные данные здоровья —
// особая категория; экспорт выполняется локально, без сети)
export function collectAll() {
  return {
    app: 'NutriBear',
    exportedAt: new Date().toISOString(),
    onboarding: useOnboardingStore.getState(),
    profile: useProfileStore.getState(),
    goals: useGoalsStore.getState(),
    food: useFoodStore.getState(),
    activity: useActivityStore.getState(),
    exercise: useExerciseStore.getState(),
    fasting: useFastingStore.getState(),
    recipes: useRecipesStore.getState(),
    shop: useShopStore.getState(),
  }
}

// «Поделиться» JSON-текстом: в системном меню есть «Сохранить в файл»
export async function shareJson(filename, data) {
  const json = JSON.stringify(data, null, 2)
  await Share.share({ title: filename, message: json })
}
