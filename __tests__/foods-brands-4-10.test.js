// Тесты большого расширения брендовой базы (файлы 4-10, отзыв Кати
// 20.11: «сделай расширенную базу продуктов, максимально сколько
// можешь за раз, желательно 2-3 тыс позиций популярных
// производителей»). Проверяем: объём, уникальные id/названия в ОБЩЕЙ
// базе FOODS, «ёлочки» марок, согласованность КБЖУ (Атуотер
// 4Б/9Ж/4У, клетчатка 2), алиасы и что новые позиции реально
// находятся поиском findLocalFood (офлайн), а preferBrandBase
// подставляет их КБЖУ вместо ИИ-оценки.
// expo-file-system / expo-image-manipulator / ai-config стабим —
// food-ai импортирует их на уровне модуля.

jest.mock('expo-file-system', () => ({
  File: class {
    get exists() {
      return false
    }
    text() {
      return '{}'
    }
    write() {}
  },
  Paths: { document: '/tmp' },
}))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: class {},
  SaveFormat: { JPEG: 0, PNG: 1 },
  manipulateAsync: jest.fn(async () => ({ uri: 'file:///tmp/x.jpg' })),
}))
jest.mock('@/lib/ai-config', () => ({
  AI_CONFIG: { apiKey: '', proxyUrl: '', baseUrl: '', model: 'test', voiceModel: '' },
}))

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

let BRAND4_FOODS
let BRAND5_FOODS
let BRAND6_FOODS
let BRAND7_FOODS
let BRAND8_FOODS
let BRAND9_FOODS
let BRAND10_FOODS
let FOODS
let foodAi

beforeAll(() => {
  ;({ BRAND4_FOODS } = require('@/lib/data/foods-brands-4'))
  ;({ BRAND5_FOODS } = require('@/lib/data/foods-brands-5'))
  ;({ BRAND6_FOODS } = require('@/lib/data/foods-brands-6'))
  ;({ BRAND7_FOODS } = require('@/lib/data/foods-brands-7'))
  ;({ BRAND8_FOODS } = require('@/lib/data/foods-brands-8'))
  ;({ BRAND9_FOODS } = require('@/lib/data/foods-brands-9'))
  ;({ BRAND10_FOODS } = require('@/lib/data/foods-brands-10'))
  ;({ FOODS } = require('@/lib/data/foods'))
  foodAi = require('@/lib/food-ai')
})

const newFoods = () => [
  ...BRAND4_FOODS,
  ...BRAND5_FOODS,
  ...BRAND6_FOODS,
  ...BRAND7_FOODS,
  ...BRAND8_FOODS,
  ...BRAND9_FOODS,
  ...BRAND10_FOODS,
]

