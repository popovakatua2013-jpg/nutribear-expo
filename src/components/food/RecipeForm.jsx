// Форма создания своего рецепта: название, состав продуктов с граммовками
// (по нему кнопка «Посчитать КБЖУ» сама оценивает калории и БЖУ всего
// выхода — бесплатно, без ИИ-запроса), общий выход (г), число порций,
// калорийность и БЖУ всего веса, фото блюда (по желанию). БЖУ
// необязательно — если не указать, они будут оценены по калорийности.
// На выходе — значения на 100 г для дневника; порция по умолчанию
// при добавлении в приём пищи равна выходу, делённому на число порций.

import { useState } from 'react'
import { Image, Pressable, Text, TextInput, View } from 'react-native'
import { ImagePlus, Trash2, Wand2, X } from 'lucide-react-native'
import * as ImagePicker from 'expo-image-picker'
import { useRecipesStore, gramsPerServing } from '@/store/useRecipesStore'
import { saveRecipePhoto, deletePhotoFile } from '@/lib/photos'
import { estimateFromDescription } from '@/lib/food-ai'
import { toRecipeTotals, recipeItemsLine } from '@/lib/data/recipe-est'
import { useToast } from '../ui/Toast'

const num = (v) => Math.max(1, Math.round(Number(String(v).replace(',', '.')) || 0))

const field =
  'rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-bear-text'

