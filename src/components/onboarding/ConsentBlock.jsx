// Компактный блок согласий на обработку персональных данных (152-ФЗ).
//
// Отзыв Кати 19.11: раньше ОПД была отдельной страницей на весь экран
// ПЕРЕД онбордингом («опд на всю страницу») — так не выглядит ни у
// классических приложений, ни у конкурентов (DietAI: условия — мелкими
// ссылками внизу стартовой страницы, без отдельного экрана).
// По 152-ФЗ согласие нужно получить ДО сбора данных, поэтому блок
// стоит на ПЕРВОМ шаге онбординга (WelcomeStep), мелким шрифтом под
// карточкой цели. Ответ на вопрос Кати: на 5-м шаге нельзя — к нему
// уже собраны цель, пол, возраст, рост и вес.
//
// 4 независимых согласия (отдельные чекбоксы, можно отметить по одному):
//   pd          — согласие на обработку ПДн (ст. 6 ч. 1 п. 1 ФЗ-152);
//   health      — согласие на обработку специальных категорий: данные
//                 о здоровье (цикл, шаги) — ст. 10 ФЗ-152;
//   crossBorder — согласие на трансграничную передачу (США:
//                 Cloudflare Inc., OpenAI L.L.C.);
//   policy      — принятие условий Политики конфиденциальности.
//
// Состояние хранится в useOnboardingStore.consent и персистится в
// AsyncStorage. После «Стереть все данные» consent сбрасывается —
// блок снова появится на первом шаге онбординга.
//
// Реквизиты оператора на экране НЕ показываются (отзыв Кати: «пусть
// будут в документах»): по ст. 18.1 ФЗ-152 они должны быть в Политике
// конфиденциальности — там они и есть («Ещё → Документы»).

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { useOnboardingStore } from '@/store/useOnboardingStore'
import { LegalDocModal } from '@/components/more/LegalDocModal'

// Короткие формулировки: одна строка мелким шрифтом, подробности —
// в документах по ссылке под чекбоксами. Порядок слов без мужского/
// женского рода, чтобы подходило любому пользователю.
const CONSENTS = [
  {
    key: 'pd',
    label: 'Персональные данные — имя, рост, вес и дневник (ст. 6 ФЗ-152)',
  },
  {
    key: 'health',
    label: 'Здоровье — цикл и шаги, хранятся только на устройстве (ст. 10 ФЗ-152)',
  },
  {
    key: 'crossBorder',
    label: 'Передача в США — ИИ-чат и фото блюд (Cloudflare, OpenAI)',
  },
  {
    key: 'policy',
    label: 'Принимаю условия сбора и удаления данных',
  },
]

function DocLink({ onPress, children }) {
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

// Строка согласия: компактный чекбокс 18px + формулировка мелким
// шрифтом. Никаких больших карточек с абзацами — подробности в документах.
function ConsentRow({ checked, onToggle, label, last }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={label}
      className={`flex-row items-start gap-2.5 py-2 active:opacity-80 ${
        last ? '' : 'border-b border-white/5'
      }`}
    >
      <View
        className="mt-0.5 h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-2"
        style={{
          borderColor: checked ? '#4D7CFE' : 'rgba(255,255,255,0.28)',
          backgroundColor: checked ? 'rgba(77,124,254,0.18)' : 'transparent',
        }}
      >
        {checked ? <Check size={12} color="#8FA7FF" strokeWidth={3.2} /> : null}
      </View>
      <Text
        maxFontSizeMultiplier={1.2}
        className="min-w-0 flex-1 font-sans text-[12.5px] leading-[16px] text-bear-sub2"
      >
        {label}
      </Text>
    </Pressable>
  )
}

export function ConsentBlock() {
  const consent = useOnboardingStore((s) => s.consent)
  const toggleConsent = useOnboardingStore((s) => s.toggleConsent)

  // Полный текст документов открывается по ссылкам под чекбоксами
  const [doc, setDoc] = useState(null)

  return (
    <View className="rounded-2xl border border-white/5 bg-white/[0.03] px-3.5 py-1.5">
      {CONSENTS.map((c, i) => (
        <ConsentRow
          key={c.key}
          checked={consent?.[c.key]}
          onToggle={() => toggleConsent(c.key)}
          label={c.label}
          last={i === CONSENTS.length - 1}
        />
      ))}

      {/* Ссылки на документы мелким шрифтом — как у конкурентов внизу
          страницы (скрины DietAI, отзыв Кати 19.11) */}
      <Text
        maxFontSizeMultiplier={1.25}
        className="mt-1.5 font-sans text-[11.5px] leading-[15px] text-bear-dim"
      >
        {'Подробности: '}
        <DocLink onPress={() => setDoc('privacy')}>
          Политика конфиденциальности
        </DocLink>
        {', '}
        <DocLink onPress={() => setDoc('terms')}>Пользовательское соглашение</DocLink>
        {'.'}
      </Text>

      <LegalDocModal doc={doc} onClose={() => setDoc(null)} />
    </View>
  )
}

// Хук: все 4 согласия отмечены? Используется кнопкой «Далее» на первом
// шаге онбординга и шлюзом для старых установок (LegacyConsentScreen).
export function useAllConsent() {
  const consent = useOnboardingStore((s) => s.consent)
  return !!(consent?.pd && consent?.health && consent?.crossBorder && consent?.policy)
}
