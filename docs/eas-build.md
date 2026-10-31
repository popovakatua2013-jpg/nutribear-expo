# EAS Build: сборки для магазинов (AAB / IPA) и dev-клиент

Конфигурация уже в проекте (`eas.json`, три профиля). Иконки и сплэш
уже готовы в `app.json`: `icon.png`, `adaptive-icon.png`, `splash.png`,
`favicon.png` (сжаты, палитра 256 цветов — требований магазинов хватает).

## Разовая подготовка (5 минут)

```bash
npm install -g eas-cli     # CLI сборок Expo
eas login                  # аккаунт expo.dev (бесплатный)
eas init                   # привязать проект (добавит projectId в app.json)
```

## Профили

| Профиль       | Что собирает                             | Зачем                                        |
| ------------- | ---------------------------------------- | -------------------------------------------- |
| `development` | dev-клиент на телефон                    | Нативные модули (RevenueCat), отладка без Expo Go |
| `preview`     | APK (Android) + iOS для симулятора       | Быстрая проверка релизной сборки на любом телефоне |
| `production`  | AAB для Google Play, IPA для App Store   | Публикация                                   |

## Команды

```bash
# Dev-клиент (заменяет Expo Go, нужен для RevenueCat):
eas build --profile development --platform android

# APK на телефон для проверки:
eas build --profile preview --platform android

# Релизные:
eas build --profile production --platform android   # AAB → Google Play
eas build --profile production --platform ios       # IPA → App Store

# Публикация в магазин после сборки (или вручную из кабинета):
eas submit --platform android --latest
eas submit --platform ios --latest
```

Ссылка на готовый файл приходит в терминал и на e-mail; бесплатный
план Expo — 30 сборок в месяц (очередь может занимать 10–30 минут).

## Заметки

- `versionCode`/`buildNumber` растут сами (`autoIncrement: true`).
- Имена аккаунтов/бандлов уже заданы: `com.nutribear.app`.
- Подписи: EAS управляет ключами сам (Android Play App Signing —
  принимает предложенный ключ; iOS — нужен аккаунт Apple Developer 99 $/год).
- До первой сборки `eas build` предложит сгенерировать учётные данные —
  отвечайте «Yes» (это безопасно и бесплатно).
