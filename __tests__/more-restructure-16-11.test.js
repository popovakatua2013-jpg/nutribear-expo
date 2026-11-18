// Перестройка «Ещё» и «Особого дня» по отзыву Кати 16.11:
//  1. Экран ошибки — человеческий язык (нет Expo Go / update.bat /
//     «серого окна», есть перезапуск и почта поддержки).
//  2. Напоминания в ОДНОМ блоке: тренировка/вода/взвешивание/еда/сон +
//     мишка + вибро-отклик; дублей «Сон»/«Время пинка» в ЗДОРОВЬЕ нет,
//     «Вибрация»/«Стиль пинков»/«Напоминание мишки» из ПРИЛОЖЕНИЯ ушли.
//  3. Стиль пинков — свойство медведя (getPokeStyle), отдельного блока нет.
//  4. Шаги по платформе: Android — Health Connect + шагомер (без Google
//     Fit), iOS — Apple Health + шагомер.
//  5. Особый день: менструация только из трекера цикла, командировка
//     спрашивает «на сколько дней» и метит диапазон.
//  6. Вибрация управляется тумблером во всём приложении (lib/haptics.js).
//  7. Цикл: подпись «Включить трекер» и «Без медицины…» убраны.

const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
// Читаем исходник и снимаем комментарии (// …): проверяем ТО, что увидит
// пользователь в рантайме — строки UI, подсказки и логику, а не исторические
// заметки разработчика в шапке файла
const read = (rel) =>
  fs
    .readFileSync(path.join(ROOT, rel), 'utf8')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\{\/\*[\s\S]*?\*\//g, '') // JSX-блок-комментарии {/* … */}

// ── 1. Экран ошибки без developer-языка ────────────────────────────────
describe('Экран «Мишка споткнулся» — язык для обычного пользователя', () => {
  const src = read('app/_layout.jsx')

  test('нет developer-подсказок Expo Go / update.bat / серого окна', () => {
    expect(src).not.toMatch(/Expo Go/)
    expect(src).not.toMatch(/update\.bat/)
    expect(src).not.toMatch(/серого окна/)
    expect(src).not.toMatch(/откройте проект/)
  })

  test('есть перезапуск, сброс данных и почта поддержки', () => {
    expect(src).toMatch(/Полностью закройте NutriBear/)
    expect(src).toMatch(/Сбросить данные/)
    expect(src).toMatch(/whitelinepay@yandex\.ru/)
    // сеть — человеческое объяснение
    expect(src).toMatch(/Проверьте Wi-Fi или мобильный интернет/)
  })
})

// ── 2. Напоминания в одном блоке ───────────────────────────────────────
describe('«Ещё»: напоминания собраны в один блок', () => {
  const more = read('app/(tabs)/more.jsx')
  const notif = read('src/components/more/NotificationsSection.jsx')

  test('группа НАПОМИНАНИЯ с одной строкой «Напоминания»', () => {
    expect(more).toMatch(/title="НАПОМИНАНИЯ"/)
    expect(notif).toMatch(/title="Мишка пинает"/)
    expect(notif).toMatch(/title="Вибро-отклик"/)
  })

  test('в ЗДОРОВЬЕ нет дублей «Сон»/«Время пинка», есть «Шаги и здоровье»', () => {
    expect(more).not.toMatch(/title="Время пинка"/)
    expect(more).toMatch(/title="Шаги и здоровье"/)
    // строка «Сон» есть только в блоке напоминаний (NotificationsSection)
    const rows = more.match(/title="Сон"/g) || []
    expect(rows.length).toBe(0)
    expect(notif).toMatch(/title="Сон"/)
  })

  test('из ПРИЛОЖЕНИЯ ушли «Вибрация», «Стиль пинков», «Напоминание мишки»', () => {
    expect(more).not.toMatch(/title="Вибрация"/)
    expect(more).not.toMatch(/title="Стиль пинков"/)
    expect(more).not.toMatch(/title="Напоминание мишки"/)
  })

  test('PokeCards (дубли) удалены и нигде не импортируются', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/components/more/PokeCards.jsx'))).toBe(false)
    expect(more).not.toMatch(/PokeCards/)
  })
})

// ── 3. Стиль пинков — у медведей ───────────────────────────────────────
describe('Стиль пинков принадлежит медведю', () => {
  const { useCompanionStore } = require('@/store/useCompanionStore')

  test('getPokeStyle: Кедр — bear, Кира — soft, Бусинка — soft, Фит — spicy', () => {
    const store = useCompanionStore.getState()
    store.select('kedr')
    expect(store.getPokeStyle()).toBe('bear')
    store.select('kira')
    expect(store.getPokeStyle()).toBe('soft')
    store.select('businka')
    expect(store.getPokeStyle()).toBe('soft')
    store.select('fit')
    expect(store.getPokeStyle()).toBe('spicy')
    store.select('kedr')
  })

  test('неизвестный медведь → bear (безопасный дефолт)', () => {
    useCompanionStore.setState({ companionId: 'nope' })
    expect(useCompanionStore.getState().getPokeStyle()).toBe('bear')
    useCompanionStore.setState({ companionId: 'kedr' })
  })

  test('reminders.js читает тон из getPokeStyle, а не meals.style', () => {
    const src = read('src/lib/reminders.js')
    expect(src).not.toMatch(/meals\?\.style/)
    expect(src).not.toMatch(/meals\.style/)
    expect(src).toMatch(/getPokeStyle\(\)/)
  })
})

