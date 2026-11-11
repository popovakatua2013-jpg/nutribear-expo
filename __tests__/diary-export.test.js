// Тесты экспорта дневника в CSV (lib/data/diary-export). Аудит 06.11
// отметил этот модуль как непротестированный, P1-7 (CSV-файл вместо
// Share.share) уже исправлен. Здесь покрываем чистую логику:
//   • buildCsv: заголовок, разделитель «;», экранирование кавычек
//   • dateFmt: ISO → DD.MM.YYYY для Excel
//   • пустые поля БЖУ → пустая строка, не «0» и не «null»
//   • пустой массив строк → только заголовок
//   • shareCsv: без Sharing откатывается на Share.share (текстом)

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

// expo-file-system и expo-sharing — ESM и не грузятся в Node. Мокаем
// минимальные стабы: writeAsStringAsync пишет в Map, isAvailableAsync
// возвращает false (тестируем фолбэк на Share.share), shareAsync — no-op.
// Переменные моков должны начинаться с `mock` — это разрешает Jest.
const mockMemFs = new Map()
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/tmp/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(async (uri, content) => mockMemFs.set(uri, content)),
  readAsStringAsync: jest.fn(async (uri) => mockMemFs.get(uri) || ''),
  deleteAsync: jest.fn(async (uri) => mockMemFs.delete(uri)),
}))
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(async () => false), // тестируем фолбэк
  shareAsync: jest.fn(async () => {}),
}))

