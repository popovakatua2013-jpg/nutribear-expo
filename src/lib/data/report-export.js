// Экспорт отчёта периода в HTML-файл (Premium-фича, задача Кати
// 23.11: «усилить Premium — экспорт отчётов в файл»). Файл открывается
// в любом браузере на телефоне и компьютере — удобно отправить врачу,
// тренеру или себе в облако; из браузера при желании сохраняется в PDF
// через «Печать». Никаких персональных данных в файле нет: только
// обезличенные цифры (ккал, БЖУ, вода, шаги, вес, дисциплина).
//
// Математика — та же, что на вкладке «Отчёты» (src/lib/data/reports.js):
// средние делятся только на ведённые дни, нулевой показатель в ведённый
// день — честный ноль. Параметр rows — дневные строки периода
// (history(days, today), старые раньше), nutrients — карта «день →
// ккал/БЖУ» из nutrientsByDay (журнал приёмов), weightMap — карта
// «день → кг» из weightByDay (журнал взвешиваний).
//
// Файл чистый (без react-native), except shareReportFile — копия
// паттерна shareBackupFile/shareCsv (expo-file-system/legacy +
// expo-sharing). Тесты: __tests__/report-export.test.js

import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { dailyAverage, dayHasRecords, discipline, nutrientTotals } from './reports'
import { localDayKey } from './history-access'

const DAY_MS = 86400000

// «ГГГГ-ММ-ДД» → «ДД.ММ» (для подписей недельных корзин)
const shortDate = (key) => {
  const [, m, d] = String(key || '').split('-')
  return m && d ? `${d}.${m}` : ''
}

// «ГГГГ-ММ-ДД» → «ДД.ММ.ГГГГ»
const fullDate = (key) => {
  const [y, m, d] = String(key || '').split('-')
  return y ? `${d}.${m}.${y}` : ''
}

const num = (x) => String(Math.round(Number(x) || 0))
// Одно десятичное с запятой (русская локаль): 74.25 → «74,3»
const num1 = (x) => (Math.round((Number(x) || 0) * 10) / 10).toFixed(1).replace('.', ',')
const liters = (ml) => num1((Number(ml) || 0) / 1000)
// Минуты → «7 ч 12 мин» (0 → «—»)
const sleepLabel = (min) => {
  const m = Math.round(Number(min) || 0)
  if (m <= 0) return '—'
  return `${Math.floor(m / 60)} ч ${m % 60} мин`
}

// Среднее показателя только по ведённым дням (как dailyAverage)
function avgOver(rows, key) {
  return dailyAverage(rows, key)
}

// Вес за период: первая и последняя запись по ключам дня.
// { has, first, last, change } — change со знаком, кг
export function weightChange(weightMap, fromKey, toKey) {
  const keys = Object.keys(weightMap || {})
    .filter((k) => k >= fromKey && k <= toKey)
    .sort()
  if (!keys.length) return { has: false, change: 0 }
  const first = weightMap[keys[0]]
  const last = weightMap[keys[keys.length - 1]]
  return { has: true, first, last, change: Math.round((last - first) * 10) / 10 }
}

// Недельные корзины периода: от начала периода, по 7 дней; последняя
// корзина может быть короче (30 дней → 7+7+7+7+2)
export function weeklyBuckets(rows) {
  const out = []
  for (let i = 0; i < (rows || []).length; i += 7) {
    const bucket = rows.slice(i, i + 7)
    const recorded = bucket.filter(dayHasRecords)
    const kcal = avgOver(bucket, 'kcal')
    const steps = avgOver(bucket, 'steps')
    const water = recorded.reduce((s, r) => s + (r.waterMl || 0), 0)
    out.push({
      label: `${shortDate(bucket[0].key)}–${shortDate(bucket[bucket.length - 1].key)}`,
      days: bucket.length,
      recorded: recorded.length,
      kcal,
      steps,
      water,
    })
  }
  return out
}