// Позиции, где марка и есть название (без «ёлочек» не обойтись):
// газировки/энергетики/кофе-сети/фастфуд-бренды латиницей
const NO_BRAND = new Set([
  'Кока-кола ваниль',
  'Кока-кола Черри',
  'Спрайт Zero',
  'Фанта Zero',
  'Пепси Zero',
  'Миринда Zero',
  'Маунтин Дью (Mountain Dew)',
  'Adrenaline Rush (энергетик)',
  'Burn энергетик',
  'Monster Energy',
  'Monster Ultra White',
  'Red Bull энергетик',
  'Red Bull без сахара',
  'Guru энергетик',
  'Flash Up энергетик',
  'Торнадо энергетик',
  'Adrenaline Game Fuel',
  'Kinder Bueno',
  'Kinder Maxi',
  'Kinder Country',
  'Нарзан (минеральная вода)',
  'Соль поваренная Экстра',
  'Уксус столовый 9%',
  'Вермишель Паутинка «Макфа» (сухая)',
  'Яйцо куриное С1',
  'Яичный белок (из яйца С1)',
  'Котлетка Куриная (Ростикс)',
  'Квас в стакане (летняя точка)',
  'Роллтон', // «Роллтон» — марка и есть название
  'Масло Кубанское любимое',
  'Соль поваренная Экстра',
  'Уксус столовый 9%',
  'Разрыхлитель теста',
  'Ванильный сахар',
  'Кока-кола ваниль',
  'Кока-кола Черри',
  'Спрайт Zero',
  'Фанта Zero',
  'Пепси Zero',
  'Миринда Zero',
  'Маунтин Дью (Mountain Dew)',
  'Adrenaline Rush (энергетик)',
  'Burn энергетик',
  'Monster Energy',
  'Monster Ultra White',
  'Red Bull энергетик',
  'Red Bull без сахара',
  'Guru энергетик',
  'Flash Up энергетик',
  'Торнадо энергетик',
  'Adrenaline Game Fuel',
  'Нарзан (минеральная вода)',
  'Лимонад Байкал',
  'Лимонад Тархун',
  'Лимонад Дюшес',
  'Чай чёрный с 2 ложками сахара',
  'Эспрессо (готовый напиток)',
  'Латте на молоке 3,2% (готовый)',
  'Мокко с шоколадом (готовый)',
  'Раф кофейный (готовый)',
  'Какао на молоке (готовый)',
  'Донер Кебаб',
  'Шаверма с говядиной',
  'Шаверма с сыром',
  'Свёкла свежая',
  'Тыква свежая',
  'Вешенки свежие',
  'Салат Айсберг',
  'Спаржа свежая',
  'Кукуруза свежая',
  'Перец чили',
  'Капуста брюссельская свежая',
  'Капуста краснокочанная свежая',
  'Цветная капуста свежая',
  'Белые грибы свежие',
  'Имбирь свежий',
  'Голубика',
  'Смородина красная',
  'Фейхоа',
  'Айва',
  'Репа свежая',
  'Сёмга стейк свежий',
  'Форель свежая',
  'Горбуша стейк свежий',
  'Скумбрия свежемороженая',
  'Минтай филе свежий',
  'Хек свежий',
  'Камбала свежая',
  'Кета свежая',
  'Кижуч свежий',
  'Креветки свежемороженые',
  'Мидии свежемороженые',
  'Кальмар свежемороженый',
  'Вобла вяленая',
  'Судак свежий',
  'Свинина свежая лопатка',
  'Говядина вырезка свежая',
  'Баранина окорок',
  'Индейка филе бедра',
  'Куриные сердечки',
  'Печень куриная свежая',
  'Филе утки',
  'Кролик тушка',
  'Яйцо куриное С1',
  'Яичный белок (из яйца С1)',
  'Икра трески в рассоле',
  'Икра щуки',
  'Сарга вяленая',
  'Тарань вяленая',
  'Утиный конфи (готовое)',
  'Прошутто (ветчина сыровяленая)',
  'Чоризо сыровяленая колбаска',
  'Паштет мясной классический (деликатес)',
  'Салат Столичный (кулинария)',
  'Салат Мимоза (кулинария)',
  'Селёдка под шубой (кулинария)',
  'Винегрет (кулинария)',
  'Салат с крабовыми палочками (кулинария)',
  'Гречневая каша с маслом (готовая)',
  'Пюре картофельное с маслом (готовое)',
  'Квас в стакане (летняя точка)',
])

// Защищённые запросы старых тестов (foods-brands-2.test.js): новые
// позиции не должны их перехватывать (алиасом-подмножеством или
// более длинным названием)
const PROTECTED_EXPECT = {
  воппер: { kcal: 192 },
  'двойной воппер': { kcal: 224 },
  'воппер джюниор': { kcal: 201 },
  твистер: { kcal: 173 },
  'кфс крылышки': { kcal: 168 },
  'биг хит': { kcal: 198 },
  'чикен хит': { kcal: 193 },
  пепперони: { kcal: 272 },
  'четыре сыра': { kcal: 284 },
  'сырники теремок': { kcal: 223 },
  'молоко 2.5 простоквашино': { kcal: 53 },
  'активиа натуральный': { kcal: 76 },
  'даниссимо вишня': { kcal: 150 },
  'сыр тильзитер брест литовск': { kcal: 339 },
  'мистраль гречка': { kcal: 332 },
  'макфа спагетти': { kcal: 338 },
  сникерс: { kcal: 482 },
  колой: { kcal: 42 },
  'кока кола': { kcal: 42 },
  'кола ноль': { kcal: 0 },
  'тунец меридиан': { kcal: 103 },
  'вкусвилл творог': { kcal: 124 },
  'пельмени царь': { kcal: 260 },
}

