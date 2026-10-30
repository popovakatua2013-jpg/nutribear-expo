// GDPR: экспорт всех данных пользователя (JSON), восстановление из
// копии и описание прав. Персональные данные о здоровье — особая
// категория: пользователь имеет право на переносимость данных
// (экспорт + импорт) и полное удаление (кнопка в «Данных»).

import { Alert, Pressable, Text, View } from 'react-native'
import { FileDown, FileUp, ShieldCheck } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import { readAsStringAsync } from 'expo-file-system/legacy'
import { collectAll, shareJson } from '@/lib/data/gdpr-export'
import { applyBackup } from '@/lib/backup'
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

  // Восстановление из копии: выбор файла → подтверждение → заливка в сторы
  async function importBackup() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ['application/json', 'text/plain', 'application/octet-stream'],
      })
      // Новый API возвращает { canceled, assets: [{ uri }] }, старый — { type: 'success', uri }
      const asset = res?.assets?.[0] || (res?.type === 'success' ? res : null)
      if (!asset || res?.canceled) return
      if (!asset.uri) {
        toast({ title: 'Не удалось открыть файл', description: 'Попробуйте другой файл' })
        return
      }

      const text = await readAsStringAsync(asset.uri)
      let data
      try {
        data = JSON.parse(text)
      } catch {
        toast({ title: 'Файл не распознан', description: 'Это не JSON-копия NutriBear' })
        return
      }

      Alert.alert(
        'Восстановить копию?',
        'Текущие данные будут заменены данными из файла. Действие нельзя отменить.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Восстановить',
            style: 'destructive',
            onPress: () => {
              try {
                applyBackup(data)
                toast({
                  title: '✅ Копия восстановлена',
                  description: 'Данные загружены из файла',
                })
              } catch (e) {
                toast({
                  title: 'Не удалось восстановить',
                  description: e?.message || 'Проверьте, что это копия NutriBear',
                })
              }
            },
          },
        ]
      )
    } catch {
      toast({ title: 'Не удалось прочитать файл' })
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
        выгрузить их, перенести на другой телефон или удалить безвозвратно
        (кнопка «Стереть все данные» ниже — после неё онбординг начнётся
        заново).
      </Text>

      <Pressable
        onPress={exportAll}
        accessibilityRole="button"
        accessibilityLabel="Сохранить копию данных в JSON-файл"
        className="mt-3 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 active:opacity-80"
      >
        <FileDown size={18} color="#38bdf8" />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[13px] text-bear-text">
            Сохранить копию (JSON)
          </Text>
          <Text className="font-sans text-[11px] text-bear-sub2">
            дневник, вода, вес, рецепты, свои продукты, комбо
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={importBackup}
        accessibilityRole="button"
        accessibilityLabel="Восстановить данные из копии"
        className="mt-2 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 active:opacity-80"
      >
        <FileUp size={18} color="#a78bfa" />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[13px] text-bear-text">
            Восстановить из копии
          </Text>
          <Text className="font-sans text-[11px] text-bear-sub2">
            выбрать JSON-файл — например, на новом телефоне
          </Text>
        </View>
      </Pressable>
    </View>
  )
}
