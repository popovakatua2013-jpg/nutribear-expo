// Правая колонка «Плана» без пустоты между блоками (правка Кати:
// «много пустого пространства между интервальным и добавить рецепт»).
//
// Раньше карточка «Интервального питания» стояла в колонке своей
// высоты, а «Добавить рецепт» прижимался space-between к низу колонки
// (выравнивание по низу «Меню на неделю», 26.11) — между блоками
// висела дыра. Теперь пустое место забирает карточка голодания
// (flex:1 у fastCard и тап-обёртки fastPress), её содержимое
// распределяется по высоте (space-between у fastInner), «Добавить
// рецепт» остаётся сжатым (растягивать нельзя — прошлый вариант
// читался огромной пустой плиткой) и колонка по-прежнему заканчивается
// на одной линии с меню.
//
// Тест — статический аудит исходников (как module-colors.test.js).

const fs = require('fs')
const path = require('path')

const src = fs.readFileSync(
  path.join(__dirname, '..', 'src/components/planner/PlanScreen.jsx'),
  'utf8',
)

describe('карточка «Интервального питания» заполняет колонку без дыр', () => {
  test('fastCard и тап-обёртка растягиваются (flex:1)', () => {
    expect(src.match(/fastPress: \{ flex: 1 \}/)).not.toBeNull()
    const fastCard = src.match(/fastCard: \{\n([^\n]*\n)+?\s*\},/)[0]
    expect(fastCard).toContain('flex: 1')
    expect(src).toContain("style={styles.fastPress}")
  })

  test('содержимое карточки распределено по высоте (space-between у fastInner)', () => {
    expect(src.match(/fastInner: \{ padding: 10, flex: 1, justifyContent: 'space-between' \}/)).not.toBeNull()
  })

  test('колонка без space-between, «Добавить рецепт» остаётся сжатым', () => {
    // space-between у fastCol больше не нужен: свободного места нет —
    // его забрала карточка голодания
    expect(src.match(/fastCol: \{ flex: 1, alignSelf: 'stretch' \}/)).not.toBeNull()
    const recipeCard = src.match(/recipeCard: \{\n([^\n]*\n)+?\s*\},/)[0]
    expect(recipeCard).not.toContain('flex: 1')
    expect(recipeCard).toContain('marginTop: 10')
  })
})
