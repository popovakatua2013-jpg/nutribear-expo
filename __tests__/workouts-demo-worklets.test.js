// Страховка от красного экрана
// «[Worklets] Attempting to synchronously call remote function … on the
// UI Runtime»: каждая функция, вызываемая внутри анимированных колбэков
// (useAnimatedStyle / useAnimatedProps / useDerivedValue), сама обязана
// быть помечена 'worklet' — иначе на UI-потоке она «remote function» и
// рендер падает. Jest-моки и html-макет этот класс ошибок не ловят
// (они исполняют колбэки на JS-потоке), поэтому проверяем статически:
//
//  1) demoPatterns.js: всё, что достижимо по вызовам из worklet-функций,
//     тоже должно быть worklet (транзитивное замыкание);
//  2) ExerciseDemo.jsx: внутри анимированных колбэков вызываются только
//     worklet-функции из demoPatterns и локальные worklet-функции.

const fs = require('fs')
const path = require('path')
const parser = require('@babel/parser')

const ROOT = path.resolve(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8')
const parse = (src, jsx) =>
  parser.parse(src, { sourceType: 'module', plugins: jsx ? ['jsx'] : [] })

const SKIP_KEYS = new Set([
  'loc', 'start', 'end', 'leadingComments', 'trailingComments', 'extra', 'innerComments',
])

/** Рекурсивный обход всех AST-узлов */
function walk(node, fn) {
  if (!node || typeof node.type !== 'string') return
  fn(node)
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue
    const v = node[key]
    if (Array.isArray(v)) v.forEach((x) => walk(x, fn))
    else if (v && typeof v === 'object') walk(v, fn)
  }
}

const isFnNode = (n) =>
  n &&
  (n.type === 'FunctionDeclaration' ||
    n.type === 'FunctionExpression' ||
    n.type === 'ArrowFunctionExpression')

/** Есть ли у функции директива 'worklet' (Babel: BlockStatement.directives).
 * Блочные стрелки тоже могут быть worklet (f2, axisCap). */
function hasWorkletDirective(fnNode) {
  const body = fnNode.body
  if (!body || body.type !== 'BlockStatement') return false
  if (Array.isArray(body.directives)) {
    if (
      body.directives.some(
        (d) => d.type === 'Directive' && d.value && d.value.value === 'worklet',
      )
    ) {
      return true
    }
  }
  // Запасное представление: ExpressionStatement со строкой 'worklet'
  return body.body.some(
    (st) =>
      st.type === 'ExpressionStatement' &&
      st.expression.type === 'StringLiteral' &&
      st.expression.value === 'worklet',
  )
}

/** Топ-уровневые функции модуля: { имя: узел-функция } */
function topLevelFns(ast) {
  const fns = {}
  const addDecl = (d) => {
    if (!d) return
    if (d.type === 'FunctionDeclaration' && d.id) fns[d.id.name] = d
    if (d.type === 'VariableDeclaration') {
      for (const dec of d.declarations) {
        if (isFnNode(dec.init) && dec.id.type === 'Identifier') fns[dec.id.name] = dec.init
      }
    }
  }
  for (const node of ast.program.body) {
    if (node.type === 'ExportNamedDeclaration' || node.type === 'ExportDefaultDeclaration') {
      addDecl(node.declaration)
    } else {
      addDecl(node)
    }
  }
  return fns
}

/** Имена топ-уровневых функций, вызываемых где-либо внутри узла */
function callees(fnNode, names) {
  const found = new Set()
  walk(fnNode.body, (n) => {
    if (n.type === 'CallExpression' && n.callee.type === 'Identifier' && names.has(n.callee.name)) {
      found.add(n.callee.name)
    }
  })
  return found
}

const ANIMATED_HOOKS = ['useAnimatedStyle', 'useAnimatedProps', 'useDerivedValue', 'useFrameCallback']

describe('worklets: нет remote functions на UI-потоке', () => {
  test('demoPatterns: всё достижимое из worklet-функций — тоже worklet', () => {
    const ast = parse(read('src/features/workouts/player/demoPatterns.js'))
    const fns = topLevelFns(ast)
    const worklets = new Set(Object.keys(fns).filter((k) => hasWorkletDirective(fns[k])))
    expect(worklets.size).toBeGreaterThan(0)

    // Транзитивное замыкание вызовов, стартуя от всех worklet-функций
    const queue = [...worklets]
    const reachable = new Set(queue)
    const allNames = new Set(Object.keys(fns))
    while (queue.length) {
      const cur = queue.pop()
      for (const callee of callees(fns[cur], allNames)) {
        if (!reachable.has(callee)) {
          reachable.add(callee)
          queue.push(callee)
        }
      }
    }
    const bad = [...reachable].filter((name) => !worklets.has(name))
    expect(bad).toEqual([]) // каждая — кандидат на 'worklet'
  })

  test('ExerciseDemo: в анимированных колбэках — только worklet-функции', () => {
    const demoAst = parse(read('src/features/workouts/player/demoPatterns.js'))
    const demoFns = topLevelFns(demoAst)
    const demoWorklets = new Set(
      Object.keys(demoFns).filter((k) => hasWorkletDirective(demoFns[k])),
    )

    const ast = parse(read('src/features/workouts/player/components/ExerciseDemo.jsx'), true)

    // Импорты из demoPatterns
    const imported = new Set()
    for (const node of ast.program.body) {
      if (node.type === 'ImportDeclaration' && /demoPatterns/.test(node.source.value)) {
        for (const spec of node.specifiers) imported.add(spec.local.name)
      }
    }
    expect(imported.size).toBeGreaterThan(0)
    const localFns = topLevelFns(ast)

    // Колбэки всех анимированных хуков в файле
    const callbacks = []
    walk(ast, (n) => {
      if (
        n.type === 'CallExpression' &&
        n.callee.type === 'Identifier' &&
        ANIMATED_HOOKS.includes(n.callee.name) &&
        isFnNode(n.arguments[0])
      ) {
        callbacks.push(n.arguments[0])
      }
    })
    expect(callbacks.length).toBeGreaterThan(0)

    const bad = []
    for (const cb of callbacks) {
      walk(cb.body, (n) => {
        if (n.type === 'CallExpression' && n.callee.type === 'Identifier') {
          const name = n.callee.name
          if (imported.has(name) && !demoWorklets.has(name)) bad.push(`${name} (из demoPatterns)`)
          else if (localFns[name] && !hasWorkletDirective(localFns[name])) bad.push(`${name} (локальная)`)
        }
      })
    }
    expect(bad).toEqual([])
  })
})
