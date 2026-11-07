// Стаб react-native-svg для юнит-тестов в Node: пакет импортируется на
// верхнем уровне lucide-react-native (реестр METRICS тянет иконки —
// трекер сна, sleep.test.js). В логике иконки/SVG не участвуют —
// достаточно одного плейсхолдера на любое имя экспорта (Svg, Path, G…),
// включая default: babel-интероп обращается и к .default, и к именам.
function Stub() {
  return null
}

module.exports = new Proxy(Stub, {
  get(target, prop) {
    if (prop === 'default') return target
    if (prop === '__esModule') return true
    return target
  },
})
