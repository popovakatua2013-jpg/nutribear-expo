// Нормализация продукта базы к единому виду buildFood (pick.js)
export function toBuildItem(f) {
  return {
    id: f.id,
    name: f.name,
    emoji: f.emoji,
    kcal100: f.kcal,
    p: f.p,
    f: f.f,
    c: f.c,
    defaultGrams: f.defaultGrams,
    source: 'local',
  }
}
