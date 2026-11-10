# Настоящий пейволл через RevenueCat (план подключения)

Сейчас в приложении стоит макет пейволла (онбординг, шаг 7 —
`src/components/onboarding/ob/PaywallStep.jsx`): цены показываются,
но покупки не проводятся. Ниже — пошаговый план подключения
настоящей подписки. **Важно: в Expo Go SDK RevenueCat не работает** —
нужна dev-сборка (см. `docs/eas-build.md`, профиль `development`).

## Цены и продукты (как задумано)

| Продукт            | Цена      | Условие                  |
| ------------------ | --------- | ------------------------ |
| `premium.monthly`  | 299 ₽/мес | —                        |
| `premium.yearly`   | 1 490 ₽/год | 7 дней бесплатно (триал) |

Триал настраивается НЕ в RevenueCat, а в консолях магазинов:
- App Store Connect → подписка → Introductory offer → Free trial 7 days;
- Google Play Console → подписка → Free trial 7 days.

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
