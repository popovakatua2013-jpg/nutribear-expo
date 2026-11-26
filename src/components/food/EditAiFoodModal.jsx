// Окно «Исправить блюдо»: открывается с экрана подтверждения (SelectedFood),
// если распознавание ошиблось. Правится название, калории и БЖУ на 100 г —
// итог за порцию пересчитывается сразу, до добавления в дневник.
//
// Отзыв Кати 19.11 (скрины 09:59/10:04):
//   1. «Не видно кнопку "пересчитать"» — чип пересчёта теперь сразу
//      под описанием состава, а не текстовой ссылкой над ним;
//   2. «не видно как считает калории, из каких ингредиентов» — под
//      чипом живая расшифровка: каждый продукт, его вес и его ккал
//      (бесплатный локальный разбор estimateFromDescription);
//   3. «убрать не знаете БЖУ...» — подсказка «подставить примерные»
//      убрана, расчёт ведёт чип пересчёта;
//   4. «выход блюда один, а порция другая» — в предпросмотре выход по
//      составу (сумма граммовок) показан отдельной строкой, чип
//      «сделать порцией» переносит его в грамм;
//   5. «клавиатура перекрывает половину окна» — как в «Записать вес»,
//      ручной отступ useKeyboardGuard вместо behavior="height".
//   Клетчатка и сахар подтягиваются сами: они заполняются из состава
//   сразу, не дожидаясь нажатия пересчёта.

