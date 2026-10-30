// О приложении: версия, описание, медицинский дисклеймер
// и кнопка «Правовая информация» (политика + соглашение)

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight, FileText } from 'lucide-react-native'
import Constants from 'expo-constants'
import { DISCLAIMER } from '@/lib/data/disclaimer'
import { LegalModal } from '@/components/more/LegalModal'

// Версия из app.json (expo), а не захардкоженная
const VERSION = Constants?.expoConfig?.version || '1.0'

export function AboutCard() {
  const [legalOpen, setLegalOpen] = useState(false)

  return (
    <View accessibilityLabel="О приложении" className="items-center rounded-3xl border border-white/5 bg-bear-card p-5">
      <Text className="text-[34px]">🐻</Text>
      <Text className="mt-2 font-extrabold text-[15px] tracking-tight text-bear-text">
        NutriBear
      </Text>
      <Text className="mt-1 font-semibold text-[11px] text-bear-dim">Версия {VERSION}</Text>
      <Text className="mx-auto mt-2 max-w-[300px] text-center font-sans text-[12px] leading-relaxed text-bear-sub2">
        Дневник питания и активности с мишкой-наставником. Веди дневник,
        пей воду, ходи пешком и получай награды — все данные хранятся
        только на твоём устройстве.
      </Text>
      <View className="mx-auto mt-3 w-full max-w-[300px] border-t border-white/5 pt-3">
        <Text className="text-center font-sans text-[10px] leading-relaxed text-bear-dim">
          {DISCLAIMER}
        </Text>
      </View>

      {/* Правовая информация: политика конфиденциальности + соглашение */}
      <Pressable
        onPress={() => setLegalOpen(true)}
        accessibilityLabel="Открыть правовую информацию"
        accessibilityRole="button"
        className="mt-3 w-full max-w-[300px] flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 active:opacity-80"
      >
        <View className="flex-row items-center">
          <FileText size={16} color="#8DABFF" />
          <Text className="ml-2.5 font-bold text-[13px] text-bear-text">
            Правовая информация
          </Text>
        </View>
        <ChevronRight size={16} color="#A5AECB" />
      </Pressable>

      <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </View>
  )
}