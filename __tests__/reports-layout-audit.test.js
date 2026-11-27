// Аудит правок Кати 27.11 (скрины «Отчётов»):
// 1) «Блок график веса наезжает на блоки истории» — ряды мини-карточек
//    «Отчётов» схлопывались в полоску: у внутренних View карточек висел
//    flex-1 (flexBasis 0%) в колонке с авто-высотой. Теперь — flexGrow:1
//    (basis auto): высоту ряду даёт контент, растягивание в ряду — stretch.
// 2) «Блок нутриенты схлопнулся» — у плиток Stat та же история
//    (flex-1 на внутренней View GradientTile): плитки сжимались в
//    двухпиксельные линии с цветными точками. Теперь у внутренней View
//    никакого flex, ширину даёт style={{ flex: 1 }} внешнего контейнера.
// 3) «В графике веса не видно под замком надпись 30 дн 90 дн» — замок
//    приглушал весь чип (opacity: 0.5): на тёмных темах подпись и замок
//    исчезали. Теперь чип не приглушается — рамка accentBorder.
//    То же — в общих пилюлях периодов (Pills).
//
// Тест — статический аудит исходников (как module-colors.test.js).

const fs = require('fs')
const path = require('path')

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8')

describe('правки «Отчётов» 27.11: ряды не схлопываются, замки читаются', () => {
  const reportCards = read('src/components/activity/reports/ReportCards.jsx')

  test('внутренние View всех шести карточек — flexGrow вместо flex-1', () => {
    // Ни одного остатка хрупкого паттерна className="flex-1" с паддингом
    expect(reportCards.match(/<View style=\{\{ padding: s\.pad \}\} className="flex-1">/)).toBeNull()
    // Три карточки (ReportCard, SleepCard, WeightReportCard) — flexGrow: 1
    expect(reportCards.match(/<View style=\{\{ padding: s\.pad, flexGrow: 1 \}\}>/g).length).toBe(3)
  })

  test('плитки «Нутриентов» без flex-1 на внутреннем View', () => {
    const nutrients = read('src/components/activity/reports/NutrientsCard.jsx')
    const stat = nutrients.match(/<GradientTile\n([\s\S]*?)\n    >/)[0]
    expect(stat).not.toBeNull()
    // Внутренней View (className) — только паддинги, никакого flex
    expect(stat.match(/className="([^"]*)"/)[1]).toBe('px-3 py-2.5')
    // Ширину в ряду даёт внешний контейнер
    expect(stat).toContain('style={{ flex: 1, minWidth: 0 }}')
  })

  test('чипы «Графика веса» под замком видны: без opacity 0.5, с рамкой темы', () => {
    const weight = read('src/components/activity/reports/WeightTrendCard.jsx')
    // Приглушение всего чипа убрано
    expect(weight.match(/opacity: 0\.5/)).toBeNull()
    // Замок — рамкой accentBorder, а не прозрачностью
    expect(weight.match(/locked && !active \? \{ borderWidth: 1, borderColor: themeColors\.accentBorder \}/)).not.toBeNull()
    // Подписи «30 д»/«90 д» остались полнота-цветными (sub), замок — dim
    expect(weight.match(/className=\{`font-semibold text-\[12\.5px\] \$\{active \? '' : 'text-bear-sub'\}`\}/)).not.toBeNull()
  })

  test('общие пилюли периодов под замком читаются: рамка вместо opacity', () => {
    const pills = read('src/components/ui/Pills.jsx')
    expect(pills.match(/opacity: 0\.5/)).toBeNull()
    expect(pills.match(/style=\{locked \? \{ borderWidth: 1, borderColor: themeColors\.accentBorder \} : null\}/)).not.toBeNull()
    expect(pills).toContain('text-bear-dim')
  })
})
