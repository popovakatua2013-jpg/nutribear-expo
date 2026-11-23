// Компактный блок согласий на обработку персональных данных (152-ФЗ).
//
// Отзыв Кати 19.11: раньше ОПД была отдельной страницей на весь экран
// ПЕРЕД онбордингом («опд на всю страницу») — перенесена на первый шаг
// онбординга (ConsentBlock под выбором цели; по 152-ФЗ согласие нужно
// ДО сбора данных, поэтому первый шаг, а не пятый). Второй отзыв тем
// же вечером: блок «очень громоздкий» — теперь это мелкий шрифт без
// карточки-рамки, как правовая строка у конкурентов (DietAI: условия
// мелкими ссылками внизу страницы).
//
// 4 независимых согласия (отдельные чекбоксы, можно отметить по одному):
//   pd          — согласие на обработку ПДн (ст. 6 ФЗ-152);
//   health      — согласие на обработку специальных категорий: данные
//                 о здоровье (цикл, шаги) — ст. 10 ФЗ-152;
//   crossBorder — согласие на трансграничную передачу (США:
//                 Cloudflare Inc., OpenAI L.L.C.);
//   policy      — принятие условий Политики и Соглашения.
// Формулировка строки crossBorder — отзыв Кати 19.11 («пугает передача
// в США; это по закону обязательно на экране или можно прочитать в
// документе?»): жёсткого требования выводить «передачу в США» на экран
// нет — по 152-ФЗ нужно ИНФОРМИРОВАННОЕ согласие до сбора данных
// (ст. 9) и раскрытие получателей в Политике (ст. 18.1, они там есть:
// Cloudflare Inc., OpenAI L.L.C., ProxyAPI). Поэтому пугающую
// формулировку меняем на нейтральную, но по-прежнему честную («за-
// рубежные сервисы» + имена получателей), а детали страны/получателей
// остаются в Политике по ссылке под чекбоксами.
// Ссылки на статьи (ст. 6, ст. 10) убраны со строк — они и полный
// перечень целей/получателей есть в документах по ссылке ниже.
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
import { useThemeColors } from '@/lib/use-theme'


// Короткие формулировки: одна строка мелким шрифтом, подробности —
// в документах по ссылке под чекбоксами. Порядок слов без мужского/
// женского рода, чтобы подходило любому пользователю.
const CONSENTS = [
  {
    key: 'pd',
    label: 'Персональные данные — имя, рост, вес, дневник',
  },
  {
    key: 'health',
    label: 'Здоровье — цикл и шаги, только на устройстве',
  },
  {
    key: 'crossBorder',
    label: 'ИИ-чат и фото — зарубежные сервисы (Cloudflare, OpenAI)',
  },
  {
    key: 'policy',
    label: 'Принимаю условия и Политику',
  },
]

function DocLink({ onPress, children }) {
  const themeColors = useThemeColors()
  return (
    <Text
      onPress={onPress}
      accessibilityRole="link"
      style={{ color: themeColors.link, textDecorationLine: 'underline' }}
    >
      {children}
    </Text>
  )
}

// Строка согласия: маленький чекбокс 16px + формулировка мелким шрифтом.
// Никаких рамок-разделителей и карточек — просто строки «мелким шрифтом»,
// как у конкурентов (отзыв Кати 19.11: «очень громоздкий»).
function ConsentRow({ checked, onToggle, label, last }) {
  return (
    <Pressable
      onPress={onToggle}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: !!checked }}
      accessibilityLabel={label}
      className={`flex-row items-start gap-2 py-1 active:opacity-80 ${last ? '' : 'mb-0.5'}`}
    >
      <View
        className="h-4 w-4 shrink-0 items-center justify-center rounded-[5px] border-2"
        style={{
          borderColor: checked ? '#4D7CFE' : 'rgba(255,255,255,0.28)',
          backgroundColor: checked ? 'rgba(77,124,254,0.18)' : 'transparent',
        }}
      >
        {checked ? <Check size={11} color="#8FA7FF" strokeWidth={3.2} /> : null}
      </View>
      <Text
        maxFontSizeMultiplier={1.2}
        className="min-w-0 flex-1 font-sans text-[12px] leading-[15px] text-bear-dim"
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
    // w-full: в родителях с items-center блок иначе сжимается до ширины
    // контента — строки уезжают и наезжают на соседей (скрин Кати 19.11)
    <View className="w-full px-0.5">
      {CONSENTS.map((c, i) => (
        <ConsentRow
          key={c.key}
          checked={consent?.[c.key]}
          onToggle={() => toggleConsent(c.key)}
          label={c.label}
          last={i === CONSENTS.length - 1}
        />
      ))}

      {/* Ссылки на документы — мелкой строкой под чекбоксами, выровнена
          по тексту строк (отступ = чекбокс 16px + промежуток 8px) */}
      <Text
        maxFontSizeMultiplier={1.25}
        className="mt-1 font-sans text-[11px] leading-[14px] text-bear-dim"
        style={{ marginLeft: 24 }}
      >
        <DocLink onPress={() => setDoc('privacy')}>
          Политика конфиденциальности
        </DocLink>
        {' · '}
        <DocLink onPress={() => setDoc('terms')}>Соглашение</DocLink>
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
