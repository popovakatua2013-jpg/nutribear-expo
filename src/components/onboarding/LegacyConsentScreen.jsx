// Однократный экран согласия для СТАРЫХ установок (152-ФЗ).
//
// Кому показывается: только пользователям, которые завершили онбординг
// ещё до введения согласий (в их сохранённых данных все 4 согласия
// не отмечены). Новым пользователям согласия даются на первом шаге
// онбординга (ConsentBlock в WelcomeStep) — этот экран у них не
// появляется никогда. После «Стереть все данные» онбординг идёт с
// первого шага, так что блок согласий пройдётся по пути.
//
// Отзыв Кати 19.11: прежний ConsentScreen был страницей на весь экран
// перед входом («опд на всю страницу») — убран. Здесь сознательно
// компактно: мишка, короткий заголовок, блок согласий и подсказка.
// Реквизиты оператора — только в документах (Политика конфиденциальности).

import { Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { ConsentBlock, useAllConsent } from './ConsentBlock'

export function LegacyConsentScreen() {
  const insets = useSafeAreaInsets()
  const allChecked = useAllConsent()

  return (
    <View
      className="flex-1 justify-center bg-bear-bg px-5"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <Text style={{ fontSize: 34 }}>🐻</Text>
      <Text
        maxFontSizeMultiplier={1.2}
        className="mt-2 font-extrabold text-[19px] tracking-tight text-bear-text"
      >
        Согласие на обработку данных
      </Text>
      <Text
        maxFontSizeMultiplier={1.25}
        className="mt-1.5 font-sans text-[13px] leading-snug text-bear-sub2"
      >
        Данные хранятся только на устройстве. Отметьте согласия, чтобы
        продолжить пользоваться NutriBear.
      </Text>

      <View className="mt-4">
        <ConsentBlock />
      </View>

      {/* Кнопка не нужна: как только отмечены все четыре согласия,
          шлюз в _layout сам пропускает в приложение. Подсказка
          объясняет, почему «входа» нет */}
      {!allChecked ? (
        <Text
          maxFontSizeMultiplier={1.25}
          className="mt-3 font-sans text-[12px] leading-snug text-bear-dim"
        >
          Отметьте все четыре согласия — приложение откроется само.
        </Text>
      ) : null}
    </View>
  )
}
