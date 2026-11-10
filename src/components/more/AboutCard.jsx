// О приложении: краткое описание. Версия и ID сборки переехали вниз
// экрана «Ещё» — отдельной маленькой строкой, как в стандартных
// приложениях (скрины Кати от 10.11).
// Длинные юридические тексты (дисклеймер, политика, соглашение) убраны
// из карточки — по отзыву Кати («если эти данные по закону нужны, можно
// ли переписать их в документы») они теперь живут в отдельном документе-
// окне «Ещё → Правовые документы».
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — содержимое встраивается в строку меню «О приложении»
// (хэш сборки виден прямо в строке — там же, где проверяют обновление).

import { Text, View } from 'react-native'
import { BUILD_HASH } from '@/lib/version'
import { CollapsibleCard } from '../ui/CollapsibleCard'

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
