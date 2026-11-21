// Проверка синтаксиса файлов через @babel/core + babel-preset-expo:
// файлы, не покрытые тестами, иначе падают только в рантайме Expo.
//
// Урок 21.11: SupportModal.jsx уехал в пуш с незакрытым <View> — Metro
// у Кати отказался бандлить всё приложение, а bare-запуск
// «node scripts/check-syntax.js» проверял НОЛЬ файлов (только те, что
// перечислены в аргументах) и молча «проходил».
// Теперь без аргументов проверяются ВСЕ исходники проекта:
// src, app, scripts, __tests__ и корневые .js/.jsx конфиги.
// С аргументами — только перечисленные файлы (как раньше).
const fs = require('fs')
const path = require('path')
const babel = require('@babel/core')

const EXT = ['.js', '.jsx', '.ts', '.tsx']
const ROOTS = ['src', 'app', 'scripts', '__tests__']
// Служебные каталоги, внутри которых исходников проекта нет
const SKIP_DIRS = new Set(['node_modules', '.expo', 'android', 'ios', '.git', 'build'])

function walk(dir, acc) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      walk(full, acc)
    } else if (EXT.includes(path.extname(name).toLowerCase())) {
      acc.push(full)
    }
  }
  return acc
}

const args = process.argv.slice(2)
const files = args.length
  ? args
  : [
      // корневые конфиги (babel.config.js, jest.config.js и т.п.)
      ...fs
        .readdirSync('.')
        .filter(
          (n) =>
            EXT.includes(path.extname(n).toLowerCase()) &&
            fs.statSync(n).isFile()
        ),
      ...ROOTS.filter((r) => fs.existsSync(r)).flatMap((r) => walk(r, [])),
    ]

let failed = false

for (const f of files) {
  const full = path.resolve(f)
  try {
    babel.transformSync(fs.readFileSync(full, 'utf8'), {
      filename: full,
      presets: ['babel-preset-expo'],
      configFile: false,
      babelrc: false,
    })
    if (args.length) console.log(`OK   ${f}`)
  } catch (e) {
    failed = true
    console.error(`FAIL ${f}\n${e.message}`)
  }
}

if (!args.length) {
  console.log(`check-syntax: проверено файлов: ${files.length}, ошибок: ${failed ? 1 : 0}`)
}
process.exit(failed ? 1 : 0)
