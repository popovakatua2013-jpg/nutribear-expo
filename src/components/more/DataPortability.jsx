// GDPR: экспорт всех данных пользователя (JSON), восстановление из
// копии. Персональные данные о здоровье — особая категория:
// пользователь имеет право на переносимость данных (экспорт + импорт)
// и полное удаление (кнопка в «Данных»).
//
// Простыми словами (отзыв Кати 23.11: «это для разработчика или обычного
// пользователя? — даже я не могу разобраться как это работает»): это
// резервная копия для ОБЫЧНОГО пользователя. «Сохранить» — выгружает один
// файл со всеми данными, его удобно отправить себе в облако/на почту.
// «Восстановить» — читает такой файл и возвращает все данные обратно
// (например, на новом телефоне). Никаких технических знаний не нужно.
// Режим embedded (редизайн «Ещё» в групповое меню): без своей карточки
// и шапки — содержимое встраивается в строку меню «Резервная копия».

import { Alert, Pressable, Text, View } from 'react-native'
import { FileDown, FileUp, ShieldCheck } from 'lucide-react-native'
import * as DocumentPicker from 'expo-document-picker'
import { readAsStringAsync } from 'expo-file-system/legacy'
import { collectAll, shareBackupFile } from '@/lib/data/gdpr-export'
import { applyBackup } from '@/lib/backup'
import { CollapsibleCard } from '../ui/CollapsibleCard'
import { useToast } from '../ui/Toast'

export function DataPortability({ embedded = false }) {
  const { toast } = useToast()

  // Предупреждение перед выгрузкой (аудит 12.11, блокер 3): копия —
  // открытый JSON со всеми данными о здоровье (профиль, замеры, цикл,
  // фото). Пользователь должен знать об этом ДО того, как отправит
  // файл в мессенджер или почту. Шифрование копии (пароль → AES) —
  // отдельная задача после релиза, сейчас честное предупреждение
  function confirmExport() {
    Alert.alert(
      'Файл копии не зашифрован',
      'Копия сохраняется открытым текстом и содержит все данные о здоровье: '
        + 'дневник, вес и замеры, трекер цикла, фото. Храните файл только '
        + 'у себя — например, в личном облаке или на диске телефона. '
        + 'Не отправляйте его в чаты и почту.',
      [
        { text: 'Отмена', style: 'cancel' },
        { text: 'Продолжить', onPress: exportAll },
      ]
    )
  }

  async function exportAll() {
    try {
      const data = await collectAll()
      await shareBackupFile(data)
      toast({
        title: '📦 Данные экспортированы',
        description: 'Сохраните файл на диск — например, в Облако',
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
            onPress: async () => {
              try {
                await applyBackup(data)
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

  const content = (
    <>
      {/* Простое объяснение «что это и зачем» (отзыв Кати 23.11:
          «даже я не могу разобраться как это работает») */}
      <Text className="mt-2 font-sans text-[14.5px] leading-snug text-bear-sub">
        Резервная копия — один файл со всеми вашими данными: дневник, вода,
        вес и замеры, рецепты, свои продукты, фото. Сохраните файл в облако —
        на новом телефоне или после сбоя всё вернётся одним нажатием.
      </Text>

      <Pressable
        onPress={confirmExport}
        accessibilityRole="button"
        accessibilityLabel="Сохранить резервную копию данных"
        className="mt-3 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 active:opacity-80"
      >
        <FileDown size={20} color="#38bdf8" />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[17.5px] text-bear-text">
            Сохранить копию в файл
          </Text>
          <Text className="font-sans text-[15px] text-bear-sub2">
            телефон предложит, куда отправить файл: облако, почта, память
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={importBackup}
        accessibilityRole="button"
        accessibilityLabel="Восстановить данные из резервной копии"
        className="mt-2 flex-row items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3.5 active:opacity-80"
      >
        <FileUp size={20} color="#a78bfa" />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[17.5px] text-bear-text">
            Восстановить из копии
          </Text>
          <Text className="font-sans text-[15px] text-bear-sub2">
            выбрать сохранённый файл — все данные вернутся
          </Text>
        </View>
      </Pressable>
    </>
  )

  // Встроено в строку меню — только содержимое
  if (embedded) {
    return <View accessibilityLabel="Резервная копия">{content}</View>
  }

  return (
    <CollapsibleCard
      storageKey="data-portability"
      accessibilityLabel="Резервная копия"
      icon={<ShieldCheck size={20} color="#4ade80" />}
      title="Резервная копия"
      summary="сохранить · восстановить"
    >
      {content}
    </CollapsibleCard>
  )
}
