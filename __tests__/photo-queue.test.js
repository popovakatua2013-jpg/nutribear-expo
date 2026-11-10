// Офлайн-очередь фото (отзыв Кирилла из RuStore, 4 звезды, скриншот
// Кати от 11.11: «опять прошу программу поддерживала офлайн съёмку,
// после подключение к сети чтобы фото автоматически отправлялись
// на анализ»). Тестируем стор usePhotoQueueStore и хелпер
// isOfflineError (food-ai.js) — сам PhotoMode в Jest не рендерится
// (стабы компонентов), проверяется логика.
// expo-file-system / expo-image-manipulator подменяются заглушками —
// food-ai.js при импорте создаёт файл кэша ИИ, которого в Node не должно
// быть (как в food-ai-parse.test.js).

jest.requireActual('./helpers/react-native-stub')
jest.requireActual('./helpers/async-storage-stub')

jest.mock('expo-file-system', () => ({
  File: class File {
    constructor() {}
  },
  Paths: { document: '/tmp', cache: '/tmp' },
}))
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: {},
  SaveFormat: {},
}))

describe('очередь офлайн-фото: стор usePhotoQueueStore', () => {
  let usePhotoQueueStore
  let MAX_ATTEMPTS
  let RETRY_AFTER_MS

  beforeAll(() => {
    ;({ usePhotoQueueStore, MAX_ATTEMPTS, RETRY_AFTER_MS } = require('@/store/usePhotoQueueStore'))
  })

  beforeEach(() => {
    usePhotoQueueStore.getState().clear()
  })

  test('add кладёт фото в конец очереди: attempts=0, повтор разрешён сразу', () => {
    const a = usePhotoQueueStore.getState().add('file:///photo-a.jpg')
    const b = usePhotoQueueStore.getState().add('file:///photo-b.jpg')
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(a.attempts).toBe(0)
    expect(a.nextAttemptAt).toBe(0)
    expect(a.id).not.toBe(b.id)
    expect(usePhotoQueueStore.getState().items.map((it) => it.uri)).toEqual([
      'file:///photo-a.jpg',
      'file:///photo-b.jpg',
    ])
  })

  test('то же фото второй раз не дублируется (в очереди одна запись)', () => {
    usePhotoQueueStore.getState().add('file:///same.jpg')
    const again = usePhotoQueueStore.getState().add('file:///same.jpg')
    expect(again).toBeNull()
    expect(usePhotoQueueStore.getState().items).toHaveLength(1)
  })

  test('пустой uri игнорируется — в очередь попадают только настоящие снимки', () => {
    expect(usePhotoQueueStore.getState().add('')).toBeNull()
    expect(usePhotoQueueStore.getState().add(null)).toBeNull()
    expect(usePhotoQueueStore.getState().items).toHaveLength(0)
  })

  test('remove убирает только своё фото — очередь двигается дальше', () => {
    const a = usePhotoQueueStore.getState().add('file:///a.jpg')
    usePhotoQueueStore.getState().add('file:///b.jpg')
    usePhotoQueueStore.getState().remove(a.id)
    expect(usePhotoQueueStore.getState().items.map((it) => it.uri)).toEqual(['file:///b.jpg'])
  })

  test('markFailed: попытка посчитана, повтор отложен на RETRY_AFTER_MS', () => {
    const a = usePhotoQueueStore.getState().add('file:///a.jpg')
    const before = Date.now()
    usePhotoQueueStore.getState().markFailed(a.id)
    const [item] = usePhotoQueueStore.getState().items
    expect(item.attempts).toBe(1)
    expect(item.nextAttemptAt).toBeGreaterThanOrEqual(before + RETRY_AFTER_MS)
  })

  test('MAX_ATTEMPTS: транзиентный сбой переживётся, вечный цикл исключён', () => {
    // попыток должно быть больше одной (сервер мог моргнуть), но конечное
    // число — иначе автопрогонка будет молотить по битому фото вечно
    expect(MAX_ATTEMPTS).toBeGreaterThanOrEqual(2)
    const a = usePhotoQueueStore.getState().add('file:///a.jpg')
    for (let i = 0; i < MAX_ATTEMPTS; i++) usePhotoQueueStore.getState().markFailed(a.id)
    const [item] = usePhotoQueueStore.getState().items
    expect(item.attempts).toBe(MAX_ATTEMPTS)
  })

  test('очередь переживает перезапуск: значения пишутся в AsyncStorage', async () => {
    const AsyncStorage = require('./helpers/async-storage-stub').default
    usePhotoQueueStore.getState().add('file:///keeper.jpg')
    // persist zustand пишет состояние под ключом nutribear-photo-queue-v1
    const raw = await AsyncStorage.getItem('nutribear-photo-queue-v1')
    expect(raw).toBeTruthy()
    const saved = JSON.parse(raw)
    expect(saved.state.items.map((it) => it.uri)).toEqual(['file:///keeper.jpg'])
  })
})

describe('isOfflineError — отличаем «нет сети» от прочих ошибок ИИ', () => {
  let isOfflineError

  beforeAll(() => {
    ;({ isOfflineError } = require('@/lib/food-ai'))
  })

  test('человекочитаемый текст из postJson — офлайн', () => {
    expect(isOfflineError(new Error('Нет интернета — распознавание требует сети'))).toBe(true)
  })

  test('сырой текст React Native «Network request failed» — офлайн', () => {
    expect(isOfflineError(new Error('Network request failed'))).toBe(true)
  })

  test('таймаут и «еда не распознана» — НЕ офлайн: фото в очередь не прячем', () => {
    expect(isOfflineError(new Error('ИИ не ответил за 45 секунд — попробуйте ещё раз'))).toBe(false)
    expect(
      isOfflineError(new Error('Еда на фото не распознана — попробуйте снять блюдо ближе и при хорошем свете'))
    ).toBe(false)
  })
})
