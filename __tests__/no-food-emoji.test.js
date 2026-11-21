// Отзыв Кати 21.11 (скрин поиска «Бург» 16:58: строки с эмодзи-бургерами):
// «Удалить все изображения в базе в виде картинок хлеба бургеров и т.д —
// это лишнее. Не нужны иконки нигде». Эмодзи-иконки и фото-миниатюры
// продуктов убраны из всех списков и экранов еды. Тест-страховка по
// исходникам: в перечисленных компонентах не должно остаться рендера
// «{x.emoji}» (данные эмодзи в базе сохраняются для совместимости,
// но нигде не показываются).

const fs = require('fs')
const path = require('path')

const rel = [
  'food/FoodList.jsx',
  'food/AddHub.jsx',
  'food/BaseMode.jsx',
  'food/SelectedFood.jsx',
  'food/VoiceMode.jsx',
  'food/EditEntryModal.jsx',
  'food/EditAiFoodModal.jsx',
  'home/AllMealsModal.jsx',
  'home/HistoryModal.jsx',
  'home/MealPlanCard.jsx',
  'home/PortionsModal.jsx',
  'planner/AddDishModal.jsx',
  'planner/SwapDishModal.jsx',
  'planner/GramsModal.jsx',
  'planner/MealPlanScreen.jsx',
  'planner/ShoppingListScreen.jsx',
]

describe('в списках еды нет эмодзи-иконок продуктов', () => {
  test.each(rel)('%s не рендерит эмодзи продукта', (file) => {
    const src = fs.readFileSync(path.join(__dirname, '../src/components', file), 'utf8')
    // Рендер эмодзи в JSX: {item.emoji}, {it.emoji || '🍽'}, {row.emoji || '🍽️'},
    // {picked.raw.emoji}, {item?.emoji || '🍽️'} и т. п. — с дефолтом или без
    expect(src).not.toMatch(/\{\s*[\w?]+\??\.emoji/)
  })

  test('FoodList без миниатюр: нет 52px-картинки и Image', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/components/food/FoodList.jsx'), 'utf8')
    expect(src).not.toMatch(/w-\[52px\]/)
    expect(src).not.toMatch(/\bImage\b/)
    expect(src).not.toMatch(/\.photo/)
  })

  test('форма «Свой продукт» без пикера «Картинка»', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/components/food/UserFoodForm.jsx'), 'utf8')
    expect(src).not.toMatch(/EMOJIS\.map/)
    expect(src).not.toMatch(/const EMOJIS/)
    expect(src).not.toContain('Выбрать картинку')
    // данные совместимы: старое эмодзи сохраняется, новое — нейтральное
    expect(src).toMatch(/initial\?\.emoji \|\| '⭐'/)
  })

  test('диалог удаления записи без эмодзи в тексте', () => {
    const src = fs.readFileSync(path.join(__dirname, '../src/lib/confirm-remove.js'), 'utf8')
    expect(src).not.toMatch(/entry\.emoji/)
  })
})
