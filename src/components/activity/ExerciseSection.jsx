// Секция «Тренировки»: РЕДДИЗАЙН ПО ШАБЛОНУ (референс Кати — тёмно-
// фиолетовый фитнес-экран): 4 плитки-статистики (ккал за сегодня,
// часы за неделю, дней подряд, % недели от 150 мин ВОЗ), hero-карточка
// «Сегодняшняя тренировка» с фото и градиентной кнопкой, рядом кольцо
// «Выполнено за неделю» с дельтой к прошлой неделе, «Динамика»
// (сожжённые за день, 7/30/90), «Популярные виды» (топ за 30 дней)
// и «Последние тренировки» (сегодняшние открываются по тапу).
// Окно добавления/изменения — прежнее: каталог + СВОИ тренировки.
// Свою тренировку пользователь создаёт сам: название, иконка,
// интенсивность — приложение запоминает её между сессиями.
// Сожжённые калории считаются по формуле MET, но значение можно
// исправить вручную (например, по цифре с тренажёра или смарт-часов).
// Тап по записи — изменение, корзина — удаление. Режим flat — без
// собственной карточки: секция встраивается в свёрнутый блок
// «Тренировки» на главной.

import { useCallback, useMemo, useState } from 'react'
import { ImageBackground, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { BarChart3, Calendar, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Dumbbell, Flame, History, Pencil, Play, Plus, RotateCcw, Star, Trash2, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useFocusEffect } from 'expo-router'
import { useExerciseStore, todayKey, dayBurned, syncHistoryBurned } from '@/store/useExerciseStore'
import { useProfileStore } from '@/store/useProfileStore'
import { shortWeekday } from '@/lib/data/activity'
import {
  EXERCISES,
  QUICK_MINUTES,
  CUSTOM_EMOJIS,
  INTENSITY_LEVELS,
  intensityMet,
  kcalBurned,
} from '@/lib/data/exercises'
import {
  WHO_WEEK_MIN,
  weekStats,
  workoutStreak,
  popularTypes,
  recentWorkouts,
  dynamicsSeries,
  dayLabel,
  fmtHours,
} from '@/lib/data/exerciseStats'
import { SvgAreaChart } from '../ui/SvgAreaChart'
import { useToast } from '../ui/Toast'
import { Pills } from '../ui/Pills'
import { BodyChip } from '../ui/BodyChip'
import { formatNum, makeId } from '@/lib/format'

// Фото-акцент hero-карточки «Сегодняшняя тренировка» — как на шаблоне
const SNEAKERS = require('../../../assets/images/sneakers.webp')

// Периоды «Динамики» — пилюли, как на шаблоне
const DYN_RANGES = [
  { id: '7', label: '7д' },
  { id: '30', label: '30д' },
  { id: '90', label: '90д' },
]

const KCAL_MAX = 10000

// Режимы задания интенсивности своей тренировки: уровни (для большинства)
// или калории за 30 минут (для тех, кому проще цифрой с тренажёра)
const FORM_MODES = [
  { id: 'level', label: 'По уровню' },
  { id: 'kcal', label: 'Ккал за 30 мин' },
]

// MET из калорий за 30 минут: kcal = MET × 3.5 × вес / 200 × 30
// → MET = kcal / (0.525 × вес). Ограничиваем реалистичным диапазоном 1–23
function metFromKcal30(kcal, weightKg) {
  if (!kcal || !weightKg) return null
  return Math.min(23, Math.max(1, kcal / (0.525 * weightKg)))
}

// Ближайшее упражнение каталога — чтобы показать «как плавание»
function closestExercise(met) {
  return EXERCISES.reduce(
    (best, e) => (Math.abs(e.met - met) < Math.abs(best.met - met) ? e : best),
    EXERCISES[0]
  )
}

// Дефолт дня для новой тренировки: после полуночи (пока не 5 утра)
// тренировка почти всегда относится к предыдущему дню — вечерней
// прогулке/залу, о которых вспомнили после 00:00. Раньше окно
// открывалось с «Сегодня», и такие записи уходили в новый день:
// назавтра в сводке горели «сожжено за сегодня», хотя ничего
// не добавляли. Днём — как раньше, «Сегодня».
function defaultDayOff() {
  return new Date().getHours() < 5 ? 1 : 0
}

export function ExerciseSection({ flat = false }) {
  const logs = useExerciseStore((s) => s.logs)
  const addLog = useExerciseStore((s) => s.addLog)
  const updateLog = useExerciseStore((s) => s.updateLog)
  const removeLog = useExerciseStore((s) => s.removeLog)
  const custom = useExerciseStore((s) => s.custom)
  const addCustom = useExerciseStore((s) => s.addCustom)
  const updateCustom = useExerciseStore((s) => s.updateCustom)
  const removeCustom = useExerciseStore((s) => s.removeCustom)
  const weightKg = useProfileStore((s) => s.weightKg)
  const { toast } = useToast()
  const insets = useSafeAreaInsets()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // запись на изменение
  // День записи: 0 — сегодня, 1 — вчера. Для новой тренировки после
  // полуночи по умолчанию «Вчера» (см. defaultDayOff), при изменении
  // 0 — запись остаётся в своём дне, «Вчера» — перенести её туда
  const [dayOff, setDayOff] = useState(defaultDayOff)
  const [exId, setExId] = useState(null)
  const [minutes, setMinutes] = useState(null)
  // Сожжённые калории: null — «по формуле», число — ручная правка
  const [kcalManual, setKcalManual] = useState(null)
  const [kcalEditing, setKcalEditing] = useState(false)
  const [kcalDraft, setKcalDraft] = useState('')
  // Форма своей тренировки
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🔥')
  const [newLevel, setNewLevel] = useState('mid')
  const [newMode, setNewMode] = useState('level') // level | kcal
  const [newKcal30, setNewKcal30] = useState('')
  // Свёрнутые блоки формы: иконка и уровень — одна строка с текущим
  // выбором, список раскрывается только по тапу (сетка иконок и уровней
  // больше не занимает пол-окна)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [levelOpen, setLevelOpen] = useState(false)
  // Правка запомненной тренировки: id своей тренировки в форме
  const [editingCustomId, setEditingCustomId] = useState(null)

  // Ключ дня — в состоянии и обновляется при каждом возврате на вкладку:
  // если приложение оставалось открытым через полночь, список «Сегодня»
  // без этого показывал бы вчерашние записи до первого ререндера
  const [key, setKey] = useState(todayKey)
  useFocusEffect(useCallback(() => { setKey(todayKey()) }, []))
  const items = logs[key] || []
  const burned = dayBurned(logs, key)
  // Последние 7 дней с тренировками (новые раньше) — для «Повторить»:
  // не только вчера, а любой день недели. Пустые дни пропускаем.
  const repeatDays = useMemo(() => {
    const out = []
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() - i * 86400000)
      const list = logs[todayKey(d)]
      if (list && list.length) {
        out.push({ key: todayKey(d), list, day: i === 1 ? 'Вчера' : shortWeekday(d) })
      }
    }
    return out
  }, [logs])
  const [repIdx, setRepIdx] = useState(0)
  const repDay = repeatDays.length
    ? repeatDays[Math.min(repIdx, repeatDays.length - 1)]
    : null

  // ── Данные витрины (реддизайн по шаблону) ────────────────────────────
  // Неделя для плиток и кольца, стрик, популярные виды, последние
  // записи, ряд «Динамики» — чистые функции из lib/data/exerciseStats
  const week = useMemo(() => weekStats(logs), [logs])
  const exStreak = useMemo(() => workoutStreak(logs), [logs])
  const popular = useMemo(() => popularTypes(logs, 30), [logs])
  const recent = useMemo(() => recentWorkouts(logs, 14, 6), [logs])
  const [dynRange, setDynRange] = useState('7')
  const dynData = useMemo(() => dynamicsSeries(logs, Number(dynRange)), [logs, dynRange])
  const hasDyn = useMemo(() => dynData.some((p) => p.value > 0), [dynData])
  // Самая свежая тренировка за сегодня — лицо hero-карточки
  const hero = items[0] || null

  // Каталог + запомненные свои тренировки (пересобирается при изменениях)
  const allExercises = useMemo(() => [...EXERCISES, ...custom], [custom])

  // Открыть окно: без записи — «добавить», с записью — «изменить»
  function openModal(entry) {
    if (entry) {
      setEditing(entry)
      setExId(entry.exId)
      setMinutes(entry.minutes)
      // Если калории правили вручную — открываем с этим значением
      setKcalManual(entry.manual ? entry.kcal : null)
      // Запись остаётся в своём дне, пока не выберут перенос «Вчера»
      setDayOff(0)
    } else {
      setEditing(null)
      setExId(null)
      setMinutes(null)
      setKcalManual(null)
      // После полуночи — по умолчанию «Вчера» (см. defaultDayOff)
      setDayOff(defaultDayOff())
    }
    setKcalEditing(false)
    setCreating(false)
    setOpen(true)
  }

  function closeModal() {
    setOpen(false)
    setEditing(null)
    setCreating(false)
    setEditingCustomId(null)
  }

  // Открыть форму своей тренировки с чистого листа (и сбросить
  // развёрнутые списки — иконка/уровень всегда начинаются свёрнутыми)
  function startCreate() {
    setCreating(true)
    setEditingCustomId(null)
    setNewName('')
    setNewEmoji('🔥')
    setNewLevel('mid')
    setNewMode('level')
    setNewKcal30('')
    setEmojiOpen(false)
    setLevelOpen(false)
  }

  // Изменить запомненную тренировку: подставляем её данные в форму.
  // Хранится только MET, поэтому режим интенсивности подбираем обратным
  // пересчётом: точное совпадение с уровнем — «По уровню», иначе — ккал за 30 мин
  function startEditCustom() {
    if (!ex || !ex.id.startsWith('custom-')) return
    setCreating(true)
    setEditingCustomId(ex.id)
    setNewName(ex.name)
    setNewEmoji(ex.emoji)
    const level = INTENSITY_LEVELS.find((l) => l.met === ex.met)
    if (level) {
      setNewMode('level')
      setNewLevel(level.id)
      setNewKcal30('')
    } else {
      setNewMode('kcal')
      setNewKcal30(String(Math.max(20, Math.round(ex.met * 0.525 * weightKg) || 20)))
    }
    setEmojiOpen(false)
    setLevelOpen(false)
  }

  const ex = allExercises.find((e) => e.id === exId)
  const autoKcal = ex && minutes ? kcalBurned(ex.met, weightKg, minutes) : 0
  const kcalShow = kcalManual != null ? Math.round(kcalManual) : autoKcal

  // Превью формы своей тренировки: MET из калорий за 30 минут (если режим
  // «ккал» и введено число) или из выбранного уровня — для живого примера
  const kcal30Num = Number(String(newKcal30).replace(',', '.')) || 0
  const kcalMet = metFromKcal30(kcal30Num, weightKg)
  const previewMet = newMode === 'kcal' ? kcalMet : intensityMet(newLevel)

  function startKcalEdit() {
    setKcalDraft(String(kcalShow || ''))
    setKcalEditing(true)
  }

  function applyKcal() {
    const n = Math.round(Number(String(kcalDraft).replace(',', '.')) || 0)
    if (!n || n < 1) {
      toast({
        title: '❗ Неверное значение',
        description: `Введите число от 1 до ${formatNum(KCAL_MAX)}`,
      })
      return
    }
    setKcalManual(Math.min(n, KCAL_MAX))
    setKcalEditing(false)
  }

  // Вернуться к автоматическому расчёту по MET
  function resetKcal() {
    setKcalManual(null)
    setKcalEditing(false)
  }

  function save() {
    const payload = { exId: ex.id, name: ex.name, emoji: ex.emoji, minutes, kcal: kcalShow }
    if (kcalManual != null) payload.manual = true
    if (editing) {
      if (dayOff) {
        // Перенос записи за вчера: убираем из сегодняшних, пишем
        // во вчерашний день — «сожжено» обоих дней сразу пересчитывается
        // в дневной истории (календарь, сводка, отчёты)
        removeLog(key, editing.id)
        const d = new Date()
        d.setDate(d.getDate() - dayOff)
        const movedKey = todayKey(d)
        addLog(movedKey, payload)
        syncHistoryBurned(movedKey)
        syncHistoryBurned(key)
        toast({
          title: `${ex.emoji} ${ex.name} — за вчера`,
          description: `${minutes} мин · ${formatNum(kcalShow)} ккал · запись перенесена`,
        })
      } else {
        updateLog(key, editing.id, payload)
        syncHistoryBurned(key)
        toast({
          title: `${ex.emoji} ${ex.name} — изменено`,
          description: `${minutes} мин · ${formatNum(kcalShow)} ккал${
            kcalManual != null ? ' · вручную' : ''
          }`,
        })
      }
    } else {
      // Ключ дня по выбору «Сегодня / Вчера» — не по времени сохранения:
      // тренировка, записанная после полуночи, уходит во вчерашний день
      // (после полуночи «Вчера» выбрано по умолчанию)
      const d = new Date()
      if (dayOff) d.setDate(d.getDate() - dayOff)
      const dayKey = todayKey(d)
      addLog(dayKey, payload)
      syncHistoryBurned(dayKey)
      toast({
        title: `${ex.emoji} ${ex.name} — ${minutes} мин`,
        description: `Сожжено ${formatNum(kcalShow)} ккал · записано${
          dayOff ? ' за вчера' : ''
        }`,
      })
    }
    closeModal()
  }

  function remove(entry) {
    removeLog(key, entry.id)
    syncHistoryBurned(key)
    if (editing && editing.id === entry.id) closeModal()
    toast({ title: '🗑 Удалено', description: `${entry.name} убрана из дневника` })
  }

  // Создать/сохранить свою тренировку — хранится навсегда, в каталоге.
  // При правке id не меняется — записи дневника остаются привязаны к ней
  function saveCustom() {
    const name = newName.trim()
    if (!name) {
      toast({ title: '❗ Нужно название', description: 'Например: Бокс, скакалка, падел' })
      return
    }
    let met
    if (newMode === 'kcal') {
      // Интенсивность из калорий за 30 минут (цифрой с тренажёра)
      const k = Math.round(Number(String(newKcal30).replace(',', '.')) || 0)
      if (!k || k < 20 || k > 2000) {
        toast({
          title: '❗ Неверное значение',
          description: 'Введите калории за 30 минут — от 20 до 2000',
        })
        return
      }
      met = metFromKcal30(k, weightKg)
    } else {
      met = intensityMet(newLevel)
    }
    if (editingCustomId) {
      updateCustom(editingCustomId, { name, emoji: newEmoji, met })
      setExId(editingCustomId)
      setCreating(false)
      setEditingCustomId(null)
      setNewName('')
      setNewEmoji('🔥')
      setNewLevel('mid')
      setNewMode('level')
      setNewKcal30('')
      setEmojiOpen(false)
      setLevelOpen(false)
      toast({ title: '✏️ Изменено', description: `«${name}» обновлена` })
      return
    }
    const exObj = { id: `custom-${makeId()}`, name, emoji: newEmoji, met }
    addCustom(exObj)
    setExId(exObj.id)
    setCreating(false)
    setNewName('')
    setNewEmoji('🔥')
    setNewLevel('mid')
    setNewMode('level')
    setNewKcal30('')
    setEmojiOpen(false)
    setLevelOpen(false)
    toast({
      title: `${exObj.emoji} «${name}» запомнена`,
      description: 'Теперь она всегда в списке тренировок',
    })
  }

  // Повторить выбранный день: копируем все его записи в сегодня
  function repeatDay() {
    if (!repDay) return
    repDay.list.forEach((e) =>
      addLog(key, { exId: e.exId, name: e.name, emoji: e.emoji, minutes: e.minutes, kcal: e.kcal, manual: e.manual })
    )
    syncHistoryBurned(key)
    toast({
      title: '🔁 Тренировки повторены',
      description: `${repDay.list.length} ${
        repDay.list.length === 1 ? 'запись добавлена' : 'записи добавлено'
      } из «${repDay.day}» в сегодня`,
    })
  }

  // Удалить свою тренировку из списка (записи дневника не пропадают)
  function forgetCustom() {
    if (!ex) return
    removeCustom(ex.id)
    setExId(null)
    toast({ title: '🗑 Удалено', description: `«${ex.name}» больше не в списке` })
  }

  return (
    <View
      accessibilityLabel="Тренировки"
      className={flat ? '' : 'rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-5'}
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-row items-center gap-2">
          <BodyChip icon={<Dumbbell size={17} />} />
          <View className="min-w-0 flex-1">
            <Text className="font-bold text-[20px] tracking-tight text-bear-text">
              Тренировки
            </Text>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.15}
              className="font-sans text-[13.5px] leading-tight text-bear-sub2"
            >
              Твой путь к лучшей форме
            </Text>
          </View>
        </View>
        <Pressable
          onPress={() => openModal(null)}
          className="flex-row items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 active:opacity-70"
        >
          <Plus size={16} color="#AEB9D9" />
          <Text className="font-bold text-[16.5px] text-bear-soft">Добавить</Text>
        </Pressable>
      </View>

      {/* Повтор активности за прошлый день: стрелками выбираем любой
          из последних 7 дней с тренировками, кнопка копирует в сегодня */}
      {repDay && (
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-white/[0.03] px-3.5 py-2.5">
          {repeatDays.length > 1 && (
            <Pressable
              onPress={() => setRepIdx((i) => Math.min(i + 1, repeatDays.length - 1))}
              disabled={repIdx >= repeatDays.length - 1}
              accessibilityRole="button"
              accessibilityLabel="Более старый день"
              hitSlop={6}
              className={`h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70 ${repIdx >= repeatDays.length - 1 ? 'opacity-30' : ''}`}
            >
              <ChevronLeft size={17} color="#AEB9D9" />
            </Pressable>
          )}
          <View className="min-w-0 flex-1">
            <Text className="font-sans text-[15px] text-bear-sub2">{`${repDay.day} было`}</Text>
            <Text numberOfLines={1} className="font-bold text-[17px] text-bear-text">
              {repDay.list
                .slice(0, 2)
                .map((e) => `${e.emoji} ${e.name}`)
                .join(' · ')
              }
              {repDay.list.length > 2 ? ` · ещё ${repDay.list.length - 2}` : ''}
            </Text>
          </View>
          {repeatDays.length > 1 && (
            <Pressable
              onPress={() => setRepIdx((i) => Math.max(i - 1, 0))}
              disabled={repIdx <= 0}
              accessibilityRole="button"
              accessibilityLabel="Более свежий день"
              hitSlop={6}
              className={`h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70 ${repIdx <= 0 ? 'opacity-30' : ''}`}
            >
              <ChevronRight size={17} color="#AEB9D9" />
            </Pressable>
          )}
          <Pressable
            onPress={repeatDay}
            accessibilityRole="button"
            accessibilityLabel={`Повторить тренировки за ${repDay.day}`}
            hitSlop={6}
            className="h-9 w-9 shrink-0 items-center justify-center rounded-full active:opacity-70"
            style={{ backgroundColor: 'rgba(123,108,246,0.15)' }}
          >
            <RotateCcw size={16} color="#A78BFA" />
          </Pressable>
        </View>
      )}

      {/* ── Витрина по шаблону: 4 плитки · hero + кольцо недели ────────── */}
      <View className="mt-3 flex-row gap-1.5">
        <StatTile emoji="🔥" value={formatNum(burned)} label="Ккал" />
        <StatTile emoji="⏱" value={fmtHours(week.minutes)} label="Тренировок" />
        <StatTile emoji="🏆" value={String(exStreak)} label="Дней подряд" />
        <StatTile emoji="📊" value={`${week.pct}%`} label="Прогресс" />
      </View>

      <View className="mt-2 flex-row gap-2">
        {/* Hero «Сегодняшняя тренировка»: точка-статус, эмодзи-плитка,
            название и метрики самой свежей записи дня, кнопка добавления;
            справа фото — как на шаблоне */}
        <View
          className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-white/10"
          style={{ backgroundColor: 'rgba(123,108,246,0.10)' }}
        >
          <View className="flex-row">
            <View className="min-w-0 flex-1 p-3.5">
              <View className="flex-row items-center gap-1.5">
                <View
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: hero ? '#4ADE80' : 'rgba(255,255,255,0.25)' }}
                />
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                  className="font-semibold text-[13px] text-bear-sub"
                >
                  Сегодняшняя тренировка
                </Text>
              </View>
              <View className="mt-2 flex-row items-center gap-2.5">
                <View
                  className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  style={{ backgroundColor: 'rgba(123,108,246,0.22)' }}
                >
                  <Text className="text-[22px]">{hero ? hero.emoji : '🏃'}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    maxFontSizeMultiplier={1.15}
                    className="font-bold text-[18px] leading-tight text-bear-text"
                  >
                    {hero ? hero.name : 'Пока нет тренировок'}
                  </Text>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    maxFontSizeMultiplier={1.1}
                    className="font-sans text-[13.5px] leading-tight text-bear-sub2"
                  >
                    {hero
                      ? `${hero.minutes} мин · ${formatNum(hero.kcal)} ккал`
                      : 'Даже прогулка считается'}
                  </Text>
                </View>
              </View>
              <Pressable
                onPress={() => openModal(null)}
                accessibilityRole="button"
                accessibilityLabel="Добавить тренировку"
                className="mt-3 overflow-hidden rounded-2xl active:opacity-80"
              >
                <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['#7B6CF6', '#A45BFF']}>
                  <View className="flex-row items-center justify-center gap-1.5 py-2.5">
                    <Play size={15} color="#FFFFFF" />
                    <Text className="font-bold text-[15px] text-white">Добавить тренировку</Text>
                  </View>
                </LinearGradient>
              </Pressable>
            </View>
            <ImageBackground
              source={SNEAKERS}
              style={{ width: 88 }}
              imageStyle={{ resizeMode: 'cover' }}
              accessibilityLabel="Кроссовки"
            />
          </View>
        </View>

        {/* Кольцо недели: % от недельной нормы 150 минут (рекомендация
            ВОЗ) и дельта к прошлой неделе — «↑ +12%» на шаблоне */}
        <Pressable
          onPress={() =>
            toast({
              title: `📅 Неделя: ${week.minutes} из ${WHO_WEEK_MIN} мин`,
              description:
                week.delta === 0
                  ? 'Норма недели — 150 минут активности (рекомендация ВОЗ)'
                  : week.delta > 0
                    ? `${week.delta}% к прошлой неделе — норма недели 150 минут (ВОЗ)`
                    : `${week.delta}% к прошлой неделе — норма недели 150 минут (ВОЗ)`,
            })
          }
          accessibilityRole="button"
          accessibilityLabel={`Выполнено за неделю ${week.pct} процентов`}
          className="w-[112px] shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] py-3 active:opacity-80"
        >
          <WeekRing pct={week.pct} />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.05}
            className="mt-1.5 font-sans text-[11px] leading-tight text-bear-dim"
          >
            за неделю
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            className="mt-0.5 font-bold text-[12.5px] leading-tight"
            style={{
              color:
                week.delta > 0 ? '#34D399' : week.delta < 0 ? '#FB7185' : '#8B96B8',
            }}
          >
            {week.delta > 0 ? `↑ +${week.delta}%` : week.delta < 0 ? `↓ −${Math.abs(week.delta)}%` : 'как раньше'}
          </Text>
        </Pressable>
      </View>

      {/* Динамика: сожжённые ккал по дням, периоды 7/30/90 — как на
          шаблоне. Пока тренировок нет — карточку не рисуем (пустых
          заглушек на витрине не оставляем) */}
      {hasDyn && (
        <View className="mt-2 rounded-3xl border border-white/10 bg-white/[0.03] p-3.5">
          <View className="flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-row items-center gap-1.5">
              <BarChart3 size={16} color="#A78BFA" />
              <Text className="font-bold text-[16px] text-bear-text">Динамика</Text>
            </View>
            <Pills
              items={DYN_RANGES}
              value={dynRange}
              onChange={setDynRange}
              size="sm"
              accessibilityLabel="Период динамики тренировок"
            />
          </View>
          <View className="mt-1.5">
            <SvgAreaChart
              data={dynData}
              color="#A78BFA"
              height={132}
              yFmt={(v) => formatNum(Math.round(v))}
              bare
              lastBadge
            />
          </View>
        </View>
      )}

      {/* Популярные виды: топ-4 за 30 дней по минутам — плитки 2×2
          с эмодзи и суммой часов, как на шаблоне */}
      {popular.length > 0 && (
        <View className="mt-2 rounded-3xl border border-white/10 bg-white/[0.03] p-3.5">
          <View className="flex-row items-center gap-1.5">
            <Star size={16} color="#FBBF24" />
            <Text className="font-bold text-[16px] text-bear-text">Популярные виды</Text>
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.05}
              className="ml-auto shrink font-sans text-[12px] text-bear-sub2"
            >
              за 30 дней
            </Text>
          </View>
          <View className="mt-2 gap-2">
            {popular
              .reduce((rows, p, i) => {
                if (i % 2 === 0) rows.push([])
                rows[rows.length - 1].push(p)
                return rows
              }, [])
              .map((row, ri) => (
                <View key={`pop-row-${ri}`} className="flex-row gap-2">
                  {row.map((p) => (
                    <View
                      key={p.name}
                      className="min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl bg-white/[0.04] px-2.5 py-2"
                    >
                      <Text className="text-[19px]">{p.emoji}</Text>
                      <View className="min-w-0 flex-1">
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.1}
                          className="font-bold text-[13.5px] leading-tight text-bear-text"
                        >
                          {p.name}
                        </Text>
                        <Text
                          numberOfLines={1}
                          maxFontSizeMultiplier={1.05}
                          className="font-sans text-[12px] leading-tight text-bear-sub2"
                        >
                          {fmtHours(p.minutes)}
                        </Text>
                      </View>
                    </View>
                  ))}
                  {row.length === 1 && <View className="flex-1" />}
                </View>
              ))}
          </View>
        </View>
      )}

      {/* Последние тренировки: свежие записи дней (сегодня — сверху).
          Записи за СЕГОДНЯ открываются по тапу (изменить), у них же
          корзина; прошлые дни — просто история, справа зелёная галочка */}
      {recent.length > 0 && (
        <View className="mt-2 rounded-3xl border border-white/10 bg-white/[0.03] p-3.5">
          <View className="flex-row items-center gap-1.5">
            <History size={16} color="#8B96B8" />
            <Text className="font-bold text-[16px] text-bear-text">Последние тренировки</Text>
          </View>
          <View className="mt-1.5 gap-0.5">
            {recent.map((e) => {
              const isToday = e.daysAgo === 0
              const RowWrap = isToday ? Pressable : View
              return (
                <RowWrap
                  key={`${e.daysAgo}-${e.id}`}
                  onPress={isToday ? () => openModal(e) : undefined}
                  accessibilityRole={isToday ? 'button' : undefined}
                  accessibilityLabel={isToday ? `Изменить ${e.name}` : undefined}
                  className="flex-row items-center gap-2.5 rounded-2xl px-0.5 py-1.5 active:opacity-70"
                >
                  <View className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">
                    <Text className="text-[17px]">{e.emoji}</Text>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.1}
                      className="font-bold text-[15px] leading-tight text-bear-text"
                    >
                      {e.name}
                    </Text>
                    <Text
                      numberOfLines={1}
                      maxFontSizeMultiplier={1.05}
                      className="font-sans text-[12.5px] leading-tight text-bear-sub2"
                    >
                      {`${e.minutes} мин · ${formatNum(e.kcal)} ккал`}
                    </Text>
                  </View>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.05}
                    className="shrink-0 font-sans text-[12.5px] text-bear-dim"
                  >
                    {dayLabel(e.daysAgo)}
                  </Text>
                  <View
                    className="h-6 w-6 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(52,211,153,0.15)' }}
                  >
                    <Check size={13} color="#34D399" />
                  </View>
                  {isToday ? (
                    <Pressable
                      onPress={() => remove(e)}
                      accessibilityLabel={`Удалить ${e.name}`}
                      hitSlop={6}
                      className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5"
                    >
                      <Trash2 size={14} color="#98A2C2" />
                    </Pressable>
                  ) : null}
                </RowWrap>
              )
            })}
          </View>
          {recent.some((e) => e.daysAgo === 0) && (
            <Text className="mt-1 font-sans text-[12px] leading-snug text-bear-dim">
              Тап по сегодняшней записи — изменить.
            </Text>
          )}
        </View>
      )}

      {/* Окно добавления/изменения тренировки */}
      <Modal visible={open} transparent animationType="fade" onRequestClose={closeModal}>
        <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
          <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
            {/* Шапка: гантель как на референсе, закрытие — в квадратной кнопке */}
            <View className="flex-row items-center gap-3 border-b border-bear-line px-4 pb-3 pt-3.5">
              <View
                className="h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(123,108,246,0.18)' }}
              >
                <Dumbbell size={20} color="#A78BFA" />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-bold text-[20px] text-bear-text">
                  {creating
                    ? editingCustomId
                      ? 'Изменить тренировку'
                      : 'Своя тренировка'
                    : editing
                      ? 'Изменить тренировку'
                      : 'Новая тренировка'}
                </Text>
                <Text className="mt-0.5 font-sans text-[15px] text-bear-sub">
                  {creating
                    ? editingCustomId
                      ? 'Поменяйте что нужно — она останется в списке'
                      : 'Запомним её — будет всегда в списке'
                    : `Расчёт по формуле MET для веса ${weightKg} кг`}
                </Text>
              </View>
              <Pressable
                onPress={closeModal}
                accessibilityLabel="Закрыть"
                hitSlop={6}
                className="h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 active:opacity-70"
              >
                <X size={20} color="#A5AECB" />
              </Pressable>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1 }}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 }}
            >
              {creating ? (
                /* Форма своей тренировки: название + иконка + интенсивность */
                <View className="gap-3.5">
                  <View>
                    <Text className="mb-1.5 font-sans text-[16px] text-bear-sub2">Название</Text>
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      maxLength={24}
                      placeholder="Например: Бокс, скакалка, падел"
                      placeholderTextColor="#8B96B8"
                      accessibilityLabel="Название своей тренировки"
                      className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 font-sans text-[19px] text-bear-text"
                    />
                  </View>

                  {/* Иконка — свёрнута: одна строка с текущим выбором,
                      сетка раскрывается только по тапу */}
                  <View>
                    <Text className="mb-1.5 font-sans text-[16px] text-bear-sub2">Иконка</Text>
                    <Pressable
                      onPress={() => setEmojiOpen((v) => !v)}
                      accessibilityRole="button"
                      accessibilityLabel={emojiOpen ? 'Скрыть выбор иконки' : 'Выбрать иконку'}
                      className="flex-row items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2 active:opacity-70"
                    >
                      <Text className="text-[24px]">{newEmoji}</Text>
                      <Text className="min-w-0 flex-1 font-semibold text-[16.5px] text-bear-soft">
                        {emojiOpen ? 'Свернуть' : 'Выбрать иконку'}
                      </Text>
                      {emojiOpen ? (
                        <ChevronUp size={18} color="#A5AECB" />
                      ) : (
                        <ChevronDown size={18} color="#A5AECB" />
                      )}
                    </Pressable>
                    {emojiOpen && (
                      <View className="mt-2 flex-row flex-wrap gap-1.5">
                        {CUSTOM_EMOJIS.map((em) => (
                          <Pressable
                            key={em}
                            onPress={() => setNewEmoji(em)}
                            accessibilityLabel={`Иконка ${em}`}
                            accessibilityRole="button"
                            className={`h-9 w-9 items-center justify-center rounded-xl border ${
                              newEmoji === em
                                ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10'
                                : 'border-white/5 bg-white/[0.03]'
                            }`}
                          >
                            <Text className="text-[22px]">{em}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}
                  </View>

                  <View>
                    <Text className="mb-1.5 font-sans text-[16px] text-bear-sub2">
                      Интенсивность
                    </Text>
                    {/* Способ: уровни (проще) или калории за 30 минут (точнее) */}
                    <Pills
                      items={FORM_MODES}
                      value={newMode}
                      onChange={setNewMode}
                      size="md"
                      accessibilityLabel="Способ задания интенсивности"
                    />
                    {newMode === 'level' ? (
                      /* Уровень — тоже свёрнут: строка с выбранным уровнем,
                         список раскрывается по тапу */
                      <View className="mt-2">
                        <Pressable
                          onPress={() => setLevelOpen((v) => !v)}
                          accessibilityRole="button"
                          accessibilityLabel={levelOpen ? 'Скрыть уровни' : 'Выбрать уровень'}
                          className="flex-row items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 active:opacity-70"
                        >
                          <Text className="font-semibold text-[16.5px] text-bear-text">
                            {INTENSITY_LEVELS.find((l) => l.id === newLevel)?.label || 'Средняя'}
                          </Text>
                          {levelOpen ? (
                            <ChevronUp size={18} color="#A5AECB" />
                          ) : (
                            <ChevronDown size={18} color="#A5AECB" />
                          )}
                        </Pressable>
                        {levelOpen && (
                          <View className="mt-2">
                            <Pills
                              items={INTENSITY_LEVELS}
                              value={newLevel}
                              onChange={setNewLevel}
                              size="md"
                              accessibilityLabel="Интенсивность"
                            />
                          </View>
                        )}
                      </View>
                    ) : (
                      <View className="mt-2 gap-1.5">
                        <View className="flex-row items-center gap-2">
                          <TextInput
                            value={newKcal30}
                            onChangeText={setNewKcal30}
                            keyboardType="number-pad"
                            maxLength={4}
                            placeholder="300"
                            placeholderTextColor="#8B96B8"
                            accessibilityLabel="Калории за 30 минут"
                            className="w-24 rounded-2xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[19px] text-bear-text"
                          />
                          <Text className="min-w-0 flex-1 font-sans text-[15px] leading-relaxed text-bear-sub2">
                            ккал за 30 минут этой активности — цифра с тренажёра или часов
                          </Text>
                        </View>
                        {kcalMet && (
                          <Text className="font-sans text-[15px] text-bear-dim">
                            {`≈ MET ${Math.round(kcalMet * 10) / 10} · как ${
                              closestExercise(kcalMet).emoji
                            } ${closestExercise(kcalMet).name.toLowerCase()}`}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>

                  {previewMet && (
                    <Text className="font-sans text-[16px] leading-relaxed text-bear-sub2">
                      Пример: 30 минут этой активности — ≈{' '}
                      <Text className="font-bold text-[#f87171]">
                        {formatNum(kcalBurned(previewMet, weightKg, 30))} ккал
                      </Text>{' '}
                      при весе {weightKg} кг
                    </Text>
                  )}

                  {/* Кнопка «Запомнить» закреплена внизу окна — общая зона
                      действий под прокручиваемым списком (см. ниже) */}
                </View>
              ) : (
                <>
                  {/* День записи: подпись и пилюли в одной строке — окно
                      компактнее (отзыв Кати). Для новой — куда записать
                      (после полуночи по умолчанию «Вчера»), при изменении
                      выбор «Вчера» переносит запись в предыдущий день */}
                  <View>
                    <View className="flex-row flex-wrap items-center gap-x-2.5 gap-y-1.5">
                      <Text className="font-sans text-[15px] text-bear-sub2">
                        {editing ? 'День записи:' : 'За какой день?'}
                      </Text>
                      <Pills
                        items={[
                          { id: 0, label: 'Сегодня' },
                          { id: 1, label: 'Вчера' },
                        ]}
                        value={dayOff}
                        onChange={setDayOff}
                        size="sm"
                        accessibilityLabel="День тренировки"
                      />
                    </View>
                    {editing && dayOff ? (
                      <Text className="mt-1.5 font-sans text-[14.5px] text-bear-dim">
                        Сохраните — запись перенесётся за вчера
                      </Text>
                    ) : null}
                  </View>

                  {/* Каталог упражнений + свои: сетка 2 колонки.
                      Плитки компактные — на небольшом экране каталог
                      почти целиком влезает без прокрутки */}
                  <View className="gap-2">
                    {allExercises.reduce((rows, e, i) => {
                      if (i % 2 === 0) rows.push([])
                      rows[rows.length - 1].push(e)
                      return rows
                    }, []).map((row) => (
                      <View key={row[0].id} className="flex-row gap-2">
                        {row.map((e) => (
                          <ExButton key={e.id} e={e} exId={exId} setExId={setExId} />
                        ))}
                        {row.length === 1 && <View className="flex-1" />}
                      </View>
                    ))}

                    {/* Своя тренировка: создаётся один раз, запоминается.
                        Крупный текст — по просьбе: строка читается сразу */}
                    <Pressable
                      onPress={startCreate}
                      accessibilityRole="button"
                      accessibilityLabel="Создать свою тренировку"
                      className="mt-1 flex-row items-center justify-center gap-2 rounded-2xl border border-white/15 py-2.5 active:opacity-70"
                      style={{ borderStyle: 'dashed' }}
                    >
                      <Plus size={17} color="#A5AECB" />
                      <Text className="font-bold text-[17.5px] text-bear-soft">
                        Своя тренировка
                      </Text>
                    </Pressable>
                  </View>

                  {/* Длительность и итог рядом: слева чипы минут, справа —
                      огонёк «сожжено» с карандашом (ручная правка калорий).
                      Старый блок с календарём «Рекомендуемое время» убран —
                      он дублировал чип минут; рекомендуемая длительность
                      теперь маленькой подсказкой под чипами и исчезает,
                      как только выбрана (отзыв Кати) */}
                  <View className="mt-3 flex-row items-stretch gap-2.5">
                    <View className="min-w-0 flex-1 flex-row flex-wrap content-start gap-1.5">
                      {QUICK_MINUTES.map((m) => {
                        const active = minutes === m
                        return (
                          <Pressable
                            key={m}
                            onPress={() => setMinutes(m)}
                            accessibilityRole="button"
                            accessibilityLabel={`${m} минут`}
                            accessibilityState={{ selected: active }}
                            className={`flex-row items-center justify-center gap-1 rounded-2xl px-3 py-2.5 active:opacity-80 ${
                              active ? '' : 'bg-white/5'
                            }`}
                            style={active ? { backgroundColor: '#7B6CF6' } : null}
                          >
                            <Text
                              className={`font-bold text-[15.5px] ${active ? 'text-white' : 'text-bear-soft'}`}
                            >
                              {m} мин
                            </Text>
                            {active && <Check size={15} color="#FFFFFF" />}
                          </Pressable>
                        )
                      })}
                      {/* Рекомендуемая длительность — маленькой подсказкой:
                          тап подставляет её, после выбора подсказка исчезает */}
                      {ex?.typ && minutes !== ex.typ ? (
                        <Pressable
                          onPress={() => setMinutes(ex.typ)}
                          accessibilityRole="button"
                          accessibilityLabel={`Рекомендуемое время ${ex.typ} минут — поставить`}
                          className="flex-row items-center gap-1 rounded-full bg-white/5 px-2.5 py-1.5 active:opacity-70"
                        >
                          <Calendar size={13} color="#8B96B8" />
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.1}
                            className="font-sans text-[13px] text-bear-sub2"
                          >
                            {`рекомендуем ${ex.typ} мин`}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                    <View className="w-px self-stretch bg-white/10" />
                    {/* Итог тренировки: огонёк + сожжённые калории +
                        карандаш ручной правки (цифра с тренажёра или часов) */}
                    <View
                      className={`w-[104px] shrink-0 items-center justify-center rounded-2xl px-1 py-2 ${
                        kcalShow > 0 ? 'bg-[#f87171]/[0.06]' : 'bg-white/[0.03]'
                      }`}
                    >
                      <View className="w-full flex-row items-center justify-center gap-1">
                        <Flame size={16} color="#f87171" />
                        <Text
                          numberOfLines={1}
                          adjustsFontSizeToFit
                          minimumFontScale={0.75}
                          maxFontSizeMultiplier={1.2}
                          className={`min-w-0 flex-1 text-right font-bold text-[16px] ${
                            kcalShow > 0 ? 'text-[#f87171]' : 'text-bear-sub2'
                          }`}
                        >
                          {kcalShow > 0 ? `${formatNum(kcalShow)} ккал` : '—'}
                        </Text>
                      </View>
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.8}
                        maxFontSizeMultiplier={1.2}
                        className="mt-0.5 w-full text-center font-sans text-[11px] leading-[13px] text-bear-sub2"
                      >
                        {kcalManual != null ? 'Сожжено · вручную' : 'Сожжено'}
                      </Text>
                      <Pressable
                        onPress={startKcalEdit}
                        disabled={!ex || !minutes || kcalEditing}
                        accessibilityLabel="Исправить калории вручную"
                        className={`mt-1.5 h-9 w-9 items-center justify-center rounded-full active:opacity-70 ${
                          kcalManual != null ? 'bg-[#7B6CF6]/25' : 'bg-white/5'
                        } ${!ex || !minutes || kcalEditing ? 'opacity-40' : ''}`}
                      >
                        <Pencil size={15} color="#A5AECB" />
                      </Pressable>
                    </View>
                  </View>

                  {/* Своя длительность: если в быстрых кнопках нужного
                      нет — вписываем своё число минут */}
                  <View className="mt-2 flex-row items-center gap-2">
                    <TextInput
                      value={minutes == null ? '' : String(minutes)}
                      onChangeText={(t) => {
                        const n = Math.round(Number(t) || 0)
                        setMinutes(n ? Math.min(600, n) : null)
                      }}
                      keyboardType="number-pad"
                      maxLength={3}
                      placeholder="—"
                      placeholderTextColor="#8B96B8"
                      accessibilityLabel="Своя длительность в минутах"
                      className="w-20 rounded-2xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[19px] text-bear-text"
                    />
                    <Text className="min-w-0 flex-1 font-sans text-[15px] leading-snug text-bear-sub2">
                      минут — впишите свою, если нужной нет
                    </Text>
                  </View>

                  {/* Ручная правка калорий — открывается карандашом у огонька
                      «сожжено» (цифра с тренажёра или часов точнее формулы).
                      Отдельная плашка «Сожжено | MET» больше не дублируется
                      под чипами — итог теперь стоит справа от чипов минут */}
                  {kcalEditing && (
                    <View className="mt-2.5 gap-2">
                      <Text className="font-sans text-[15px] text-bear-sub2">
                        Сожжено за эту тренировку, ккал
                      </Text>
                      <View className="flex-row items-center gap-2">
                        <TextInput
                          value={kcalDraft}
                          onChangeText={setKcalDraft}
                          keyboardType="number-pad"
                          maxLength={5}
                          autoFocus
                          accessibilityLabel="Сожжённые калории вручную"
                          className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[19px] text-bear-text"
                        />
                        <Text className="shrink-0 font-sans text-[16.5px] text-bear-sub">ккал</Text>
                      </View>
                      <View className="flex-row gap-2">
                        <Pressable
                          onPress={resetKcal}
                          accessibilityLabel="Вернуть расчёт по формуле"
                          className="flex-row flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/5 py-2 active:opacity-70"
                        >
                          <RotateCcw size={14} color="#A5AECB" />
                          <Text className="font-bold text-[16px] text-bear-soft">По формуле</Text>
                        </Pressable>
                        <Pressable
                          onPress={applyKcal}
                          accessibilityLabel="Применить значение"
                          className="flex-1 items-center rounded-xl bg-white/10 py-2 active:opacity-70"
                        >
                          <Text className="font-bold text-[16px] text-bear-text">Готово</Text>
                        </Pressable>
                      </View>
                      <Text className="font-sans text-[15px] leading-relaxed text-bear-dim">
                        Точнее формулы: цифра с тренажёра, пульсометра или смарт-часов.
                      </Text>
                    </View>
                  )}

                  {/* Своя тренировка выбрана — её можно изменить или удалить */}
                  {ex && ex.id.startsWith('custom-') && (
                    <View className="mt-2 flex-row items-center justify-center gap-6">
                      <Pressable
                        onPress={startEditCustom}
                        accessibilityRole="button"
                        accessibilityLabel={`Изменить ${ex.name}`}
                        className="flex-row items-center gap-1.5 active:opacity-70"
                      >
                        <Pencil size={14} color="#A5AECB" />
                        <Text className="font-sans text-[15px] text-bear-sub2">Изменить</Text>
                      </Pressable>
                      <Pressable
                        onPress={forgetCustom}
                        accessibilityRole="button"
                        accessibilityLabel={`Удалить ${ex.name} из моих тренировок`}
                        className="flex-row items-center gap-1.5 active:opacity-70"
                      >
                        <Trash2 size={14} color="#98A2C2" />
                        <Text className="font-sans text-[15px] text-bear-sub2">Удалить</Text>
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            {/* Кнопка действия — закреплена внизу окна, вне прокрутки.
                Раньше «Добавить тренировку» была последним элементом списка:
                на небольшом экране она уходила за нижний край вместе с
                прокруткой, и казалось, что кнопки нет вовсе. Теперь шапка,
                список и кнопка разделены: кнопка видна всегда, а прокручивается
                только каталог активностей. Пока не выбраны активность и
                длительность — кнопка видна, но приглушена, а под ней
                подсказка, чего не хватает. */}
            <View
              className="gap-1.5 border-t border-bear-line px-4 pt-2.5"
              style={{ paddingBottom: Math.max(16, insets.bottom + 12) }}
            >
              {creating ? (
                <Pressable
                  onPress={saveCustom}
                  accessibilityRole="button"
                  accessibilityLabel="Запомнить тренировку"
                  className="items-center rounded-2xl py-3 active:opacity-80"
                  style={{ backgroundColor: '#7B6CF6' }}
                >
                  <Text className="font-bold text-[17px] text-white">
                    {editingCustomId ? 'Сохранить' : 'Запомнить'}
                  </Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={save}
                    disabled={!ex || !minutes}
                    accessibilityRole="button"
                    accessibilityLabel={editing ? 'Сохранить изменения' : 'Добавить тренировку'}
                    className={`overflow-hidden rounded-2xl ${!ex || !minutes ? 'opacity-40' : ''}`}
                  >
                    <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
                      <Text className="w-full py-3 text-center font-bold text-[18px] text-white">
                        {editing ? 'Сохранить' : 'Добавить тренировку'}
                      </Text>
                    </LinearGradient>
                  </Pressable>
                  {/* Чего не хватает до добавления — под приглушённой кнопкой */}
                  {!ex || !minutes ? (
                    <Text maxFontSizeMultiplier={1.2} className="text-center font-sans text-[15px] text-bear-dim">
                      {!ex && !minutes
                        ? 'Выберите активность и длительность'
                        : !ex
                          ? 'Выберите активность'
                          : 'Выберите длительность'}
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

// Плитка-статистика витрины (по шаблону): эмодзи, крупное значение,
// подпись. Значение с дожимом — «12,5 ч» и «1 048» помещаются даже
// на узком экране
function StatTile({ emoji, value, label }) {
  return (
    <View className="min-w-0 flex-1 items-center rounded-2xl bg-white/[0.04] px-0.5 py-2">
      <Text className="text-[14px] leading-none">{emoji}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.72}
        maxFontSizeMultiplier={1.1}
        className="mt-1 w-full text-center font-extrabold text-[15.5px] leading-tight text-bear-text"
      >
        {value}
      </Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={1.05}
        className="mt-0.5 w-full text-center font-sans text-[10.5px] leading-tight text-bear-sub2"
      >
        {label}
      </Text>
    </View>
  )
}

// Кольцо недели (по шаблону): % недельной нормы — 150 минут ВОЗ.
// Статичное (без анимации) — растёт с каждой записанной тренировкой,
// дельта к прошлой неделе стоит под ним отдельной строкой
function WeekRing({ pct, size = 76 }) {
  const sw = 8
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(100, pct)) / 100
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGrad id="wkRingGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#8B5CF6" />
            <Stop offset="1" stopColor="#A45BFF" />
          </SvgGrad>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={sw}
          fill="none"
        />
        {pct > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="url(#wkRingGrad)"
            strokeWidth={sw}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </Svg>
      <View className="absolute inset-0 items-center justify-center">
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          maxFontSizeMultiplier={1.1}
          className="text-center font-extrabold text-[19px] text-bear-text"
        >
          {`${Math.round(pct)}%`}
        </Text>
      </View>
    </View>
  )
}

// Плитка каталога: как на референсе — выбранная подсвечена фиолетовой
// рамкой с галочкой-бейджем в углу, у остальных мягкая серая граница
function ExButton({ e, exId, setExId }) {
  const active = exId === e.id
  const isCustom = e.id.startsWith('custom-')
  return (
    <Pressable
      onPress={() => setExId(e.id)}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={`relative min-w-0 flex-1 flex-row items-center gap-2 rounded-2xl border-2 px-2.5 py-2 ${
        active ? 'border-[#7B6CF6] bg-[#7B6CF6]/10' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <Text className="text-[24px]">{e.emoji}</Text>
      <View className="min-w-0 flex-1">
        <Text numberOfLines={1} className="font-bold text-[16px] text-bear-text">
          {e.name}
        </Text>
        <Text numberOfLines={1} className="font-sans text-[14px] text-bear-sub2">
          {`MET ${e.met}${isCustom ? ' · моё' : ''}`}
        </Text>
      </View>
      {active && (
        <View
          pointerEvents="none"
          className="absolute right-1.5 top-1.5 h-5 w-5 items-center justify-center rounded-full"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <Check size={13} color="#FFFFFF" />
        </View>
      )}
    </Pressable>
  )
}
