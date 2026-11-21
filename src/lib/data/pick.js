// Единый вид «выбранной еды» из любого источника:
// локальная база, Open Food Facts, распознавание фото, голос, рецепты.

import { estimateBju } from './bju'
import { FOODS } from './foods'

export const SOURCE_EMOJI = {
  local: '🍽️',
  off: '📦',
  ai: '📸',
  recipe: '🍴',
  voice: '🎤',
}

// Нормализация названия для сравнения продуктов: регистр, ё/е, пробелы
// (отзыв Кати 21.11: записала свой продукт «Сырники» — в «Рейтинге
// питания» витамины показывают нули, хотя у встроенных «Сырников»
// кальций, железо и витамин A известны). Совпадение по нормализованному
// имени — свой продукт наследует микроэлементы встроенного
export function normFoodName(s) {
  return (s || '').toLowerCase().replace(/ё/g, 'е').trim()
}

// Ленивый индекс «название → продукт базы» (первое вхождение)
let foodByNameIndex = null
function foodByName(name) {
  if (!foodByNameIndex) {
    foodByNameIndex = new Map()
    FOODS.forEach((f) => {
      const key = normFoodName(f.name)
      if (key && !foodByNameIndex.has(key)) foodByNameIndex.set(key, f)
    })
  }
  return foodByNameIndex.get(normFoodName(name)) || null
}

// Дубликат названия среди своих продуктов или встроенной базы —
// для предупреждения в форме «Свой продукт»: свой продукт с именем
// встроенного перебивает его в поиске (свои идут в результатах раньше)
export function findFoodDuplicate(name, ownItems = [], excludeId = null) {
  const key = normFoodName(name)
  if (!key) return null
  const own = ownItems.find((f) => f.id !== excludeId && normFoodName(f.name) === key)
  if (own) return { name: own.name, kcal: own.kcal, from: 'own' }
  const base = foodByName(name)
  if (base) {
    return {
      name: base.name,
      kcal: base.kcal,
      from: 'base',
      micros: base.fe != null || base.ca != null,
    }
  }
  return null
}

// item: {name, kcal100, p?, f?, c?, emoji?, id?, source?, defaultGrams?, sub?}
// p/f/c — БЖУ на 100 г; если не заданы — оцениваем по калорийности
export function buildFood(item) {
  const known = item.p != null || item.f != null || item.c != null
  const bju = known
    ? { p: item.p || 0, f: item.f || 0, c: item.c || 0 }
    : estimateBju(item.kcal100 || 100)
  // витамины/минералы на 100 г — есть только у продуктов базы;
  // своим и внешним продуктам без них — наследуем по точному имени
  // (нормализованному: регистр, ё/е, пробелы) от встроенного продукта
  const hasMicros =
    item.fe != null || item.ca != null || item.k != null || item.mg != null
  let micros = {
    fe: item.fe || 0,
    ca: item.ca || 0,
    k: item.k || 0,
    mg: item.mg || 0,
    vitc: item.vitc || 0,
    vita: item.vita || 0,
  }
  let mk = hasMicros ? 1 : undefined
  if (!hasMicros && item.name) {
    const base = foodByName(item.name)
    if (base && (base.fe != null || base.ca != null)) {
      micros = {
        fe: base.fe || 0,
        ca: base.ca || 0,
        k: base.k || 0,
        mg: base.mg || 0,
        vitc: base.vitc || 0,
        vita: base.vita || 0,
      }
      mk = 1
    }
  }
  return {
    id: item.id || `${item.source || 'ext'}-${Date.now().toString(36)}`,
    name: item.name,
    emoji: item.emoji || SOURCE_EMOJI[item.source] || '🍽️',
    kcal: item.kcal100 || 100,
    ...bju,
    // клетчатка/сахар на 100 г — для рейтинга питания
    fib: item.fib || 0,
    sug: item.sug || 0,
    ...micros,
    mk,
    defaultGrams: item.defaultGrams || 100,
    tags: [],
    source: item.source || 'ext',
  }
}
