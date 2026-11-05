// Пейволл аудита организма: Premium открывает все 6 систем, редкие диагнозы
// и историю аудитов за неделю. Сейчас — макет с демо-активацией: настоящая
// оплата подключится через RevenueCat после EAS-сборки
// (docs/paywall-revenuecat.md: trial 7 дней / 299 ₽ / 1 490 ₽, entitlement `premium`).

import { useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Check, Shield, X } from 'lucide-react-native'
import { GAME } from './GameUi'
import { PRO_PLANS, useProStore } from '@/store/useProStore'

const FEATURES = [
  'Все 6 систем осмотра: + Мышцы, Нервы и Иммунитет',
  'Редкие диагнозы (шанс 10%) — шутки, которых нет в бесплатной версии',
  'История аудитов за неделю: видно, куда движется организм',
  'Рекомендации по всем системам, а не только по трём',
  'Плюс всё остальное Premium приложения',
]

export function AuditPaywall({ visible, onClose, onActivated }) {
  const [picked, setPicked] = useState('year')
  const activate = useProStore((s) => s.activate)

  const handleActivate = () => {
    activate(picked)
    onClose()
    onActivated?.()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center px-5" style={{ backgroundColor: 'rgba(2,8,5,0.85)' }}>
        <View
          className="w-full rounded-3xl p-5"
          style={{ backgroundColor: GAME.card, borderWidth: 1, borderColor: 'rgba(196,181,253,0.35)' }}
        >
          {/* шапка */}
          <View className="flex-row items-start justify-between gap-2">
            <View className="min-w-0 flex-1 flex-row items-center gap-2.5">
              <View
                className="h-10 w-10 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(196,181,253,0.14)' }}
              >
                <Shield size={22} color="#C4B5FD" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-extrabold text-[20px] tracking-tight" style={{ color: GAME.text }}>
                  Аудит Pro
                </Text>
                <Text className="font-sans text-[14px] leading-snug" style={{ color: GAME.dim }}>
                  полный медосмотр от доктора Топтыгина
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel="Закрыть"
              className="h-9 w-9 items-center justify-center rounded-full"
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
            >
              <X hitSlop={10} size={18} color={GAME.dim} />
            </Pressable>
          </View>

          {/* что входит */}
          <View className="mt-4 gap-2">
            {FEATURES.map((f) => (
              <View key={f} className="flex-row items-start gap-2">
                <View style={{ marginTop: 2 }}>
                  <Check size={17} color={GAME.lime} />
                </View>
                <Text className="flex-1 font-sans text-[15px] leading-snug" style={{ color: GAME.text }}>
                  {f}
                </Text>
              </View>
            ))}
          </View>

          {/* планы */}
          <View className="mt-4 gap-2" accessibilityLabel="Варианты подписки">
            {PRO_PLANS.map((p) => {
              const active = picked === p.id
              return (
                <Pressable
                  key={p.id}
                  onPress={() => setPicked(p.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`Выбрать план: ${p.title}, ${p.price}`}
                  className="flex-row items-center justify-between rounded-2xl border p-3.5"
                  style={{
                    borderColor: active ? 'rgba(196,181,253,0.6)' : 'rgba(255,255,255,0.05)',
                    backgroundColor: active ? 'rgba(196,181,253,0.08)' : GAME.panel,
                  }}
                >
                  <View className="min-w-0 flex-1">
                    <View className="flex-row items-center">
                      <Text className="font-bold text-[17px]" style={{ color: GAME.text }}>
                        {p.title}
                      </Text>
                      {p.best ? (
                        <View className="ml-2 rounded-full px-2 py-0.5" style={{ backgroundColor: 'rgba(250,204,21,0.15)' }}>
                          <Text className="font-bold text-[13px]" style={{ color: GAME.yellow }}>
                            Выгодно
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {p.note ? (
                      <Text className="font-sans text-[13px]" style={{ color: GAME.dim }}>
                        {p.note}
                      </Text>
                    ) : null}
                  </View>
                  <Text className="font-extrabold text-[18px]" style={{ color: GAME.text }}>
                    {p.price}
                  </Text>
                </Pressable>
              )
            })}
          </View>

          {/* кнопка активации */}
          <Pressable onPress={handleActivate} className="mt-4 overflow-hidden rounded-2xl">
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
              <Text className="py-3.5 text-center font-bold text-[18px] text-white">
                Начать бесплатно
              </Text>
            </LinearGradient>
          </Pressable>

          <Text className="mt-2.5 text-center font-sans text-[13px] leading-snug" style={{ color: GAME.dim2 }}>
            Демо-активация: настоящая оплата подключится после сборки приложения
          </Text>
        </View>
      </View>
    </Modal>
  )
}
