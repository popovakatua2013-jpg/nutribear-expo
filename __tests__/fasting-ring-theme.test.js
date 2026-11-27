// Кольцо «Интервального питания» — всегда цвет темы (правка Кати:
// «заполненое кольцо интервальное голодание ораньжевое сделай по теме»).
//
// Раньше при таймере сверх цели (pct > 1.05) дуга кольца на карточке
// «Плана» и таймер/полоса на экране голодания переключались на
// оранжевый (P.orange = nutF темы — в «Классике» это #FB923C): кольцо
// неделями стояло залитым оранжевым и выбивалось из оформления.
// Теперь: у Ring есть проп toneOver — «Прогресс» (калории) сохраняет
// оранжевый сигнал перебора нормы, кольцу голодания передан
// toneOver={false} — сверх цели дуга остаётся акцентом темы. Таймер и
// полоса на экране голодания тоже больше не красятся оранжевым сверх
// цели. Заодно кольцо уважает plain бесплатной «Классики»: свечение
// под дугой не рисуется («однотонная без эффектов и свечения»).
//
// Тест — статический аудит исходников (как module-colors.test.js):
// компоненты вкладки не рендерятся в jsdom.

const fs = require('fs')
const path = require('path')

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')

const ringBlock = (src, anchor) => {
  const at = src.indexOf(anchor)
  expect(at).toBeGreaterThan(-1)
  const end = src.indexOf('/>', at)
  return src.slice(at, end)
}

describe('кольцо голодания — по теме, без оранжевого сверх цели', () => {
  const plan = read('src/components/planner/PlanScreen.jsx')

  test('Ring умеет toneOver; по умолчанию (кольцо «Прогресса») сигнал перебора сохранён', () => {
    expect(plan.match(/function Ring\(\{[^}]*toneOver = true/)).not.toBeNull()
    // Оранжевый «сверх нормы» в Ring теперь только под toneOver
    expect(plan.match(/stroke=\{over && toneOver \? P\.orange/)).not.toBeNull()
    // Кольцо «Прогресса» (size={88}) не передаёт toneOver — сигнал перебора калорий остаётся
    const progressRing = ringBlock(plan, '<Ring\n            pct={kcalGoal')
    expect(progressRing).toContain('size={88}')
    expect(progressRing).not.toContain('toneOver')
  })

  test('кольцу голодания передан toneOver={false} — сверх цели цвет темы', () => {
    // Анкор без привязки к отступам — карусель «меню ↔ голодание»
    // (правка Кати 27.11) сменила вложенность блока
    const fastingRing = ringBlock(plan, plan.match(/<Ring\n\s+pct=\{fastPct\}/)[0])
    // «все поменьше» (правка Кати 27.11): кольцо карточки голодания ужато 56 → 48
    expect(fastingRing).toContain('size={48}')
    expect(fastingRing).toContain('toneOver={false}')
  })

  test('свечение под дугой не рисуется в plain-темах («Классика»)', () => {
    expect(plan.match(/pct > 0 && !plain && \(\n\s*<AnimatedCircle/)).not.toBeNull()
    expect(plan.match(/useThemePlain\(\)/)).not.toBeNull()
  })

  test('экран голодания: таймер и полоса сверх цели — акцент темы, не оранжевый', () => {
    const fast = read('src/components/planner/FastingScreen.jsx')
    expect(fast.match(/bigTimer,\s*overGoal && \{ color: colors\.orange \}/)).toBeNull()
    expect(fast.match(/backgroundColor: colors\.accent \}\]\} \/>/)).not.toBeNull()
    expect(fast.match(/overGoal \? colors\.orange : colors\.accent/)).toBeNull()
    // Текст «Цель превышена… — молодец!» сохранён — состояние «сверх цели» читается словами
    expect(fast).toContain('Цель превышена на')
  })

  test('colors.orange на экране голодания остался только у кнопки «Завершить»', () => {
    const fast = read('src/components/planner/FastingScreen.jsx')
    const lines = fast.split('\n')
    const hits = lines
      .map((l, i) => ({ l: l.trim(), n: i + 1 }))
      .filter(({ l }) => l.includes('colors.orange'))
    expect(hits.length).toBeGreaterThan(0)
    for (const { l } of hits) {
      expect(
        l.includes('stopBtn') ||
        l.includes('stopText') ||
        l.includes('<Square') ||
        l.includes('borderColor: colors.orange')
      ).toBe(true)
    }
  })
})