// ── 4. Шаги по платформе ───────────────────────────────────────────────
describe('Шаги и здоровье: источники по платформе', () => {
  const sync = read('src/components/more/SyncCard.jsx')
  const perm = read('src/components/onboarding/ob/PermissionsStep.jsx')

  test('SyncCard: iOS — Apple Health, Android — Health Connect, без общих ROWS', () => {
    expect(sync).toMatch(/IS_IOS\s*\?/)
    expect(sync).toMatch(/Platform\.OS === 'android'/)
    expect(sync).not.toMatch(/'gfit'/)
    expect(sync).not.toMatch(/Google Fit/)
    expect(sync).toMatch(/Health Connect/)
    // шагомер скрыт на web
    expect(sync).toMatch(/!IS_WEB && /)
  })

  test('онбординг: заголовок источника по платформе, без «Google Fit / Apple Health»', () => {
    expect(perm).not.toMatch(/Google Fit/)
    expect(perm).toMatch(/IS_IOS \? 'Apple Health' : IS_ANDROID \? 'Health Connect'/)
    expect(perm).toMatch(/Platform\.OS/)
  })
})

// ── 5. Особый день: менструация из трекера, командировка на N дней ─────
describe('Особый день: связь с трекером цикла и длительность командировки', () => {
  const ds = read('src/components/home/DailySummary.jsx')

  test('ручных опций только две: командировка и праздник', () => {
    expect(ds).toMatch(/MANUAL_DAY_TYPES = \['trip', 'holiday'\]/)
    // окно больше не рисует все типы через Object.keys(DAY_TYPES)
    expect(ds).not.toMatch(/Object\(keys\(DAY_TYPES\)\)|Object\.keys\(DAY_TYPES\)\.map\(\(t\) =>\s*\{[^}]*pickDayMark/)
  })

  test('менструация — только авто-строка из трекера, без «включить трекер»', () => {
    expect(ds).toMatch(/отмечается сама по трекеру цикла/)
    expect(ds).not.toMatch(/включить трекер/)
    expect(ds).not.toMatch(/Включить трекер/)
  })

  test('командировка: вопрос «на сколько дней?» и метка на диапазон', () => {
    expect(ds).toMatch(/На сколько дней командировка\?/)
    expect(ds).toMatch(/TRIP_DAYS = \[1, 2, 3, 5, 7, 10, 14\]/)
    expect(ds).toMatch(/applyTripDays/)
    expect(ds).toMatch(/shiftDayKey\(todayKeyStr, i\), 'trip'\)/)
  })

  test('сдвиг ключа дня: локальная дата без UTC-сдвига', () => {
    // функция из файла через require нельзя (компонент тянет RN) —
    // проверяем формулу: конструктор с T00:00:00 и локальные геттеры
    expect(ds).toMatch(/new Date\(`\$\{key\}T00:00:00`\)/)
    expect(ds).toMatch(/d\.getFullYear\(\)-\$\{p\(d\.getMonth\(\) \+ 1\)\}|d\.getFullYear\(\)/)
  })

  test('«Вернуть обычный день» снимает весь диапазон командировки', () => {
    expect(ds).toMatch(/clearManualMark/)
    expect(ds).toMatch(/marks\[shiftDayKey\(todayKeyStr, i\)\] === 'trip'/)
  })

  test('DiarySettingsCard: прибавка цикла связана с трекером', () => {
    const diary = read('src/components/more/DiarySettingsCard.jsx')
    expect(diary).toMatch(/только по трекеру цикла/)
    expect(diary).toMatch(/на сколько дней — спросит само/)
  })
})

// ── 6. Вибрация управляется тумблером ──────────────────────────────────
describe('Вибро-отклик: единая точка и учёт тумблера', () => {
  test('lib/haptics.js проверяет настройку до вибрации', () => {
    const src = read('src/lib/haptics.js')
    expect(src).toMatch(/useUiPrefsStore\.getState\(\)\.haptics/)
    expect(src).toMatch(/if \(!useUiPrefsStore\.getState\(\)\.haptics\) return/)
  })

  test('плеер тренировок удалён вместе с модулем (чистка 19.11), его строки-тесты больше не нужны', () => {
    // Модуль src/features/workouts (кроме theme.js) удалён как неиспользуемый:
    // остаётся проверить только то, что files-сирот в нём нет
    expect(fs.existsSync(path.join(ROOT, 'src/features/workouts/player'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'src/features/workouts/components'))).toBe(false)
    expect(fs.existsSync(path.join(ROOT, 'src/features/workouts/theme.js'))).toBe(true)
  })

  test('меню «Ещё» даёт отклик на тумблеры/пилюли/строки', () => {
    const menu = read('src/components/more/MenuList.jsx')
    expect(menu).toMatch(/hapticFeedback\('selection'\)/)
    expect(menu).toMatch(/hapticFeedback\('light'\)/)
  })
})

// ── 7. Цикл без лишних подписей ────────────────────────────────────────
describe('Цикл: компактная настройка', () => {
  const src = read('src/components/more/CycleCard.jsx')

  test('нет подписи «Включить трекер» и сноски «Без медицины…»', () => {
    expect(src).not.toMatch(/Включить трекер/)
    expect(src).not.toMatch(/Без медицины/)
  })

  test('тумблер остался (доступен скринридеру)', () => {
    expect(src).toMatch(/accessibilityLabel="Трекер цикла вкл\/выкл"/)
  })
})
