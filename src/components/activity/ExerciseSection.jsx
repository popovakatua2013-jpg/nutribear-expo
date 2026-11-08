// Секция «Тренировки» — КОМПАКТНАЯ ВЕРСИЯ (отзыв Кати: «блок тренировки
// мне не нравится — перепиши полностью и сделай компактно»).
// Вместо прежней витрины (4 плитки-статистики, hero-карточка с фото
// кроссовок, большое кольцо недели, «Популярные виды», карусель
// «повторить за день») — один лёгкий блок:
//   шапка:    🏋 Тренировки ······ мини-кольцо недели (44px, % нормы ВОЗ);
//             под заголовком — строка «2ч 30м за неделю · 5 трен»
//   записи:   компактные строки (сегодня — сверху, тап по сегодняшней
//             записи — изменить; справа день для прошлых записей);
//             если за сегодня пусто — кнопка «Повторить вчера …»
//   добавить: форма ВСЕГДА видна и занимает две строки —
//             [🚶 Выбрать ▾][мин][ккал] + [Сегодня|Вчера] [Записать];
//             список тренировок и форма своей — раскрываются под ней;
//             тап по сегодняшней записи превращает эту же форму в режим
//             изменения («Сохранить», корзина, перенос за вчера)
//   динамика: мини-график (высота 88) с пилюлями 7/30/90 — по-прежнему
//             только когда есть 2+ дня с данными
// Схема добавления Кати сохранена: список → время и ккал вручную →
// «Записать»; пустые калории считаются по формуле MET. Режим flat —
// без собственной карточки: секция встраивается в свёрнутый блок
// «Тренировок» на главной.

import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg'
import { useFocusEffect } from 'expo-router'
import { useExerciseStore, todayKey, syncHistoryBurned } from '@/store/useExerciseStore'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import {
  EXERCISES,
  CUSTOM_EMOJIS,
  INTENSITY_LEVELS,
  intensityMet,
  kcalBurned,
} from '@/lib/data/exercises'
import {
  WHO_WEEK_MIN,
  weekStats,
  workoutStreak,
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

// Периоды «Динамики» — пилюли
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
// прогулке/залу, о которых вспомнили после 00:00. Днём — «Сегодня».
function defaultDayOff() {
  return new Date().getHours() < 5 ? 1 : 0
}

// «1 запись / 2 записи / 5 записей» — для кнопки «Повторить»
function exNoun(n) {
  return n % 10 === 1 && n % 100 !== 11
    ? 'запись'
    : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)
      ? 'записи'
      : 'записей'
}

