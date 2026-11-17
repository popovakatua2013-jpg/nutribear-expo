// Экран согласия на обработку персональных данных (152-ФЗ).
//
// Показывается ПЕРВЫМ при запуске приложения — раньше онбординга.
// Пока все 4 чекбокса не отмечены — кнопка «Продолжить» неактивна,
// дальнейший доступ к приложению невозможен.
//
// 4 независимых согласия (отдельные чекбоксы, можно отметить по одному):
//   1. pd         — согласие на обработку ПДн (ст. 6 ч. 1 п. 1 ФЗ-152)
//   2. health     — согласие на обработку специальных категорий:
//                    данные о здоровье (цикл, шаги) — ст. 10 ФЗ-152
//   3. crossBorder — согласие на трансграничную передачу (США:
//                    Cloudflare Inc., OpenAI L.L.C.)
//   4. policy     — согласие с Политикой конфиденциальности
//
// Все 4 сохраняются в useOnboardingStore.consent и персистятся в
// AsyncStorage. После сброса данных («Стереть все данные») consent
// также сбрасывается → экран показывается заново при следующем запуске.
//
// Стиль повторяет онбординг: bg-bear-bg, шрифты Inter, кнопка #4D7CFE.

import { Pressable, ScrollView, Text, View, Linking, Alert } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const PRIVACY_URL =
  'https://popovakatua2013-jpg.github.io/nutribear-expo/privacy.html'

const CONSENTS = [
  {
    key: 'pd',
    title: 'Обработка персональных данных',
    body: 'Согласен на обработку моих персональных данных (имя, пол, возраст, рост, вес, история питания, история тренировок) для работы дневника питания и активности. Основание: п. 1 ч. 1 ст. 6 ФЗ-152.',
  },
  {
    key: 'health',
    title: 'Данные о здоровье',
    body: 'Согласен на обработку специальных категорий персональных данных — данных о здоровье (даты менструального цикла и рассчитанные фазы, данные шагов из Health Connect). Хранятся только на устройстве. Основание: ст. 10 ФЗ-152.',
  },
  {
    key: 'crossBorder',
    title: 'Трансграничная передача',
    body: 'Согласен на трансграничную передачу моих текстовых запросов в ИИ-чат и описаний/фотографий блюд в США — получатели Cloudflare, Inc. (сервер-прокси) и OpenAI L.L.C. (модель gpt-4o-mini). Без этого согласия функции ИИ-чата и распознавания блюд недоступны.',
  },
  {
    key: 'policy',
    title: 'Политика конфиденциальности',
    body: 'Ознакомился с Политикой конфиденциальности приложения NutriBear и согласен с её условиями. Политика описывает, какие данные обрабатываются, где хранятся и как их удалить.',
  },
]

function ConsentRow({ checked, onToggle, title, body, isLink, onLinkPress }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={title}
      className="mt-3 rounded-2xl border p-4 active:opacity-80"
      style={{
        borderColor: checked ? '#4D7CFE' : '#dde3f0',
        backgroundColor: checked ? '#eef3ff' : '#ffffff',
      }}
    >
      <View className="flex-row items-start">
        <View
          className="mr-3 mt-0.5 h-6 w-6 items-center justify-center rounded-md border-2"
          style={{ borderColor: checked ? '#4D7CFE' : '#bcc6db' }}
        >
          {checked ? (
            <Text style={{ color: '#4D7CFE', fontSize: 17, fontWeight: '800' }}>
              ✓
            </Text>
          ) : null}
        </View>
        <View className="flex-1">
          <Text
            maxFontSizeMultiplier={1.25}
            className="font-extrabold text-[17px] text-bear-text"
          >
            {title}
          </Text>
          <Text
            maxFontSizeMultiplier={1.25}
            className="mt-1 font-sans text-[14.5px] leading-relaxed text-bear-sub2"
          >
            {body}{' '}
            {isLink ? (
              <Text
                onPress={onLinkPress}
                style={{ color: '#4d7cfe', textDecorationLine: 'underline' }}
              >
                Открыть Политику →
              </Text>
            ) : null}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

export function ConsentScreen() {
  const insets = useSafeAreaInsets()
  const consent = useOnboardingStore((s) => s.consent)
  const toggleConsent = useOnboardingStore((s) => s.toggleConsent)

  const allChecked =
    consent?.pd && consent?.health && consent?.crossBorder && consent?.policy

  function openPolicy() {
    Linking.openURL(PRIVACY_URL).catch(() => {
      Alert.alert('Не удалось открыть', PRIVACY_URL)
    })
  }

  return (
    <View
      className="flex-1 bg-bear-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 32, paddingBottom: 40 }}
      >
        <Text style={{ fontSize: 52 }}>🐻</Text>
        <Text
          maxFontSizeMultiplier={1.2}
          className="mt-2 font-extrabold text-[26px] tracking-tight text-bear-text"
        >
          Согласие на обработку данных
        </Text>
        <Text
          maxFontSizeMultiplier={1.25}
          className="mt-2 font-sans text-[15.5px] leading-relaxed text-bear-sub2"
        >
          Чтобы пользоваться NutriBear, отметьте все четыре согласия. Это
          требование Федерального закона № 152-ФЗ «О персональных данных».
          Согласия хранятся только на вашем устройстве.
        </Text>

        {CONSENTS.map((c) => (
          <ConsentRow
            key={c.key}
            checked={consent?.[c.key]}
            onToggle={() => toggleConsent(c.key)}
            title={c.title}
            body={c.body}
            isLink={c.key === 'policy'}
            onLinkPress={openPolicy}
          />
        ))}

        <View
          className="mt-4 rounded-2xl p-3.5"
          style={{ backgroundColor: '#f3f0ff', borderColor: '#e2dbff', borderWidth: 1 }}
        >
          <Text
            maxFontSizeMultiplier={1.25}
            className="font-sans text-[13.5px] leading-relaxed text-bear-sub2"
          >
            Оператор персональных данных — Попова Екатерина Александровна,
            самозанятая (ИНН 290801999806). Включена в Реестр операторов
            Роскомнадзора, регистрационный номер уведомления 5822/10
            от 18.11.2026.
          </Text>
        </View>
      </ScrollView>

      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 12,
          paddingBottom: 18,
          borderTopWidth: 1,
          borderTopColor: '#e8edf8',
          backgroundColor: '#ffffff',
        }}
      >
        <Pressable
          disabled={!allChecked}
          onPress={() => useOnboardingStore.getState().setConsentAccepted(true)}
          accessibilityRole="button"
          accessibilityLabel="Продолжить"
          className="items-center rounded-2xl px-4 py-4"
          style={{
            backgroundColor: allChecked ? '#4D7CFE' : '#c5cee0',
            opacity: allChecked ? 1 : 0.9,
          }}
        >
          <Text className="font-bold text-[18px] text-white">
            {allChecked ? 'Продолжить' : 'Отметьте все согласия'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
