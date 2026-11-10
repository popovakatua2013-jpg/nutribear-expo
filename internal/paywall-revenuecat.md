# Настоящий пейволл через RevenueCat (план подключения)

Сейчас в приложении стоит макет пейволла (онбординг, шаг 7 —
`src/components/onboarding/ob/PaywallStep.jsx`): цены показываются,
но покупки не проводятся. Ниже — пошаговый план подключения
настоящей подписки. **Важно: в Expo Go SDK RevenueCat не работает** —
нужна dev-сборка (см. `internal/eas-build.md`, профиль `development`).

## ⚠️ RuStore и RevenueCat — НЕ совместимы (проверено 10.11)

RevenueCat поддерживает только App Store, Google Play, Stripe,
Amazon и Web Billing — RuStore в списке магазинов нет.
Значит, для продаж через RuStore нужен **собственный Pay SDK RuStore**
(<https://www.rustore.ru/help/sdk/pay>): есть обёртка под React Native,
продукты и подписки создаются в RuStore Console, триалы — там же.

**Решение ДО проектирования пейволла (отзыв Кати от 10.11):**

- публикуемся только в RuStore → RevenueCat вообще не нужен:
  оплата напрямую через RuStore Pay SDK (или пока без продаж —
  макет остаётся демо);
- публикуемся и в Google Play → RevenueCat закрывает Google Play,
  а для RuStore — отдельный путь через RuStore Pay SDK (два
  независимых пути активации, один entitlement `premium` в коде).

**✅ Выбрано (Катя, 10.11): сценарий «Google Play + RuStore».**
RevenueCat — для Google Play, RuStore Pay SDK — отдельно для
RuStore; в коде приложения один общий флаг Premium
(`useProStore`), куда оба пути активации приходят одинаково.
Когда берёмся за настоящий paywall — начинаем с RevenueCat
(шаги ниже), затем отдельной задачей RuStore Pay SDK.

Также: в RuStore триал настраивается в консоли RuStore (как и
в Google Play — не в RevenueCat); подписки RuStore не проходят
через RevenueCat, их срок действия проверяем сами
(по ответам Pay SDK о статусе покупки).

## Цены и продукты (как задумано)

| Продукт            | Цена      | Условие                  |
| ------------------ | --------- | ------------------------ |
| `premium.monthly`  | 299 ₽/мес | —                        |
| `premium.yearly`   | 1 490 ₽/год | 3 дня бесплатно (триал — как в приложении, отзыв Кати) |

Триал настраивается НЕ в RevenueCat, а в консолях магазинов:
- App Store Connect → подписка → Introductory offer → Free trial 3 days;
- Google Play Console → подписка → Free trial 3 days;
- RuStore Console → продукт → триал 3 дня (см. раздел выше).

## Шаги

1. **Аккаунт RevenueCat** (бесплатно до $2.5k месячной выручки):
   app.revenuecat.com → New project → подключить приложения
   (App Store + Google Play), забрать Public SDK keys (Apple/Android).
2. **Продукты**: в RevenueCat → Products → создать `premium.monthly`,
   `premium.yearly` (IDs должны совпадать с созданными в
   App Store Connect / Google Play Console), entitlement `premium`.
3. **SDK в проект** (только после того, как работает dev-сборка!):
   ```bash
   npx expo install react-native-purchases
   eas build --profile development --platform android
   ```
4. **Код** (заменить макет PaywallStep):
   - `src/lib/paywall.js`: init с ключами из `app.json → extra`,
     `getOfferings()` → пакеты, `purchasePackage()`,
     `restorePurchases()`, слушатель `addCustomerInfoUpdateListener`.
   - Экран пейволла: карточки пакетов из offering (цены приходят из
     магазина, локализованные), кнопка «Начать бесплатно»,
     «Восстановить покупки», ссылки на условия/политику
     (требование Apple — обязательны).
5. **Лимиты бесплатных** (freemium-воронка):
   - бесплатно: дневник, база продуктов, отчёты, 3 ИИ-фото еды в день;
   - premium: ИИ без лимитов, голос, шеринговые карточки, до/после-фото
     без ограничения, приоритетные подсказки мишки.
   Лимит считаем локально (`nutribear-usage-v1`): дата + счётчик.
6. **Проверка**: sandbox-аккаунт App Store / тестеры Google Play —
   покупки за реальные деньги в песочнице не списываются.

## Что уже готово

- Макет пейволла с дизайном (онбординг), цены 299 ₽ / 1 490 ₽ / триал.
- `eas.json` с профилем `development` под нативные модули.
- Анонимная покупка: RevenueCat не требует своего аккаунта/логина —
  пользователь покупает через системное окно магазина.

## Порядок запуска

RevenueCat подключаем ПОСЛЕ (или вместе с) первой EAS-сборки:
без dev-клиента SDK упадёт в Expo Go. Сами цены появятся в
приложении автоматически после модерации продуктов в консолях.
