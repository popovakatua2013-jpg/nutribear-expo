// Подсказка «Консоль на компьютере»: что в терминале выглядит
// страшно, но является нормой. Разворачиваемый список — по умолчанию
// свёрнут, чтобы не занимать место. Помогает тем, кто запускает
// приложение через update.bat / npx expo start и пугается логов.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ChevronDown, ChevronUp, Terminal } from 'lucide-react-native'
import { animateExpandCollapse } from '@/lib/anim'

// «Что написано» → «что это значит»
const ITEMS = [
  [
    'npm audit / «уязвимости»',
    'Отчёт о пакетах для веб-серверов, а не про это приложение. На работу в Expo Go не влияет.',
  ],
  [
    'npm warn / deprecated',
    'Предупреждения о старых пакетах внутри зависимостей. Приложение от этого не ломается.',
  ],
  [
    'dev client · expo.fyi/dev-client',
    'Пояснение Expo о версии клиента, а не ошибка.',
  ],
  [
    'PS C:\\...> в начале строки',
    'Просто приглашение PowerShell — место, куда вводят команды. Случайно вставленный текст, на который консоль «ругается», ничему не вредит: нажмите Enter и продолжайте.',
  ],
  [
    'Port 8081 / Bundling / Waiting',
    'Сервер запущен и собирает приложение — так и должно быть, дождитесь надписи в окне Expo Go.',
  ],
]

export function ConsoleHelpCard() {
  const [open, setOpen] = useState(false)

  const toggle = () => {
    animateExpandCollapse()
    setOpen((v) => !v)
  }

  return (
    <View
      accessibilityLabel="Подсказка про сообщения в консоли"
      className="rounded-3xl border border-white/5 bg-bear-card p-5"
    >
      <Pressable
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={
          open ? 'Свернуть подсказку про консоль' : 'Развернуть подсказку про консоль'
        }
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <View className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#8DABFF]/15">
          <Terminal size={19} color="#8DABFF" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[14px] leading-snug text-bear-text">
            Консоль на компьютере
          </Text>
          <Text className="mt-0.5 font-sans text-[11px] leading-snug text-bear-sub">
            Какие строки в чёрном окне можно спокойно игнорировать
          </Text>
        </View>
        {open ? (
          <ChevronUp size={16} color="#98A2C2" />
        ) : (
          <ChevronDown size={16} color="#98A2C2" />
        )}
      </Pressable>

      {open && (
        <View className="mt-3 gap-2.5">
          {ITEMS.map(([what, why]) => (
            <View key={what} className="rounded-xl bg-white/[0.04] px-3 py-2.5">
              <Text className="font-semibold text-[12px] text-bear-bright">{what}</Text>
              <Text className="mt-0.5 font-sans text-[11px] leading-snug text-bear-sub">{why}</Text>
            </View>
          ))}
          <Text className="font-sans text-[11px] leading-snug text-bear-dim">
            Настоящая ошибка обычно красная и останавливает сервер. Лечится просто: закройте окно
            и запустите update.bat заново.
          </Text>
        </View>
      )}
    </View>
  )
}
