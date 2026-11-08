// Список покупок (отдельная нижняя вкладка «Покупки»).
// Строка: продукт + количество (шт) + категория + отметка «в корзине».
// Категории группируют список как отделы магазина (овощи, молочное…);
// для новых строк категория подбирается автоматически по названию
// (guessCategory). addMany добавляет пачкой из плана меню, пропуская
// дубликаты. Отсортировано так, что некупленное сверху, купленное
// оседает вниз. Сохраняется в AsyncStorage, как остальные сторы.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'

/** Категории покупок — «отделы магазина» в фиксированном порядке */
export const SHOP_CATEGORIES = [
  { id: 'produce', emoji: '🥦', label: 'Овощи и фрукты' },
  { id: 'meat', emoji: '🍗', label: 'Мясо и рыба' },
  { id: 'dairy', emoji: '🥛', label: 'Молочное' },
  { id: 'bakery', emoji: '🍞', label: 'Хлеб и выпечка' },
  { id: 'grains', emoji: '🌾', label: 'Крупы и бакалея' },
  { id: 'frozen', emoji: '🧊', label: 'Заморозка' },
  { id: 'snacks', emoji: '🍪', label: 'Сладкое и снеки' },
  { id: 'other', emoji: '🧺', label: 'Другое' },
]

const CAT_IDS = new Set(SHOP_CATEGORIES.map((c) => c.id))

const CAT_KEYWORDS = [
  // Порядок важен: «овсяное печенье» → снеки (не крупа),
  // «мороженое» → снеки (не заморозка), «печень трески» → мясо.
  ['dairy', ['молок', 'кефир', 'ряжен', 'йогурт', 'творог', 'сметан', 'сыр', 'сливк', 'варенец', 'айран', 'снежок', 'брынз', 'моцарел', 'пармез', 'маскарпон', 'фета', 'яйц', 'масло сливочн']],
  ['snacks', ['шоколад', 'конфет', 'печенье', 'зефир', 'пастила', 'халва', 'чипс', 'сухарик', 'снек', 'батончик', 'мармелад', 'варенье', 'джем', 'морожен', 'сгущенк', 'попкорн', 'глазиров']],
  ['produce', ['овощ', 'фрукт', 'ягод', 'огурц', 'помидор', 'томат', 'салат', 'капуст', 'морков', 'лук', 'картоф', 'свекл', 'яблок', 'банан', 'груш', 'апельсин', 'мандарин', 'лимон', 'лайм', 'клубник', 'малин', 'черник', 'смородин', 'виноград', 'киви', 'авокадо', 'перец', 'броккол', 'цветн', 'кабачк', 'баклаж', 'тыкв', 'зелень', 'укроп', 'петруш', 'шпинат', 'рукол', 'чеснок', 'редис', 'сельдер', 'ананас', 'гранат', 'персик', 'дыня', 'арбуз', 'слива', 'абрикос', 'вишн', 'черешн', 'инжир', 'манго', 'хурм', 'кукуруз', 'горошек', 'оливк', 'маслин', 'гриб', 'шампиньон', 'сок']],
  ['meat', ['куриц', 'курин', 'индейк', 'говядин', 'свинин', 'баранин', 'фарш', 'мясо', 'рыб', 'лосос', 'семг', 'сёмг', 'форел', 'тунец', 'скумбр', 'сельд', 'треск', 'минта', 'хек', 'креветк', 'кальмар', 'мидии', 'краб', 'икра', 'колбас', 'сосиск', 'сардельк', 'ветчин', 'бекон', 'печень', 'шашлык', 'тефтел', 'котлет', 'утк']],
  ['bakery', ['хлеб', 'батон', 'булоч', 'булк', 'лаваш', 'багет', 'лепешк', 'лепёшк', 'пирог', 'пирож', 'сдоб', 'баран', 'сушк', 'вафл', 'круассан', 'тортиль']],
  ['grains', ['круп', 'рис', 'овсян', 'геркулес', 'греч', 'макарон', 'спагетти', 'паста', 'пшен', 'перлов', 'булгур', 'кускус', 'мука', 'манк', 'ячнев', 'хлопь', 'мюсли', 'гранол', 'фасол', 'горох', 'чечев', 'нут', 'киноа', 'масл', 'соль', 'сахар', 'мед', 'уксус', 'соус', 'кетчуп', 'майонез', 'горчиц', 'дрожж', 'желатин', 'чай', 'кофе', 'какао', 'приправ', 'специ']],
  ['frozen', ['заморож', 'пельмен', 'вареник', 'наггетс', 'овощн смес', 'лед']],
]

