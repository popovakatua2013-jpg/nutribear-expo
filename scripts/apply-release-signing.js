// Подпись релизного APK ключом из секретов Actions (блокер RuStore 15.11:
// каждая сборка подписывалась новым debug-ключом — обновление поверх
// установленной версии невозможно, RuStore не принимает такие APK).
//
// expo prebuild генерирует android/app/build.gradle, где release-сборка
// подписана debug-ключом. Скрипт запускается в CI ПОСЛЕ prebuild и ТОЛЬКО
// когда секреты подписи заданы (KEYSTORE_BASE64 декодирован в
// android/app/release.keystore, пароли придут через env на шаге gradlew):
//
//   1. в signingConfigs добавляется конфиг release с file('release.keystore')
//      и паролями из System.getenv('KEYSTORE_PASSWORD' / 'KEY_PASSWORD');
//   2. в buildTypes.release подпись переключается на signingConfigs.release
//      (buildTypes.debug остаётся на debug-ключе — локальные отладочные
//      сборки не должны требовать релизный keystore).
//
// Строгий режим: если не нашли ожидаемых мест в шаблоне — падаем с ясной
// ошибкой, чтобы сборка не уехала тихо debug-подписанной.

const fs = require('fs')

const KEYSTORE_BLOCK = [
  '        release {',
  "            storeFile file('release.keystore')",
  "            storePassword System.getenv('KEYSTORE_PASSWORD')",
  "            keyAlias 'nutribear'",
  "            keyPassword System.getenv('KEY_PASSWORD')",
  '        }',
].join('\n')

// Чистая функция над текстом build.gradle — покрывается тестом на образце
// шаблона expo prebuild. Возвращает { content, addedConfig, switchedRelease }.
function patchGradle(content) {
  if (typeof content !== 'string' || !content.includes('android {')) {
    throw new Error('apply-release-signing: это не похоже на build.gradle (нет блока android {)')
  }

  let out = content
  let addedConfig = false
  let switchedRelease = false

  // 1. Конфиг release в signingConfigs (идемпотентно: уже вставлен — пропускаем)
  if (!out.includes("storeFile file('release.keystore')")) {
    const idx = out.indexOf('signingConfigs {')
    if (idx === -1) {
      throw new Error('apply-release-signing: не найден блок signingConfigs { в build.gradle')
    }
    const open = out.indexOf('{', idx) + 1
    out = out.slice(0, open) + '\n' + KEYSTORE_BLOCK + out.slice(open)
    addedConfig = true
  }

  // 2. Переключить подпись именно release-сборки: блок buildTypes.release
  //    находим по сбалансированным скобкам — простая замена «первой строки»
  //    зацепила бы buildTypes.debug (в шаблоне оба блока пишут
  //    signingConfig signingConfigs.debug), и отладочная сборка стала бы
  //    требовать релизный keystore
  const btIdx = out.indexOf('buildTypes {')
  if (btIdx === -1) {
    throw new Error('apply-release-signing: не найден блок buildTypes { в build.gradle')
  }
  const head = out.slice(0, btIdx)
  const tail = out.slice(btIdx)
  const relStart = tail.indexOf('release {')
  if (relStart === -1) {
    throw new Error('apply-release-signing: в buildTypes не найден блок release {')
  }
  const relEnd = matchingBrace(tail, relStart)
  const relBlock = tail.slice(relStart, relEnd)
  let newRelBlock = relBlock
  if (!relBlock.includes('signingConfig signingConfigs.release')) {
    if (!relBlock.includes('signingConfig signingConfigs.debug')) {
      throw new Error(
        'apply-release-signing: в buildTypes.release нет строки signingConfig signingConfigs.debug'
      )
    }
    newRelBlock = relBlock.replace(
      'signingConfig signingConfigs.debug',
      'signingConfig signingConfigs.release'
    )
    switchedRelease = true
  }

  return { content: head + tail.slice(0, relStart) + newRelBlock + tail.slice(relEnd), addedConfig, switchedRelease }
}

// Индекс закрывающей } для блока, открытого в openIdx (первая { после него).
// В шаблоне gradle скобки внутри строк/комментов не встречаются — обычного
// счётчика достаточно
function matchingBrace(str, openIdx) {
  const open = str.indexOf('{', openIdx)
  if (open === -1) {
    throw new Error('apply-release-signing: не найдена открывающая { блока release')
  }
  let depth = 0
  for (let i = open; i < str.length; i++) {
    if (str[i] === '{') depth++
    else if (str[i] === '}') {
      depth--
      if (depth === 0) return i + 1
    }
  }
  throw new Error('apply-release-signing: не найдена закрывающая } блока release')
}

// Режим «без секретов»: убрать строку подписи из buildTypes.release —
// тогда gradle соберёт НЕПОДПИСАННЫЙ app-release-unsigned.apk вместо
// debug-подписанного app-release.apk из шаблона. Неподписанный артефакт
// честно ожидает подписи владельца, не притворяясь готовой сборкой.
// Блок release ищем тем же сбалансированным способом (matchingBrace)
function stripReleaseSigning(content) {
  const btIdx = content.indexOf('buildTypes {')
  if (btIdx === -1) {
    throw new Error('apply-release-signing: не найден блок buildTypes { в build.gradle')
  }
  const head = content.slice(0, btIdx)
  const tail = content.slice(btIdx)
  const relStart = tail.indexOf('release {')
  if (relStart === -1) {
    throw new Error('apply-release-signing: в buildTypes не найден блок release {')
  }
  const relEnd = matchingBrace(tail, relStart)
  const relBlock = tail.slice(relStart, relEnd)
  const newRelBlock = relBlock
    .split('\n')
    .filter((line) => !line.includes('signingConfig signingConfigs.debug'))
    .join('\n')
  return { content: head + tail.slice(0, relStart) + newRelBlock + tail.slice(relEnd) }
}

function main() {
  const path = 'android/app/build.gradle'
  if (!fs.existsSync(path)) {
    throw new Error(`apply-release-signing: ${path} не найден — сначала expo prebuild`)
  }
  const before = fs.readFileSync(path, 'utf8')

  // --unsigned: убрать подпись release, чтобы сборка без секретов выходила
  // неподписанной (а не debug-подписанной из шаблона)
  if (process.argv[2] === '--unsigned') {
    const { content } = stripReleaseSigning(before)
    const changed = content !== before
    fs.writeFileSync(path, content)
    console.log(changed
      ? 'строка подписи удалена из buildTypes.release — APK выйдет неподписанным (app-release-unsigned.apk)'
      : 'подпись release уже убрана — патч пропущен')
    return
  }

  const { content, addedConfig, switchedRelease } = patchGradle(before)
  fs.writeFileSync(path, content)
  if (addedConfig) console.log('signingConfigs.release добавлен (release.keystore + env-пароли)')
  if (switchedRelease) console.log('buildTypes.release -> signingConfigs.release')
  if (!addedConfig && !switchedRelease) console.log('подпись release уже настроена — патч пропущен')
}

module.exports = { patchGradle, stripReleaseSigning }

if (require.main === module) main()
