// Карточка «Аудит организма» для шеринга: красивый слепок заключения
// доктора Топтыгина — счёт, дата, вердикты систем с фразами. Кнопка
// «Поделиться» снимает карточку в PNG (react-native-view-shot) и
// открывает системное меню — тот же механизм, что у «Итогов недели».
// Бесплатнику закрытые системы видны строками с замком — тизер Premium.

import { useRef, useState } from 'react'
import { Image, Modal, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { captureRef } from 'react-native-view-shot'
import * as Sharing from 'expo-sharing'
import { Lock, Share2, X } from 'lucide-react-native'
import { VERDICT_META } from '@/lib/data/audit'

const BEAR = require('../../../assets/images/bear.webp')
const MAX = 1.25

// Цвет счёта — как вердикт заключения (в AuditCard та же логика)
function scoreMeta(score) {
  return VERDICT_META[score >= 75 ? 'good' : score >= 45 ? 'ok' : 'bad']
}

function VerdictPill({ verdict }) {
  const meta = VERDICT_META[verdict] || VERDICT_META.ok
  return (
    <View
      className="rounded-full px-2 py-0.5"
      style={{ backgroundColor: `${meta.color}1A`, borderWidth: 1, borderColor: `${meta.color}55` }}
    >
      <Text maxFontSizeMultiplier={MAX} className="font-bold text-[12px]" style={{ color: meta.color }}>
        {meta.label}
      </Text>
    </View>
  )
}

// Строка системы: открытая — вердикт + фраза, Premium-система у
// бесплатника — замок и тизер (в PNG тоже, пусть завидуют)
function SystemRow({ s, pro }) {
  if (s.pro && !pro) {
    return (
      <View className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(196,181,253,0.08)' }}>
        <View className="flex-row items-center gap-2">
          <Lock size={14} color="#C4B5FD" />
          <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[14.5px]" style={{ color: '#C4B5FD' }}>
            {s.emoji} {s.name} · Premium
          </Text>
        </View>
      </View>
    )
  }
  return (
    <View className="rounded-xl px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
      <View className="flex-row items-center justify-between gap-2">
        <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[15px]" style={{ color: '#E7F5EC' }}>
          {s.emoji} {s.name}
          {s.rare ? ' ✨' : ''}
        </Text>
        <VerdictPill verdict={s.verdict} />
      </View>
      {!!s.phrase && (
        <Text maxFontSizeMultiplier={MAX} className="mt-0.5 font-medium text-[13px] leading-snug" style={{ color: '#7FA890' }}>
          «{s.phrase}»
        </Text>
      )}
    </View>
  )
}

export function AuditShareCard({ visible, onClose, report, pro = false, dateLabel = '' }) {
  const cardRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function share() {
    if (busy || !cardRef.current || !report) return
    setBusy(true)
    try {
      const uri = await captureRef(cardRef, { result: 'tmpfile', format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: 'Аудит организма · NutriBear',
        })
      }
    } catch {
      // шаринг недоступен или отменён — просто остаёмся на карточке
    } finally {
      setBusy(false)
    }
  }

  const score = report?.score ?? 0
  const meta = scoreMeta(score)
  const systems = report?.systems || []

  return (
    <Modal
      visible={visible && !!report}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-8">
        {/* Карточка для снятия в PNG */}
        <View
          ref={cardRef}
          collapsable={false}
          accessibilityLabel="Карточка аудита для поделиться"
          className="w-full overflow-hidden rounded-3xl"
          style={{ backgroundColor: '#0D1F16', borderWidth: 1, borderColor: 'rgba(74,158,112,0.22)' }}
        >
          <LinearGradient
            colors={['rgba(103,232,249,0.13)', 'rgba(163,230,53,0.05)', 'rgba(13,31,22,0)']}
            style={{ padding: 18 }}
          >
            {/* Шапка: мишка + бренд + дата осмотра */}
            <View className="flex-row items-center gap-2.5">
              <View className="h-9 w-9 overflow-hidden rounded-full border border-white/15 bg-white/5">
                <Image source={BEAR} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              </View>
              <View className="min-w-0 flex-1">
                <Text maxFontSizeMultiplier={MAX} className="font-extrabold text-[17px] leading-tight" style={{ color: '#E7F5EC' }}>
                  NutriBear
                </Text>
                <Text maxFontSizeMultiplier={MAX} className="font-sans text-[12px]" style={{ color: '#7FA890' }}>
                  медосмотр доктора Топтыгина
                </Text>
              </View>
              {!!dateLabel && (
                <View className="rounded-full px-2.5 py-1" style={{ backgroundColor: 'rgba(0,0,0,0.28)', borderWidth: 1, borderColor: 'rgba(74,158,112,0.22)' }}>
                  <Text maxFontSizeMultiplier={MAX} className="font-semibold text-[12px]" style={{ color: '#7FA890' }}>
                    {dateLabel}
                  </Text>
                </View>
              )}
            </View>

            {/* Счёт + вердикт */}
            <View className="mt-3.5 flex-row items-center gap-3">
              <Text maxFontSizeMultiplier={MAX} className="font-extrabold text-[38px] leading-none tracking-tight" style={{ color: meta.color }}>
                {score}
              </Text>
              <View className="min-w-0 flex-1">
                <Text maxFontSizeMultiplier={MAX} className="font-bold text-[12.5px] tracking-[0.08em]" style={{ color: '#64866F' }}>
                  АУДИТ ОРГАНИЗМА
                </Text>
                <View className="mt-1 self-start">
                  <VerdictPill verdict={score >= 75 ? 'good' : score >= 45 ? 'ok' : 'bad'} />
                </View>
              </View>
            </View>

            {/* Заключение */}
            {!!report?.conclusion && (
              <Text maxFontSizeMultiplier={MAX} className="mt-2.5 font-medium text-[15.5px] leading-snug" style={{ color: '#E7F5EC' }}>
                «{report.conclusion}»
              </Text>
            )}

            {/* Системы осмотра */}
            <View className="mt-3 gap-1.5">
              {systems.map((s) => (
                <SystemRow key={s.key} s={s} pro={pro} />
              ))}
            </View>

            {/* Подвал */}
            <Text maxFontSizeMultiplier={MAX} className="mt-3 font-sans text-[11.5px]" style={{ color: 'rgba(100,134,111,0.9)' }}>
              Данные хранятся только на устройстве · NutriBear
            </Text>
          </LinearGradient>
        </View>

        {/* Кнопки под карточкой (в PNG не попадают) */}
        <Pressable
          onPress={share}
          accessibilityRole="button"
          accessibilityLabel="Поделиться карточкой аудита"
          disabled={busy}
          className="mt-4 w-full items-center rounded-2xl py-3.5 active:opacity-80"
          style={{ backgroundColor: '#A3E635' }}
        >
          <View className="flex-row items-center gap-2">
            <Share2 size={19} color="#12200F" />
            <Text className="font-extrabold text-[18px]" style={{ color: '#12200F' }}>
              {busy ? 'Готовим…' : 'Поделиться'}
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрыть карточку аудита"
          className="mt-1 w-full flex-row items-center justify-center gap-1.5 py-3"
        >
          <X size={17} color="#7FA890" />
          <Text className="font-semibold text-[15.5px]" style={{ color: '#7FA890' }}>
            Закрыть
          </Text>
        </Pressable>
      </View>
    </Modal>
  )
}
