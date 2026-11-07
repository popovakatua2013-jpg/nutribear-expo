// О приложении: краткое описание и версия со сборкой (бейдж).
// Длинные юридические тексты (дисклеймер, политика, соглашение) убраны
// из карточки — по отзыву Кати («если эти данные по закону нужны, можно
// ли переписать их в документы») они теперь живут в отдельном документе-
// окне «Ещё → Правовые документы».
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — содержимое встраивается в строку меню «О приложении»
// (хэш сборки виден прямо в строке — там же, где проверяют обновление).

import { Text, View } from 'react-native'
import Constants from 'expo-constants'
import { BUILD_HASH } from '@/lib/version'
import { CollapsibleCard } from '../ui/CollapsibleCard'

// Версия из app.json (expo), а не захардкоженная
const VERSION = Constants?.expoConfig?.version || '1.0'
// Сборка: хэш коммита, который update.ps1 записывает в src/lib/version.js
// при каждом обновлении. 'dev' — копия обновлялась вручную, без скрипта.
const BUILD = BUILD_HASH || 'dev'

export function AboutCard({ embedded = false }) {
  const content = (
    <>
      <Text className="mx-auto mt-1 max-w-[300px] text-center font-sans text-[16.5px] leading-relaxed text-bear-sub2">
        Дневник питания и активности с мишкой-наставником. Веди дневник,
        пей воду, ходи пешком и получай награды — все данные хранятся
        только на твоём устройстве.
      </Text>

      {/* Полная строка версии: бейдж в шапке обрезан до хэша, здесь — целиком */}
      <Text maxFontSizeMultiplier={1.25} className="mt-3 text-center font-sans text-[13px] text-bear-dim">
        Версия {VERSION} · сборка {BUILD}
      </Text>
    </>
  )

  // Встроено в строку меню — только содержимое (хэш сборки — в строке меню)
  if (embedded) {
    return <View accessibilityLabel="О приложении">{content}</View>
  }

  return (
    <CollapsibleCard
      storageKey="about"
      accessibilityLabel="О приложении"
      icon={<Text className="text-[26px]">🐻</Text>}
      title="NutriBear"
      summary={`сборка ${BUILD}`}
    >
      {content}
    </CollapsibleCard>
  )
}
