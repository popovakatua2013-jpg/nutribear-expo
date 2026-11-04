// Проверка синтаксиса файлов через @babel/core + babel-preset-expo:
// файлы, не покрытые тестами, иначе падают только в рантайме Expo.
const fs = require('fs')
const path = require('path')
const babel = require('@babel/core')

const files = process.argv.slice(2)
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
    console.log(`OK   ${f}`)
  } catch (e) {
    failed = true
    console.error(`FAIL ${f}\n${e.message}`)
  }
}

process.exit(failed ? 1 : 0)