export function RecipeForm({ onDone, initial, onCancel }) {
  const add = useRecipesStore((s) => s.add)
  const update = useRecipesStore((s) => s.update)
  const { toast } = useToast()

  // initial задан — редактируем существующий рецепт (поля предзаполнены)
  const editing = Boolean(initial && initial.id)
  const [name, setName] = useState(initial ? initial.name : '')
  const [grams, setGrams] = useState(initial ? String(initial.grams) : '')
  const [servings, setServings] = useState(initial ? String(initial.servings || 1) : '1')
  const [kcal, setKcal] = useState(
    initial ? String(Math.round((initial.kcal100 * initial.grams) / 100)) : ''
  )
  const [p, setP] = useState(
    initial && initial.p100 ? String(Math.round((initial.p100 * initial.grams) / 100)) : ''
  )
  const [f, setF] = useState(
    initial && initial.f100 ? String(Math.round((initial.f100 * initial.grams) / 100)) : ''
  )
  const [c, setC] = useState(
    initial && initial.c100 ? String(Math.round((initial.c100 * initial.grams) / 100)) : ''
  )
  // photo: null — «сниму фото при сохранении» (старое удалится), uri — новое
  const [photo, setPhoto] = useState(initial?.photo || null)
  const [photoBusy, setPhotoBusy] = useState(false)
  // Состав — продукты с граммовками; по нему считаем КБЖУ всего выхода
  const [desc, setDesc] = useState('')

  const g = num(grams)
  const sv = Math.max(1, Math.min(24, Math.round(Number(servings.replace(',', '.')) || 1)))
  const total = num(kcal)
  const per100 = grams && kcal ? Math.round((total / g) * 100) : null
  const perServing = grams && kcal ? Math.round(total / sv) : null
  const ready = name.trim() && grams && kcal

  async function pickPhoto() {
    if (photoBusy) return
    setPhotoBusy(true)
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (!perm?.granted) {
        toast({
          title: '📷 Нужно разрешение',
          description: 'Разрешите доступ к фото в настройках телефона',
        })
        return
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.5,
        exif: false,
      })
      if (!res.canceled && res.assets?.[0]?.uri) {
        const uri = await saveRecipePhoto(res.assets[0].uri)
        if (photo) await deletePhotoFile(photo) // прежний файл больше не нужен
        setPhoto(uri)
      }
    } catch {
      toast({ title: '📷 Фото не получилось', description: 'Попробуйте другой снимок' })
    } finally {
      setPhotoBusy(false)
    }
  }

  async function dropPhoto() {
    if (photo) await deletePhotoFile(photo)
    setPhoto(null)
  }

  // «Посчитать КБЖУ по составу»: разбираем текст состава на ингредиенты
  // (локальная база продуктов, бесплатно), пересчитываем на весь выход и
  // подставляем в поля. Выход (г) трогаем, только если он ещё не введён.
  function estimateByComposition() {
    if (!desc.trim()) {
      toast({
        title: '🪄 Нужен состав',
        description: 'Напишите продукты с граммовками — например: свинина 300 грамм, картошка 500 грамм',
      })
      return
    }
    const est = estimateFromDescription(desc)
    const totals = toRecipeTotals(est)
    if (!totals) {
      toast({
        title: '🪄 Состав не распознан',
        description: 'Пишите так: «лук 50 грамм» или «300 грамм свинины» — известные нам продукты посчитаются сами',
      })
      return
    }
    if (!grams) setGrams(String(totals.weight))
    setKcal(String(totals.kcal))
    setP(String(totals.p))
    setF(String(totals.f))
    setC(String(totals.c))
    const line = recipeItemsLine(est.items)
    toast({
      title: `🪄 Считаем по составу${line ? `: ${line}` : ''}`,
      description: `≈ ${totals.kcal} ккал на весь вес продуктов${grams ? '' : `, выход ≈ ${totals.weight} г`} — поправьте, если нужно`,
    })
  }

  function handleSave() {
    if (!ready) return
    // Пустое БЖУ остаётся пустым (оценится по калорийности), а не «1 грамм»
    const data = {
      name: name.trim(),
      grams: g,
      servings: sv,
      photo, // uri нового фото | null — «без фото» | прежний uri
      totalKcal: total,
      totalP: p.trim() ? num(p) : 0,
      totalF: f.trim() ? num(f) : 0,
      totalC: c.trim() ? num(c) : 0,
    }
    const where = `· ${sv === 1 ? '1 порция' : `${sv} порции по ${Math.round(g / sv)} г`}`
    if (editing) {
      update(initial.id, data)
      toast({
        title: `🍴 Рецепт «${data.name}» изменён`,
        description: `${g} г · ${total} ккал (${per100} ккал / 100 г) ${where}`,
      })
    } else {
      add(data)
      toast({
        title: `🍴 Рецепт «${data.name}» сохранён`,
        description: `${g} г · ${total} ккал (${per100} ккал / 100 г) ${where}`,
      })
    }
    onDone()
  }

  return (
    <View className="rounded-2xl border border-[#5B7FFF]/25 bg-[#5B7FFF]/5 p-4">
      {/* Шапка: что делаем + крестик закрытия (только в режиме изменения) */}
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="font-semibold text-[11px] uppercase tracking-wide text-bear-link">
          {editing ? 'Изменение рецепта' : 'Новый рецепт'}
        </Text>
        {editing && (
          <Pressable
            onPress={onCancel}
            accessibilityRole="button"
            accessibilityLabel="Отменить изменение рецепта"
            className="p-1 active:opacity-70"
          >
            <X size={18} color="#A5AECB" />
          </Pressable>
        )}
      </View>

      {/* Название + фото блюда */}
      <View className="flex-row gap-2">
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Название рецепта"
          placeholderTextColor="#8B96B8"
          accessibilityLabel="Название рецепта"
          className={`${field} min-w-0 flex-1`}
        />
        <Pressable
          onPress={pickPhoto}
          disabled={photoBusy}
          accessibilityRole="button"
          accessibilityLabel="Прикрепить фото блюда"
          className="h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl active:opacity-80"
          style={{ backgroundColor: '#5B7FFF' }}
        >
          {photo ? (
            <Image source={{ uri: photo }} className="h-full w-full rounded-2xl" />
          ) : (
            <ImagePlus size={18} color="#FFFFFF" />
          )}
        </Pressable>
      </View>
      {photo && (
        <View className="mt-1.5 flex-row items-center gap-2 px-1">
          <Text className="min-w-0 flex-1 font-sans text-[10px] text-bear-dim">
            Фото прикреплено — появится рядом с рецептом в списке
          </Text>
          <Pressable
            onPress={dropPhoto}
            accessibilityRole="button"
            accessibilityLabel="Убрать фото"
            className="flex-row items-center gap-1 rounded p-1"
          >
            <Trash2 size={12} color="#98A2C2" />
            <Text className="font-sans text-[10px] text-bear-sub">убрать</Text>
          </Pressable>
        </View>
      )}

      {/* Состав продуктов с граммовками — по нему считаем КБЖУ */}
      <View className="mt-2">
        <TextInput
          value={desc}
          onChangeText={setDesc}
          maxLength={300}
          multiline
          accessibilityLabel="Состав рецепта"
          placeholder="Состав: свинина 300 грамм, картошка 500 грамм…"
          placeholderTextColor="#8B96B8"
          className={`${field} min-h-[64px]`}
        />
        <Pressable
          onPress={estimateByComposition}
          accessibilityRole="button"
          accessibilityLabel="Посчитать калории и БЖУ по составу"
          className="mt-1.5 flex-row items-center gap-1.5 self-start px-1 py-0.5 active:opacity-70"
        >
          <Wand2 size={14} color="#7DD3FC" />
          <Text className="font-semibold text-[12px] text-[#7DD3FC]">
            Посчитать КБЖУ по составу
          </Text>
        </Pressable>
        <Text className="mt-1 px-1 font-sans text-[10px] leading-[14px] text-bear-dim">
          Известные продукты посчитаем сами — калории и БЖУ встанут в поля ниже
        </Text>
      </View>

      {/* Общий выход + число порций */}
      <View className="mt-2 flex-row gap-2">
        <TextInput
          value={grams}
          onChangeText={setGrams}
          placeholder="Общий выход, г"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Общий выход, граммы"
          className={`${field} flex-[2]`}
        />
        <TextInput
          value={servings}
          onChangeText={setServings}
          placeholder="Порций"
          placeholderTextColor="#8B96B8"
          keyboardType="number-pad"
          maxLength={2}
          accessibilityLabel="Число порций"
          className={`${field} flex-1`}
        />
      </View>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          value={kcal}
          onChangeText={setKcal}
          placeholder="Ккал на весь выход"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Калорийность всего"
          className={`${field} flex-1`}
        />
      </View>
      <View className="mt-2 flex-row gap-2">
        <TextInput
          value={p}
          onChangeText={setP}
          placeholder="Белки, г"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Белки, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={f}
          onChangeText={setF}
          placeholder="Жиры, г"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Жиры, граммы"
          className={`${field} flex-1`}
        />
        <TextInput
          value={c}
          onChangeText={setC}
          placeholder="Углеводы, г"
          placeholderTextColor="#8B96B8"
          keyboardType="decimal-pad"
          accessibilityLabel="Углеводы, граммы"
          className={`${field} flex-1`}
        />
      </View>
      <View className="mt-3 flex-row items-center justify-between gap-2">
        <View className="min-w-0 flex-1">
          <Text className="font-sans text-[11px] text-bear-sub">
            {per100
              ? `≈ ${per100} ккал / 100 г${sv > 1 ? ` · ${perServing} ккал / порция (${gramsPerServing({ grams: g, servings: sv })} г)` : ''}`
              : 'Укажите выход и калории'}
          </Text>
          <Text className="font-sans text-[10px] text-bear-dim">
            БЖУ — по желанию, иначе оценим по калориям
          </Text>
        </View>
        <Pressable
          onPress={handleSave}
          disabled={!ready}
          accessibilityRole="button"
          className="rounded-full px-4 py-2 active:opacity-80"
          style={{ backgroundColor: ready ? '#7B6CF6' : '#4A4670' }}
        >
          <Text className="font-bold text-xs text-white">
            {editing ? 'Сохранить изменения' : 'Сохранить рецепт'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
