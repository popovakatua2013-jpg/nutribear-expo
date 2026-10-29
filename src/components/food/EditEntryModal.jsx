// Полный редактор уже добавленной записи (открывается из «Все приёмы за день»):
// название, вес, калории и БЖУ за порцию. Вес меняете — ккал и БЖУ
// пересчитываются пропорционально, пока вы не впишете свои значения вручную.

import { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Pencil, X } from 'lucide-react-native'
import { QUICK_GRAMS } from '@/lib/data/foods'
import { round1 } from '@/lib/data/bju'
import { useFoodStore } from '@/store/useFoodStore'
import { useToast } from '../ui/Toast'

// Строка инпута → число (запятая тоже работает), с запасным значением
function parseNum(text, fallback, min, max) {
  const n = Number(String(text).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10))
}

export function EditEntryModal({ open, onClose, mealId, entry, mealName }) {
  const updateEntry = useFoodStore((s) => s.updateEntry)
  const { toast } = useToast()

  const [name, setName] = useState(entry?.name ?? '')
  const [grams, setGrams] = useState(String(entry?.grams ?? 100))
  const [kcal, setKcal] = useState(String(entry?.kcal ?? 100))
  const [p, setP] = useState(String(entry?.p ?? 0))
  const [f, setF] = useState(String(entry?.f ?? 0))
  const [c, setC] = useState(String(entry?.c ?? 0))
  const [fib, setFib] = useState(entry?.fib ?? 0) // клетчатка/сахар — только пересчёт от граммовки
  const [sug, setSug] = useState(entry?.sug ?? 0)
  // витамины/минералы — тоже только пересчёт от граммовки
  const [micro, setMicro] = useState({
    fe: entry?.fe ?? 0,
    ca: entry?.ca ?? 0,
    k: entry?.k ?? 0,
    mg: entry?.mg ?? 0,
    vitc: entry?.vitc ?? 0,
    vita: entry?.vita ?? 0,
  })
  const [desc, setDesc] = useState(entry?.desc ?? '')
  // Поля, которые пользователь вписал руками (при смене веса не трогаем)
  const [manual, setManual] = useState({ kcal: false, p: false, f: false, c: false })

  if (!entry) return null

  const gramsN = Math.max(1, Math.min(2000, Math.round(Number(String(grams).replace(',', '.')) || 0)))

  // Пропорциональный пересчёт от исходной записи (как в дневнике)
  function changeGrams(text) {
    setGrams(text)
    const g = Math.round(Number(String(text).replace(',', '.')) || 0)
    if (!g || !entry.grams) return
    const k = g / entry.grams
    setKcal((prev) => (manual.kcal ? prev : String(Math.max(1, Math.round(entry.kcal * k)))))
    setP((prev) => (manual.p ? prev : String(round1((entry.p || 0) * k))))
    setF((prev) => (manual.f ? prev : String(round1((entry.f || 0) * k))))
    setC((prev) => (manual.c ? prev : String(round1((entry.c || 0) * k))))
    // клетчатка/сахар и витамины/минералы пересчитываем всегда (полей
    // ручного ввода нет) — иначе в рейтинге останутся значения от старой граммовки
    setFib(round1((entry.fib || 0) * k))
    setSug(round1((entry.sug || 0) * k))
    setMicro({
      fe: round1((entry.fe || 0) * k),
      ca: round1((entry.ca || 0) * k),
      k: round1((entry.k || 0) * k),
      mg: round1((entry.mg || 0) * k),
      vitc: round1((entry.vitc || 0) * k),
      vita: round1((entry.vita || 0) * k),
    })
  }

  function save() {
    const next = {
      name: name.trim() || entry.name,
      grams: gramsN,
      kcal: parseNum(kcal, entry.kcal, 1, 9999),
      p: parseNum(p, entry.p || 0, 0, 999),
      f: parseNum(f, entry.f || 0, 0, 999),
      c: parseNum(c, entry.c || 0, 0, 999),
      fib: Math.max(0, round1(fib || 0)),
      sug: Math.max(0, round1(sug || 0)),
      fe: Math.max(0, round1(micro.fe || 0)),
      ca: Math.max(0, round1(micro.ca || 0)),
      k: Math.max(0, round1(micro.k || 0)),
      mg: Math.max(0, round1(micro.mg || 0)),
      vitc: Math.max(0, round1(micro.vitc || 0)),
      vita: Math.max(0, round1(micro.vita || 0)),
      desc: desc.trim(),
    }
    updateEntry(mealId, entry.id, next)
    toast({
      title: '✏️ Запись обновлена',
      description: `${next.name}: ${next.grams} г · ${next.kcal} ккал · Б ${next.p} · Ж ${next.f} · У ${next.c}`,
    })
    onClose()
  }

  return (
    <Modal visible={open && Boolean(entry)} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60 px-3 pb-3"
      >
        <View className="max-h-[92%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-row items-center gap-2 pr-2">
              <Pencil size={18} color="#6C8CFF" />
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[15px] text-bear-text">Изменить запись</Text>
                <Text numberOfLines={1} className="font-sans text-[11px] text-bear-sub">
                  {`${entry.emoji} ${entry.name} · «${mealName}» · ${entry.time || 'без времени'}`}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} accessibilityLabel="Закрыть" className="p-1">
              <X size={20} color="#8A94B3" />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Название */}
            <Text className="font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Название
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={60}
              accessibilityLabel="Название блюда"
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-bear-text"
            />

            {/* Описание — своими словами */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Описание (необязательно)
            </Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              maxLength={200}
              multiline
              accessibilityLabel="Описание блюда"
              placeholder="Например: борщ на свином бульоне, со сметаной"
              placeholderTextColor="#5C668A"
              className="mt-1.5 min-h-[70px] rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] leading-[19px] text-bear-text"
            />

            {/* Вес порции */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Вес порции
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={grams}
                onChangeText={changeGrams}
                keyboardType="number-pad"
                maxLength={4}
                accessibilityLabel="Вес порции в граммах"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
              />
              <Text className="shrink-0 font-sans text-sm text-bear-sub">г</Text>
            </View>
            <View className="mt-2 flex-row flex-wrap gap-1.5">
              {QUICK_GRAMS.map((v) => (
                <Pressable
                  key={v}
                  onPress={() => changeGrams(String(v))}
                  accessibilityRole="button"
                  className={`rounded-full px-3 py-1 ${gramsN === v ? '' : 'bg-white/5'}`}
                  style={gramsN === v ? { backgroundColor: '#7B6CF6' } : null}
                >
                  <Text
                    className={`font-semibold text-xs ${gramsN === v ? 'text-white' : 'text-bear-sub'}`}
                  >
                    {`${v} г`}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Итого за порцию: калории */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Итого за порцию
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={kcal}
                onChangeText={(t) => {
                  setKcal(t)
                  setManual((m) => ({ ...m, kcal: true }))
                }}
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Калории за порцию"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
              />
              <Text className="shrink-0 font-sans text-sm text-bear-sub">ккал</Text>
            </View>

            {/* Итого за порцию: БЖУ */}
            <View className="mt-2 flex-row gap-2">
              {[
                { label: 'Б, г', value: p, set: setP, key: 'p' },
                { label: 'Ж, г', value: f, set: setF, key: 'f' },
                { label: 'У, г', value: c, set: setC, key: 'c' },
              ].map((fld) => (
                <View key={fld.key} className="min-w-0 flex-1">
                  <TextInput
                    value={fld.value}
                    onChangeText={(t) => {
                      fld.set(t)
                      setManual((m) => ({ ...m, [fld.key]: true }))
                    }}
                    keyboardType="number-pad"
                    maxLength={5}
                    accessibilityLabel={`${fld.label} за порцию`}
                    className="rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
                  />
                  <Text className="mt-1 text-center font-sans text-[10px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>

            <Text className="mt-2 text-[11px] leading-[16px] text-bear-sub">
              Меняете вес — калории и БЖУ пересчитаются сами. Впишете своё значение —
              оно останется как есть.
            </Text>

            <Pressable
              onPress={save}
              accessibilityRole="button"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text className="text-center font-bold text-sm text-white">Сохранить</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
