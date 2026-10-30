// Награда за достижение цели по весу: чистые правила, когда ставить
// и чистить goalReachedAt при сохранении модалки «Записать вес».
// Цель считается достигнутой, если вес отличается от цели меньше 0,05 кг
// (на практике — совпадает с точностью одного знака после запятой).

export const AT_GOAL_EPS = 0.05

export function isAtGoal(weightKg, goalKg) {
  return goalKg != null && Math.abs(weightKg - goalKg) < AT_GOAL_EPS
}

// Что сделать с наградой после сохранения модалки веса.
//   prevGoal / prevReachedAt / prevWeight — состояние до сохранения;
//   weight / weightChanged — новый вес и изменился ли он вообще;
//   goalKg — цель из модалки: undefined — поле не трогали, null — сняли.
// Возвращает { reachedAt, celebrate }:
//   reachedAt — новое значение goalReachedAt
//     (undefined — не менять, null — забыть, ISO-строка — поставить);
//   celebrate — был переход «не достиг → достиг», можно поздравить.
export function goalRewardAfterSave({
  prevGoal,
  prevReachedAt,
  prevWeight,
  weight,
  weightChanged,
  goalKg,
}) {
  const goal = goalKg === undefined ? prevGoal : goalKg
  const wasReached = isAtGoal(prevWeight, prevGoal)

  // Цель изменили или сняли: старая дата относится к прежней цели,
  // поэтому честно ставим свежую дату либо забываем награду
  if (goalKg !== undefined) {
    const reachedNow = isAtGoal(weight, goal)
    return {
      reachedAt: reachedNow ? new Date().toISOString() : null,
      celebrate: reachedNow && !wasReached,
    }
  }

  // Цель не трогали: награда только при переходе «не достиг → достиг».
  // Вес снова у цели после отката — дата ставится заново: «стриком»
  // считаем непрерывное удержание результата, а не первое попадание
  if (weightChanged && !wasReached && isAtGoal(weight, goal)) {
    return { reachedAt: new Date().toISOString(), celebrate: true }
  }

  return { reachedAt: undefined, celebrate: false }
}
