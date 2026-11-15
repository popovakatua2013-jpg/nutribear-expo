// Карточка «Премиум» для вкладки «Ещё»: выгоды подписки и активация
// планов (триал 3 дня / месяц 299 ₽ / год 1 490 ₽ из useProStore).
//
// Два режима оплаты (решение Кати 15.11, релизный блокер RuStore):
//   demo — прежнее поведение локальной разработки: активация без денег
//          с честной подписью «Демо-режим оплаты». EXPO_PUBLIC_PAYMENTS_MODE
//          не задан (локальный запуск, тесты).
//   release — сборки для установки и магазина (build-apk.yml ставит
//          EXPO_PUBLIC_PAYMENTS_MODE=release): кнопки «активировать без
//          оплаты» не активируют ничего — показывают честный ответ
//          «оплата подключается в следующем обновлении», вместо них
//          промокод для первых пользователей (src/lib/promo-codes.js,
//          в APK хэши, сами коды не хранятся). Так модерация не видит
//          кнопку «покупка без оплаты», а первые пользователи получают
//          Premium уже до подключения RevenueCat (этап 3).
//
// Режим embedded: содержимое встраивается в строку меню «Премиум»
// (как CompanionCard, CycleCard и пр.).

import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { PRO_PLANS, useProStore } from '@/store/useProStore'
import { PREMIUM_PERKS } from '@/lib/entitlements'
import { getPaymentsMode, isValidPromoCode } from '@/lib/promo-codes'
import { useToast } from '@/components/ui/Toast'

// Подпись статуса для строки меню
export function premiumStatusValue(pro, plan) {
  if (!pro) return '299 ₽/мес'
  if (plan === 'trial') return 'триал 3 дня'
  if (plan === 'promo') return 'промо'
  return 'активна'
}

// Человекочитаемое название плана для строки «План: …»
function planLabel(plan) {
  if (plan === 'trial') return 'триал 3 дня'
  if (plan === 'month') return 'месяц — 299 ₽'
  if (plan === 'promo') return 'промо — подарок на год'
  return 'год — 1 490 ₽'
}

export function PremiumCard({ embedded = false }) {
  const pro = useProStore((s) => s.pro)
  const plan = useProStore((s) => s.plan)
  const activate = useProStore((s) => s.activate)
  const deactivate = useProStore((s) => s.deactivate)
  const { toast } = useToast()

  // Режим оплаты фиксируется на этапе сборки (env инлайнится в бандл)
  const release = getPaymentsMode() === 'release'
  const [promo, setPromo] = useState('')

  function pickPlan(id) {
    if (release) {
      toast({
        title: 'Оплата — в следующем обновлении',
        description: 'Оплата картой подключается прямо сейчас, цены не изменятся. А пока Premium включается промокодом ниже',
      })
      return
    }
    activate(id)
    toast({
      title: '👑 Premium активирован',
      description:
        id === 'trial'
          ? 'Триал 3 дня — все функции Premium без лимитов'
          : 'Лимиты сняты, а ИИ-меню на неделю и разбор недели уже ждут',
    })
  }

  // Промокод для первых пользователей (релизный режим). Код в APK не
  // хранится — сравнивается хэш; активация годовым промо-планом
  function redeemPromo() {
    const code = promo.trim()
    if (!code) return
    if (!isValidPromoCode(code)) {
      toast({
        title: 'Промокод не подошёл',
        description: 'Проверьте код ещё раз — регистр и дефисы не важны',
      })
      return
    }
    setPromo('')
    activate('promo')
    toast({
      title: '👑 Premium активирован',
      description: 'Промокод принят — год Premium без лимитов. Спасибо, что вы с нами с самого начала!',
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
              План: {planLabel(plan)}. Лимиты сняты: чат, фото и голос — без ограничений.
              Доступны ИИ-меню на неделю и разбор недели от напарника.
            </Text>
          </View>
          <Pressable
            onPress={drop}
            accessibilityRole="button"
            accessibilityLabel={release ? 'Отключить Premium' : 'Отключить Premium (демо-активация)'}
            className="items-center rounded-2xl border border-white/10 bg-white/5 py-3 active:bg-white/10"
          >
            <Text className="font-semibold text-[15.5px] text-bear-sub">
              {release ? 'Отключить Premium' : 'Отключить (демо-активация)'}
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

          {/* Планы: триал / месяц / год. В релизном режиме без оплаты —
              честный ответ, в демо — прежняя локальная активация */}
          <View className="mt-1 gap-2">
            {PRO_PLANS.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => pickPlan(p.id)}
                accessibilityRole="button"
                accessibilityLabel={`Выбрать: ${p.title} ${p.price}`}
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

          {release ? (
            <>
              {/* Промокод первых пользователей: место демо-кнопки */}
              <View className="mt-1 gap-2">
                <TextInput
                  value={promo}
                  onChangeText={setPromo}
                  placeholder="Промокод"
                  placeholderTextColor="#8B96B8"
                  autoCapitalize="characters"
                  autoCorrect={false}
                  accessibilityLabel="Ввод промокода Premium"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-3 text-[15px] text-bear-text"
                />
                <Pressable
                  onPress={redeemPromo}
                  accessibilityRole="button"
                  accessibilityLabel="Активировать промокод"
                  className={`items-center rounded-2xl border border-amber-400/40 bg-amber-400/10 py-3 active:opacity-80 ${
                    promo.trim() ? '' : 'opacity-50'
                  }`}
                >
                  <Text className="font-semibold text-[15.5px] text-amber-300">
                    Активировать промокод
                  </Text>
                </Pressable>
              </View>
              <Text className="mt-0.5 px-1 font-sans text-[12px] leading-relaxed text-bear-dim">
                Оплата картой подключается в следующем обновлении — цены не изменятся.
                Первым пользователям Premium включается промокодом.
              </Text>
            </>
          ) : (
            <Text className="mt-0.5 px-1 font-sans text-[12px] leading-relaxed text-bear-dim">
              Демо-режим оплаты: активация работает без денег — для теста.
              Настоящие покупки (Google Play) подключим в одном из следующих
              обновлений, цены не изменятся.
            </Text>
          )}
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
