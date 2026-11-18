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
// КОМПАКТНАЯ РЕДАКЦИЯ (отзыв Кати 18.11: «шапку ОПД не видно, блоки
// очень большие — можно сделать как на скрине goCalories»):
//   • шапка (мишка + заголовок + строка со ссылками) закреплена над
//     скроллом — видна ВСЕГДА, что бы ни происходило с размером шрифта;
//   • четыре согласия — короткие строки в ОДНОЙ карточке: заголовок,
//     одна строка описания и ссылка «детали», открывающая полный
//     документ (Политика конфиденциальности / Соглашение);
//   • реквизиты оператора — мелкой строкой под карточкой;
//   • большие карточки с абзацами текста убраны: подробности —
//     в документах по ссылке, а не на экране согласия.
// Заодно исправлены цвета прежней версии: карточки были белыми
// (#ffffff), а текст — почти белым (#EEF2FB), то есть нечитаемым;
// теперь карточка тёмная (bear-card), текст светлый — как во всём
// приложении.

import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { LegalDocModal } from '@/components/more/LegalDocModal'
import { OPERATOR } from '@/lib/data/legal'

// Короткие формулировки согласий: одна строка описания, подробности —
// в документе по ссылке «детали». Порядок слов без мужского/женского
// рода, чтобы подходило любому пользователю.
const CONSENTS = [
  {
    key: 'pd',
    title: 'Персональные данные',
    body: 'Имя, рост, вес и история питания — для работы дневника (ст. 6 ФЗ-152).',
  },
  {
    key: 'health',
    title: 'Данные о здоровье',
    body: 'Цикл и шаги из Health Connect; хранятся только на устройстве (ст. 10 ФЗ-152).',
  },
  {
    key: 'crossBorder',
    title: 'Передача в США',
    body: 'Запросы ИИ-чата и фото блюд — в Cloudflare и OpenAI; без этого ИИ недоступен.',
  },
  {
    key: 'policy',
    title: 'Политика конфиденциальности',
    body: 'Принимаю условия: какие данные собираются и как их удалить.',
  },
]

function LinkText({ onPress, children }) {
  return (
    <Text
      onPress={onPress}
      accessibilityRole="link"
      style={{ color: '#6C8CFF', textDecorationLine: 'underline' }}
    >
      {children}
    </Text>
  )
}

// Компактная строка согласия: чекбокс + заголовок + ссылка «детали»
// в один ряд, под ними — одна строка описания. Никаких карточек-блоков.
function ConsentRow({ checked, onToggle, title, body, onDetails, last }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={title}
      className={`active:opacity-80 ${last ? 'py-3' : 'border-b border-bear-line py-3'}`}
      style={{ paddingHorizontal: 16 }}
    >
      <View className="flex-row items-center gap-3">
        <View
          className="h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2"
          style={{
            borderColor: checked ? '#4D7CFE' : 'rgba(255,255,255,0.28)',
            backgroundColor: checked ? 'rgba(77,124,254,0.18)' : 'transparent',
          }}
        >
          {checked ? (
            <Text style={{ color: '#8FA7FF', fontSize: 15, fontWeight: '800' }}>
              ✓
            </Text>
          ) : null}
        </View>
        <Text
          maxFontSizeMultiplier={1.2}
          className="min-w-0 flex-1 font-bold text-[16px] text-bear-text"
        >
          {title}
        </Text>
        <LinkText onPress={onDetails}>детали</LinkText>
      </View>
      <Text
        maxFontSizeMultiplier={1.2}
        className="mt-1 font-sans text-[12.5px] leading-snug text-bear-sub2"
        style={{ marginLeft: 38 }}
      >
        {body}
      </Text>
    </Pressable>
  )
}

export function ConsentScreen() {
  const insets = useSafeAreaInsets()
  const consent = useOnboardingStore((s) => s.consent)
  const toggleConsent = useOnboardingStore((s) => s.toggleConsent)

  // Полный документ по ссылке «детали»: все четыре согласия
  // расписаны в Политике конфиденциальности (категории, хранение,
  // передача), поэтому «детали» открывают её
  const [doc, setDoc] = useState(null)

  const allChecked =
    consent?.pd && consent?.health && consent?.crossBorder && consent?.policy

  return (
    <View
      className="flex-1 bg-bear-bg"
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      {/* Шапка — закреплена над скроллом, видна всегда (отзыв Кати:
          «шапку не видно»): мишка, заголовок и строка со ссылками
          в стиле скрина goCalories */}
      <View className="px-5 pb-3 pt-5">
        <Text style={{ fontSize: 40 }}>🐻</Text>
        <Text
          maxFontSizeMultiplier={1.2}
          className="mt-1 font-extrabold text-[22px] tracking-tight text-bear-text"
        >
          Согласие на обработку данных
        </Text>
        <Text
          maxFontSizeMultiplier={1.25}
          className="mt-1.5 font-sans text-[14px] leading-snug text-bear-sub2"
        >
          Продолжая, вы принимаете условия{' '}
          <LinkText onPress={() => setDoc('terms')}>Пользовательского соглашения</LinkText>
          . Как мы обрабатываем данные — в{' '}
          <LinkText onPress={() => setDoc('privacy')}>Политике конфиденциальности</LinkText>
          . Данные хранятся только на устройстве.
        </Text>
      </View>

      {/* Согласия — одна компактная карточка, всё умещается на экране */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 16 }}
      >
        <View className="overflow-hidden rounded-3xl border border-bear-line bg-bear-card">
          {CONSENTS.map((c, i) => (
            <ConsentRow
              key={c.key}
              checked={consent?.[c.key]}
              onToggle={() => toggleConsent(c.key)}
              title={c.title}
              body={c.body}
              onDetails={() => setDoc('privacy')}
              last={i === CONSENTS.length - 1}
            />
          ))}
        </View>

        {/* Реквизиты оператора — мелкой строкой под карточкой */}
        <Text
          maxFontSizeMultiplier={1.2}
          className="mt-3 font-sans text-[12px] leading-snug text-bear-dim"
        >
          Оператор персональных данных — {OPERATOR.name}, {OPERATOR.status},
          ИНН {OPERATOR.inn}. Реестр операторов Роскомнадзора: №{' '}
          {OPERATOR.rknNumber} от {OPERATOR.rknDate}.
        </Text>
      </ScrollView>

      {/* Кнопка «Продолжить» — внизу, как на онбординге */}
      <View
        style={{
          paddingHorizontal: 20,
          paddingTop: 10,
          paddingBottom: 14,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.08)',
          backgroundColor: '#0A1020',
        }}
      >
        <Pressable
          disabled={!allChecked}
          onPress={() => useOnboardingStore.getState().setConsentAccepted(true)}
          accessibilityRole="button"
          accessibilityLabel="Продолжить"
          className="items-center rounded-2xl px-4 py-3.5"
          style={{
            backgroundColor: allChecked ? '#4D7CFE' : 'rgba(255,255,255,0.10)',
            opacity: allChecked ? 1 : 0.9,
          }}
        >
          <Text className="font-bold text-[17px] text-white">
            {allChecked ? 'Продолжить' : 'Отметьте все согласия'}
          </Text>
        </Pressable>
      </View>

      {/* Полный текст документа по ссылке «детали»/из шапки */}
      <LegalDocModal doc={doc} onClose={() => setDoc(null)} />
    </View>
  )
}
