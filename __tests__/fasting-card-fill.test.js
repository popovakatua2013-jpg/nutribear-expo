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
// Тест — статический аудит исходников (как module-colors.test.js).

const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(
  path.join(__dirname, '..', 'src/components/planner/PlanScreen.jsx'),
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
