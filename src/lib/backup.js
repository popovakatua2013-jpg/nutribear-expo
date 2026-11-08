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
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { useCycleStore, normLength, normBleed } from '@/store/useCycleStore'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useShoppingStore } from '@/store/useShoppingStore'
import { restorePhotos } from '@/lib/photos'

const MEAL_KEYS = { breakfast: [], lunch: [], dinner: [], snack: [] }
const MEALS_DEFAULT = { enabled: false, breakfast: '08:30', lunch: '13:00', dinner: '19:00' }
const WEIGH_DEFAULT = { enabled: false, weekday: 5, time: '09:00' }
// Время пинка о тренировке по умолчанию (совпадает с useActivityStore)
const EXERCISE_DEFAULT = { enabled: false, time: '18:00' }
// Допустимые категории ИМТ (совпадают с useProfileStore.lastBmiCat)
const BMI_CATS = new Set(['low', 'norm', 'over', 'obese1', 'obese2'])
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

  // Фото пишем ПЕРВЫМИ, до каких-либо изменений в сторах: если снимки
  // не записались (нет места, битый файл) — ошибка вылетает здесь,
  // и восстановление не остаётся наполовину сделанным
  await restorePhotos(data.photos)

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
      // Пинок о тренировке: блок появился позже остального (v5), и при
      // восстановлении он терялся — после переноса на новый телефон
      // переключатель «Тренировка» вёл себя как выключенный, а его
      // включение падало на отсутствующем времени
      exercise: {
        enabled: Boolean(rem.exercise?.enabled),
        time: /^\d{1,2}:\d{2}$/.test(String(rem.exercise?.time || ''))
          ? String(rem.exercise.time)
          : EXERCISE_DEFAULT.time,
      },
    },
    // Тумблеры шагомера и Health Connect: экспортируются, но не
    // восстанавливались — после переноса шагомер молча выключен
    pedometerEnabled: Boolean(act.pedometerEnabled),
    healthConnectEnabled: Boolean(act.healthConnectEnabled),
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
    // Замеры тела и пользовательские замеры: экспортировались, но при
    // восстановлении терялись — таблица «Тело» после переноса пустая
    measurements: obj(prof.measurements),
    customMeasurements: arr(prof.customMeasurements),
    // Скрытые замеры (снятые галочки) — тоже переносим, иначе после
    // восстановления вернутся скрытые строки
    hiddenMeasurements: arr(prof.hiddenMeasurements).filter((k) => typeof k === 'string'),
    lastBmiCat: BMI_CATS.has(prof.lastBmiCat) ? prof.lastBmiCat : null,
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

  // ── Мелкие настройки: вибро-отклик, порог напоминания мишки ──
  const ui = obj(data.uiPrefs)
  useUiPrefsStore.setState({
    expanded: obj(ui.expanded),
    haptics: ui.haptics === undefined ? true : Boolean(ui.haptics),
    weighNudgeDays: [5, 7, 10].includes(ui.weighNudgeDays) ? ui.weighNudgeDays : 7,
  })

  // ── Трекер цикла: настройки и история. Дата начала — валидный
  //    ключ не в будущем; история — до 12 записей { start } ──
  const cy = obj(data.cycle)
  const cyStart =
    typeof cy.lastStart === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(cy.lastStart)
      ? cy.lastStart
      : null
  const cyHistory = arr(cy.history)
    .filter((r) => r && typeof r.start === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.start))
    .slice(0, 12)
  useCycleStore.setState({
    enabled: Boolean(cy.enabled) && Boolean(cyStart),
    lastStart: cyStart,
    length: normLength(cy.length),
    bleed: normBleed(cy.bleed),
    history: cyHistory,
  })

  // ── План питания и список покупок (вкладки «План»/«Покупки»):
  //    разделы появились позже первого формата копии — заливаем их
  //    только если они в копии есть, чтобы старая копия не стирала
  //    текущие планы. Недельные ключи проверяем на формат даты,
  //    покупки чистим и ограничиваем (200 строк) ──
  const mp = obj(data.mealPlan)
  if (mp.plans && typeof mp.plans === 'object' && !Array.isArray(mp.plans)) {
    const cleanPlans = {}
    for (const [wk, week] of Object.entries(mp.plans)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(wk)) continue
      if (!week || typeof week !== 'object' || Array.isArray(week)) continue
      cleanPlans[wk] = week
    }
    useMealPlanStore.setState({ plans: cleanPlans })
  }
  const sh = obj(data.shopping)
  if (Array.isArray(sh.items)) {
    const mkId = () => `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
    const items = sh.items
      .filter((it) => it && typeof it === 'object' && typeof it.name === 'string' && it.name.trim())
      .slice(0, 200)
      .map((it) => ({
        id: typeof it.id === 'string' && it.id ? it.id : mkId(),
        name: it.name.slice(0, 80),
        done: Boolean(it.done),
        qty: Math.min(99, Math.max(1, Math.round(Number(it.qty) || 1))),
        category: typeof it.category === 'string' && it.category ? it.category : null,
        createdAt: Number(it.createdAt) || Date.now(),
      }))
    useShoppingStore.setState({ items })
  }

  return true
}