// Главный сборщик: возвращает полный HTML-документ отчёта.
// rows — дневные строки периода (старые раньше); today — живой «сегодня»
// (уже подмешан вызывающей стороной в rows); now — точка отсчёта периода.
export function buildReportHtml({ days, rows, now, goals, weightMap, nutrients }) {
  const list = rows || []
  const nowDate = now || new Date()
  const toKey = localDayKey(nowDate)
  const fromKey = localDayKey(new Date(nowDate.getTime() - ((days || 7) - 1) * DAY_MS))

  const avgKcal = avgOver(list, 'kcal')
  const avgSteps = avgOver(list, 'steps')
  const avgBurned = avgOver(list, 'burned')
  const avgWater = avgOver(list, 'waterMl')
  const avgSleep = avgOver(list, 'sleepMin')

  const disc = discipline(list, goals)
  const g = goals || {}
  const nut = nutrientTotals(nutrients, days || 7, 0)
  const nutAvg = (v) => (nut.recorded > 0 ? Math.round(v / nut.recorded) : 0)

  const weight = weightChange(weightMap, fromKey, toKey)
  const weeks = weeklyBuckets(list)

  const recordedLabel = `${disc.recorded} из ${disc.days}`
  const metLabel = (k) => `${disc.met[k]} из ${disc.days}`
  const weightLine = weight.has
    ? `${num1(weight.first)} → ${num1(weight.last)} кг (${
        weight.change === 0
          ? 'без изменений'
          : `${weight.change > 0 ? '+' : '−'}${num1(Math.abs(weight.change))} кг`
      })`
    : 'записей веса за период нет'

  // Дневник пуст целиком — честно сообщаем, остальное скрыто
  const emptyNote =
    disc.recorded === 0
      ? '<p class="note">За период нет ни одной записи — отчёт построить не на чем. Ведите дневник, и файлы будут наполняться.</p>'
      : ''

  const weeksRows = weeks
    .map(
      (w) => `<tr><td>${w.label}</td><td>${num(w.kcal)}</td><td>${liters(w.water)}</td>` +
        `<td>${num(w.steps)}</td><td>${w.recorded} из ${w.days}</td></tr>`
    )
    .join('')

  const rowsHtml = [
    ['Калории', `${num(avgKcal)} ккал`],
    ['Белки / жиры / углеводы', `${nutAvg(nut.p)} / ${nutAvg(nut.f)} / ${nutAvg(nut.c)} г`],
    ['Клетчатка', `${nutAvg(nut.fib)} г`],
    ['Вода', `${liters(avgWater)} л`],
    ['Шаги', num(avgSteps)],
    ['Сожжено (тренировки + шаги)', `${num(avgBurned)} ккал`],
    ['Сон', sleepLabel(avgSleep)],
  ]
    .map(
      ([k, v]) =>
        `<div class="metric"><span class="k">${k}</span><span class="v">${v}</span></div>`
    )
    .join('')

  const disciplineHtml = [
    ['Дневник вели', `${recordedLabel} дн`],
    ...(g.kcal > 0 ? [['Калории в норме', `${metLabel('kcal')} дн`]] : []),
    ...(g.steps > 0 ? [['Шаги — цель', `${metLabel('steps')} дн`]] : []),
    ...(g.waterMl > 0 ? [['Вода — цель', `${metLabel('waterMl')} дн`]] : []),
    ...(g.burnKcal > 0 ? [['Сожжено — цель', `${metLabel('burned')} дн`]] : []),
  ]
    .map(
      ([k, v]) =>
        `<div class="metric"><span class="k">${k}</span><span class="v">${v}</span></div>`
    )
    .join('')

  return `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>NutriBear — отчёт ${fullDate(fromKey)} — ${fullDate(toKey)}</title>
<style>
  body { margin: 0; padding: 24px 16px; background: #f6f7fb; color: #16192b;
         font: 15px/1.5 -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; }
  main { max-width: 640px; margin: 0 auto; }
  h1 { font-size: 22px; margin: 0 0 4px; }
  h2 { font-size: 16px; margin: 28px 0 10px; color: #5b2cae; }
  .sub { color: #6a7086; font-size: 14px; margin: 0 0 20px; }
  .metric { display: flex; justify-content: space-between; gap: 16px;
            padding: 9px 12px; background: #fff; border: 1px solid #e6e8f0;
            border-radius: 10px; margin-bottom: 6px; }
  .k { color: #4a5068; } .v { font-weight: 600; white-space: nowrap; }
  table { width: 100%; border-collapse: collapse; background: #fff;
          border: 1px solid #e6e8f0; border-radius: 10px; overflow: hidden; }
  th, td { padding: 8px 10px; text-align: right; border-top: 1px solid #eef0f6; font-size: 14px; }
  th { background: #f1f0fb; color: #3d3370; font-size: 13px; }
  th:first-child, td:first-child { text-align: left; }
  .note { color: #6a7086; background: #fff; border: 1px dashed #d5d8e6;
          border-radius: 10px; padding: 14px; }
  footer { margin-top: 28px; color: #8a90a6; font-size: 12.5px; }
</style>
</head>
<body>
<main>
  <h1>Отчёт NutriBear</h1>
  <p class="sub">${fullDate(fromKey)} — ${fullDate(toKey)} · ${days} дн · файл создан ${fullDate(toKey)}</p>
  ${emptyNote}
  <h2>В среднем за день</h2>
  ${rowsHtml}
  <h2>Дисциплина</h2>
  ${disciplineHtml}
  <h2>Вес</h2>
  <div class="metric"><span class="k">За период</span><span class="v">${weightLine}</span></div>
  ${
    weeks.length > 1
      ? `<h2>По неделям</h2>
  <table><thead><tr><th>Дни</th><th>Ккал/день</th><th>Вода, л</th><th>Шаги/день</th><th>Вели</th></tr></thead>
  <tbody>${weeksRows}</tbody></table>`
      : ''
  }
  <footer>Сделано в NutriBear — дневнике питания с медвежьей поддержкой.
  Чтобы сохранить PDF: откройте файл в браузере → «Печать» → «Сохранить как PDF».</footer>
</main>
</body>
</html>`
}

// Записать HTML во временный файл и открыть системное меню «Поделиться»:
// «Сохранить в файл», мессенджеры, почта — как у резервной копии
export async function shareReportFile(html) {
  const stamp = localDayKey(new Date())
  const filename = `nutribear-report-${stamp}.html`
  const fileUri = `${FileSystem.cacheDirectory}${filename}`
  await FileSystem.writeAsStringAsync(fileUri, html, {
    encoding: FileSystem.EncodingType.UTF8,
  })
  if (!(await Sharing.isAvailableAsync())) {
    // Крайне редкий случай: шаринга нет — хотя бы вернём файл
    return fileUri
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/html',
    dialogTitle: 'Отчёт NutriBear',
    UTI: 'public.html',
  })
  // Чистим кэш за собой (файл уже сохранён/отправлен)
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true })
  } catch {}
  return fileUri
}