describe('foods-brands-4..10: объём и целостность', () => {
  test('новых позиций ≥ 700, общая база ≥ 1500 (просьба Кати 20.11)', () => {
    expect(BRAND4_FOODS.length).toBeGreaterThanOrEqual(130)
    expect(BRAND5_FOODS.length).toBeGreaterThanOrEqual(110)
    expect(BRAND6_FOODS.length).toBeGreaterThanOrEqual(120)
    expect(BRAND7_FOODS.length).toBeGreaterThanOrEqual(100)
    expect(BRAND8_FOODS.length).toBeGreaterThanOrEqual(80)
    expect(BRAND9_FOODS.length).toBeGreaterThanOrEqual(130)
    expect(BRAND10_FOODS.length).toBeGreaterThanOrEqual(55)
    expect(newFoods().length).toBeGreaterThanOrEqual(700)
    expect(FOODS.length).toBeGreaterThanOrEqual(1500)
  })

  test('id уникальны во всей базе, префиксы по файлам', () => {
    const ids = new Set()
    for (const f of FOODS) {
      expect(ids.has(f.id)).toBe(false)
      ids.add(f.id)
    }
    const files = [
      [BRAND4_FOODS, 'brand4-'],
      [BRAND5_FOODS, 'brand5-'],
      [BRAND6_FOODS, 'brand6-'],
      [BRAND7_FOODS, 'brand7-'],
      [BRAND8_FOODS, 'brand8-'],
      [BRAND9_FOODS, 'brand9-'],
      [BRAND10_FOODS, 'brand10-'],
    ]
    for (const [arr, prefix] of files) {
      for (const f of arr) expect(f.id.startsWith(prefix)).toBe(true)
    }
  })

  test('названия уникальны во всей базе, ≤ 80 символов, марка «ёлочками»', () => {
    const names = new Set()
    const безМарки = []
    for (const f of FOODS) {
      expect(names.has(f.name)).toBe(false)
      names.add(f.name)
    }
    for (const f of newFoods()) {
      expect(f.name.length).toBeLessThanOrEqual(80)
      if (!NO_BRAND.has(f.name) && !/«/.test(f.name)) безМарки.push(f.id)
    }
    expect(безМарки).toEqual([])
  })

  test('КБЖУ согласованы (Атуотер 4Б/9Ж/4У, клетчатка 2), числа правдоподобны', () => {
    const наруш = []
    for (const f of newFoods()) {
      if (f.kcal < 0 || f.kcal > 900 || f.p < 0 || f.p > 100 || f.f < 0 || f.f > 100 || f.c < 0 || f.c > 100)
        наруш.push(`${f.id}: пределы КБЖУ`)
      if (f.sug > f.c + 0.001) наруш.push(`${f.id}: sug ${f.sug} > c ${f.c}`)
      if (f.fib > f.c + 0.001) наруш.push(`${f.id}: fib ${f.fib} > c ${f.c}`)
      if (!(f.defaultGrams > 0 && f.defaultGrams <= 1000)) наруш.push(`${f.id}: defaultGrams`)
      if (!f.tags?.length) наруш.push(`${f.id}: пустые tags`)
      if (!f.al?.length) наруш.push(`${f.id}: пустые алиасы`)
      const calc = f.p * 4 + f.f * 9 + (f.c - f.fib) * 4 + f.fib * 2
      const dev = calc > 0 ? Math.abs(f.kcal - calc) / calc : f.kcal > 0 ? 1 : 0
      if (dev > 0.06 + 3 / Math.max(calc, 1)) наруш.push(`${f.id} «${f.name}»: ккал ${f.kcal}, по БЖУ ${Math.round(calc)}`)
    }
    expect(наруш).toEqual([])
  })

  test('алиасы уникальны внутри новых файлов', () => {
    const seen = new Map()
    const дубли = []
    for (const f of newFoods()) {
      for (const a of f.al || []) {
        const key = a.toLowerCase()
        if (seen.has(key)) дубли.push(`${key}: ${seen.get(key)} / ${f.id}`)
        seen.set(key, f.id)
      }
    }
    expect(дубли).toEqual([])
  })
})

