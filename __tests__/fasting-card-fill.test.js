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
  test('горизонтальная прокрутка со снапом: меню ↔ голодание ↔ прогресс, ширины от окна', () => {
    // Горизонтальный ScrollView со снапом к ТРЁМ позициям (правка Кати
    // 27.11: «прогресс тоже сделай в карусель»)
    expect(src.match(/<ScrollView\n\s*horizontal\n\s*showsHorizontalScrollIndicator=\{false\}\n\s*decelerationRate="fast"\n\s*snapToOffsets=\{\[0, menuCardW \+ CAR_GAP, menuCardW \+ CAR_GAP \+ fastCardW \+ CAR_GAP\]\}/)).not.toBeNull()
    // Ширины — от окна и боковых отступов вкладки (spacing.xl)
    expect(src.match(/const menuCardW = winW - spacing\.xl \* 2 - CAR_PEEK/)).not.toBeNull()
    expect(src.match(/const fastCardW = winW - spacing\.xl \* 2/)).not.toBeNull()
    expect(src.match(/useWindowDimensions/)).not.toBeNull()
  })

  test('первая карточка карусели — «Меню на неделю», вторая — голодание', () => {
    const carousel = src.slice(src.indexOf('snapToOffsets={[0, menuCardW + CAR_GAP'))
    expect(carousel.indexOf('<MealPlanScreen compact />')).toBeGreaterThan(-1)
    expect(carousel.indexOf('Интервальное питание — открыть подробнее')).toBeGreaterThan(-1)
    // Порядок: меню стоит в карусели ДО карточки голодания и «Прогресса»
    expect(carousel.indexOf('<MealPlanScreen compact />'))
      .toBeLessThan(carousel.indexOf('Интервальное питание — открыть подробнее'))
    // «Прогресс» — третья карточка той же карусели (правка Кати 27.11)
    const atProgress = carousel.indexOf('>Прогресс</Text>')
    expect(atProgress).toBeGreaterThan(carousel.indexOf('Интервальное питание — открыть подробнее'))
  })

  test('карточка голодания тянется на высоту ряда карусели, содержимое распределено по высоте', () => {
    const fastCard = src.match(/fastCard: \{ flex: 1 \}/)
    expect(fastCard).not.toBeNull()
    // Правка Кати 28.11: карточка вдвое ниже — паддинг 8 вместо 10
    expect(src.match(/fastInner: \{ padding: 8, flex: 1, justifyContent: 'space-between' \}/)).not.toBeNull()
    // Ширина тап-обёртки — fastCardW, высота — от карусели (stretch)
    expect(src).toContain('style={{ width: fastCardW }}')
    // Растяжение по высоте — alignItems: 'stretch' у contentContainer карусели;
    // 28.11: у ряда ФИКСИРОВАННАЯ высота CAR_H (~половина прежней)
    expect(src).toContain("alignItems: 'stretch',")
    expect(src).toContain('height: CAR_H + 28')
  })

  test('обе карточки карусели ОДИНАКОВОЙ высоты (правка Кати 27.11: «сделать одинаково»)', () => {
    // Карточка меню в карусели: без marginTop от вертикальной вёрстки
    // (он сдвигал меню ВНИЗ относительно карточки голодания) и с flex: 1 —
    // тянется на высоту ряда карусели, как fastCard
    expect(menuSrc.match(/cardC: \{ flex: 1, marginTop: 0 \}/)).not.toBeNull()
    expect(menuSrc).toContain('style={[styles.card, compact && styles.cardC]}')
    // Обе карточки стоят в одном ряду карусели — высоту ряда задаёт
    // самая высокая, stretch + flex: 1 дотягивают обе до одного края
    const atStretch = src.indexOf("alignItems: 'stretch',")
    const atMenuCard = src.indexOf('<MealPlanScreen compact />')
    const atFast = src.indexOf('style={{ width: fastCardW }}')
    expect(atMenuCard).toBeGreaterThan(atStretch)
    expect(atFast).toBeGreaterThan(atMenuCard)
  })

  test('«в два раза меньше по высоте» (правка Кати 28.11): компактные элементы ужаты ещё сильнее', () => {
    // Меню: день 26, строка приёма 26, «Все приёмы пищи» 26 (было 30/32/30)
    expect(menuSrc).toContain('cardInnerC: { padding: spacing.m, justifyContent: \'space-between\' }')
    expect(menuSrc).toContain('dayBoxC: { height: 26 }')
    expect(menuSrc.match(/mealRowC: \{ gap: 5, minHeight: 26 \}/)).not.toBeNull()
    expect(menuSrc).toContain('showAllC: { height: 26, marginTop: 4 }')
    // Голодание: кольцо 52/5 (правка Кати 28.11: «кольцо выглядит
    // несуразно» — тоньше и соразмернее; было 48 → 64 по 27.11),
    // кнопка «Подробнее» 24
    expect(src).toContain('size={52}')
    expect(src.match(/height: 24,\n    marginTop: 4,/)).not.toBeNull()
  })

  test('«Прогресс» в карусели: той же ширины и высоты, без своего marginTop', () => {
    // Обёртка третьей карточки — fastCardW (во всю ширину при снапе),
    // NeonCard — cardC (flex: 1, marginTop: 0) + компактные стили C
    const carousel = src.slice(src.indexOf('snapToOffsets={[0, menuCardW + CAR_GAP'))
    expect(carousel).toContain('<View style={{ width: fastCardW }}>')
    expect(carousel).toContain('style={[styles.card, styles.cardC]}')
    expect(carousel).toContain('innerStyle={[styles.cardInner, styles.cardInnerC]}')
    // У карточки прогресса в карусели НЕТ собственного marginTop от вёрстки
    expect(src.match(/cardC: \{ flex: 1, marginTop: 0 \}/)).not.toBeNull()
  })

  test('кольцо голодания сохранило toneOver={false} — цвет темы сверх цели', () => {
    const fastRing = src.match(/<Ring\n\s*pct=\{fastPct\}[\s\S]*?\/>/)
    expect(fastRing).not.toBeNull()
    expect(fastRing[0]).toContain('toneOver={false}')
  })

  test('«Добавить рецепт» — компактная строка-кнопка под каруселью', () => {
    const recipeCard = src.match(/recipeCard: \{\n([^\n]*\n)+?\s*\},/)[0]
    expect(recipeCard).not.toContain('flex: 1')
    // marginTop 16 — единый отступ между блоками (правка Кати 27.11:
    // «между блоками нет отступов — сделать отступ»; было 10)
    expect(recipeCard).toContain('marginTop: 16')
    // Строка-кнопка: иконка слева, тексты в столбик, шеврон справа
    const recipeInner = src.match(/recipeInner: \{\n([^\n]*\n)+?\s*\},/)[0]
    expect(recipeInner).toContain("flexDirection: 'row'")
    expect(src.match(/recipeTexts: \{ flex: 1, minWidth: 0 \}/)).not.toBeNull()
    // Рецепт стоит ПОСЛЕ карусели (под ней), не внутри
    const atCarousel = src.indexOf('snapToOffsets={[0, menuCardW + CAR_GAP,')
    const atRecipe = src.indexOf('Добавить рецепт — свои рецепты')
    expect(atRecipe).toBeGreaterThan(atCarousel)
  })
})
