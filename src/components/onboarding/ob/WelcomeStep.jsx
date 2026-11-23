// Этап 1. «Твоя цель»: витринный первый экран — мишка и выбор цели
// чипами прямо здесь (по макету). Заголовок «Похудей, поддерживай или
// набирай вес» УДАЛЕН по отзыву Кати («Похудей… — удалить»): остался
// нейтральный подзаголовок. Выбор сразу пишется в стор, поэтому
// отдельный шаг «Какая у вас цель?» из цепочки удалён.
// Отзыв Кати: карточка «Поддерживать» была «кривая» — в один ряд из
// трёх чипов слово не помещалось и рвалось посреди («Поддержива-ть»);
// теперь чипы лежат сеткой 2×2 и подпись всегда в одну строку. Сюда
// же добавлена четвёртая цель «Сушка» (отзыв Кати).
// Решение по вопросу Кати 18.11 («не вводит данные — пропускать или нет?»):
// цель — единственный обязательный выбор (без неё план не построить),
// поэтому «Далее» без цели не активна, но под карточкой появляется
// подсказка, почему; анкета (шаг 2) при этом пропускается «Пропустить»
// Отзыв Кати 19.11: согласия 152-ФЗ перенесены сюда с отдельной
// страницы перед входом — компактный блок ConsentBlock мелким шрифтом
// под карточкой цели (по закону согласие ДО сбора данных, поэтому
// первый шаг, а не пятый; реквизиты оператора — только в документах).
// «Далее» активна, когда выбрана цель И отмечены все 4 согласия.

import { Image, Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { ObShell } from './ObShell'
import { ConsentBlock, useAllConsent } from '../ConsentBlock'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const BEAR = require('../../../../assets/images/bear.webp')

const CHIPS = [
  { id: 'lose', emoji: '🔥', label: 'Похудеть' },
  { id: 'cut', emoji: '⚡', label: 'Сушка' },
  { id: 'maintain', emoji: '⚖️', label: 'Поддерживать' },
  { id: 'gain', emoji: '💪', label: 'Набрать вес' },
]

// Чипы рядами по два (сетка 2×2): в ряд из трёх подпись «Поддерживать»
// не влезала и переносилась посреди слова (отзыв Кати: «кривая»)
const CHIP_ROWS = [CHIPS.slice(0, 2), CHIPS.slice(2, 4)]

export function WelcomeStep({ onNext }) {
  const goalId = useOnboardingStore((s) => s.answers.goalId)
  const patch = useOnboardingStore((s) => s.patchAnswers)
  const consentOk = useAllConsent()

  return (
    <ObShell
      title="NutriBear"
      onNext={onNext}
      nextDisabled={!goalId || !consentOk}
      nextLabel="Далее"
    >
      <View className="items-center pt-1">
        {/* Мишка со свечением. История скринов Кати: голый <Image> с
            inline w/h рисуется полоской 126×1, произвольные классы
            h-[148px] не применяются вовсе; плитка с inline-дублем
            {width:96,height:96} поверх классов тоже подвела (скрин
            20.11 20:36: «шторка всё равно закрывает медведя» — видна
            только полоска с тарелкой). Итоговая версия — РОВНО паттерн
            Greeting с Главной, который на её телефоне работает:
            обёртка и плитка ТОЛЬКО на стандартных классах шкалы
            Tailwind (h-24 w-24 — как h-11/w-11 в Greeting), никакого
            inline-размера ни на одном звене цепочки картинки; у
            свечений-эллипсов классами задан размер, а inline остался
            только на цвете (inline-цвета на её устройстве работают) */}
        <View className="relative mt-2 h-28 w-40 items-center justify-center">
          {/* Свечение — два эллипса за плиткой */}
          <View
            className="absolute h-20 w-40 rounded-full"
            style={{ backgroundColor: 'rgba(124,92,252,0.26)' }}
          />
          <View
            className="absolute h-14 w-32 rounded-full"
            style={{ backgroundColor: 'rgba(139,108,255,0.26)' }}
          />
          <View className="h-24 w-24 overflow-hidden rounded-3xl bg-white/5">
            <Image
              source={BEAR}
              accessibilityLabel="Медвежонок NutriBear"
              resizeMode="cover"
              style={{ width: '100%', height: '100%' }}
            />
          </View>
        </View>

        {/* Заголовок «Похудей, поддерживай или набирай вес» удалён
            (отзыв Кати) — остался нейтральный подзаголовок */}
        <Text className="mx-auto mt-1 max-w-[280px] text-center font-sans text-[17.5px] leading-relaxed text-bear-sub">
          Персональный план питания и тренировок под твои цели
        </Text>

        {/* Карточка «Твоя цель» с четырьмя чипами (сетка 2×2) */}
        <View className="mt-4 w-full rounded-3xl border border-white/5 bg-bear-card p-4">
          <Text className="font-bold text-[17.5px] text-bear-sub2">Твоя цель</Text>
          <View className="mt-3 gap-2.5">
            {CHIP_ROWS.map((row, ri) => (
              <View key={ri} className="flex-row gap-2.5">
                {row.map((c) => (
                  <GoalChip
                    key={c.id}
                    chip={c}
                    active={goalId === c.id}
                    onPress={() => patch({ goalId: c.id })}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Блок согласий 152-ФЗ — строки мелким шрифтом без карточки,
            под карточкой цели (отзывы Кати 19.11: сначала «перенести
            с отдельной страницы», потом «очень громоздкий»). w-full
            обязателен: родитель items-center сжимает обёртку до ширины
            контента — строки уезжали вправо, а строка ссылок
            накладывалась на подсказку (скрин 19.11 00:29). Реквизиты
            оператора — в Политике конфиденциальности */}
        <View className="mt-3 w-full">
          <ConsentBlock />
        </View>

        {/* Подсказка, пока «Далее» не активна: серая кнопка должна
            объяснять себя, а не выглядеть сломанной (вопрос Кати) */}
        {!goalId ? (
          <Text className="mt-2.5 text-center font-sans text-[14px] leading-snug text-bear-dim">
            Выберите цель — и пойдём дальше
          </Text>
        ) : !consentOk ? (
          <Text className="mt-2.5 text-center font-sans text-[14px] leading-snug text-bear-dim">
            Отметьте согласия — и пойдём дальше
          </Text>
        ) : null}
      </View>
    </ObShell>
  )
}

function GoalChip({ chip, active, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={chip.label}
      accessibilityState={{ selected: active }}
      className="min-w-0 flex-1"
    >
      <View
        className={`items-center rounded-2xl border px-1 pb-3 pt-3.5 ${
          active ? 'border-[#A45BFF] bg-[#A45BFF]/10' : 'border-white/10 bg-white/[0.03]'
        }`}
      >
        {active ? (
          <View className="absolute right-1.5 top-1.5 h-[18px] w-[18px] items-center justify-center rounded-full bg-[#A45BFF]">
            <Check size={15} color="#FFFFFF" strokeWidth={3.2} />
          </View>
        ) : null}
        <Text className="text-[26px]">{chip.emoji}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          className={`mt-1.5 text-center font-bold text-[15px] leading-[18px] ${
            active ? 'text-white' : 'text-bear-sub'
          }`}
        >
          {chip.label}
        </Text>
      </View>
    </Pressable>
  )
}