describe('новые бренды находятся поиском (офлайн)', () => {
  test('молочка и детское', () => {
    expect(foodAi.findLocalFood('простоквашино сметана 30').kcal).toBe(291)
    expect(foodAi.findLocalFood('простоквашино сметана 15').kcal).toBe(160)
    expect(foodAi.findLocalFood('молоко 3.2 простоквашино').kcal).toBe(60)
    expect(foodAi.findLocalFood('молоко 2.5 простоквашино').kcal).toBe(53)
    expect(foodAi.findLocalFood('вкуснотеево творог 5').kcal).toBe(120)
    expect(foodAi.findLocalFood('эконива молоко').kcal).toBe(60)
    expect(foodAi.findLocalFood('актимель вишня').kcal).toBe(77)
    expect(foodAi.findLocalFood('фрутоняня творожок').kcal).toBe(91)
    expect(foodAi.findLocalFood('рогачев сгущенка').kcal).toBe(329)
    expect(foodAi.findLocalFood('коровка творог 5').kcal).toBe(120)
  })

  test('мясо и заморозка', () => {
    expect(foodAi.findLocalFood('мираторг рибай').kcal).toBe(252)
    expect(foodAi.findLocalFood('дымов сосиски').kcal).toBe(187)
    expect(foodAi.findLocalFood('велком буженина').kcal).toBe(204)
    expect(foodAi.findLocalFood('гп ресурс филе').kcal).toBe(111)
    expect(foodAi.findLocalFood('4 сезона мексиканская').kcal).toBe(62)
    expect(foodAi.findLocalFood('хортекс грибы').kcal).toBe(29)
    expect(foodAi.findLocalFood('садко рыбные палочки').kcal).toBe(212)
  })

  test('бакалея, сладкое, напитки', () => {
    expect(foodAi.findLocalFood('бондюэль кукуруза').kcal).toBe(99)
    expect(foodAi.findLocalFood('киккоман терияки').kcal).toBe(94)
    expect(foodAi.findLocalFood('олейна оливковое').kcal).toBe(899)
    expect(foodAi.findLocalFood('киндер бино').kcal).toBe(539)
    expect(foodAi.findLocalFood('нутелла').kcal).toBe(529)
    expect(foodAi.findLocalFood('раффаэлло').kcal).toBe(614)
    expect(foodAi.findLocalFood('магнум миндаль').kcal).toBe(263)
    expect(foodAi.findLocalFood('7days бисквит').kcal).toBe(403)
    expect(foodAi.findLocalFood('лейс паприка').kcal).toBe(506)
    expect(foodAi.findLocalFood('натс фисташки').kcal).toBe(593)
    expect(foodAi.findLocalFood('липтон yellow').kcal).toBe(1)
    expect(foodAi.findLocalFood('чибо 3 в 1').kcal).toBe(51)
  })

  test('фастфуд сетей: новые позиции и защищённые запросы не перехвачены', () => {
    expect(foodAi.findLocalFood('твистер спайси').kcal).toBe(268)
    expect(foodAi.findLocalFood('хот крисп').kcal).toBe(259)
    expect(foodAi.findLocalFood('сабвей курица').kcal).toBe(108)
    expect(foodAi.findLocalFood('стардогс чизбургер').kcal).toBe(240)
    expect(foodAi.findLocalFood('папа джонс пепперони').kcal).toBe(234)
    expect(foodAi.findLocalFood('донер кебаб').kcal).toBe(204)
    // Защищённые запросы старых тестов — ровно прежние результаты
    for (const [q, exp] of Object.entries(PROTECTED_EXPECT)) {
      const r = foodAi.findLocalFood(q)
      expect(`запрос «${q}» → ${r?.kcal} (имя ${r?.name})`).toContain(`→ ${exp.kcal}`)
    }
    expect(foodAi.findLocalFood('наггетсы').name).toContain('Вкусно и точка')
  })
})

describe('preferBrandBase: новые брендовые позиции перекрывают ИИ-оценку', () => {
  test('«Киндер Сюрприз», «Твистер Спайси», «Актимель вишня» берут КБЖУ из базы', () => {
    const r = foodAi.preferBrandBase([
      { name: 'Киндер Сюрприз', kcal100: 999, p: 9, f: 9, c: 90, fib: 0, sug: 90, source: 'ai' },
      { name: 'Твистер Спайси', kcal100: 500, p: 10, f: 10, c: 80, fib: 0, sug: 5, source: 'ai' },
      { name: 'Актимель вишня', kcal100: 300, p: 3, f: 3, c: 60, fib: 0, sug: 60, source: 'ai' },
      { name: 'Сметана 30% Простоквашино', kcal100: 118, p: 2.8, f: 10, c: 3.9, fib: 0, sug: 3.9, source: 'ai' },
    ])
    expect(r[0].kcal100).toBe(538)
    expect(r[0].source).toBe('brand')
    expect(r[1].kcal100).toBe(268)
    expect(r[1].source).toBe('brand')
    expect(r[2].kcal100).toBe(77)
    expect(r[2].source).toBe('brand')
    // цифра «30%» в имени ИИ выбирает сметану 30%, а не первую сметану 10%
    expect(r[3].kcal100).toBe(291)
    expect(r[3].source).toBe('brand')
  })

  test('старое поведение сохранено: «Селёдка в масле» → 239, целое блюдо не трогаем', () => {
    const r = foodAi.preferBrandBase([
      { name: 'Селёдка в масле', kcal100: 400, p: 30, f: 35, c: 0, fib: 0, sug: 0, defaultGrams: 100, source: 'ai' },
      { name: 'Омлет с селёдкой в масле', kcal100: 414, p: 12, f: 40, c: 2, fib: 0, sug: 1, source: 'ai' },
    ])
    expect(r[0].kcal100).toBe(239)
    expect(r[1].kcal100).toBe(414)
    expect(r[1].source).toBe('ai')
  })
})
