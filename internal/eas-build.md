# EAS Build: сборки для магазинов (AAB / IPA) и dev-клиент

Конфигурация уже в проекте (`eas.json`, три профиля). Иконки и сплэш
уже готовы в `app.json`: `icon.png`, `adaptive-icon.png`, `splash.png`,
`favicon.png` (сжаты, палитра 256 цветов — требований магазинов хватает).

## Первый APK — быстрый путь (15 минут, из терминала Windows)

Сборка идёт в облаке Expo — на компьютере ничего, кроме этих команд,
не нужно; Android Studio и Java не требуются.

**0. Аккаунт Expo** (если ещё нет): регистрация на
<https://expo.dev/signup> — e-mail и пароль, бесплатно, без карты.

**1. Разовая подготовка** (в папке проекта):

```powershell
cd C:\Users\Администратор\Desktop\nutribear-expo-main\nutribear-app
git pull origin main
npm install -g eas-cli
eas login
eas init
```

`eas init` допишет `projectId` в `app.json` — на вопрос про коммит можно
ответить «Yes» или просто продолжить: сборке это не мешает.

**2. Сборка APK:**

```powershell
npm run apk
```

(то же самое вручную: `eas build --profile preview --platform android`)

На первый вопрос «Generate a new Android Keystore?» ответьте **Yes** —
ключ подписи EAS создаст и сохранит сам, это бесплатно и безопасно.

**3. Установка на телефон.** Сборка занимает 10–30 минут (бесплатная
очередь). Готовый APK приходит ссылкой в терминал и на e-mail — откройте
её на телефоне, скачайте файл и установите (Android спросит разрешение
«устанавливать из неизвестных источников» — это нормально для APK вне
магазина).

## ИИ в облачных сборках (apk / aab)

Файл `.env` НЕ попадает в облачную сборку: он исключён в `.easignore`
(с 11.11.2026; `.easignore` полностью заменяет `.gitignore` для EAS).
Ключ ИИ (sk-…) в приложение больше не грузится — ИИ работает только
через сервер-прокси, ключ живёт на сервере. Порядок:

1. Задеплойте воркер (3 команды из `server/README.md`), если ещё нет.
2. Создайте секреты EAS (адрес прокси обязателен):

   ```powershell
   eas secret:create --name EXPO_PUBLIC_AI_PROXY_URL --value "https://nutribear-ai.ваш-аккаунт.workers.dev/v1"
   ```

   Если на воркере задан общий секрет (`npx wrangler secret put NB_SECRET`),
   создайте и его — иначе воркер отклонит запросы из сборки:

   ```powershell
   eas secret:create --name EXPO_PUBLIC_AI_PROXY_SECRET --value "та-же-строка-что-и-NB_SECRET"
   ```

3. Проверка: `eas secret:list` — обе строки должны быть на месте.
   Секреты подхватятся при следующей сборке; менять код не нужно.
4. Строку `EXPO_PUBLIC_AI_KEY=sk-…` из локального `.env` удалите совсем
   (останутся только `EXPO_PUBLIC_AI_PROXY_URL` и при необходимости
   `EXPO_PUBLIC_AI_PROXY_SECRET`). Работает и для Expo Go, и для сборок.

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
  Один раз скачайте ключ подписи себе: `eas credentials` → платформа
  Android → экспорт keystore; файл и пароли сохраните ВНЕ репозитория
  (флешка, облако). Резерв спасёт при потере доступа к аккаунту Expo.
- До первой сборки `eas build` предложит сгенерировать учётные данные —
  отвечайте «Yes» (это безопасно и бесплатно).
