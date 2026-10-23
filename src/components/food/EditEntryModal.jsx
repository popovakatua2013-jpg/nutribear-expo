// Модалка «Изменить вес»: черновик граммовки, быстрые кнопки
// и предпросмотр калорий/БЖУ. Калории и БЖУ пересчитываются пропорционально.

import { useState } from 'react'
import { Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Pencil, X } from 'lucide-react-native'
import { QUICK_GRAMS } from '@/lib/data/foods'
import { round1, bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '../ui/Toast'

export function EditEntryModal({ open, onClose, mealId, entry, mealName }) {
  const updateEntryGrams = useFoodStore((s) => s.updateEntryGrams)
  const { toast } = useToast()
  const [grams, setGrams] = useState(String(entry?.grams ?? 100))

  if (!entry) return null

  const g = Math.max(
    1,
    Math.min(2000, Math.round(Number(String(grams).replace(',', '.')) || 0))
  )
  const k = g / (entry.grams || 1)
  const previewKcal = Math.max(1, Math.round(entry.kcal * k))
  // у записи БЖУ хранится на порцию — масштабируем тем же коэффициентом
  const previewBju = {
    p: round1((entry.p || 0) * k),
    f: round1((entry.f || 0) * k),
    c: round1((entry.c || 0) * k),
  }

  function save() {
    if (!grams || g === entry.grams) {
      onClose()
      return
    }
    updateEntryGrams(mealId, entry.id, g)
    toast({
      title: '✏️ Вес обновлён',
      description: `${entry.name}: ${entry.grams} г → ${g} г · ${formatNum(previewKcal)} ккал`,
    })
    onClose()
  }

  return (
    <Modal visible={open && Boolean(entry)} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="rounded-3xl border border-white/10 bg-bear-pop">
          {/* Заголовок */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-row items-center gap-2 pr-2">
              <Pencil size={18} color="#6C8CFF" />
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[15px] text-bear-text">Изменить вес</Text>
                <Text numberOfLines={1} className="font-sans text-[11px] text-bear-sub">
                  {`${entry.emoji} ${entry.name} · «${mealName}»`}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#8A94B3" />
            </Pressable>
          </View>

          <View className="px-5 pb-5 pt-4">
            <View className="flex-row items-center gap-2">
              <TextInput
                accessibilityLabel="Новый вес в граммах"
                keyboardType="number-pad"
                maxLength={4}
                value={grams}
                onChangeText={setGrams}
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center font-semibold text-sm text-bear-text"
              />
              <Text className="shrink-0 font-sans text-sm text-bear-sub">г</Text>
            </View>

            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {QUICK_GRAMS.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => setGrams(String(v))}
                  accessibilityRole="button"
                  className={`rounded-full px-3 py-1 ${g === v ? '' : 'bg-white/5'}`}
                  style={g === v ? { backgroundColor: '#7B6CF6' } : null}
                >
                  <Text
                    className={`font-semibold text-xs ${g === v ? 'text-white' : 'text-bear-sub'}`}
                  >
                    {`${v} г`}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-4 rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/10 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xs text-bear-soft">Станет</Text>
                <Text className="font-extrabold text-[17px] text-white">
                  ≈ {formatNum(previewKcal)}{' '}
                  <Text className="font-medium text-xs text-bear-sub">ккал</Text>
                </Text>
              </View>
              <Text className="mt-1 text-right font-sans text-[11px] text-bear-sub">
                {bjuLine(previewBju)}
              </Text>
            </View>

            <Pressable
              onPress={save}
              accessibilityRole="button"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text className="text-center font-bold text-sm text-white">Сохранить</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}
