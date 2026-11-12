# NutriBear — дневник питания и активности

Expo-приложение (Android, готовится публикация в RuStore) от
Поповой Екатерины (whitelinepay@yandex.ru). Тексты для правовых
документов и правила работы с проектом — в этом файле.

## Стек

- Expo SDK 58 · React Native 0.88 · expo-router (вкладки:
  Главная, Дневник, Тело, План, Ещё)
- NativeWind (палитра `bear-*` в `tailwind.config.js`),
  Zustand-сторы в `src/store/`, lucide-react-native для иконок
- ИИ-функции — через сервер-прокси Cloudflare Worker
  (`server/cloudflare-worker.js`, ключ хранится в воркере)

## Команды

```bash
npm ci                  # установка зависимостей (Windows: update.bat / update.ps1)
npx expo start          # запуск в Expo Go
npx jest                # все тесты (50 наборов, 636 тестов)
```

Сборка APK — только через GitHub Actions (Actions → Build APK →
Run workflow); команды `npm run apk` / `npm run aab` остались от EAS
и больше не используются. CI на каждый push сам гоняет
check-syntax и тесты (Actions → CI).

## Сборка для магазинов

- **RuStore** принимает **APK** — собирается через GitHub Actions: вкладка
  Actions → «Build APK» → Run workflow. Готовый файл — в блоке Artifacts
  запуска (NutriBear-APK.zip, внутри app-release.apk).
- **Google Play** принимает **AAB** (команда `npm run aab` или EAS).
- AAB не заливается в RuStore, APK без пересборки не заливается в
  Google Play — форматы разные, одна и та же сборка не подходит обоим.

## Структура

| Путь                  | Что там                                            |
| --------------------- | -------------------------------------------------- |
| `app/`                | экраны и вкладки (expo-router)                     |
| `src/components/`     | UI-компоненты по вкладкам                          |
| `src/lib/`            | расчёты, ИИ, Health Connect, документы (`data/`)   |
| `src/store/`          | Zustand-сторы (persist в AsyncStorage; чувствительные — в SecureStore) |
| `docs/`               | публичные юридические документы (страница GitHub Pages) |
| `internal/`           | внутренние заметки: аудиты, backlog, план paywall, EAS |
| `server/`             | Cloudflare Worker — ИИ-прокси (`server/README.md`) |
| `rustore/`            | материалы карточки RuStore: иконка 512×512, тексты |
| `.env.example`        | шаблон переменных (ключи НЕ зашиваем в бандл)      |

## Правила проекта

1. Ключи и секреты — только в `.env` (не в git) или в секрете
   воркера; всё с префиксом `EXPO_PUBLIC_` попадает в бандл.
2. Обновления для Владельца — через `update.bat` / `update.ps1`
   (ps1 сам делает `npm install`).
3. Данные здоровья (профиль, цикл) лежат в защищённом хранилище
   платформы (Android Keystore) через `src/lib/secure-storage.js`;
   «Стереть все данные» чистит и AsyncStorage, и SecureStore,
   и файлы фото прогресса.
4. Перед коммитом: `node scripts/check-syntax.js <файлы>` и `npx jest`.
5. GitHub Pages публикует только каталог `docs/` (политика и
   соглашение): <https://popovakatua2013-jpg.github.io/nutribear-expo/privacy.html>