import { useEffect, useMemo, useState } from 'react'
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
import { Pencil, TriangleAlert, Wand2, X } from 'lucide-react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { bjuForPortion, bjuLine } from '@/lib/data/bju'
import { formatNum } from '@/lib/format'
import { estimateByName, estimateFromDescription } from '@/lib/food-ai'
import { useFoodStore } from '@/store/useFoodStore'
import { useKeyboardGuard } from '@/lib/useKeyboardGuard'
import { useThemeColors } from '@/lib/use-theme'


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
  const themeColors = useThemeColors()
  const insets = useSafeAreaInsets()
  // Android: собственное окно Modal не ужмётся под клавиатуру сам —
  // считаем отступ сами (тот же приём, что в «Записать вес»)
  const kb = useKeyboardGuard()
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
  // «Порция = выход»: null — порция не трогаем (приходит из грамма на
  // экране подтверждения), число — выбран выход по составу
  const [overrideGrams, setOverrideGrams] = useState(null)

  // Живой разбор состава из описания (бесплатно, без сети): сумма
  // граммовок = выход блюда, каждый ингредиент = своя ккал. Пересобирается
  // при каждом изменении описания — расшифровка всегда актуальна.
  const recipe = useMemo(() => {
    const d = String(desc || '').trim()
    if (!d) return null
    const r = estimateFromDescription(d)
    return r && r.kcal100 > 0 ? r : null
  }, [desc])

  // Клетчатка и сахар подтягиваются сами, но бережно: только пустые
  // поля (вписанное пользователем не перезатираем)
  useEffect(() => {
    if (!recipe) return
    setFib((cur) => (cur || !(recipe.fib > 0) ? cur : String(recipe.fib)))
    setSug((cur) => (cur || !(recipe.sug > 0) ? cur : String(recipe.sug)))
  }, [recipe])

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
  const portionG = overrideGrams ?? gramsN
  const previewKcal = Math.max(1, Math.round((kcalN * portionG) / 100))
  const previewBju = bjuForPortion(bjuN, portionG)

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

  // Чип «Пересчитать КБЖУ»: 1) по составу из описания (бесплатно и точно),
  // 2) по истории дневника, 3) по названию (база → память → ИИ).
  // Технических подсказок пользователю не показываем — только ошибки ввода.
  async function autofill() {
    setLooking(true)
    setFillHint('')
    try {
      // 1) Состав с граммовками («свинина 300 грамм, картошка 500 грамм»)
      if (recipe) {
        setKcal(String(recipe.kcal100))
        setP(String(recipe.p))
        setF(String(recipe.f))
        setC(String(recipe.c))
        setFib(String(recipe.fib ?? 0))
        setSug(String(recipe.sug ?? 0))
        return
      }
      // 2) Название: сначала история дневника
      const q = name.trim()
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
      // «порция = выход»: null — грамм на экране подтверждения не трогаем
      grams: overrideGrams,
    })
    onClose()
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        onLayout={kb.onLayout}
        className="flex-1 justify-end bg-black/60 px-3"
        style={{ paddingBottom: kb.padBottom > 0 ? kb.padBottom + 12 : 12 + insets.bottom }}
      >
        {/* flexShrink: шторка сжимается, если под клавиатуру осталось
            мало места, — скролл внутри, шапка всегда на экране */}
        <View
          className="max-h-[92%] overflow-hidden rounded-3xl border border-bear-line bg-bear-pop"
          style={{ flexShrink: 1 }}
        >
          {/* Шапка: левый блок flex-1 — длинный подзаголовок сжимается,
              а не выталкивает крестик за край окна */}
          <View className="flex-row items-center justify-between border-b border-bear-line px-4 pb-3 pt-4">
            <View className="min-w-0 flex-1 flex-row items-center gap-2 pr-2">
              <Pencil size={20} color={themeColors.link} />
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[20px] text-bear-text">
                  Исправить блюдо
                </Text>
                <Text numberOfLines={1} className="font-sans text-[15px] text-bear-sub">
                  {SOURCE_HINT[item.source] || 'проверьте значения'}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityLabel="Закрыть"
              className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bear-overlay active:bg-bear-overlay2"
            >
              <X hitSlop={10} size={20} color={themeColors.sub} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            style={{ flexShrink: 1 }}
          >
            {/* Название */}
            <Text className="font-sans text-[16px] font-semibold uppercase text-bear-sub">
              Название
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              maxLength={60}
              accessibilityLabel="Название блюда"
              placeholder="Название блюда"
              placeholderTextColor={themeColors.dim}
              className="mt-1 rounded-2xl border border-bear-line bg-bear-overlay px-4 py-2 text-[20px] text-bear-text"
            />

            {/* Описание — своими словами (попадёт в дневник) */}
            <Text className="mt-3 font-sans text-[16px] font-semibold uppercase text-bear-sub">
              Описание (необязательно)
            </Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              maxLength={200}
              multiline
              accessibilityLabel="Описание блюда"
              placeholder="Например: свинина 300 грамм, картошка 500 грамм, свёкла 200 грамм"
              placeholderTextColor={themeColors.dim}
              className="mt-1 min-h-[60px] rounded-2xl border border-bear-line bg-bear-overlay px-4 py-2 text-[20px] leading-[23px] text-bear-text"
            />

            {/* Пересчёт — сразу под составом (отзыв Кати 19.11: кнопку
                «пересчитать» было не видно, теперь это чип на видном месте) */}
            <Pressable
              onPress={autofill}
              disabled={looking}
              accessibilityRole="button"
              accessibilityLabel="Пересчитать КБЖУ по составу или названию"
              className="mt-2 flex-row items-center gap-1.5 self-start rounded-full border border-bear-accentBorder bg-bear-accentFaint px-3.5 py-2 active:opacity-80"
            >
              <Wand2 size={15} color={themeColors.accentSoft} />
              <Text className="text-[16px] font-semibold text-bear-accentSoft">
                {looking ? 'Считаем…' : 'Пересчитать КБЖУ'}
              </Text>
            </Pressable>
            {fillHint ? (
              <Text className="mt-1.5 text-[15px] leading-[17px] text-bear-sub">{fillHint}</Text>
            ) : null}

            {/* Расшифровка расчёта: что и сколько вошло в калории.
                Показывается сразу, как только в описании появился состав */}
            {recipe ? (
              <View className="mt-2.5 rounded-2xl border border-bear-line bg-bear-overlay px-3.5 py-2.5">
                <Text className="font-sans text-[12px] font-semibold uppercase text-bear-sub">
                  Как посчитано
                </Text>
                {recipe.items.map((it) => (
                  <View key={it.name} className="mt-1 flex-row items-center justify-between">
                    <Text numberOfLines={1} className="min-w-0 flex-1 pr-2 font-sans text-[15px] text-bear-soft">
                      {it.name} · {it.grams} г
                    </Text>
                    <Text className="shrink-0 font-sans text-[15px] text-bear-sub">
                      ≈ {formatNum(it.kcal)} ккал
                    </Text>
                  </View>
                ))}
                {/* Нераспознанные позиции: в расчёт не вошли — видно сразу */}
                {recipe.missed.map((m) => (
                  <View key={`${m.name}-${m.grams}`} className="mt-1 flex-row items-center justify-between">
                    <View className="min-w-0 flex-1 flex-row items-center pr-2">
                      <TriangleAlert size={13} color={themeColors.warn} />
                      <Text numberOfLines={1} className="ml-1 min-w-0 flex-1 font-sans text-[15px] text-bear-soft">
                        {`${m.name} · ${m.grams} г`}
                      </Text>
                    </View>
                    <Text className="shrink-0 font-sans text-[13px] text-bear-warn">
                      нет в базе
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Калории на 100 г */}
            <Text className="mt-3 font-sans text-[16px] font-semibold uppercase text-bear-sub">
              Калории на 100 г
            </Text>
            <View className="mt-1 flex-row items-center gap-2">
              <TextInput
                value={kcal}
                onChangeText={setKcal}
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Калории на 100 грамм"
                className="min-w-0 flex-1 rounded-2xl border border-bear-line bg-bear-overlay py-2 text-center text-[20px] text-bear-text"
              />
              <Text className="shrink-0 font-sans text-[19px] text-bear-sub">ккал</Text>
            </View>

            {/* БЖУ на 100 г */}
            <Text className="mt-3 font-sans text-[16px] font-semibold uppercase text-bear-sub">
              Белки · жиры · углеводы на 100 г
            </Text>
            <View className="mt-1 flex-row gap-2">
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
                    className="rounded-2xl border border-bear-line bg-bear-overlay py-2 text-center text-[20px] text-bear-text"
                  />
                  <Text className="mt-1 text-center font-sans text-[16px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Клетчатка и сахар на 100 г — для рейтинга питания */}
            <Text className="mt-3 font-sans text-[16px] font-semibold uppercase text-bear-sub">
              Клетчатка · сахар на 100 г (для рейтинга)
            </Text>
            <View className="mt-1 flex-row gap-2">
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
                    placeholderTextColor={themeColors.dim}
                    className="rounded-2xl border border-bear-line bg-bear-overlay py-2 text-center text-[20px] text-bear-text"
                  />
                  <Text className="mt-1 text-center font-sans text-[16px] text-bear-sub">
                    {fld.label}
                  </Text>
                </View>
              ))}
            </View>
            <Text className="mt-1.5 font-sans text-[15px] leading-[18px] text-bear-dim">
              Необязательно, но с ними рейтинг питания станет точнее
            </Text>

            {/* Живой предпросмотр: выход по составу и порция — разные вещи
                (отзыв Кати 19.11: «выход блюда один, а порция другая») */}
            <View className="mt-4 rounded-2xl border border-bear-accentBorder bg-bear-accentFaint px-4 py-3">
              {recipe ? (
                <View className="mb-1.5 flex-row items-center justify-between">
                  <Text className="font-sans text-[16px] text-bear-soft">
                    Выход по составу ≈ {recipe.weight} г
                  </Text>
                  {recipe.weight !== portionG ? (
                    <Pressable
                      onPress={() => setOverrideGrams(recipe.weight)}
                      accessibilityRole="button"
                      accessibilityLabel="Сделать порцию равной выходу блюда"
                      className="flex-row items-center rounded-full border border-bear-accentBorder bg-bear-accentFaint px-2.5 py-1 active:opacity-80"
                    >
                      <Text className="text-[13px] font-semibold text-bear-accentSoft">
                        сделать порцией
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-[16px] text-bear-soft">
                  Порция {portionG} г
                </Text>
                <Text className="font-extrabold text-[22px] text-white">
                  ≈ {formatNum(previewKcal)}{' '}
                  <Text className="font-medium text-[16px] text-bear-sub">ккал</Text>
                </Text>
              </View>
              <Text className="mt-1 text-right font-sans text-[15px] text-bear-sub">
                {bjuLine(previewBju)}
              </Text>
            </View>

            {/* Кнопки: крестик закрытия — в шапке, здесь только «Готово» */}
            <View className="mt-4 flex-row">
              <Pressable
                onPress={apply}
                accessibilityRole="button"
                className="flex-1 rounded-2xl py-3 active:opacity-80"
                style={{ backgroundColor: themeColors.accent }}
              >
                <Text className="text-center font-bold text-[19px]" style={{ color: themeColors.accentOn }}>
                  Готово
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
