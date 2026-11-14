// Карточка «Премиум» для вкладки «Ещё»: выгоды подписки и активация
// планов (триал 3 дня / месяц 299 ₽ / год 1 490 ₽ из useProStore).
// Этап 1 монетизации (матрица 14.11): оплата пока демо-локальная —
// настоящие покупки (RevenueCat + Play Billing) подключим на этапе 3,
// планы и сроки те же, чтобы логика не менялась (см. useProStore).
//
// Режим embedded: содержимое встраивается в строку меню «Премиум»
// (как CompanionCard, CycleCard и пр.).

import { Pressable, Text, View } from 'react-native'
import { Check } from 'lucide-react-native'
import { PRO_PLANS, useProStore } from '@/store/useProStore'
import { PREMIUM_PERKS } from '@/lib/entitlements'
import { useToast } from '@/components/ui/Toast'

// Подпись статуса для строки меню
export function premiumStatusValue(pro, plan) {
  if (!pro) return '299 ₽/мес'
  return plan === 'trial' ? 'триал 3 дня' : 'активна'
}

export function PremiumCard({ embedded = false }) {
  const pro = useProStore((s) => s.pro)
  const plan = useProStore((s) => s.plan)
  const activate = useProStore((s) => s.activate)
  const deactivate = useProStore((s) => s.deactivate)
  const { toast } = useToast()

  function pickPlan(id) {
    activate(id)
    toast({
      title: '👑 Premium активирован',
      description:
        id === 'trial'
          ? 'Триал 3 дня — все функции Premium без лимитов'
          : 'Все лимиты сняты: чат, фото и голос — без ограничений',
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
          {/* Активная подписка: статус и демо-отключение */}
          <View className="rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3.5 py-3">
            <Text className="font-bold text-[15.5px] text-amber-300">
              👑 Premium активна
            </Text>
            <Text className="mt-1 font-sans text-[13.5px] leading-snug text-bear-sub">
              План: {plan === 'trial' ? 'триал 3 дня' : plan === 'month' ? 'месяц — 299 ₽' : 'год — 1 490 ₽'}.{' '}
              Лимиты сняты: чат, фото и голос — без ограничений.
            </Text>
          </View>
          <Pressable
            onPress={drop}
            accessibilityRole="button"
            accessibilityLabel="Отключить Premium (демо-активация)"
            className="items-center rounded-2xl border border-white/10 bg-white/5 py-3 active:bg-white/10"
          >
            <Text className="font-semibold text-[15.5px] text-bear-sub">
              Отключить (демо-активация)
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

          {/* Планы: триал / месяц / год */}
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

          <Text className="mt-0.5 px-1 font-sans text-[12px] leading-relaxed text-bear-dim">
            Демо-режим оплаты: активация работает без денег — для теста.
            Настоящие покупки (Google Play) подключим в одном из следующих
            обновлений, цены не изменятся.
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
