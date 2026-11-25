// Страховка от краша «Property 'colors' doesn't exist» (отзыв Кати
// 25.11: вкладка «План» и «Покупки» падали при открытии). Причина:
// палитра вкладки «План» переехала со статичного импорта
// `import { C as colors }` на хук `usePlanPalette()` внутри компонента,
// а часть файлов продолжала ссылаться на colors в МОДУЛЬНЫХ стилях
// (const styles = { … colors.text … }). styles вычисляются при импорте
// модуля, colors там не существует — ReferenceError ронял весь экран.
//
// Тест читает все исходники src/ и app/ и требует инвариант: если
// colors НЕ определён на верхнем уровне модуля (import / const / let),
// то ни один ВЕРХНЕУРОВНЕВЫЙ блок `const X = { … }` (например,
// модульные styles) не содержит ссылок colors.*. Ссылки внутри тел
// функций — легальны (colors объявлен хуком в начале компонента).

const fs = require('fs')
const path = require('path')

const SRC = path.join(__dirname, '..', 'src')
const APP = path.join(__dirname, '..', 'app')

function listFiles(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) listFiles(p, acc)
    else if (/\.(jsx?|tsx?)$/.test(name)) acc.push(p)
  }
  return acc
}

// Найти в модуле ссылки colors.* вне тел функций:
// 1) строки верхнего уровня (без отступа) с colors.
// 2) тела верхнеуровневых блоков const X = { … }: от объявления до
//    закрывающей `}` без отступа — внутри этих тел colors недоступен.
function topLevelColorRefs(lines) {
  const hits = []
  let blockEnd = -1 // индекс строки, на которой закрыт открытый блок
  for (let i = 0; i < lines.length; i++) {
    if (i <= blockEnd) continue
    const l = lines[i]
    if (!l || l.startsWith('//') || l.startsWith('*') || l.startsWith('/*')) continue
    // 1) прямая ссылка на верхнем уровне
    if (/^[^\s/*].*\bcolors\s*[.[]/.test(l)) hits.push({ line: i + 1, text: l.trim() })
    // 2) тело верхнеуровневого const X = { … } (до `}` без отступа)
    const m = l.match(/^const\s+\w+\s*=\s*\{\s*$/)
    if (m) {
      let end = -1
      for (let j = i + 1; j < lines.length; j++) {
        if (/^\}\s*,?\s*$/.test(lines[j])) { end = j; break }
      }
      if (end > i) {
        for (let j = i + 1; j < end; j++) {
          const t = lines[j]
          if (t.includes('colors.') || /\bcolors\s*\[/.test(t)) hits.push({ line: j + 1, text: t.trim() })
        }
        blockEnd = end
      }
    }
  }
  return hits
}

describe('модульные ссылки на colors (краш Property colors does not exist)', () => {
  const files = [...listFiles(SRC), ...listFiles(APP)]

  test('ни один верхнеуровневый блок не ссылается на colors без его определения в модуле', () => {
    const broken = []
    for (const f of files) {
      const lines = fs.readFileSync(f, 'utf8').split('\n')
      // colors определён на верхнем уровне: import … colors … либо
      // const/let на первом уровне вложенности (деструктуризация тоже)
      const defined = lines.some((l) =>
        /^import\s[^;]*\bcolors\b/.test(l) ||
        /^(const|let)\s[^=;{]*\bcolors\b/.test(l) ||
        /^(const|let)\s\{[^}]*\bcolors\b[^}]*\}\s*=/.test(l),
      )
      if (defined) continue
      for (const h of topLevelColorRefs(lines)) {
        broken.push(`${path.relative(path.join(__dirname, '..'), f)}:${h.line}: ${h.text.slice(0, 90)}`)
      }
    }
    expect(broken).toEqual([])
  })
})
