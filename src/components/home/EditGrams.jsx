// Окно изменения граммовки записи: ккал и БЖУ пересчитываются на лету

import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import { kcalForPortion } from '@/lib/data/foods'
import { bjuForPortion, bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { useFoodStore } from '@/store/useFoodStore'
import { GramsPicker } from './GramsPicker'

export function EditGrams({ visible, onClose, mealId, entry, mealName }) {
  const updateEntryGrams = useFoodStore((s) => s.updateEntryGrams)
  const [grams, setGrams] = useState(100)

  useEffect(() => {
    if (entry) setGrams(entry.grams || 100)
  }, [entry])

  if (!entry) return null

  const gramsNum = Math.max(1, Math.min(2000, Math.round(Number(grams) || 0)))
  const k = gramsNum / (entry.grams || 100)
  const previewKcal = Math.max(1, Math.round(entry.kcal * k))
  const previewBju = bjuForPortion(entry, gramsNum)

  function save() {
    updateEntryGrams(mealId, entry.id, gramsNum)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-center bg-black/60 px-5" onPress={onClose}>
        <Pressable className="rounded-3xl border border-white/10 bg-bear-pop p-5">
          <Text className="font-bold text-[15px] text-bear-text">
            {entry.emoji} {entry.name}
          </Text>
          <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
            Приём: {mealName} · было {entry.grams} г
          </Text>

          <View className="mt-4">
            <GramsPicker grams={String(gramsNum)} onChange={setGrams} />
          </View>

          <View className="mt-4 rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/10 px-4 py-3">
            <View className="flex-row items-center justify-between">
              <Text className="font-sans text-xs text-bear-soft">Итого калорий</Text>
              <Text className="font-extrabold text-[17px] text-white">
                ≈ {formatNum(previewKcal)} ккал
              </Text>
            </View>
            <Text className="mt-1 text-right font-sans text-[11px] text-bear-sub">
              {bjuLine(previewBju)}
            </Text>
          </View>

          <Pressable
            onPress={save}
            className="mt-4 rounded-2xl py-3.5 active:opacity-80"
            style={{ backgroundColor: '#7B6CF6' }}
          >
            <Text className="text-center font-bold text-sm text-white">Сохранить</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
