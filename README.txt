NutriBear — заплатка от 25.10 (39 файлов)

КАК ПРИМЕНИТЬ:
1. Скопируйте папки app, docs, src из этой папки в папку проекта
   nutribear-expo — С ЗАМЕНОЙ файлов.
2. Если Windows спросит про совпадающие имена — «Заменить файлы
   в папке назначения» (никогда не «Пропустить»!).
3. package.json НЕ трогаем — его нет в заплатке, это правильно.

ЗАТЕМ В ТЕРМИНАЛЕ (в папке проекта):
   npm install
   npx expo start --clear

Файлы в заплатке:

ДОБАВИТЬ (их не было):
  .env.example
  docs/privacy.html
  docs/terms.html
  src/components/more/LegalModal.jsx
  src/lib/data/legal.js
  src/lib/rollover.js
  src/store/useHistoryStore.js

ОБНОВИТЬ (были старые версии):
  app/(tabs)/activity.jsx
  app/(tabs)/index.jsx
  app/_layout.jsx
  src/components/activity/ActivityStats.jsx
  src/components/activity/ExerciseSection.jsx
  src/components/activity/SummarySection.jsx
  src/components/bmi/WeightCard.jsx
  src/components/food/EditAiFoodModal.jsx
  src/components/food/EditEntryModal.jsx
  src/components/food/PhotoMode.jsx
  src/components/food/RecipeForm.jsx
  src/components/food/RecipeMode.jsx
  src/components/food/SelectedFood.jsx
  src/components/food/VoiceMode.jsx
  src/components/home/EntryList.jsx
  src/components/home/GramsPicker.jsx
  src/components/home/HistoryModal.jsx
  src/components/home/MealCard.jsx
  src/components/home/MealPlanCard.jsx
  src/components/home/WaterModal.jsx
  src/components/more/AboutCard.jsx
  src/components/more/DataActions.jsx
  src/components/onboarding/ob/RegisterStep.jsx
  src/lib/ai-config.js
  src/lib/data/activity.js
  src/lib/data/reports.js
  src/lib/food-ai.js
  src/store/useActivityStore.js
  src/store/useExerciseStore.js
  src/store/useFoodStore.js
  src/store/useProfileStore.js
  src/store/useRecipesStore.js
