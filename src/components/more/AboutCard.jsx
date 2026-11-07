// О приложении: версия, сборка (бейдж), описание, медицинский дисклеймер
// и кнопка «Правовая информация» (политика + соглашение)

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronRight, FileText } from 'lucide-react-native'
import Constants from 'expo-constants'
import { DISCLAIMER } from '@/lib/data/disclaimer'
import { BUILD_HASH } from '@/lib/version'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { LegalModal } from '@/components/more/LegalModal'

// Версия из app.json (expo), а не захардкоженная
const VERSION = Constants?.expoConfig?.version || '1.0'
// Сборка: хэш коммита, который update.ps1 записывает в src/lib/version.js
// при каждом обновлении. 'dev' — копия обновлялась вручную, без скрипта.
const BUILD = BUILD_HASH || 'dev'

export function AboutCard() {
  const [legalOpen, setLegalOpen] = useState(false)

  return (
    <CollapsibleCard
      storageKey="about"
      accessibilityLabel="О приложении"
      icon={<Text className="text-[26px]">🐻</Text>}
      title="NutriBear"
      summary={`сборка ${BUILD}`}
    >
      <Text className="mx-auto mt-1 max-w-[300px] text-center font-sans text-[16.5px] leading-relaxed text-bear-sub2">
        Дневник питания и активности с мишкой-наставником. Веди дневник,
        пей воду, ходи пешком и получай награды — все данные хранятся
        только на твоём устройстве.
      </Text>
      <View className="mx-auto mt-3 w-full max-w-[300px] border-t border-white/5 pt-3">
        <Text className="text-center font-sans text-[15px] leading-relaxed text-bear-dim">
          {DISCLAIMER}
        </Text>
      </View>

      {/* Полная строка версии: бейдж в шапке обрезан до хэша, здесь — целиком */}
      <Text maxFontSizeMultiplier={1.25} className="mt-3 text-center font-sans text-[13px] text-bear-dim">
        Версия {VERSION} · сборка {BUILD}
      </Text>

      {/* Правовая информация: политика конфиденциальности + соглашение */}
      <Pressable
        onPress={() => setLegalOpen(true)}
        accessibilityLabel="Открыть правовую информацию"
        accessibilityRole="button"
        className="mt-3 w-full max-w-[300px] flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 active:opacity-80"
      >
        <View className="flex-row items-center">
          <FileText size={18} color="#8DABFF" />
          <Text className="ml-2.5 font-bold text-[17.5px] text-bear-text">
            Правовая информация
          </Text>
        </View>
        <ChevronRight size={18} color="#A5AECB" />
      </Pressable>

      <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </CollapsibleCard>
  )
}