// Babel-шим: Metro на web отдаёт бандл классическим скриптом, где
// import.meta запрещён (встречается в zustand v5). Заменяем на объект.
module.exports = function ({ types: t }) {
  const MODE = t.stringLiteral(
    process.env.BABEL_ENV || process.env.NODE_ENV || 'development'
  )
  return {
    name: 'import-meta-shim',
    visitor: {
      MetaProperty(path) {
        // трогаем только import.meta (new.target не затрагиваем)
        if (path.node.meta.name !== 'import') return
        path.replaceWith(
          t.objectExpression([
            t.objectProperty(t.identifier('MODE'), MODE),
            t.objectProperty(
              t.identifier('env'),
              t.objectExpression([t.objectProperty(t.identifier('MODE'), MODE)])
            ),
          ])
        )
      },
    },
  }
}
