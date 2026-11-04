// Каждый именованный импорт в src/ и app/ должен существовать в
// модуле-источнике. Ловит падения вида «Cannot convert undefined value
// to object» из-за переименованных/удалённых экспортов (как было с
// REPORT_METRICS и daysLabel): компоненты в обычных тестах логики не
// рендерятся, поэтому такие обрывы там не видны.
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    const st = fs.statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (/\.(js|jsx)$/.test(name)) out.push(p)
  }
  return out
}

// '@/x/y' → src/x/y, относительный путь → от файла; пакеты не проверяем
function resolveTarget(spec, fromFile) {
  let base
  if (spec.startsWith('@/')) base = path.join(ROOT, 'src', spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(fromFile), spec)
  else return null
  for (const cand of [base, `${base}.js`, `${base}.jsx`, path.join(base, 'index.js'), path.join(base, 'index.jsx')]) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) return cand
  }
  return 'MISSING'
}

function exportsOf(file) {
  const src = fs.readFileSync(file, 'utf8')
  const names = new Set()
  for (const m of src.matchAll(/export\s+(?:async\s+)?(?:const|let|var|function\*?|class)\s+([A-Za-z0-9_$]+)/g)) {
    names.add(m[1])
  }
  for (const m of src.matchAll(/export\s*\{([^}]+)\}/g)) {
    for (const part of m[1].split(',')) {
      const n = part.trim().split(/\s+as\s+/).pop().trim()
      if (n) names.add(n)
    }
  }
  if (/export\s+default/.test(src)) names.add('default')
  return names
}

describe('целостность импортов', () => {
  test('каждый именованный импорт существует в модуле-источнике', () => {
    const problems = []
    const files = [...walk(path.join(ROOT, 'src')), ...walk(path.join(ROOT, 'app'))]
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8')
      for (const m of src.matchAll(/import\s+(?:([A-Za-z0-9_$]+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g)) {
        const [, def, named, spec] = m
        const target = resolveTarget(spec, f)
        if (target === null) continue // node_modules
        const rel = path.relative(ROOT, f)
        if (target === 'MISSING') {
          problems.push(`${rel}: модуль '${spec}' не найден`)
          continue
        }
        const exp = exportsOf(target)
        if (def && !exp.has('default') && !exp.has(def)) {
          problems.push(`${rel}: default-импорт из '${spec}', но default-экспорта нет`)
        }
        if (named) {
          for (const part of named.split(',')) {
            const n = part.trim().split(/\s+as\s+/)[0].trim()
            if (!n || n === 'type') continue
            if (!exp.has(n)) problems.push(`${rel}: { ${n} } не экспортируется из '${spec}'`)
          }
        }
      }
    }
    expect(problems).toEqual([])
  })
})
