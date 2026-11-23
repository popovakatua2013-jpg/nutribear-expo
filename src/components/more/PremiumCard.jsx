// Карточка «Премиум» для вкладки «Ещё»: выгоды подписки и активация
// планов (триал 3 дня / месяц 299 ₽ / год 1 490 ₽ из useProStore).
//
// Схема оплаты (решение Кати 19.11 — вместо демо-кнопки «активировать
// без оплаты»): тап на «Месяц»/«Год» открывает страницу оплаты
// (PAY_PAGE_URL — карта/СБП через Ю-Kassa), после оплаты покупателю
// высылается код активации, код вводится в поле ниже. Триал 3 дня
// бесплатный — активируется сразу в приложении. Режимов demo/release
// больше нет: активация всегда только по коду (src/lib/promo-codes.js,
// в APK хэши, сами коды не хранятся).
//
// Режим embedded: содержимое встраивается в строку меню «Премиум»
// (как CompanionCard, CycleCard и пр.).

import { useState } from 'react'
import { Linking, Pressable, Text, TextInput, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { PRO_PLANS, useProStore } from '@/store/useProStore'
import { PREMIUM_PERKS } from '@/lib/entitlements'
import { isValidPromoCode, PAY_PAGE_URL } from '@/lib/promo-codes'
import { useToast } from '@/components/ui/Toast'
import { useThemeColors } from '@/lib/use-theme'


// Подпись статуса для строки меню
export function premiumStatusValue(pro, plan) {
  if (!pro) return '299 ₽/мес'
  if (plan === 'trial') return 'триал 3 дня'
  if (plan === 'promo') return 'по коду'
  return 'активна'
}

// Человекочитаемое название плана для строки «План: …»
function planLabel(plan) {
  if (plan === 'trial') return 'триал 3 дня'
  if (plan === 'month') return 'месяц — 299 ₽'
  if (plan === 'promo') return 'по коду активации — год'
  return 'год — 1 490 ₽'
}

export function PremiumCard({ embedded = false }) {
  const themeColors = useThemeColors()
  const pro = useProStore((s) => s.pro)
  const plan = useProStore((s) => s.plan)
  const activate = useProStore((s) => s.activate)
  const deactivate = useProStore((s) => s.deactivate)
  const { toast } = useToast()
  const [code, setCode] = useState('')

  // Триал бесплатный — включается сразу; месяц/год — страница оплаты
  function pickPlan(id) {
    if (id === 'trial') {
      activate('trial')
      toast({
        title: '👑 Premium активирован',
        description: 'Триал 3 дня — все функции Premium без лимитов',
      })
      return
    }
    Linking.openURL(PAY_PAGE_URL).catch(() => {
      toast({
        title: 'Страница оплаты не открылась',
        description: 'Откройте в браузере: popovakatua2013-jpg.github.io/nutribear-expo',
      })
    })
  }

  // Код активации: после оплаты покупатель получает код и вводит его
  // здесь. Код в APK не хранится — сравнивается SHA-256 хэш; активация
  // годовым промо-планом (src/lib/promo-codes.js)
  function redeemCode() {
    const value = code.trim()
    if (!value) return
    if (!isValidPromoCode(value)) {
      toast({
        title: 'Код не подошёл',
        description: 'Проверьте код ещё раз — регистр, пробелы и дефисы не важны',
      })
      return
    }
    setCode('')
    activate('promo')
    toast({
      title: '👑 Premium активирован',
      description: 'Код принят — год Premium без лимитов. Спасибо, что вы с нами!',
    })
  }

  function drop() {
    deactivate()
    toast({ title: 'Premium отключён', description: 'Вернулись на бесплатный тариф' })
  }

  const content = (
    <View className="gap-2" accessibilityLabel="Премиум">
      {pro ? (
        <>
          {/* Активная подписка: статус и отключение */}
          <View className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3">
            <Text className="font-bold text-[15.5px] text-amber-300">
              👑 Premium активна
            </Text>
            <Text className="mt-1 font-sans text-[13.5px] leading-snug text-bear-sub">
              План: {planLabel(plan)}. Лимиты сняты: чат, фото и голос — без
              ограничений. Доступны вся история приёмов, комбо без лимита,
              темы оформления и экспорт отчётов в файл.
            </Text>
          </View>
          <Pressable
            onPress={drop}
            accessibilityRole="button"
            accessibilityLabel="Отключить Premium"
            className="items-center rounded-2xl border border-white/10 bg-white/5 py-3 active:bg-white/10"
          >
            <Text className="font-semibold text-[15.5px] text-bear-sub">
              Отключить Premium
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* Выгоды Premium */}
          <View className="gap-1.5">
            {PREMIUM_PERKS.map((p) => (
              <View key={p.text} className="flex-row items-start gap-2.5 px-1 py-1">
                <Text className="text-[17px]">{p.icon}</Text>
                <View className="min-w-0 flex-1">
                  <Text className="font-semibold text-[14.5px] leading-snug text-bear-text">
                    {p.text}
                  </Text>
                  <Text className="mt-0.5 font-sans text-[12.5px] leading-snug text-bear-sub2">
                    {p.sub}
                  </Text>
                </View>
                <Check size={15} color="#34D399" strokeWidth={2.5} style={{ marginTop: 2 }} />
              </View>
            ))}
          </View>

          {/* Планы: триал включается сразу; месяц/год — страница оплаты */}
          <View className="mt-1 gap-2">
            {PRO_PLANS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pickPlan(p.id)}
                accessibilityRole="button"
                accessibilityLabel={
                  p.id === 'trial'
                    ? `Выбрать: ${p.title} ${p.price}`
                    : `Открыть страницу оплаты: ${p.title} ${p.price}`
                }
                className={`flex-row items-center justify-between rounded-2xl border px-3.5 py-3 active:opacity-80 ${
                  p.best
                    ? 'border-amber-400/40 bg-amber-400/10'
                    : 'border-white/10 bg-white/[0.04]'
                }`}
              >
                <View className="min-w-0 flex-1">
                  <Text className="font-bold text-[15px] text-bear-text">{p.title}</Text>
                  {p.note ? (
                    <Text className="mt-0.5 font-sans text-[12.5px] text-amber-300">{p.note}</Text>
                  ) : null}
                </View>
                <Text className="ml-2 font-bold text-[15px] text-bear-text">{p.price}</Text>
              </Pressable>
            ))}
          </View>

          {/* Код активации: вводится после оплаты на странице */}
          <View className="mt-1 gap-2">
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="Код активации"
              placeholderTextColor={themeColors.dim}
              autoCapitalize="characters"
              autoCorrect={false}
              accessibilityLabel="Ввод кода активации Premium"
              className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-[15px] text-bear-text"
            />
            <Pressable
              onPress={redeemCode}
              accessibilityRole="button"
              accessibilityLabel="Активировать код"
              className={`items-center rounded-2xl border border-amber-400/40 bg-amber-400/10 py-3 active:opacity-80 ${
                code.trim() ? '' : 'opacity-50'
              }`}
            >
              <Text className="font-semibold text-[15.5px] text-amber-300">
                Активировать код
              </Text>
            </Pressable>
          </View>
          <Text className="mt-0.5 px-1 font-sans text-[12px] leading-relaxed text-bear-dim">
            «Месяц» и «Год» открывают страницу оплаты — карта или СБП. После
            оплаты код активации придёт на почту: введите его выше. Триал
            включается сразу, бесплатно.
          </Text>
        </>
      )}
    </View>
  )

  if (embedded) {
    return <View accessibilityLabel="Премиум">{content}</View>
  }

  // Не embedded — отдельной карточкой (например, на главной)
  return (
    <View
      accessibilityLabel="Премиум"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      {content}
    </View>
  )
}
