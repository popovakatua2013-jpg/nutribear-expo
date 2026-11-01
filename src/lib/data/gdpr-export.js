// GDPR: полный экспорт данных пользователя в JSON
// (право на переносимость данных). Копия пишется во временный файл
// и отправляется через системное меню «Поделиться» («Сохранить в
// файл» на телефоне) — сообщение чата для мегабайтов не годится.

import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore } from '@/store/useActivityStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { useCombosStore } from '@/store/useCombosStore'
import { useProgressPhotosStore } from '@/store/useProgressPhotosStore'
import { useHistoryStore } from '@/store/useHistoryStore'
import { useShopStore } from '@/store/useShopStore'
import { collectPhotosForBackup } from '@/lib/photos'

// Снимок всех данных приложения (персональные данные здоровья —
// особая категория; экспорт выполняется локально, без сети).
// Асинхронный: фото перед записью ужимаются и кодируются в base64.
export async function collectAll() {
  const photos = await collectPhotosForBackup(
    useProgressPhotosStore.getState().items
  )
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
    userFoods: useUserFoodsStore.getState(),
    combos: useCombosStore.getState(),
    // Фото прогресса «до/после» (base64, до 24 последних снимков)
    photos,
    // Дневная история (шаги/ккал/вода/тренировки по датам) — для отчётов
    history: useHistoryStore.getState(),
    // Копилка организма: монетки и купленный декор
    shop: useShopStore.getState(),
  }
}

// Записать JSON во временный файл и открыть системное меню
// «Поделиться»: там есть «Сохранить в файл», мессенджеры, почта
export async function shareBackupFile(data) {
  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `nutribear-export-${stamp}.json`
  const fileUri = `${FileSystem.cacheDirectory}${filename}`
  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data), {
    encoding: FileSystem.EncodingType.UTF8,
  })
  if (!(await Sharing.isAvailableAsync())) {
    // Крайне редкий случай: шаринга нет — хотя бы вернём файл
    return fileUri
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Резервная копия NutriBear',
    UTI: 'public.json',
  })
  // Чистим кэш за собой (копия уже сохранена/отправлена)
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true })
  } catch {}
  return fileUri
}
