// GDPR: экспорт всех данных пользователя (JSON) и описание прав.
// Персональные данные о здоровье — особая категория: пользователь
// имеет право на экспорт и полное удаление (кнопка в «Данных»).

import { Pressable, Text, View } from 'react-native'
import { FileDown, ShieldCheck } from 'lucide-react-native'
import { collectAll, shareJson } from '@/lib/data/gdpr-export'
import { useToast } from '../ui/Toast'

export function DataPortability() {
  const { toast } = useToast()

  async function exportAll() {
    try {
      const data = collectAll()
      const stamp = new Date().toISOString().slice(0, 10)
      await shareJson(`nutribear-export-${stamp}.json`, data)
      toast({
        title: '📦 Данные экспортированы',
        description: 'Отправьте JSON в заметки или сохраните в файл',
      })
    } catch {
      toast({ title: 'Не удалось поделиться данными' })
    }
  }

  return (
    <View accessibilityLabel="Приватность" className="rounded-3xl border border-white/5 bg-bear-card p-5">
      <View className="flex-row items-center gap-2">
        <ShieldCheck size={18} color="#4ade80" />
        <Text className="font-bold text-[15px] tracking-tight text-bear-text">
          Приватность (GDPR / 152-ФЗ)
        </Text>
      </View>

      <Text className="mt-2 font-sans text-[11px] leading-relaxed text-bear-sub2">
        Ваши данные о здоровье — особая категория. Они хранятся только на
        устройстве и не передаются в сеть. Вы можете в любой момент
        выгрузить их или удалить безвозвратно (кнопка «Стереть все
        данные» ниже — после неё онбординг начнётся заново).
      </Text>

      <Pressable
        onPress={exportAll}
        className="mt-3 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 active:opacity-80"
      >
        <FileDown size={18} color="#38bdf8" />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[13px] text-bear-text">
            Экспорт всех данных (JSON)
          </Text>
          <Text className="font-sans text-[11px] text-bear-sub2">
            профиль, дневник, активность, монетки
          </Text>
        </View>
      </Pressable>
    </View>
  )
}
