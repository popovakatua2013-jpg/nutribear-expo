// Единый вид «выбранной еды» из любого источника:
// локальная база, Open Food Facts, распознавание фото, голос, рецепты.

import { estimateBju } from './bju'

export const SOURCE_EMOJI = {
  local: '🍽️',
  off: '📦',
  ai: '📸',
  recipe: '🍴',
  voice: '🎤',
}

// item: {name, kcal100, p?, f?, c?, emoji?, id?, source?, defaultGrams?, sub?}
// p/f/c — БЖУ на 100 г; если не заданы — оцениваем по калорийности
export function buildFood(item) {
  const known = item.p != null || item.f != null || item.c != null
  const bju = known
    ? { p: item.p || 0, f: item.f || 0, c: item.c || 0 }
    : estimateBju(item.kcal100 || 100)
  return {
    id: item.id || `${item.source || 'ext'}-${Date.now().toString(36)}`,
    name: item.name,
    emoji: item.emoji || SOURCE_EMOJI[item.source] || '🍽️',
    kcal: item.kcal100 || 100,
    ...bju,
    defaultGrams: item.defaultGrams || 100,
    tags: [],
    source: item.source || 'ext',
  }
}
