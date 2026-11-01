// Восстановление данных из резервной копии (JSON-экспорт GDPR).
// Копия пишется и читается локально: пользователь выбирает файл,
// мы аккуратно заливаем данные в сторы. Сторы обновляются через
// setState — действия (функции) сохраняются, persist сам перезапишет
// AsyncStorage. Онбординг не восстанавливаем: статус «приложение
// настроено» не должен сломать флоу.

import { useFoodStore } from '@/store/useFoodStore'
import { useActivityStore, DEFAULT_VESSELS } from '@/store/useActivityStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useExerciseStore } from '@/store/useExerciseStore'
import { useFastingStore } from '@/store/useFastingStore'
import { useRecipesStore } from '@/store/useRecipesStore'
import { useUserFoodsStore } from '@/store/useUserFoodsStore'
import { useCombosStore } from '@/store/useCombosStore'
import { useHistoryStore, dayKeyOf } from '@/store/useHistoryStore'
import { useShopStore } from '@/store/useShopStore'
import { useOrganismGameStore } from '@/store/useOrganismGameStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { restorePhotos } from '@/lib/photos'

const MEAL_KEYS = { breakfast: [], lunch: [], dinner: [], snack: [] }
const MEALS_DEFAULT = { enabled: false, breakfast: '08:30', lunch: '13:00', dinner: '19:00' }
const WEIGH_DEFAULT = { enabled: false, weekday: 5, time: '09:00' }
// id уровней активности (совпадают с ACTIVITY_LEVELS онбординга)
const ACTIVITY_IDS = new Set(['sedentary', 'light', 'moderate', 'high', 'athlete'])

// Безопасный объект: undefined/null/не-объект → fallback
const obj = (v, fb = {}) => (v && typeof v === 'object' && !Array.isArray(v) ? v : fb)
// Безопасный массив
const arr = (v, fb = []) => (Array.isArray(v) ? v : fb)
// Число с fallback
const num = (v, fb = 0) => (Number.isFinite(Number(v)) ? Number(v) : fb)