export function ExerciseSection({ flat = false }) {
  const logs = useExerciseStore((s) => s.logs)
  const addLog = useExerciseStore((s) => s.addLog)
  const { toast } = useToast()

  // Изменение записи: id записи из «сегодняшних» — форма (она всегда
  // видна) переключается в режим изменения; повторный тап по строке — отмена
  const [editId, setEditId] = useState(null)

  // Ключ дня — в состоянии и обновляется при каждом возврате на вкладку:
  // если приложение оставалось открытым через полночь, список «Сегодня»
  // без этого показывал бы вчерашние записи до первого ререндера
  const [key, setKey] = useState(todayKey)
  useFocusEffect(useCallback(() => { setKey(todayKey()) }, []))
  const items = logs[key] || []

  // ── Данные шапки и списков (чистые функции lib/data/exerciseStats) ──
  const week = useMemo(() => weekStats(logs), [logs])
  const exStreak = useMemo(() => workoutStreak(logs), [logs])
  // Число тренировок за 7 дней — для строки под заголовком
  const weekCount = useMemo(() => {
    let n = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      n += (logs[todayKey(d)] || []).length
    }
    return n
  }, [logs])
  // Последние записи: сегодня сверху, дальше прошлые дни (до 6 штук)
  const recent = useMemo(() => recentWorkouts(logs, 14, 6), [logs])
  // История прошлых дней: свернутость/раскрытость ЗАПОМИНАЕТСЯ
  // (просьба Кати: «пусть запоминает выбор, а не сворачивается каждый
  // раз») — храним в useUiPrefsStore.expanded, переживает перезапуск
  // приложения и возврат на вкладку. Дефолт — свёрнута.
  const histOpen = useUiPrefsStore((s) => Boolean(s.expanded['workouts-history']))
  const setHistOpen = (v) => useUiPrefsStore.getState().setExpanded('workouts-history', v)
  const todayRows = useMemo(() => recent.filter((e) => e.daysAgo === 0), [recent])
  const pastRows = useMemo(() => recent.filter((e) => e.daysAgo > 0), [recent])
  const [dynRange, setDynRange] = useState('7')
  const dynData = useMemo(() => dynamicsSeries(logs, Number(dynRange)), [logs, dynRange])
  // График имеет смысл только когда есть ЧТО сравнивать: одна запись
  // даёт кривую из одной точки — она дублирует список (отзыв Кати)
  const hasDyn = useMemo(() => dynData.filter((p) => p.value > 0).length >= 2, [dynData])

  // Ближайший прошлый день с тренировками — для кнопки «Повторить»
  // (показывается только пока за сегодня ничего не записано)
  const repDay = useMemo(() => {
    for (let i = 1; i <= 7; i++) {
      const d = new Date(Date.now() - i * 86400000)
      const k = todayKey(d)
      const list = logs[k]
      if (list && list.length) {
        return { key: k, list, label: dayLabel(i), kcal: list.reduce((s, e) => s + (Number(e.kcal) || 0), 0) }
      }
    }
    return null
  }, [logs])

  // Повторить ближайший прошлый день: копируем все его записи в сегодня
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
      } из «${repDay.label}» в сегодня`,
    })
  }

  // Тап по кольцу недели: минуты, серия, дельта к прошлой неделе
  function weekToast() {
    toast({
      title: `📅 Неделя: ${week.minutes} из ${WHO_WEEK_MIN} мин`,
      description:
        week.delta > 0
          ? `Серия: ${exStreak} дн · +${week.delta}% к прошлой неделе`
          : week.delta < 0
            ? `Серия: ${exStreak} дн · ${week.delta}% к прошлой неделе`
            : `Серия: ${exStreak} дн · норма недели — ${WHO_WEEK_MIN} мин (ВОЗ)`,
    })
  }

  return (
    <View
      accessibilityLabel="Тренировки"
      className={flat ? '' : 'rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-5'}
    >
      {/* ── Шапка: чип + заголовок + строка недели + мини-кольцо ───────── */}
      <View className="flex-row items-center gap-2.5">
        <BodyChip icon={<Dumbbell size={17} />} />
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[19px] tracking-tight text-bear-text">
            Тренировки
          </Text>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.15}
            className="font-sans text-[12.5px] leading-tight text-bear-sub2"
          >
            {`${fmtHours(week.minutes)} за неделю · ${weekCount} трен`}
          </Text>
        </View>
        <Pressable
          onPress={weekToast}
          accessibilityRole="button"
          accessibilityLabel={`Выполнено за неделю ${week.pct} процентов`}
          className="shrink-0 items-center justify-center active:opacity-80"
        >
          <MiniWeekRing pct={week.pct} />
        </Pressable>
      </View>

      {/* ── Записи: сегодня + ИСТОРИЯ ПРОШЛЫХ ДНЕЙ (свёрнута по умолчанию) ── */}
      {todayRows.length > 0 && (
        <View className="mt-1.5 gap-0.5">
          {todayRows.map((e) => {
            const isToday = e.daysAgo === 0
            const editingThis = isToday && editId === e.id
            const RowWrap = isToday ? Pressable : View
            return (
              <RowWrap
                key={`${e.daysAgo}-${e.id}`}
                onPress={isToday ? () => setEditId(editingThis ? null : e.id) : undefined}
                accessibilityRole={isToday ? 'button' : undefined}
                accessibilityLabel={isToday ? `Изменить ${e.name}` : undefined}
                className={`flex-row items-center gap-2.5 rounded-xl px-1.5 py-1.5 active:opacity-70 ${
                  editingThis ? 'bg-[#7B6CF6]/10' : ''
                }`}
              >
                <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                  <Text className="text-[16px]">{e.emoji}</Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                    className="font-bold text-[14.5px] leading-tight text-bear-text"
                  >
                    {e.name}
                  </Text>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.05}
                    className="font-sans text-[12px] leading-tight text-bear-sub2"
                  >
                    {`${e.minutes} мин · ${formatNum(e.kcal)} ккал`}
                  </Text>
                </View>
                {!isToday && (
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.05}
                    className="shrink-0 font-sans text-[12px] text-bear-dim"
                  >
                    {dayLabel(e.daysAgo)}
                  </Text>
                )}
                {isToday && (
                  <Pencil size={14} color={editingThis ? '#C4B5FD' : '#8B96B8'} />
                )}
              </RowWrap>
            )
          })}
        </View>
      )}

      {/* История прошлых дней: состояние помнится (useUiPrefsStore) */}
      {pastRows.length > 0 && (
        <Pressable
          onPress={() => setHistOpen(!histOpen)}
          accessibilityRole="button"
          accessibilityState={{ expanded: histOpen }}
          accessibilityLabel={histOpen ? 'Свернуть историю тренировок' : `Показать историю тренировок: ${pastRows.length} ${exNoun(pastRows.length)}`}
          className="mt-0.5 flex-row items-center gap-1 self-start rounded-lg px-1.5 py-2 active:opacity-70"
        >
          <Text className="font-semibold text-[13.5px] text-[#8DABFF]">
            {`История · ${pastRows.length}`}
          </Text>
          {histOpen ? (
            <ChevronUp size={14} color="#8DABFF" />
          ) : (
            <ChevronDown size={14} color="#8DABFF" />
          )}
        </Pressable>
      )}
      {histOpen && pastRows.length > 0 && (
        <View className="gap-0.5">
          {pastRows.map((e) => (
            <View
              key={`${e.daysAgo}-${e.id}`}
              className="flex-row items-center gap-2.5 rounded-xl px-1.5 py-1.5"
            >
              <View className="h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                <Text className="text-[16px]">{e.emoji}</Text>
              </View>
              <View className="min-w-0 flex-1">
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.1}
                  className="font-bold text-[14.5px] leading-tight text-bear-text"
                >
                  {e.name}
                </Text>
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.05}
                  className="font-sans text-[12px] leading-tight text-bear-sub2"
                >
                  {`${e.minutes} мин · ${formatNum(e.kcal)} ккал`}
                </Text>
              </View>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.05}
                className="shrink-0 font-sans text-[12px] text-bear-dim"
              >
                {dayLabel(e.daysAgo)}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Пусто сегодня: строка-подсказка + кнопка «Повторить …» */}
      {items.length === 0 && (
        <Text className="mt-2 px-1 font-sans text-[13px] text-bear-dim">
          {recent.length > 0 ? 'Сегодня тренировок ещё нет' : 'Пока пусто — добавьте первую ниже'}
        </Text>
      )}
      {repDay && items.length === 0 && (
        <Pressable
          onPress={repeatDay}
          accessibilityRole="button"
          accessibilityLabel={`Повторить тренировки за ${repDay.label}`}
          className="mt-1.5 self-start flex-row items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 active:opacity-70"
        >
          <RotateCcw size={13} color="#A78BFA" />
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.05}
            className="font-semibold text-[13px] text-bear-soft"
          >
            {`Повторить ${repDay.label.toLowerCase()} — ${repDay.list.length} ${exNoun(repDay.list.length)} · ${formatNum(repDay.kcal)} ккал`}
          </Text>
        </Pressable>
      )}

      {/* ── Форма добавления — всегда видна, две строки ────────────────── */}
      {/* Изменение: та же форма переключается в режим записи (remount
          по ключу), тап по строке ещё раз или «Отмена» — обратно к добавлению */}
      {editId ? (
        <WorkoutForm
          key={`edit-${editId}`}
          editing={items.find((e) => e.id === editId) || null}
          onDone={() => setEditId(null)}
          className="mt-2.5"
        />
      ) : (
        <WorkoutForm key="add" className="mt-2.5" />
      )}

      {/* ── Динамика: сожжённые ккал по дням, периоды 7/30/90 ──────────── */}
      {hasDyn && (
        <View className="mt-2.5 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <View className="flex-row items-center justify-between gap-2">
            <View className="min-w-0 flex-row items-center gap-1.5">
              <BarChart3 size={15} color="#A78BFA" />
              <Text className="font-bold text-[15px] text-bear-text">Динамика</Text>
            </View>
            <Pills
              items={DYN_RANGES}
              value={dynRange}
              onChange={setDynRange}
              size="sm"
              accessibilityLabel="Период динамики тренировок"
            />
          </View>
          <View className="mt-1">
            <SvgAreaChart
              data={dynData}
              color="#A78BFA"
              height={88}
              yFmt={(v) => formatNum(Math.round(v))}
              bare
              lastBadge
            />
          </View>
        </View>
      )}
    </View>
  )
}

// ── Форма «добавить/изменить тренировку» — компактная, всегда видна ─────
// Строка 1: [выбор тренировки ▾][время, мин][калории];
// строка 2: [Сегодня | Вчера] ····· [Записать].
// Схема Кати: список → время и ккал вручную → записать. Калории можно
// оставить пустыми — тогда считает формула MET; вписанная цифра
// (тренажёр, часы) точнее — запишется она. Изменение: та же форма
// с данными записи, «Сохранить» и корзиной; «Вчера» переносит запись.
// Свои тренировки: «＋ Своя тренировка» в списке — название, иконка,
// интенсивность; запоминается между сессиями.
function WorkoutForm({ editing = null, onDone, className = '' }) {
  const weightKg = useProfileStore((s) => s.weightKg)
  const addLog = useExerciseStore((s) => s.addLog)
  const updateLog = useExerciseStore((s) => s.updateLog)
  const removeLog = useExerciseStore((s) => s.removeLog)
  const custom = useExerciseStore((s) => s.custom)
  const addCustom = useExerciseStore((s) => s.addCustom)
  const updateCustom = useExerciseStore((s) => s.updateCustom)
  const removeCustom = useExerciseStore((s) => s.removeCustom)
  const { toast } = useToast()

  // День записи: 0 — сегодня, 1 — вчера. Для новой тренировки после
  // полуночи по умолчанию «Вчера» (см. defaultDayOff), при изменении
  // 0 — запись остаётся в своём дне, «Вчера» — перенести её туда
  const [dayOff, setDayOff] = useState(editing ? 0 : defaultDayOff)
  const [exId, setExId] = useState(editing ? editing.exId : null)
  // Время — строка поля (вручную, схема Кати)
  const [minutesStr, setMinutesStr] = useState(editing ? String(editing.minutes) : '')
  // Калории — строка поля: пусто → расчёт по формуле, число → вручную
  const [kcalStr, setKcalStr] = useState(editing && editing.manual ? String(editing.kcal) : '')
  // Выпадающий список тренировок: раскрыт/свёрнут
  const [listOpen, setListOpen] = useState(false)

  // Форма своей тренировки (внутри списка)
  const [creating, setCreating] = useState(false)
  const [editingCustomId, setEditingCustomId] = useState(null)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🔥')
  const [newLevel, setNewLevel] = useState('mid')
  const [newMode, setNewMode] = useState('level') // level | kcal
  const [newKcal30, setNewKcal30] = useState('')
  // Свёрнутый блок формы: иконка — одна строка с текущим выбором,
  // сетка раскрывается только по тапу
  const [emojiOpen, setEmojiOpen] = useState(false)

  // Каталог + запомненные свои тренировки
  const allExercises = useMemo(() => [...EXERCISES, ...custom], [custom])
  const ex = allExercises.find((e) => e.id === exId)
  const minutesNum = Math.round(Number(minutesStr) || 0)
  const autoKcal = ex && minutesNum ? kcalBurned(ex.met, weightKg, minutesNum) : 0
  const kcalNum = Math.round(Number(String(kcalStr).replace(',', '.')) || 0)
  const kcalEmpty = !String(kcalStr).trim()

  // Превью формы своей тренировки: MET из калорий за 30 минут (если режим
  // «ккал» и введено число) или из выбранного уровня — для живого примера
  const kcal30Num = Number(String(newKcal30).replace(',', '.')) || 0
  const kcalMet = metFromKcal30(kcal30Num, weightKg)
  const previewMet = newMode === 'kcal' ? kcalMet : intensityMet(newLevel)

  function resetCreate() {
    setCreating(false)
    setEditingCustomId(null)
    setNewName('')
    setNewEmoji('🔥')
    setNewLevel('mid')
    setNewMode('level')
    setNewKcal30('')
    setEmojiOpen(false)
  }

  // После успешной записи форма остаётся на месте (добавить ещё одну),
  // но с чистыми полями
  function resetFields() {
    setExId(null)
    setMinutesStr('')
    setKcalStr('')
    setDayOff(defaultDayOff())
    setListOpen(false)
    resetCreate()
  }

  // Создать свою тренировку с чистого листа (список прячем — вместо
  // него раскрывается форма)
  function startCreate() {
    resetCreate()
    setCreating(true)
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
      toast({ title: '✏️ Изменено', description: `«${name}» обновлена` })
      resetCreate()
      return
    }
    const exObj = { id: `custom-${makeId()}`, name, emoji: newEmoji, met }
    addCustom(exObj)
    setExId(exObj.id)
    toast({
      title: `${exObj.emoji} «${name}» запомнена`,
      description: 'Теперь она всегда в списке тренировок',
    })
    resetCreate()
  }

  // Удалить свою тренировку из списка (записи дневника не пропадают)
  function forgetCustom() {
    if (!ex) return
    removeCustom(ex.id)
    setExId(null)
    toast({ title: '🗑 Удалено', description: `«${ex.name}» больше не в списке` })
  }

  // Записать: проверяем поля и добавляем/сохраняем запись
  function save() {
    if (!ex) {
      toast({
        title: '❗ Выберите тренировку',
        description: 'Раскройте список и выберите вид',
      })
      return
    }
    if (!minutesNum || minutesNum < 1) {
      toast({ title: '❗ Укажите время', description: 'Впишите минуты — например, 30' })
      return
    }
    if (minutesNum > 600) {
      toast({ title: '❗ Слишком долго', description: 'Максимум 600 минут за запись' })
      return
    }
    let kcal
    let manual = false
    if (!kcalEmpty) {
      if (kcalNum < 1 || kcalNum > KCAL_MAX) {
        toast({
          title: '❗ Неверные калории',
          description: `Число от 1 до ${formatNum(KCAL_MAX)} — или оставьте поле пустым`,
        })
        return
      }
      kcal = kcalNum
      manual = true
    } else {
      kcal = autoKcal
    }
    const payload = { exId: ex.id, name: ex.name, emoji: ex.emoji, minutes: minutesNum, kcal }
    if (manual) payload.manual = true
    if (editing) {
      if (dayOff) {
        // Перенос записи за вчера: убираем из сегодняшних, пишем
        // во вчерашний день — «сожжено» обоих дней сразу пересчитывается
        // в дневной истории (календарь, сводка, отчёты)
        removeLog(todayKey(), editing.id)
        const d = new Date()
        d.setDate(d.getDate() - dayOff)
        const movedKey = todayKey(d)
        addLog(movedKey, payload)
        syncHistoryBurned(movedKey)
        syncHistoryBurned(todayKey())
        toast({
          title: `${ex.emoji} ${ex.name} — за вчера`,
          description: `${minutesNum} мин · ${formatNum(kcal)} ккал · запись перенесена`,
        })
      } else {
        updateLog(todayKey(), editing.id, payload)
        syncHistoryBurned(todayKey())
        toast({
          title: `${ex.emoji} ${ex.name} — изменено`,
          description: `${minutesNum} мин · ${formatNum(kcal)} ккал${
            manual ? ' · вручную' : ''
          }`,
        })
      }
      onDone?.()
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
        title: `${ex.emoji} ${ex.name} — ${minutesNum} мин`,
        description: `Сожжено ${formatNum(kcal)} ккал · записано${
          dayOff ? ' за вчера' : ''
        }`,
      })
      resetFields()
    }
  }

  // Удалить запись (корзина в режиме изменения)
  function deleteEntry() {
    if (!editing) return
    removeLog(todayKey(), editing.id)
    syncHistoryBurned(todayKey())
    toast({ title: '🗑 Удалено', description: `${editing.name} убрана из дневника` })
    onDone?.()
  }

  return (
    <View
      className={`rounded-2xl border border-white/10 bg-white/[0.04] p-2.5 ${className}`}
    >
      {/* Строка 1: выбор тренировки + время + калории */}
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => setListOpen((v) => !v)}
          accessibilityRole="button"
          accessibilityLabel={listOpen ? 'Скрыть список тренировок' : 'Выбрать тренировку'}
          className="min-w-0 flex-1 flex-row items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2.5 py-2 active:opacity-70"
        >
          {ex ? (
            <Text className="text-[19px]">{ex.emoji}</Text>
          ) : (
            <View
              className="h-6 w-6 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: 'rgba(123,108,246,0.18)' }}
            >
              <Dumbbell size={14} color="#A78BFA" />
            </View>
          )}
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={1.1}
            className={`min-w-0 flex-1 font-semibold text-[14.5px] ${ex ? 'text-bear-text' : 'text-bear-dim'}`}
          >
            {ex ? ex.name : 'Выбрать тренировку'}
          </Text>
          {listOpen ? (
            <ChevronUp size={16} color="#A5AECB" />
          ) : (
            <ChevronDown size={16} color="#A5AECB" />
          )}
        </Pressable>
        <TextInput
          value={minutesStr}
          onChangeText={setMinutesStr}
          keyboardType="number-pad"
          maxLength={3}
          placeholder="мин"
          placeholderTextColor="#8B96B8"
          accessibilityLabel="Время тренировки в минутах"
          className="w-[54px] shrink-0 rounded-xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[16px] text-bear-text"
        />
        <TextInput
          value={kcalStr}
          onChangeText={setKcalStr}
          keyboardType="number-pad"
          maxLength={5}
          placeholder={autoKcal ? `≈${formatNum(autoKcal)}` : 'ккал'}
          placeholderTextColor="#8B96B8"
          accessibilityLabel="Сожжённые калории — вручную"
          className="w-[62px] shrink-0 rounded-xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[16px] text-bear-text"
        />
      </View>

      {/* Выбрана своя тренировка — её можно изменить или удалить */}
      {ex && ex.id.startsWith('custom-') && !creating && (
        <View className="mt-1.5 flex-row items-center gap-4 pl-1">
          <Pressable
            onPress={startEditCustom}
            accessibilityRole="button"
            accessibilityLabel={`Изменить ${ex.name}`}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Pencil size={12} color="#A5AECB" />
            <Text className="font-sans text-[12.5px] text-bear-sub2">Изменить</Text>
          </Pressable>
          <Pressable
            onPress={forgetCustom}
            accessibilityRole="button"
            accessibilityLabel={`Удалить ${ex.name} из моих тренировок`}
            className="flex-row items-center gap-1 active:opacity-70"
          >
            <Trash2 size={12} color="#98A2C2" />
            <Text className="font-sans text-[12.5px] text-bear-sub2">Удалить из списка</Text>
          </Pressable>
        </View>
      )}

      {/* Раскрытый список тренировок: каталог + свои, внизу —
          «Своя тренировка» с формой запоминания */}
      {listOpen && !creating && (
        <View className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
          <ScrollView
            style={{ maxHeight: 210 }}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            {allExercises.map((e) => {
              const active = exId === e.id
              const isCustom = e.id.startsWith('custom-')
              return (
                <Pressable
                  key={e.id}
                  onPress={() => {
                    setExId(e.id)
                    setListOpen(false)
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={e.name}
                  accessibilityState={{ selected: active }}
                  className={`flex-row items-center gap-2.5 border-b border-white/5 px-3 py-2 active:opacity-70 ${
                    active ? 'bg-[#7B6CF6]/10' : ''
                  }`}
                >
                  <Text className="text-[18px]">{e.emoji}</Text>
                  <Text
                    numberOfLines={1}
                    maxFontSizeMultiplier={1.1}
                    className={`min-w-0 flex-1 font-semibold text-[14.5px] ${
                      active ? 'text-[#C4B5FD]' : 'text-bear-text'
                    }`}
                  >
                    {e.name}
                  </Text>
                  {isCustom && (
                    <Text className="shrink-0 font-sans text-[11.5px] text-bear-dim">моё</Text>
                  )}
                  {active && (
                    <View
                      className="shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: '#7B6CF6', width: 18, height: 18 }}
                    >
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              )
            })}
            {/* Своя тренировка: создаётся один раз, запоминается */}
            <Pressable
              onPress={startCreate}
              accessibilityRole="button"
              accessibilityLabel="Создать свою тренировку"
              className="flex-row items-center justify-center gap-1.5 py-2.5 active:opacity-70"
            >
              <Plus size={15} color="#A5AECB" />
              <Text className="font-bold text-[14.5px] text-bear-soft">Своя тренировка</Text>
            </Pressable>
          </ScrollView>
        </View>
      )}

      {/* Форма своей тренировки — вместо списка, прямо в панели */}
      {listOpen && creating && (
        <View className="mt-2 gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
          <View>
            <Text className="mb-1 font-sans text-[13.5px] text-bear-sub2">Название</Text>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              maxLength={24}
              placeholder="Например: Бокс, скакалка, падел"
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Название своей тренировки"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 font-sans text-[16px] text-bear-text"
            />
          </View>

          {/* Иконка — свёрнута: одна строка с текущим выбором,
              сетка раскрывается только по тапу */}
          <View>
            <Text className="mb-1 font-sans text-[13.5px] text-bear-sub2">Иконка</Text>
            <Pressable
              onPress={() => setEmojiOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={emojiOpen ? 'Скрыть выбор иконки' : 'Выбрать иконку'}
              className="flex-row items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 active:opacity-70"
            >
              <Text className="text-[19px]">{newEmoji}</Text>
              <Text className="min-w-0 flex-1 font-semibold text-[14.5px] text-bear-soft">
                {emojiOpen ? 'Свернуть' : 'Выбрать иконку'}
              </Text>
              {emojiOpen ? (
                <ChevronUp size={16} color="#A5AECB" />
              ) : (
                <ChevronDown size={16} color="#A5AECB" />
              )}
            </Pressable>
            {emojiOpen && (
              <View className="mt-1.5 flex-row flex-wrap gap-1.5">
                {CUSTOM_EMOJIS.map((em) => (
                  <Pressable
                    key={em}
                    onPress={() => setNewEmoji(em)}
                    accessibilityLabel={`Иконка ${em}`}
                    accessibilityRole="button"
                    className={`h-8 w-8 items-center justify-center rounded-lg border ${
                      newEmoji === em
                        ? 'border-[#6c8cff]/60 bg-[#6c8cff]/10'
                        : 'border-white/5 bg-white/[0.03]'
                    }`}
                  >
                    <Text className="text-[18px]">{em}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View>
            <Text className="mb-1 font-sans text-[13.5px] text-bear-sub2">
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
              <View className="mt-1.5">
                <Pills
                  items={INTENSITY_LEVELS}
                  value={newLevel}
                  onChange={setNewLevel}
                  size="md"
                  accessibilityLabel="Интенсивность"
                />
              </View>
            ) : (
              <View className="mt-1.5 gap-1">
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={newKcal30}
                    onChangeText={setNewKcal30}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="300"
                    placeholderTextColor="#8B96B8"
                    accessibilityLabel="Калории за 30 минут"
                    className="w-24 rounded-xl border border-white/10 bg-white/5 py-1.5 text-center font-bold text-[16px] text-bear-text"
                  />
                  <Text className="min-w-0 flex-1 font-sans text-[12.5px] leading-snug text-bear-sub2">
                    ккал за 30 минут этой активности — цифра с тренажёра или часов
                  </Text>
                </View>
                {kcalMet && (
                  <Text className="font-sans text-[12.5px] text-bear-dim">
                    {`≈ MET ${Math.round(kcalMet * 10) / 10} · как ${
                      closestExercise(kcalMet).emoji
                    } ${closestExercise(kcalMet).name.toLowerCase()}`}
                  </Text>
                )}
              </View>
            )}
            {previewMet && (
              <Text className="mt-1.5 font-sans text-[13px] leading-snug text-bear-sub2">
                Пример: 30 минут — ≈{' '}
                <Text className="font-bold text-[#f87171]">
                  {formatNum(kcalBurned(previewMet, weightKg, 30))} ккал
                </Text>{' '}
                при весе {weightKg} кг
              </Text>
            )}
          </View>

          <View className="flex-row gap-2">
            <Pressable
              onPress={resetCreate}
              accessibilityLabel="Отмена"
              className="shrink-0 items-center justify-center rounded-xl bg-white/5 px-4 py-2 active:opacity-70"
            >
              <Text className="font-bold text-[14.5px] text-bear-soft">Отмена</Text>
            </Pressable>
            <Pressable
              onPress={saveCustom}
              accessibilityRole="button"
              accessibilityLabel="Запомнить тренировку"
              className="min-w-0 flex-1 items-center justify-center rounded-xl py-2 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text className="font-bold text-[14.5px] text-white">
                {editingCustomId ? 'Сохранить' : 'Запомнить'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Строка 2: день записи + Записать. Для новой — куда записать
          (после полуночи по умолчанию «Вчера»), при изменении выбор
          «Вчера» переносит запись в предыдущий день */}
      <View className="mt-2 flex-row items-center gap-2">
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
        <View className="min-w-0 flex-1" />
        <Pressable
          onPress={save}
          accessibilityRole="button"
          accessibilityLabel={editing ? 'Сохранить изменения' : 'Записать тренировку'}
          className="shrink-0 overflow-hidden rounded-xl active:opacity-80"
        >
          <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['#7B6CF6', '#A45BFF']}>
            <Text className="px-4 py-2 text-center font-bold text-[15.5px] text-white">
              {editing ? 'Сохранить' : 'Записать'}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>

      {/* Подсказки — по одной короткой строке, только когда нужны */}
      {editing && dayOff ? (
        <Text className="mt-1 px-1 font-sans text-[12px] text-bear-dim">
          Сохраните — запись перенесётся за вчера
        </Text>
      ) : null}
      {!editing && ex && minutesNum > 0 && kcalEmpty && autoKcal > 0 ? (
        <Text className="mt-1 px-1 font-sans text-[12px] leading-snug text-bear-dim">
          {`Пусто — посчитаем сами: ≈ ${formatNum(autoKcal)} ккал за ${minutesNum} мин (вес ${weightKg} кг)`}
        </Text>
      ) : null}

      {/* Режим изменения: удалить запись или вернуться к добавлению */}
      {editing && (
        <View className="mt-1.5 flex-row items-center justify-between px-1">
          <Pressable
            onPress={deleteEntry}
            accessibilityRole="button"
            accessibilityLabel={`Удалить ${editing.name}`}
            className="flex-row items-center gap-1.5 py-1 active:opacity-70"
          >
            <Trash2 size={14} color="#f87171" />
            <Text className="font-semibold text-[13px] text-[#f87171]">Удалить</Text>
          </Pressable>
          <Pressable
            onPress={onDone}
            accessibilityRole="button"
            accessibilityLabel="Отмена изменения"
            hitSlop={6}
            className="py-1 active:opacity-70"
          >
            <Text className="font-sans text-[13px] text-bear-dim">Отмена</Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

// Мини-кольцо недели в шапке: % недельной нормы — 150 минут ВОЗ.
// Статичное (без анимации) — растёт с каждой записанной тренировкой;
// тап по нему показывает минуты, серию и дельту к прошлой неделе
function MiniWeekRing({ pct, size = 44 }) {
  const sw = 5
  const r = (size - sw) / 2
  const c = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(100, pct)) / 100
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGrad id="miniWkRingGrad" x1="0" y1="0" x2="1" y2="1">
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
            stroke="url(#miniWkRingGrad)"
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
          maxFontSizeMultiplier={1.05}
          className="text-center font-extrabold text-[11.5px] text-bear-text"
        >
          {`${Math.round(pct)}%`}
        </Text>
      </View>
    </View>
  )
}