/** Нормализация названия: нижний регистр, ё → е, схлопнуть пробелы */
export const normName = (s) =>
  String(s || '').toLowerCase().trim().replace(/ё/g, 'е').replace(/\s+/g, ' ')

/** Категория по названию: первое совпадение по ключевым словам */
export function guessCategory(name) {
  const n = normName(name)
  if (n) {
    for (const [catId, words] of CAT_KEYWORDS) {
      if (words.some((w) => n.includes(w))) return catId
    }
  }
  return 'other'
}

const clampQty = (v) => Math.max(1, Math.min(99, Math.round(Number(v)) || 1))

/** Порядок списка: некупленные сверху (ранние раньше), купленные вниз */
export function sortItems(items) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return (a.createdAt || 0) - (b.createdAt || 0)
  })
}

/** Разбить список на категории в порядке SHOP_CATEGORIES (пустые
 * отделы не выводятся); внутри категории — sortItems */
export function groupByCategory(items) {
  const buckets = new Map()
  for (const it of items) {
    const cat = CAT_IDS.has(it.category) ? it.category : guessCategory(it.name)
    if (!buckets.has(cat)) buckets.set(cat, [])
    buckets.get(cat).push(it)
  }
  return SHOP_CATEGORIES.filter((c) => buckets.has(c.id)).map((c) => ({
    ...c,
    items: sortItems(buckets.get(c.id)),
  }))
}

const makeItem = (name, opts = {}) => ({
  id: makeId(),
  name: String(name).trim().slice(0, 80),
  qty: clampQty(opts.qty),
  category: CAT_IDS.has(opts.category) ? opts.category : guessCategory(name),
  done: false,
  createdAt: Date.now(),
})

export const useShoppingStore = create(
  persist(
    (set) => ({
      items: [],

      /** Добавить продукт; false — пустая строка. Категорию можно
       * задать явно, иначе подбирается по названию */
      add(name, opts = {}) {
        const clean = String(name || '').trim()
        if (!clean) return false
        set((state) => ({
          items: sortItems([...state.items, makeItem(clean, opts)]),
        }))
        return true
      },

      /** Добавить пачкой (например, «Из плана»): дубликаты по названию
       * (регистр и ё/е не важны) пропускаются. Возвращает, сколько
       * реально добавлено */
      addMany(list) {
        let added = []
        set((state) => {
          const seen = new Set(state.items.map((it) => normName(it.name)))
          added = []
          for (const raw of list || []) {
            const name = String(raw?.name || '').trim()
            const key = normName(name)
            if (!key || seen.has(key)) continue
            seen.add(key)
            added.push(makeItem(name, raw))
          }
          if (!added.length) return state
          return { items: sortItems([...state.items, ...added]) }
        })
        return added.length
      },

      toggle(id) {
        set((state) => ({
          items: sortItems(
            state.items.map((it) => (it.id === id ? { ...it, done: !it.done } : it)),
          ),
        }))
      },

      /** Количество (шт), границы 1…99 */
      setQty(id, qty) {
        const q = clampQty(qty)
        set((state) => ({
          items: state.items.map((it) => (it.id === id ? { ...it, qty: q } : it)),
        }))
      },

      /** Перенести в другой отдел */
      setCategory(id, categoryId) {
        if (!CAT_IDS.has(categoryId)) return
        set((state) => ({
          items: state.items.map((it) =>
            it.id === id ? { ...it, category: categoryId } : it,
          ),
        }))
      },

      remove(id) {
        set((state) => ({ items: state.items.filter((it) => it.id !== id) }))
      },

      /** Убрать все купленные */
      clearDone() {
        set((state) => ({ items: state.items.filter((it) => !it.done) }))
      },
    }),
    { name: 'nutribear-shopping-list', storage: createJSONStorage(() => AsyncStorage) },
  ),
)
