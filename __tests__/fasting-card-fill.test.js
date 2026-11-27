// Карусель «меню ↔ интервальное питание» на «Плане» (правка Кати 27.11:
// «меню на неделю и листать/смахнуть влево — там будет интервальное
// питание», оформление как в Сбербанке) — без дыр и без потери прежних
// гарантий.
//
// Прежний макет — две колонки (меню слева, голодание + «Добавить рецепт»
// справа) — заменён горизонтальной каруселью: слева большая карточка
// меню, справа из-за края выглядывает карточка голодания, свайп влево
// ставит её во всю ширину (snapToOffsets). «Добавить рецепт» —
// компактная строка-кнопка под каруселью (растягивать нельзя — прошлый
// вариант читался огромной пустой плиткой). Карточка голодания тянется
// на высоту карточки меню (alignItems: 'stretch' + flex:1 у fastCard),
// содержимое распределено по высоте (space-between у fastInner).
//
// Правка Кати 27.11 («разной высоты — сделать одинаково и все
// поменьше»): карточка меню в карусели тоже тянется на высоту ряда
// (cardC: flex: 1 без marginTop — он сдвигал меню вниз), компактные
// элементы ужаты (паддинг 12, день 30, строка приёма 32, кольцо 48).
//
// Тест — статический аудит исходников (как module-colors.test.js).

const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(
  path.join(__dirname, '..', 'src/components/planner/PlanScreen.jsx'),
  'utf8',
)

const menuSrc = fs.readFileSync(
  path.join(__dirname, '..', 'src/components/planner/MealPlanScreen.jsx'),
  'utf8',
)

describe('карусель «меню ↔ интервальное питание» на «Плане»', () => {
  test('горизонтальная прокрутка со снапом: меню ↔ голодание, ширины от окна', () => {
    // Горизонтальный ScrollView со снапом к двум позициям (меню, голодание)
    expect(src.match(/<ScrollView\n\s*horizontal\n\s*showsHorizontalScrollIndicator=\{false\}\n\s*decelerationRate="fast"\n\s*snapToOffsets=\{\[0, menuCardW \+ CAR_GAP\]\}/)).not.toBeNull()
    // Ширины — от окна и боковых отступов вкладки (spacing.xl)
    expect(src.match(/const menuCardW = winW - spacing\.xl \* 2 - CAR_PEEK/)).not.toBeNull()
    expect(src.match(/const fastCardW = winW - spacing\.xl \* 2/)).not.toBeNull()
    expect(src.match(/useWindowDimensions/)).not.toBeNull()
  })

  test('первая карточка карусели — «Меню на неделю», вторая — голодание', () => {
    const carousel = src.slice(src.indexOf('snapToOffsets={[0, menuCardW + CAR_GAP]}'))
    expect(carousel.indexOf('<MealPlanScreen compact />')).toBeGreaterThan(-1)
    expect(carousel.indexOf('Интервальное питание — открыть подробнее')).toBeGreaterThan(-1)
    // Порядок: меню стоит в карусели ДО карточки голодания
    expect(carousel.indexOf('<MealPlanScreen compact />'))
      .toBeLessThan(carousel.indexOf('Интервальное питание — открыть подробнее'))
  })

  test('карточка голодания тянется на высоту меню, содержимое распределено по высоте', () => {
    const fastCard = src.match(/fastCard: \{ flex: 1 \}/)
    expect(fastCard).not.toBeNull()
    expect(src.match(/fastInner: \{ padding: 10, flex: 1, justifyContent: 'space-between' \}/)).not.toBeNull()
    // Ширина тап-обёртки — fastCardW, высота — от карусели (stretch)
    expect(src).toContain('style={{ width: fastCardW }}')
    // Растяжение по высоте — alignItems: 'stretch' у contentContainer карусели
    expect(src).toContain("contentContainerStyle={{ alignItems: 'stretch', gap: CAR_GAP, paddingVertical: 14 }}")
  })

  test('обе карточки карусели ОДИНАКОВОЙ высоты (правка Кати 27.11: «сделать одинаково»)', () => {
    // Карточка меню в карусели: без marginTop от вертикальной вёрстки
    // (он сдвигал меню ВНИЗ относительно карточки голодания) и с flex: 1 —
    // тянется на высоту ряда карусели, как fastCard
    expect(menuSrc.match(/cardC: \{ flex: 1, marginTop: 0 \}/)).not.toBeNull()
    expect(menuSrc).toContain('style={[styles.card, compact && styles.cardC]}')
    // Обе карточки стоят в одном ряду карусели — высоту ряда задаёт
    // самая высокая, stretch + flex: 1 дотягивают обе до одного края
    const atStretch = src.indexOf("alignItems: 'stretch', gap: CAR_GAP")
    const atMenuCard = src.indexOf('<MealPlanScreen compact />')
    const atFast = src.indexOf('style={{ width: fastCardW }}')
    expect(atMenuCard).toBeGreaterThan(atStretch)
    expect(atFast).toBeGreaterThan(atMenuCard)
  })

  test('«все поменьше» (правка Кати 27.11): компактные элементы ужаты', () => {
    // Меню: внутренний паддинг 12 вместо 16, день 30, строка приёма 32,
    // «Все приёмы пищи» 30
    expect(menuSrc).toContain('cardInnerC: { padding: spacing.m }')
    expect(menuSrc).toContain('dayBoxC: { height: 30 }')
    expect(menuSrc.match(/mealRowC: \{ gap: 5, minHeight: 32 \}/)).not.toBeNull()
    expect(menuSrc).toContain('showAllC: { height: 30, marginTop: 6 }')
    // Голодание: кольцо 48, кнопка «Подробнее» 28
    expect(src).toContain('size={48}')
    expect(src.match(/height: 28,\n    marginTop: 6,/)).not.toBeNull()
  })

  test('кольцо голодания сохранило toneOver={false} — цвет темы сверх цели', () => {
    const fastRing = src.match(/<Ring\n\s*pct=\{fastPct\}[\s\S]*?\/>/)
    expect(fastRing).not.toBeNull()
    expect(fastRing[0]).toContain('toneOver={false}')
  })

  test('«Добавить рецепт» — компактная строка-кнопка под каруселью', () => {
    const recipeCard = src.match(/recipeCard: \{\n([^\n]*\n)+?\s*\},/)[0]
    expect(recipeCard).not.toContain('flex: 1')
    expect(recipeCard).toContain('marginTop: 10')
    // Строка-кнопка: иконка слева, тексты в столбик, шеврон справа
    const recipeInner = src.match(/recipeInner: \{\n([^\n]*\n)+?\s*\},/)[0]
    expect(recipeInner).toContain("flexDirection: 'row'")
    expect(src.match(/recipeTexts: \{ flex: 1, minWidth: 0 \}/)).not.toBeNull()
    // Рецепт стоит ПОСЛЕ карусели (под ней), не внутри
    const atCarousel = src.indexOf('snapToOffsets={[0, menuCardW + CAR_GAP]}')
    const atRecipe = src.indexOf('Добавить рецепт — свои рецепты')
    expect(atRecipe).toBeGreaterThan(atCarousel)
  })
})
