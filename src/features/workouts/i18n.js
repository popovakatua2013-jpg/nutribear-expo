// src/features/workouts/i18n.js — словари RU/EN вкладки «Тренировки»
// Плюрализация и форматы дат/чисел — по правилам локали. i18n-js не
// подключаем (лишняя зависимость): t() — простой проход по словарю
// с подстановкой %{переменных} и фолбэком на русский.

export const dict = {
  ru: {
    catalog: {
      title: 'Тренировки',
      searchPh: 'Поиск тренировок',
      recommended: 'Рекомендуем для вас',
      all: 'Все тренировки',
      found: 'Найдено: %{count}',
      continue: 'Продолжить',
      continueLeft: 'Осталось %{min} мин',
      streak: 'Серия: %{count} %{word} подряд',
      streakNext: 'Ещё %{count} %{word} до рекорда — %{record}',
      emptyTitle: 'Ничего не найдено',
      emptyText: 'По вашему запросу нет тренировок. Попробуйте изменить фильтры или поискать по другому слову.',
      emptyButton: 'Сбросить фильтры',
    },
    progress: {
      title: 'Прогресс',
      streak: 'Дней серии',
      monthWorkouts: 'Тренировок за месяц',
      minutes: 'Активные минуты',
      kcal: 'Сожжено за месяц',
      week: 'Активность за неделю',
      weekTotal: '%{count} мин',
      calendar: 'Календарь активности',
      calendarOf: '%{done} из %{total} %{days}',
      less: 'Меньше',
      more: 'Больше',
      badges: 'Достижения',
      badgesOf: '%{open} из %{total}',
      done: 'Завершена',
      emptyTitle: 'Здесь появится ваша статистика',
      emptyText: 'Завершите первую тренировку — и серия, минуты и калории начнут расти.',
      emptyButton: 'К тренировкам',
    },
    player: {
      done: 'Завершить тренировку',
      abort: 'Прервать',
      of: 'из %{min} мин',
      kcal: '≈ %{kcal} ккал',
    },
    level: { beginner: 'Новичок', intermediate: 'Средний', advanced: 'Продвинутый' },
    type: { all: 'Все', strength: 'Силовые', cardio: 'Кардио', hiit: 'HIIT', yoga: 'Йога', stretch: 'Растяжка' },
    week: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  },
  en: {
    catalog: {
      title: 'Workouts',
      searchPh: 'Search workouts',
      recommended: 'Recommended for you',
      all: 'All workouts',
      found: 'Found: %{count}',
      continue: 'Continue',
      continueLeft: '%{min} min left',
      streak: '%{count}-day streak',
      streakNext: '%{count} more %{word} to your record — %{record}',
      emptyTitle: 'Nothing found',
      emptyText: 'No workouts match your query. Try changing the filters or search for something else.',
      emptyButton: 'Reset filters',
    },
    progress: {
      title: 'Progress',
      streak: 'Streak days',
      monthWorkouts: 'Workouts this month',
      minutes: 'Active minutes',
      kcal: 'Calories burned',
      week: 'Weekly activity',
      weekTotal: '%{count} min',
      calendar: 'Activity calendar',
      calendarOf: '%{done} of %{total} %{days}',
      less: 'Less',
      more: 'More',
      badges: 'Achievements',
      badgesOf: '%{open} of %{total}',
      done: 'Unlocked',
      emptyTitle: 'Your stats will appear here',
      emptyText: 'Finish your first workout and your streak, minutes and calories will start growing.',
      emptyButton: 'To workouts',
    },
    player: {
      done: 'Finish workout',
      abort: 'Abort',
      of: 'of %{min} min',
      kcal: '≈ %{kcal} kcal',
    },
    level: { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' },
    type: { all: 'All', strength: 'Strength', cardio: 'Cardio', hiit: 'HIIT', yoga: 'Yoga', stretch: 'Stretching' },
    week: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  },
}

/** Привязка t() к языку: проход по ключу «a.b.c», подстановка %{vars},
 *  фолбэк на русскую строку, при полном промахе — сам ключ */
export function makeT(lang) {
  return (key, vars) => {
    const resolve = (l) => {
      let node = dict[l]
      for (const part of key.split('.')) {
        if (node === undefined || node === null) return undefined
        node = node[part]
      }
      return node
    }
    let val = resolve(lang)
    if (val === undefined) val = resolve('ru')
    if (typeof val !== 'string') return key
    if (vars) {
      for (const k of Object.keys(vars)) {
        val = val.split(`%{${k}}`).join(String(vars[k]))
      }
    }
    return val
  }
}

/**
 * Плюрализация вручную (правила русского языка)
 */
export function plural(lang, n, forms) {
  if (lang === 'en') {
    return n === 1 ? forms.one : (forms.other ?? forms.many)
  }
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return forms.one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few
  return forms.many
}

/** «воскресенье, 8 ноября» / «Sunday, November 8» */
export function formatDateLong(d, lang) {
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

/** «Ноябрь 2026» / «November 2026» */
export function formatMonth(d, lang) {
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'en-US', {
    month: 'long',
    year: 'numeric',
  }).format(d)
}

/** Разрядка чисел по локали: 5 230 (неразрывный пробел) */
export function formatNumber(n, lang) {
  return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'en-US').format(n)
}