// Залить данные из копии в сторы. Бросает ошибку, если это не копия
// NutriBear. Асинхронный: фото копии записываются в файловую систему.
// Возвращает true при успехе.
export async function applyBackup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Это не файл копии')
  }
  if (data.app !== 'NutriBear') {
    throw new Error('Это копия другого приложения или повреждённый файл')
  }

  // ── Питание ────────────────────────────────────────────────────
  const food = obj(data.food)
  useFoodStore.setState({
    goal: food.goal || 'maintain',
    entries: obj(food.entries, MEAL_KEYS),
    customMeals: arr(food.customMeals),
    history: arr(food.history),
    dayKey: food.dayKey || dayKeyOf(),
  })

  // ── Вода, шаги, напоминания ────────────────────────────────────
  const act = obj(data.activity)
  const rem = obj(act.reminder)
  useActivityStore.setState({
    waterMl: Math.min(6000, Math.max(0, num(act.waterMl))),
    extraSteps: Math.min(50000, Math.max(0, num(act.extraSteps))),
    lastWaterAt: num(act.lastWaterAt),
    waterLog: arr(act.waterLog),
    vessels: arr(act.vessels).length ? act.vessels : DEFAULT_VESSELS,
    reminder: {
      enabled: Boolean(rem.enabled),
      everyMin: Math.min(720, Math.max(5, num(rem.everyMin, 60))),
      lastAt: 0,
      meals: { ...MEALS_DEFAULT, ...obj(rem.meals) },
      weigh: { ...WEIGH_DEFAULT, ...obj(rem.weigh) },
    },
    dayKey: act.dayKey || dayKeyOf(),
  })

  // ── Профиль: биоданные тоже восстанавливаем, иначе после переноса
  //    на новый телефон калькулятор ИМТ потеряет пол/возраст/активность ─
  const prof = obj(data.profile)
  useProfileStore.setState({
    name: typeof prof.name === 'string' ? prof.name.slice(0, 24) : '',
    sex: prof.sex === 'male' ? 'male' : 'female',
    age: Math.min(90, Math.max(10, Math.round(num(prof.age, 30)))),
    heightCm: Math.min(250, Math.max(80, num(prof.heightCm, 175))),
    weightKg: Math.min(300, Math.max(25, num(prof.weightKg, 75))),
    activityId: ACTIVITY_IDS.has(prof.activityId) ? prof.activityId : 'light',
    hasBio: Boolean(prof.hasBio),
    goalWeightKg:
      prof.goalWeightKg == null
        ? null
        : Math.min(300, Math.max(25, Math.round(num(prof.goalWeightKg) * 10) / 10)),
    goalReachedAt:
      typeof prof.goalReachedAt === 'string' && prof.goalReachedAt ? prof.goalReachedAt : null,
    weights: arr(prof.weights),
  })

  // ── Цели (мержим поверх текущих, чтобы новые поля не потерялись) ─
  const goals = obj(data.goals)
  if (goals.goals && typeof goals.goals === 'object') {
    useGoalsStore.setState({
      goals: { ...useGoalsStore.getState().goals, ...goals.goals },
    })
  }

  // ── Остальные сторы: тренировки, голодание, рецепты, продукты,
  //    комбо, дневная история ─────────────────────────────────────
  const simple = [
    [useExerciseStore, data.exercise],
    [useFastingStore, data.fasting],
    [useRecipesStore, data.recipes],
    [useUserFoodsStore, data.userFoods],
    [useCombosStore, data.combos],
    [useHistoryStore, data.history],
  ]
  for (const [store, payload] of simple) {
    const src = obj(payload)
    const clean = {}
    for (const [k, v] of Object.entries(src)) {
      if (typeof v !== 'function') clean[k] = v // функции-действия не трогаем
    }
    if (Object.keys(clean).length) store.setState(clean)
  }

  // ── Копилка: монетки и купленный декор (экспортировались и раньше,
  //    но при восстановлении терялись) ─────────────────────────
  const shop = obj(data.shop)
  useShopStore.setState({
    coins: Math.max(0, Math.round(num(shop.coins))),
    owned: obj(shop.owned),
  })

  // ── Прогресс организма: гены, кристаллы, мутаген, капсулы,
  //    эволюция, рейд стаи, комбо-стрик и коллекция. Сначала честный
  //    сброс к стартовым значениям, затем поверх — значения из копии:
  //    пропущенные поля остаются валидными ───────────────────
  const og = obj(data.organismGame)
  useOrganismGameStore.getState().resetAll()
  useOrganismGameStore.setState({
    genes: Math.max(0, Math.round(num(og.genes, 12))),
    crystals: Math.max(0, Math.round(num(og.crystals))),
    mutagen: Math.max(0, Math.round(num(og.mutagen))),
    capsules: Math.max(0, Math.round(num(og.capsules, 1))),
    evoStage: Math.min(4, Math.max(0, Math.round(num(og.evoStage)))),
    evoBranch: typeof og.evoBranch === 'string' ? og.evoBranch : '',
    createdAt: typeof og.createdAt === 'string' ? og.createdAt : null,
    stableDays: Math.max(0, Math.round(num(og.stableDays))),
    stableLastKey: typeof og.stableLastKey === 'string' ? og.stableLastKey : null,
    mutationUnlocked: Boolean(og.mutationUnlocked),
    raidWeekStart: typeof og.raidWeekStart === 'string' ? og.raidWeekStart : '',
    raidDays: obj(og.raidDays),
    raidKilled: Boolean(og.raidKilled),
    raidRewarded: Boolean(og.raidRewarded),
    comboDays: obj(og.comboDays),
    goodDays: obj(og.goodDays),
    streak: Math.max(0, Math.round(num(og.streak))),
    streakLastKey: typeof og.streakLastKey === 'string' ? og.streakLastKey : null,
    items: arr(og.items),
    opened: Math.max(0, Math.round(num(og.opened))),
    log: arr(og.log),
  })

  // ── Мелкие настройки: вибро-отклик, порог напоминания мишки ──
  const ui = obj(data.uiPrefs)
  useUiPrefsStore.setState({
    expanded: obj(ui.expanded),
    haptics: ui.haptics === undefined ? true : Boolean(ui.haptics),
    weighNudgeDays: [5, 7, 10].includes(ui.weighNudgeDays) ? ui.weighNudgeDays : 7,
  })

  // ── Фото прогресса: файлы снимков в папку приложения ─────────
  await restorePhotos(data.photos)

  return true
}