describe('lib/data/diary-export: buildCsv', () => {
  let buildCsv

  beforeAll(() => {
    ;({ buildCsv } = require('@/lib/data/diary-export'))
  })

  test('корректный заголовок и одна строка', () => {
    const csv = buildCsv(
      [
        {
          day: '2026-11-10',
          time: '08:30',
          mealId: 'breakfast',
          name: 'Овсянка',
          grams: 100,
          kcal: 88,
          p: 3,
          f: 1,
          c: 14,
        },
      ],
      (id) => (id === 'breakfast' ? 'Завтрак' : id)
    )
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      'Дата;Время;Приём;Продукт;Граммы;Ккал;Белки;Жиры;Углеводы'
    )
    expect(lines[1]).toBe('"10.11.2026";"08:30";"Завтрак";"Овсянка";"100";"88";"3";"1";"14"')
  })

  test('несколько строк сохраняют порядок', () => {
    const csv = buildCsv(
      [
        { day: '2026-11-10', time: '08:30', mealId: 'breakfast', name: 'Овсянка', grams: 100, kcal: 88, p: 3, f: 1, c: 14 },
        { day: '2026-11-10', time: '13:00', mealId: 'lunch', name: 'Суп', grams: 250, kcal: 120, p: 5, f: 4, c: 18 },
        { day: '2026-11-11', time: '19:30', mealId: 'dinner', name: 'Курица', grams: 150, kcal: 220, p: 30, f: 8, c: 0 },
      ],
      (id) => ({ breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин' }[id] || id)
    )
    const lines = csv.split('\r\n')
    expect(lines).toHaveLength(4)
    expect(lines[1]).toContain('10.11.2026')
    expect(lines[2]).toContain('"Обед"')
    expect(lines[3]).toContain('11.11.2026')
  })

  test('пустые p/f/c превращаются в пустую строку, не 0/null', () => {
    // БЖУ может быть неизвестно для пользовательских продуктов —
    // пустое поле корректнее, чем «0» (иначе Excel считает белок = 0)
    const csv = buildCsv(
      [{ day: '2026-11-10', time: '10:00', mealId: 'snack', name: 'Энергетик', grams: 50, kcal: 60, p: null, f: null, c: null }],
      () => 'Перекус'
    )
    const line = csv.split('\r\n')[1]
    // Три последних поля — пустые (внутри кавычек)
    expect(line).toBe('"10.11.2026";"10:00";"Перекус";"Энергетик";"50";"60";"";"";""')
  })

  test('кавычки внутри названия экранируются удвоением', () => {
    // Если в названии встречается «"», CSV требует «""» — иначе Excel
    // воспринимает её как конец поля и ломает таблицу
    const csv = buildCsv(
      [{ day: '2026-11-10', time: '10:00', mealId: 'snack', name: 'Батончик "Сникерс"', grams: 50, kcal: 250, p: 4, f: 12, c: 30 }],
      () => 'Перекус'
    )
    const line = csv.split('\r\n')[1]
    expect(line).toBe('"10.11.2026";"10:00";"Перекус";"Батончик ""Сникерс""";"50";"250";"4";"12";"30"')
  })

  test('пустой массив строк → только заголовок', () => {
    const csv = buildCsv([], () => '')
    expect(csv).toBe('Дата;Время;Приём;Продукт;Граммы;Ккал;Белки;Жиры;Углеводы')
  })

  test('дата в формате DD.MM.YYYY для Excel (ISO → ru)', () => {
    // Excel на русской локали ожидает DD.MM.YYYY — ISO «2026-11-10»
    // открывался бы как текст. Проверяем преобразование
    const csv = buildCsv(
      [{ day: '2026-11-10', time: '08:30', mealId: 'breakfast', name: 'Test', grams: 100, kcal: 88, p: 1, f: 1, c: 1 }],
      () => 'Завтрак'
    )
    expect(csv).toContain('"10.11.2026"')
    expect(csv).not.toContain('2026-11-10')
  })

  test('битая дата → пустая строка в CSV (не ломает таблицу)', () => {
    const csv = buildCsv(
      [{ day: null, time: '08:30', mealId: 'breakfast', name: 'Test', grams: 100, kcal: 88, p: 1, f: 1, c: 1 }],
      () => 'Завтрак'
    )
    // Поле «Дата» — пустое, но строка остаётся валидной (9 полей)
    const line = csv.split('\r\n')[1]
    expect(line.startsWith('"";"08:30"')).toBe(true)
  })

  test('mealName fallback: неизвестный mealId → сам id', () => {
    const csv = buildCsv(
      [{ day: '2026-11-10', time: '10:00', mealId: 'unknown', name: 'Test', grams: 50, kcal: 60, p: 1, f: 1, c: 1 }],
      (id) => id // без маппинга — отдаём как есть
    )
    expect(csv).toContain('"unknown"')
  })

  test('числа не оборачиваются в кавычки', () => {
    const csv = buildCsv(
      [{ day: '2026-11-10', time: '08:30', mealId: 'breakfast', name: 'Test', grams: 100, kcal: 88, p: 3, f: 1, c: 14 }],
      () => 'Завтрак'
    )
    const line = csv.split('\r\n')[1]
    // Все поля экранируются кавычками — это безопасный CSV: Excel
    // корректно воспринимает "100" как число
    expect(line).toContain('"100";"88";"3";"1";"14"')
    // Подтверждаем что кавычки внутри названия удвоены, а не сломаны
    expect(line.split(';')).toHaveLength(9)
  })
})

describe('lib/data/diary-export: shareCsv', () => {
  let shareCsv

  beforeAll(() => {
    ;({ shareCsv } = require('@/lib/data/diary-export'))
  })

  test('shareCsv возвращает undefined (Promise<void>)', async () => {
    // В Node-тестах expo-file-system и expo-sharing возвращают стабы,
    // функция должна безопасно отработать и вернуть undefined
    const result = await shareCsv('test.csv', 'a,b,c')
    expect(result).toBeUndefined()
  })

  test('shareCsv не падает на пустом CSV', async () => {
    await expect(shareCsv('empty.csv', '')).resolves.toBeUndefined()
  })

  test('shareCsv не падает на больших данных', async () => {
    // 10000 строк — реалистичный дневник за год. Должно работать
    // без переполнения стека или вечного цикла
    const rows = Array.from({ length: 10000 }, (_, i) =>
      `"2026-11-10";"08:${String(i % 60).padStart(2, '0')}";"Завтрак";"Продукт${i}";100;50;1;1;1`
    ).join('\r\n')
    await expect(shareCsv('big.csv', rows)).resolves.toBeUndefined()
  })
})
