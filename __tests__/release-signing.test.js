// Страховка патча подписи релизной сборки (scripts/apply-release-signing.js).
// CI: expo prebuild -> node scripts/apply-release-signing.js -> gradlew assembleRelease.
// Патч обязан: добавить signingConfigs.release на release.keystore, переключить
// подпись buildTypes.release на него и НЕ трогать подпись buildTypes.debug.
// Патч строгий: не нашёл ожидаемое место в шаблоне — падает, сборка красная,
// тихо debug-подписанный APK не выйдет.

const { patchGradle, stripReleaseSigning } = require('../scripts/apply-release-signing')

// Образец android/app/build.gradle в форме, которую генерирует expo prebuild
// (подпись release на debug-ключе — то, из-за чего каждая сборка выходила
// с новой подписью)
const TEMPLATE = `apply plugin: "com.android.application"
apply plugin: "com.facebook.react"

android {
    ndkVersion rootProject.ext.ndkVersion
    compileSdkVersion rootProject.ext.compileSdkVersion
    namespace "com.nutribear.app"
    defaultConfig {
        applicationId "com.nutribear.app"
        versionCode 11
        versionName "1.1.0"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            signingConfig signingConfigs.debug
            shrinkResources true
            minifyEnabled true
        }
    }
}
`

describe('apply-release-signing: патч build.gradle', () => {
  test('добавляет signingConfigs.release и переключает release на него', () => {
    const { content, addedConfig, switchedRelease } = patchGradle(TEMPLATE)
    expect(addedConfig).toBe(true)
    expect(switchedRelease).toBe(true)

    // Конфиг release появился внутри signingConfigs
    expect(content).toContain("storeFile file('release.keystore')")
    expect(content).toContain("storePassword System.getenv('KEYSTORE_PASSWORD')")
    expect(content).toContain("keyAlias 'nutribear'")
    // один пароль на store и key (PKCS12); отдельный KEY_PASSWORD не нужен:
    // в сборке №6 он оказался заполнен неверно и валил packageRelease
    expect(content).toContain("keyPassword System.getenv('KEYSTORE_PASSWORD')")
    expect(content).not.toContain("System.getenv('KEY_PASSWORD')")
    // и стоит ДО конфига debug (вставка сразу после signingConfigs {)
    expect(content.indexOf("storeFile file('release.keystore')")).toBeLessThan(
      content.indexOf("storeFile file('debug.keystore')")
    )

    // release-сборка подписана release-конфигом
    const bt = content.slice(content.indexOf('buildTypes {'))
    expect(bt).toContain('signingConfig signingConfigs.release')
    // debug-сборка осталась на debug-ключе — ровно одно вхождение
    expect(bt.split('signingConfig signingConfigs.debug').length - 1).toBe(1)
  })

  test('идемпотентен: повторный запуск ничего не дублирует', () => {
    const once = patchGradle(TEMPLATE).content
    const twice = patchGradle(once)
    expect(twice.addedConfig).toBe(false)
    expect(twice.switchedRelease).toBe(false)
    expect(twice.content).toBe(once)
    expect(twice.content.split("storeFile file('release.keystore')").length - 1).toBe(1)
    expect(twice.content.split('signingConfig signingConfigs.release').length - 1).toBe(1)
  })

  test('падает, если в шаблоне нет блока signingConfigs', () => {
    const broken = TEMPLATE.replace(/signingConfigs \{[\s\S]*?\n    \}\n/, '')
    expect(() => patchGradle(broken)).toThrow('signingConfigs')
  })

  test('падает, если в buildTypes нет строки подписи debug', () => {
    const broken = TEMPLATE.replace('signingConfig signingConfigs.debug\n            shrinkResources', 'shrinkResources')
    expect(() => patchGradle(broken)).toThrow('signingConfig signingConfigs.debug')
  })

  test('падает на файле без блока android', () => {
    expect(() => patchGradle('не gradle')).toThrow('build.gradle')
  })
})

describe('stripReleaseSigning: режим сборки без секретов', () => {
  test('убирает подпись только у release — debug остаётся на debug-ключе', () => {
    const { content } = stripReleaseSigning(TEMPLATE)
    const bt = content.slice(content.indexOf('buildTypes {'))

    // у release больше нет строки подписи
    const relStart = bt.indexOf('release {')
    const relBlock = bt.slice(relStart, bt.indexOf('}', relStart))
    expect(relBlock).not.toContain('signingConfig')

    // у debug строка на месте
    expect(bt).toContain('signingConfig signingConfigs.debug')
    // gradle соберёт app-release-unsigned.apk вместо debug-подписанного app-release.apk
  })

  test('идемпотентен: повторный запуск ничего не ломает', () => {
    const once = stripReleaseSigning(TEMPLATE).content
    const twice = stripReleaseSigning(once)
    expect(twice.content).toBe(once)
    expect(once.split('signingConfig signingConfigs.debug').length - 1).toBe(1)
  })

  test('падает, если блока buildTypes нет', () => {
    expect(() => stripReleaseSigning('не gradle')).toThrow('buildTypes')
  })
})
