// Этап 9. Пейволл (freemium): показывается на пике мотивации —
// сразу после «раскрытия» плана. Сейчас все функции открыты бесплатно.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Check } from 'lucide-react-native'
import { ObShell } from './ObShell'

const PLANS = [
  { id: 'trial', title: 'Триал 7 дней', price: 'Бесплатно', note: 'все функции Premium' },
  { id: 'month', title: 'Месяц', price: '299 ₽', note: '' },
  { id: 'year', title: 'Год', price: '1 490 ₽', note: 'скидка 50%', best: true },
]

const FEATURES = ['База Open Food Facts без лимитов', 'Коучинговые подсказки мишки', 'Экспорт отчётов и истории']

export function PaywallStep({ onNext, onBack }) {
  const [picked, setPicked] = useState('trial')

  return (
    <ObShell
      sub="Шаг 9 из 12"
      title="NutriBear Premium"
      onBack={onBack}
      footer={
        <View className="gap-2.5">
          <Pressable onPress={onNext} className="overflow-hidden rounded-2xl">
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
              <Text className="py-3.5 text-center font-bold text-[15px] text-white">
                Начать бесплатно
              </Text>
            </LinearGradient>
          </Pressable>
          <Pressable onPress={onNext} className="py-2.5">
            <Text className="text-center font-semibold text-[13px] text-bear-sub2">
              Пропустить
            </Text>
          </Pressable>
        </View>
      }
    >
      <View className="gap-4">
        <View className="gap-1.5">
          {FEATURES.map((f) => (
            <View key={f} className="flex-row items-center gap-2">
              <Check size={16} color="#4ade80" />
              <Text className="min-w-0 flex-1 font-sans text-[13px] text-[#aab4d4]">{f}</Text>
            </View>
          ))}
        </View>

        <View className="gap-2.5" accessibilityLabel="Варианты подписки">
          {PLANS.map((p) => {
            const active = picked === p.id
            return (
              <Pressable
                key={p.id}
                onPress={() => setPicked(p.id)}
                className={`flex-row items-center justify-between rounded-2xl border p-4 ${
                  active ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10' : 'border-white/5 bg-bear-card'
                }`}
              >
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center">
                    <Text className="font-bold text-[14px] text-bear-text">{p.title}</Text>
                    {p.best ? (
                      <View className="ml-2 rounded-full bg-amber-400/15 px-2 py-0.5">
                        <Text className="font-bold text-[10px] text-amber-300">Выгодно</Text>
                      </View>
                    ) : null}
                  </View>
                  {p.note ? (
                    <Text className="font-sans text-[11px] text-bear-sub2">{p.note}</Text>
                  ) : null}
                </View>
                <Text className="font-extrabold text-[15px] text-bear-text">{p.price}</Text>
              </Pressable>
            )
          })}
        </View>

        <Text className="text-center font-sans text-[10px] text-bear-dim">
          Сейчас все функции открыты бесплатно — оплата появится в обновлениях
        </Text>
      </View>
    </ObShell>
  )
}
