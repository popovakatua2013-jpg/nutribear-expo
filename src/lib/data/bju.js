// Помощники по БЖУ: белки/жиры/углеводы, граммы на 100 г продукта.

const round1 = (n) => Math.round(n * 10) / 10

export { round1 }

// Оценка БЖУ по калорийности, если точных данных нет:
// классическая тарелка — 20% ккал из белков, 30% из жиров, 50% из углеводов
export function estimateBju(kcal100) {
  return {
    p: round1((kcal100 * 0.2) / 4),
    f: round1((kcal100 * 0.3) / 9),
    c: round1((kcal100 * 0.5) / 4),
  }
}

// БЖУ порции: bju100 = {p, f, c} на 100 г → на заданный вес.
// Если в продукте есть клетчатка/сахар (fib/sug на 100 г) — они тоже пересчитываются
export function bjuForPortion(bju100, grams) {
  const k = grams / 100
  return {
    p: round1((bju100?.p || 0) * k),
    f: round1((bju100?.f || 0) * k),
    c: round1((bju100?.c || 0) * k),
    fib: round1((bju100?.fib || 0) * k),
    sug: round1((bju100?.sug || 0) * k),
  }
}

// Сумма БЖУ по списку записей дневника
export function bjuSum(entries) {
  return entries.reduce(
    (acc, e) => ({
      p: acc.p + (e.p || 0),
      f: acc.f + (e.f || 0),
      c: acc.c + (e.c || 0),
    }),
    { p: 0, f: 0, c: 0 }
  )
}

// Компактная строка «Б 12 · Ж 5 · У 34»
export function bjuLine(b) {
  return `Б ${Math.round(b.p)} · Ж ${Math.round(b.f)} · У ${Math.round(b.c)}`
}
