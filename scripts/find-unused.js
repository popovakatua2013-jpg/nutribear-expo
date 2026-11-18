// Разовая диагностика: найти файлы src/, которые нигде не импортируются.
// Запуск: node scripts/find-unused.js
const fs = require('fs')
const path = require('path')

const files = []
;(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name)
    if (e.isDirectory()) walk(p)
    else if (/\.(js|jsx)$/.test(e.name)) files.push(p)
  }
})('src')

const read = (p) => fs.readFileSync(p, 'utf8')
const appFiles = fs
  .readdirSync('app', { recursive: true })
  .filter((f) => String(f).endsWith('.jsx'))
  .map((f) => read(path.join('app', String(f))))

const corpus =
  files.map(read).join('\n') +
  '\n' +
  appFiles.join('\n') +
  '\n' +
  fs
    .readdirSync('__tests__')
    .filter((f) => f.endsWith('.js'))
    .map((f) => read(path.join('__tests__', f)))
    .join('\n')

let suspicious = 0
for (const f of files) {
  const base = path.basename(f).replace(/\.(js|jsx)$/, '')
  const src = read(f)
  const mentions = corpus.split(base).length - 1
  const own = src.split(base).length - 1
  if (mentions <= own) {
    console.log('НЕ ИМПОРТИРУЕТСЯ:', f)
    suspicious++
  }
}
console.log('---', 'всего файлов src:', files.length, 'подозрительных:', suspicious)
