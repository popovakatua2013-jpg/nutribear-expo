// Аудит правок Кати 27.11 (скриншоты «Добавить приём пищи» и
// «Динамика веса»):
//   1) «Текст распознает но отсутствует кнопка добавить» — в «Голосе»
//      список распознанного был простынёй карточек без явной кнопки:
//      теперь внизу окна ЗАКРЕПЛЕНА кнопка «Добавить всё в „Ужин“»
//      (вне прокрутки — видна всегда), у карточек — плюс-подсказка
//      и крестик «убрать лишнее» (нейросеть приписала «Яйцо варёное»
//      к фразе про грудку с гречкой);
//   2) «Шапку не видно текущий вес» — у GradientTile угол больше не
//      ярко-неоновый: первый цвет внутреннего градиента НЕПОЗРАЧНЫЙ
//      (blendHex card + акцент), текст «Текущий вес» читается на всех
//      темах;
//   3) «цифра веса не соответствует темам» — weightTone в норме красится
//      акцентом темы (accentBright), янтарный «сушка»-тон удалён;
//      правка Кати 28.11 «Вес красные цифры»: красной цифры больше нет
//      и при переборе ИМТ — приглушённый sub (кольцо ИМТ и шкала рядом
//      сигнализируют как раньше);
//   4) «рейтинг питания убрать подсказку у блюд этого периода» — длинная
//      подсказка про витамины удалена из NutritionRating;
//   5) промпт распознавания — «НЕ выдумывай и не добавляй блюда, которых
//      нет во фразе» (меньше фантомных позиций от ИИ).
// Стиль — статический аудит исходников (fs.readFileSync + regex),
// как в fasting-card-fill.test.js.

const fs = require('fs')
const path = require('path')

const read = (...p) =>
  fs.readFileSync(path.join(__dirname, '..', ...p), 'utf8')

const voice = read('src', 'components', 'food', 'VoiceMode.jsx')
const addModal = read('src', 'components', 'food', 'AddFoodModal.jsx')
const weightCard = read('src', 'components', 'bmi', 'WeightCard.jsx')
const gradientTile = read('src', 'components', 'ui', 'GradientTile.jsx')
const rating = read('src', 'components', 'home', 'NutritionRating.jsx')
const foodAi = read('src', 'lib', 'food-ai.js')

describe('кнопка «Добавить всё» в «Голосе» (отзыв Кати 27.11)', () => {
  test('кнопка существует, закреплена ВНЕ прокрутки и в цвет темы', () => {
    expect(voice).toMatch(/Добавить всё в «\$\{mealName\}»/)
    // футер после закрытия ScrollView (между ними — только комментарий) —
    // кнопка не уезжает под список
    expect(voice).toMatch(/<\/ScrollView>[\s\S]*?\{results\.length > 0 && \(/)
    expect(voice).toMatch(/backgroundColor: themeColors\.accent\b/)
    expect(voice).toMatch(/color: themeColors\.accentOn/)
    // вариант «за вчера» тоже есть
    expect(voice).toMatch(/Добавить всё за вчера в «\$\{mealName\}»/)
  })

  test('добавление идёт в дневник с защитой от двойного тапа', () => {
    expect(voice).toMatch(/const addEntry = useFoodStore\(\(s\) => s\.addEntry\)/)
    expect(voice).toMatch(/addAllOnce = useRef\(tapGuard\(\)\)\.current/)
    expect(voice).toMatch(/addAllOnce\(\(\) => \{/)
    // калории считаются как на экране порции: kcal100 × грамовка
    expect(voice).toMatch(/kcalForPortion\(food, grams\)/)
    expect(voice).toMatch(/addEntry\(mealId, \{ food, grams, kcal, desc: it\.desc \}, dayOff\)/)
  })

  test('крестик убирает лишнюю позицию, плюс — подсказка тапабельности', () => {
    expect(voice).toMatch(/function removeItem\(i\) \{/)
    expect(voice).toMatch(/setResults\(\(prev\) => prev\.filter\(\(_, j\) => j !== i\)\)/)
    expect(voice).toMatch(/accessibilityLabel=\{`Убрать \$\{it\.name\} из списка`\}/)
    expect(voice).toMatch(/<Plus size=\{18\} color=\{themeColors\.accentSoft\} \/>/)
    expect(voice).toMatch(/<X size=\{16\} color=\{themeColors\.sub\} \/>/)
  })

  test('AddFoodModal передаёт приём, имя приёма, день и закрытие', () => {
    expect(addModal).toMatch(
      /<VoiceMode onPick=\{setPicked\} mealId=\{mealId\} mealName=\{meal\?\.name \|\| ''\} dayOff=\{dayOff\} onClose=\{close\} \/>/
    )
  })

  test('промпт распознавания запрещает выдумывать блюда', () => {
    expect(foodAi).toMatch(/Извлекай ТОЛЬКО то, что названо во фразе: не добавляй/)
    expect(foodAi).toMatch(/НЕ выдумывай и не добавляй блюда, которых нет во фразе\./)
  })
})

describe('плитка «Текущий вес» (отзыв Кати 27.11)', () => {
  test('GradientTile: угол плитки непрозрачный — текст читается на ярких темах', () => {
    expect(gradientTile).toMatch(/import \{ blendHex \} from '@\/lib\/themes'/)
    // старый полупрозрачный угол удалён — он и делал «шапку не видно»
    expect(gradientTile).not.toMatch(/withAlpha\(c\.accent, 0\.1\)/)
    expect(gradientTile).toMatch(/colors=\{\[blendHex\(c\.card, c\.accentBright, 0\.2\), c\.card, c\.deep\]\}/)
  })

  test('цифра веса в норме — акцент темы, вне нормы — семантика ИМТ', () => {
    // янтарные ветки по цели питания удалены («цифра веса не соответствует темам»)
    expect(weightCard).not.toMatch(/foodGoal === 'lose'\s*\n\s*\? themeColors\.warn/)
    expect(weightCard).not.toMatch(/foodGoal === 'maintain'/)
    expect(weightCard).not.toMatch(/foodGoal === 'gain'/)
    // отклонения ИМТ больше НЕ красят цифру в красный (правка Кати
    // 28.11 «Вес красные цифры» — агрессивно и не по темам): перебор —
    // приглушённый sub темы, недостаток — жёлтый warn
    expect(weightCard).not.toMatch(/bmiNow >= 25\s*\n\s*\? themeColors\.bad/)
    expect(weightCard).toMatch(/bmiNow >= 25\s*\n\s*\? themeColors\.sub/)
    expect(weightCard).toMatch(/bmiNow > 0 && bmiNow < 18\.5\s*\n\s*\? themeColors\.warn/)
    // в норме — акцент активной темы
    expect(weightCard).toMatch(/: themeColors\.accentBright\s*\n/)
    expect(weightCard).toMatch(/style=\{\{ color: weightTone \}\}/)
  })
})

describe('рейтинг питания без подсказки «у блюд этого периода»', () => {
  test('длинная подсказка про витамины удалена, краткая с процентом осталась', () => {
    // ищем именно СТРОКУ подсказки (тернарник), а не упоминания в комментариях
    expect(rating).not.toMatch(/\?\s*'У блюд этого периода/)
    expect(rating).not.toMatch(/микро-часть в балле не учтена/)
    expect(rating).toMatch(/share > 0\.001 && share < 0\.999/)
    expect(rating).toMatch(/покрытие записей ≈/)
  })
})
