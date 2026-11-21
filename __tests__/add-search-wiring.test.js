// Проводка «сжатого режима» поиска в окне «Добавить приём пищи».
// Отзыв Кати 21.11, 16:38 (скрины Expo Go: «Каша», «Батон», «Чай» —
// между «Свой продукт» и «Ручной поиск» пусто): в коммите 2c3165a
// компактный режим был уже написан (searching ? 'h-full' : 'h-[85%]',
// шапка сжимается), но проп onSearchActiveChange={setSearching} в
// AddHub не передавался — searching всегда false, окно оставалось
// с полной шапкой и высотой 85%, и при открытой клавиатуре списку
// результатов доставалась нулевая высота: поиск «работал», но был
// невидим. Компонентный рендер тут избыточен — проверяем проводку
// по исходнику (паттерн promo-codes.test.js), регрессия ловится.

const fs = require('fs')
const path = require('path')

const modal = fs.readFileSync(
  path.join(__dirname, '../src/components/food/AddFoodModal.jsx'),
  'utf8'
)
const hub = fs.readFileSync(
  path.join(__dirname, '../src/components/food/AddHub.jsx'),
  'utf8'
)

describe('«сжатый режим» поиска: AddHub ↔ AddFoodModal', () => {
  test('AddFoodModal передаёт onSearchActiveChange={setSearching} в AddHub', () => {
    expect(modal).toMatch(/onSearchActiveChange=\{setSearching\}/)
  })

  test('окно реагирует на searching: полная высота и компактная шапка', () => {
    expect(modal).toMatch(/searching \? 'h-full' : 'h-\[85%\]'/)
    expect(modal).toMatch(/searching \? \(/)
  })

  test('AddHub объявляет проп и сообщает о активном поиске', () => {
    expect(hub).toMatch(/onSearchActiveChange\s*\}/)
    expect(hub).toMatch(/onSearchActiveChange\?\.\(searchActive\)/)
  })

  test('списку результатов гарантирована минимальная высота', () => {
    expect(hub).toMatch(/min-h-\[150px\]/)
  })
})
