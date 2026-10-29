// Окно «Исправить блюдо»: открывается с экрана подтверждения (SelectedFood),
// если ИИ распознал неверно. Можно поправить название, калории и БЖУ на 100 г —
// итог за порцию пересчитывается сразу, до добавления в дневник.

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
import { Pencil, Wand2, X } from 'lucide-react-native'
import { estimateBju, bjuForPortion, bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { estimateByName, estimateFromDescription } from '@/lib/food-ai'
import { useFoodStore } from '@/store/useFoodStore'

// Подсказка под заголовком — откуда пришли значения
const SOURCE_HINT = {
  ai: 'значения распознал ИИ — поправьте, что не так',
  off: 'значения из открытой базы продуктов',
}

// Строка инпута → число (запятая тоже работает), с запасным значением
function parseNum(text, fallback, min, max) {
  const n = Number(String(text).trim().replace(',', '.'))
  if (!Number.isFinite(n)) return fallback
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10))
}

export function EditAiFoodModal({ open, onClose, item, grams, onApply }) {
  const [name, setName] = useState(item?.name ?? '')
  const [kcal, setKcal] = useState(
    item?.kcal100 != null ? String(item.kcal100) : ''
  )
  const [p, setP] = useState(item?.p != null ? String(item.p) : '')
  const [f, setF] = useState(item?.f != null ? String(item.f) : '')
  const [c, setC] = useState(item?.c != null ? String(item.c) : '')
  const [fib, setFib] = useState(item?.fib != null && item.fib > 0 ? String(item.fib) : '')
  const [sug, setSug] = useState(item?.sug != null && item.sug > 0 ? String(item.sug) : '')
  const [looking, setLooking] = useState(false)
  const [fillHint, setFillHint] = useState('')
  const [desc, setDesc] = useState(item?.desc ?? '')

  if (!item) return null

  // Пустое поле = оставляем прежнее значение; всё клампится в разумные пределы
  const kcalN = parseNum(kcal, item.kcal100 ?? 100, 1, 2000)
  const bjuN = {
    p: parseNum(p, item.p ?? 0, 0, 100),
    f: parseNum(f, item.f ?? 0, 0, 100),
    c: parseNum(c, item.c ?? 0, 0, 100),
  }
  // клетчатка/сахар на 100 г — учитываются в рейтинге питания
  const fibN = parseNum(fib, item.fib ?? 0, 0, 50)
  const sugN = parseNum(sug, item.sug ?? 0, 0, 100)
  const gramsN = Math.max(1, Math.min(2000, Math.round(Number(grams) || 100)))
  const previewKcal = Math.max(1, Math.round((kcalN * gramsN) / 100))
  const previewBju = bjuForPortion(bjuN, gramsN)

  // Нет точных БЖУ? Раскладываем калории по классической тарелке (20/30/50)
  function applyExampleBju() {
    const est = estimateBju(kcalN)
    setP(String(est.p))
    setF(String(est.f))
    setC(String(est.c))
  }

  // История дневника: если такое блюдо уже ели — берём его КБЖУ (пересчёт на 100 г)
  function findInHistory(query) {
    const norm = (s) => String(s).toLowerCase().replace(/ё/g, 'е').trim()
    const hit = (useFoodStore.getState().history || []).find((h) => norm(h.name) === norm(query))
    if (!hit) return null
    const g = Math.max(1, Number(hit.grams) || 100)
    const per100 = (v) => Math.round(((Number(v) || 0) * 100) / g * 10) / 10
    return {
      kcal100: per100(hit.kcal),
      p: per100(hit.p),
      f: per100(hit.f),
      c: per100(hit.c),
      fib: per100(hit.fib),
      sug: per100(hit.sug),
    }
  }

  // Кнопка «Посчитать КБЖУ»: 1) по составу из описания (бесплатно и точно),
  // 2) по истории дневника, 3) по названию (база → память → ИИ).
  // Технических подсказок пользователю не показываем — только ошибки ввода.
  async function autofill() {
    const q = name.trim()
    const d = desc.trim()
    setLooking(true)
    setFillHint('')
    try {
      // 1) Состав с граммовками («свинина 300 грамм, картошка 500 грамм»)
      const recipe = d ? estimateFromDescription(d) : null
      if (recipe && recipe.kcal100 > 0) {
        setKcal(String(recipe.kcal100))
        setP(String(recipe.p))
        setF(String(recipe.f))
        setC(String(recipe.c))
        setFib(String(recipe.fib ?? 0))
        setSug(String(recipe.sug ?? 0))
        return
      }
      // 2) Название: сначала история дневника
      if (!q) {
        setFillHint(
          'Впишите название или состав с граммовками — например: свинина 300 грамм, картошка 500 грамм'
        )
        return
      }
      const local = findInHistory(q)
      if (local && local.kcal100 > 0) {
        setKcal(String(local.kcal100))
        setP(String(local.p))
        setF(String(local.f))
        setC(String(local.c))
        setFib(String(local.fib ?? 0))
        setSug(String(local.sug ?? 0))
        return
      }
      // 3) Название: встроенная база → память телефона → ИИ
      const est = await estimateByName(q)
      setKcal(String(Math.round(est.kcal100)))
      setP(String(est.p))
      setF(String(est.f))
      setC(String(est.c))
      setFib(String(est.fib ?? 0))
      setSug(String(est.sug ?? 0))
    } catch (e) {
      setFillHint(String(e?.message || e))
    } finally {
      setLooking(false)
    }
  }

  function apply() {
    onApply({
      name: name.trim() || item.name,
      kcal100: kcalN,
      p: bjuN.p,
      f: bjuN.f,
      c: bjuN.c,
      fib: fibN,
      sug: sugN,
      desc: desc.trim(),
    })
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
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
                <Text className="font-bold text-[15px] text-bear-text">
                  Исправить блюдо
                </Text>
                <Text numberOfLines={1} className="font-sans text-[11px] text-bear-sub">
                  {`${item.emoji || '🍽️'} ${SOURCE_HINT[item.source] || 'проверьте значения'}`}
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
              placeholder="Название блюда"
              placeholderTextColor="#5C668A"
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] text-bear-text"
            />

            {/* Автоподстановка КБЖУ по названию: история дневника → ИИ */}
            <Pressable
              onPress={autofill}
              disabled={looking}
              accessibilityRole="button"
              accessibilityLabel="Подставить КБЖУ по названию"
              className="mt-2 flex-row items-center gap-1.5 self-start"
            >
              <Wand2 size={14} color="#7DD3FC" />
              <Text className="text-[12px] font-semibold text-[#7DD3FC]">
                {looking ? 'Считаем КБЖУ…' : 'Посчитать КБЖУ по составу или названию'}
              </Text>
            </Pressable>
            {fillHint ? (
              <Text className="mt-1 text-[11px] leading-[15px] text-bear-sub">{fillHint}</Text>
            ) : null}

            {/* Описание — своими словами (попадёт в дневник) */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Описание (необязательно)
            </Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              maxLength={200}
              multiline
              accessibilityLabel="Описание блюда"
              placeholder="Например: свинина 300 грамм, картошка 500 грамм, свёкла 200 грамм"
              placeholderTextColor="#5C668A"
              className="mt-1.5 min-h-[70px] rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[14px] leading-[19px] text-bear-text"
            />

            {/* Калории на 100 г */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Калории на 100 г
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={kcal}
                onChangeText={setKcal}
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Калории на 100 грамм"
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
              />
              <Text className="shrink-0 font-sans text-sm text-bear-sub">ккал</Text>
            </View>

            {/* БЖУ на 100 г */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Белки · жиры · углеводы на 100 г
            </Text>
            <View className="mt-1.5 flex-row gap-2">
              {[
                { label: 'Б, г', value: p, set: setP },
                { label: 'Ж, г', value: f, set: setF },
                { label: 'У, г', value: c, set: setC },
              ].map((fld) => (
                <View key={fld.label} className="min-w-0 flex-1">
                  <TextInput
                    value={fld.value}
                    onChangeText={fld.set}
                    keyboardType="number-pad"
                    maxLength={5}
                    accessibilityLabel={`${fld.label} на 100 грамм`}
                    className="rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
                  />
                  <Text className="mt-1 text-center font-sans text-[10px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>

            <Pressable
              onPress={applyExampleBju}
              accessibilityRole="button"
              className="mt-2 self-start"
            >
              <Text className="text-[12px] font-semibold text-[#7DD3FC]">
                Не знаете БЖУ? Подставить примерные по калориям
              </Text>
            </Pressable>

            {/* Клетчатка и сахар на 100 г — для рейтинга питания */}
            <Text className="mt-3.5 font-sans text-[11px] font-semibold uppercase text-bear-sub">
              Клетчатка · сахар на 100 г (для рейтинга)
            </Text>
            <View className="mt-1.5 flex-row gap-2">
              {[
                { label: 'клетчатка, г', value: fib, set: setFib },
                { label: 'сахар, г', value: sug, set: setSug },
              ].map((fld) => (
                <View key={fld.label} className="min-w-0 flex-1">
                  <TextInput
                    value={fld.value}
                    onChangeText={fld.set}
                    keyboardType="number-pad"
                    maxLength={5}
                    accessibilityLabel={`${fld.label} на 100 грамм`}
                    placeholder="0"
                    placeholderTextColor="#5C668A"
                    className="rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[14px] text-bear-text"
                  />
                  <Text className="mt-1 text-center font-sans text-[10px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="mt-1.5 font-sans text-[10.5px] leading-[14px] text-bear-dim">
              Необязательно, но с ними рейтинг питания станет точнее
            </Text>

            {/* Живой предпросмотр за порцию */}
            <View className="mt-4 rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/10 px-4 py-3">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-xs text-bear-soft">
                  Порция {gramsN} г
                </Text>
                <Text className="font-extrabold text-[17px] text-white">
                  ≈ {formatNum(previewKcal)}{' '}
                  <Text className="font-medium text-xs text-bear-sub">ккал</Text>
                </Text>
              </View>
              <Text className="mt-1 text-right font-sans text-[11px] text-bear-sub">
                {bjuLine(previewBju)}
              </Text>
            </View>

            {/* Кнопки */}
            <View className="mt-4 flex-row gap-2">
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-3 active:bg-white/10"
              >
                <Text className="text-center font-bold text-sm text-bear-text">
                  Отмена
                </Text>
              </Pressable>
              <Pressable
                onPress={apply}
                accessibilityRole="button"
                className="flex-1 rounded-2xl py-3 active:opacity-80"
                style={{ backgroundColor: '#7B6CF6' }}
              >
                <Text className="text-center font-bold text-sm text-white">Готово</Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
