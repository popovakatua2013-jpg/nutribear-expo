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

// Ленивый индекс «название → продукт базы». Два прохода: сначала точные
// имена всех продуктов, потом псевдонимы (al) — точное имя всегда
// сильнее псевдонима. По псевдониму свой продукт «Селёдка» находит
// встроенную «Сельдь солёная» (отзыв Кати 21.11 17:21)
let foodByNameIndex = null
function foodByName(name) {
  if (!foodByNameIndex) {
    foodByNameIndex = new Map()
    FOODS.forEach((f) => {
      const key = normFoodName(f.name)
      if (key && !foodByNameIndex.has(key)) foodByNameIndex.set(key, f)
    })
    FOODS.forEach((f) => {
      ;(f.al || []).forEach((a) => {
        const key = normFoodName(a)
        if (key && !foodByNameIndex.has(key)) foodByNameIndex.set(key, f)
      })
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
// p/f/c — БЖУ на 100 г.
// «Состав известен» — хотя бы один макронутриент больше нуля. Отзыв
// Кати 21.11 17:21: свой продукт «Селёдка» записан одними калориями
// (форма «Свой продукт» сохраняет пустые БЖУ как 0) — прежняя проверка
// «p != null» считала нули известным составом, и жиры/белки/углеводы
// не попадали в дневник вообще (в отчётах «У 6 г» при 3310 ккал).
// Теперь без БЖУ состав наследуется от встроенного тёзки (по имени
// или псевдониму), иначе оценивается по калорийности; продукты
// с 0 ккал (вода) остаются нулевыми, без выдуманных граммов.
// Заодно честно считаем калории: 0 ккал/100 г у воды и «Колы без
// сахара» не превращались в 100 (было «kcal100 || 100»)
export function buildFood(item) {
  const kcal100 = Math.max(0, Math.round(Number(item.kcal100) || 0))
  const hasMacro = Number(item.p) > 0 || Number(item.f) > 0 || Number(item.c) > 0
  const base = item.name ? foodByName(item.name) : null
  const baseHasMacro =
    !!base && (Number(base.p) > 0 || Number(base.f) > 0 || Number(base.c) > 0)
  const bju = hasMacro
    ? { p: item.p || 0, f: item.f || 0, c: item.c || 0 }
    : baseHasMacro
      ? { p: base.p || 0, f: base.f || 0, c: base.c || 0 }
      : kcal100 > 0
        ? estimateBju(kcal100)
        : { p: 0, f: 0, c: 0 }
  // клетчатка/сахар на 100 г — для рейтинга питания: свои, иначе от тёзки
  const fib = hasMacro ? item.fib || 0 : item.fib || (baseHasMacro && base.fib) || 0
  const sug = hasMacro ? item.sug || 0 : item.sug || (baseHasMacro && base.sug) || 0
  // витамины/минералы на 100 г — есть только у продуктов базы;
  // своим и внешним продуктам без них — наследуем по имени
  // (нормализованному: регистр, ё/е, пробелы, псевдонимы) от встроенного
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
  if (!hasMicros && base && (base.fe != null || base.ca != null)) {
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
  return {
    id: item.id || `${item.source || 'ext'}-${Date.now().toString(36)}`,
    name: item.name,
    emoji: item.emoji || SOURCE_EMOJI[item.source] || '🍽️',
    kcal: kcal100,
    ...bju,
    fib,
    sug,
    ...micros,
    mk,
    defaultGrams: item.defaultGrams || 100,
    tags: [],
    source: item.source || 'ext',
  }
}
