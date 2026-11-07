// Секция «Тренировки»: РЕДДИЗАЙН ПО ШАБЛОНУ (референс Кати — тёмно-
// фиолетовый фитнес-экран): 4 плитки-статистики (ккал за сегодня,
// часы за неделю, дней подряд, % недели от 150 мин ВОЗ), hero-карточка
// «Сегодняшняя тренировка» с фото и градиентной кнопкой, рядом кольцо
// «Выполнено за неделю» с дельтой к прошлой неделе, «Динамика»
// (сожжённые за день, 7/30/90), «Популярные виды» (топ за 30 дней)
// и «Последние тренировки».
//
// Добавление — ПО СХЕМЕ КАТИ (отзыв: «при раскрытии добавить
// тренировку — раскрывающийся список — выбор тренировки — указать
// время и кал вручную — записать»): тап «Добавить тренировку» больше
// НЕ открывает отдельное окно — прямо в секции раскрывается панель:
//   1) выпадающий список «Выбор тренировки» (каталог + свои);
//   2) время и калории — два поля, оба вписываются вручную;
//   3) кнопка «Записать».
// Калории можно оставить пустыми — посчитаем по формуле MET (вес
// берём из профиля); вписанная вручную цифра (с тренажёра или часов)
// всегда точнее — она и запишется. Свою тренировку пользователь
// создаёт сам: название, иконка, интенсивность — запоминается между
// сессиями. Изменение записи — тап по сегодняшней строке в «Последних
// тренировках»: та же панель раскрывается прямо в списке, с кнопкой
// удаления. Режим flat — без собственной карточки: секция
// встраивается в свёрнутый блок «Тренировки» на главной.

import { useCallback, useMemo, useState } from 'react'
import { ImageBackground, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Dumbbell,
  History,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Star,
  Trash2,
  X,
} from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Svg, { Circle, Defs, LinearGradient as SvgGrad, Stop } from 'react-native-svg'
import { useFocusEffect } from 'expo-router'
import { useExerciseStore, todayKey, dayBurned, syncHistoryBurned } from '@/store/useExerciseStore'
import { useProfileStore } from '@/store/useProfileStore'
import { shortWeekday } from '@/lib/data/activity'
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
// прогулке/залу, о которых вспомнили после 00:00. Раньше панель
// открывалась с «Сегодня», и такие записи уходили в новый день:
// назавтра в сводке горели «сожжено за сегодня», хотя ничего
// не добавляли. Днём — как раньше, «Сегодня».
function defaultDayOff() {
  return new Date().getHours() < 5 ? 1 : 0
}

export function ExerciseSection({ flat = false }) {
  const logs = useExerciseStore((s) => s.logs)
  const addLog = useExerciseStore((s) => s.addLog)
  const { toast } = useToast()

  // Панель добавления: раскрыта/свёрнута (схема Кати — без отдельного окна)
  const [addOpen, setAddOpen] = useState(false)
  // Изменение записи: id записи из «Последних тренировок» — панель
  // раскрывается прямо на месте строки
  const [editId, setEditId] = useState(null)

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
  // Число тренировок за 7 дней — для плитки «Тренировок»: раньше плитка
  // «Прогресс» показывала те же % , что и кольцо рядом (дубль), а
  // «Тренировок» подписывалась под минутами. Развели: минуты — отдельно,
  // количество — отдельно (отзыв Кати: «дублируется одно и то же»)
  const weekCount = useMemo(() => {
    let n = 0
    for (let i = 0; i < 7; i++) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      n += (logs[todayKey(d)] || []).length
    }
    return n
  }, [logs])
  const exStreak = useMemo(() => workoutStreak(logs), [logs])
  const popular = useMemo(() => popularTypes(logs, 30), [logs])
  const recent = useMemo(() => recentWorkouts(logs, 14, 6), [logs])
  const [dynRange, setDynRange] = useState('7')
  const dynData = useMemo(() => dynamicsSeries(logs, Number(dynRange)), [logs, dynRange])
  // График имеет смысл только когда есть ЧТО сравнивать: одна запись
  // даёт кривую из одной точки — она дублирует hero и «Последние»
  // (отзыв Кати: «дублируется одно и то же»). Показываем от 2 дней
  const hasDyn = useMemo(() => dynData.filter((p) => p.value > 0).length >= 2, [dynData])
  // Самая свежая тренировка за сегодня — лицо hero-карточки
  const hero = items[0] || null

  // Раскрыть/свернуть панель добавления (закрывая форму изменения)
  function toggleAdd() {
    setEditId(null)
    setAddOpen((v) => !v)
  }

  // Изменить запись: панель раскрывается прямо в «Последних тренировках»
  function openEdit(entry) {
    setAddOpen(false)
    setEditId(entry.id)
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
          onPress={toggleAdd}
          className="flex-row items-center gap-1 rounded-full bg-white/5 px-3 py-1.5 active:opacity-70"
        >
          {addOpen ? <X size={16} color="#AEB9D9" /> : <Plus size={16} color="#AEB9D9" />}
          <Text className="font-bold text-[16.5px] text-bear-soft">
            {addOpen ? 'Свернуть' : 'Добавить'}
          </Text>
        </Pressable>
      </View>

      {/* Повтор активности за прошлый день: стрелками выбираем любой
          из последних 7 дней с тренировками, кнопка копирует в сегодня.
          Показываем только пока за сегодня НИЧЕГО не записано: после
          записи этот блок дублировал hero и «Последние тренировки»
          (отзыв Кати: «дублируется одно и то же») */}
      {repDay && items.length === 0 && (
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
                .join(' · ')}
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
        <StatTile emoji="🔥" value={formatNum(burned)} label="Ккал сегодня" />
        <StatTile emoji="⏱" value={fmtHours(week.minutes)} label="За неделю" />
        <StatTile emoji="🏆" value={String(exStreak)} label="Дней подряд" />
        <StatTile emoji="🏋️" value={String(weekCount)} label="Тренировок" />
      </View>

      <View className="mt-2 flex-row gap-2">
        {/* Hero «Сегодняшняя тренировка» (шаблон): точка-статус и заголовок
            на всю ширину карточки, запись (плитка + название) с фото-акцентом
            справа, кнопка — на всю ширину карточки: на узких экранах (360dp)
            ничего не пережимается и не обрезается. Метрики записи — своей
            строкой под названием. Тап по кнопке РАСКРЫВАЕТ панель добавления
            прямо под карточкой (схема Кати) */}
        <View
          className="min-w-0 flex-1 overflow-hidden rounded-3xl border border-white/10"
          style={{ backgroundColor: 'rgba(123,108,246,0.10)' }}
        >
          <View className="px-3.5 pt-3">
            <View className="flex-row items-center gap-1.5">
              <View
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: hero ? '#4ADE80' : 'rgba(255,255,255,0.25)' }}
              />
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.1}
                className="min-w-0 flex-1 font-semibold text-[13px] text-bear-sub"
              >
                Сегодняшняя тренировка
              </Text>
            </View>
            <View className="mt-2.5 flex-row items-center gap-2">
              <View
                className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: 'rgba(123,108,246,0.22)' }}
              >
                <Text className="text-[22px]">{hero ? hero.emoji : '🏃'}</Text>
              </View>
              <Text
                numberOfLines={hero ? 1 : 2}
                maxFontSizeMultiplier={1.15}
                className="min-w-0 flex-1 font-bold text-[16.5px] leading-tight text-bear-text"
              >
                {hero ? hero.name : 'Тренировок ещё нет'}
              </Text>
              {hero && (
                <ImageBackground
                  source={SNEAKERS}
                  style={{ width: 60, height: 44, borderRadius: 14 }}
                  imageStyle={{ resizeMode: 'cover', borderRadius: 14 }}
                  accessibilityLabel="Кроссовки"
                />
              )}
            </View>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              maxFontSizeMultiplier={1.1}
              className="mt-1 font-sans text-[13px] leading-tight text-bear-sub2"
            >
              {hero
                ? `${hero.minutes} мин · ${formatNum(hero.kcal)} ккал`
                : recent.length > 0
                  ? `Последняя — ${dayLabel(recent[0].daysAgo).toLowerCase()} · повторите сегодня`
                  : 'Добавьте первую — прогулка тоже считается'}
            </Text>
          </View>
          {/* Кнопка — на всю ширину карточки: раскрывает/сворачивает
              панель добавления под hero (референс: широкая градиентная кнопка) */}
          <Pressable
            onPress={toggleAdd}
            accessibilityRole="button"
            accessibilityLabel={addOpen ? 'Свернуть панель добавления' : 'Добавить тренировку'}
            className="mt-2.5 overflow-hidden active:opacity-80"
          >
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['#7B6CF6', '#A45BFF']}>
              <View className="flex-row items-center justify-center gap-1.5 py-2.5">
                {addOpen ? (
                  <ChevronUp size={15} color="#FFFFFF" />
                ) : (
                  <Play size={15} color="#FFFFFF" />
                )}
                <Text
                  numberOfLines={1}
                  maxFontSizeMultiplier={1.05}
                  className="font-bold text-[14.5px] text-white"
                >
                  {addOpen ? 'Свернуть' : 'Добавить тренировку'}
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
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
          className="w-[104px] shrink-0 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.03] py-3 active:opacity-80"
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

      {/* ── Панель добавления (схема Кати): список → время/ккал → записать ── */}
      {addOpen && (
        <View className="mt-2">
          <WorkoutForm onDone={() => setAddOpen(false)} />
        </View>
      )}

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

      {/* Популярные виды: топ за 30 дней по минутам — плитки 2×2
          с эмодзи и суммой часов, как на шаблоне. Один вид — это всё
          ещё та же запись, что в hero и «Последних»: показываем только
          когда есть из чего выбирать (отзыв Кати о дублях) */}
      {popular.length >= 2 && (
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
          Тап по сегодняшней записи раскрывает ПАНЕЛЬ ИЗМЕНЕНИЯ прямо на
          месте строки (та же форма, что у добавления): правка времени и
          калорий, перенос за вчера, корзина — удаление. Прошлые дни —
          просто история, справа зелёная галочка */}
      {recent.length > 0 && (
        <View className="mt-2 rounded-3xl border border-white/10 bg-white/[0.03] p-3.5">
          <View className="flex-row items-center gap-1.5">
            <History size={16} color="#8B96B8" />
            <Text className="font-bold text-[16px] text-bear-text">Последние тренировки</Text>
          </View>
          <View className="mt-1.5 gap-0.5">
            {recent.map((e) => {
              const isToday = e.daysAgo === 0
              if (isToday && editId === e.id) {
                return (
                  <WorkoutForm
                    key={`edit-${e.id}`}
                    editing={e}
                    className="mt-1"
                    onDone={() => setEditId(null)}
                  />
                )
              }
              const RowWrap = isToday ? Pressable : View
              return (
                <RowWrap
                  key={`${e.daysAgo}-${e.id}`}
                  onPress={isToday ? () => openEdit(e) : undefined}
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
    </View>
  )
}

// ── Панель «добавить/изменить тренировку» (схема Кати) ──────────────────
// Раскрывается прямо в секции, без отдельного окна:
//   1) «Выбор тренировки» — выпадающий список (каталог + свои, внизу
//      «＋ Своя тренировка» с формой запоминания);
//   2) «Время, мин» и «Калории» — два поля, оба вписываются вручную;
//   3) «Записать» — добавляет (или сохраняет изменения).
// Калории можно оставить пустыми — тогда считает формула MET; вписанная
// цифра (тренажёр, часы) точнее — запишется она. Изменение: та же панель
// с данными записи, «Сохранить» и корзиной; «Вчера» переносит запись.
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
    }
    onDone()
  }

  // Удалить запись (корзина в панели изменения)
  function deleteEntry() {
    if (!editing) return
    removeLog(todayKey(), editing.id)
    syncHistoryBurned(todayKey())
    toast({ title: '🗑 Удалено', description: `${editing.name} убрана из дневника` })
    onDone()
  }

  return (
    <View
      className={`overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] ${className}`}
    >
      {/* Шапка панели: что сейчас делаем + закрыть */}
      <View className="flex-row items-center gap-2 border-b border-white/10 px-4 pb-2.5 pt-3">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={1.1}
          className="min-w-0 flex-1 font-bold text-[17px] text-bear-text"
        >
          {editing ? 'Изменить тренировку' : 'Новая тренировка'}
        </Text>
        <Pressable
          onPress={onDone}
          accessibilityLabel="Закрыть"
          hitSlop={6}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 active:opacity-70"
        >
          <X size={18} color="#A5AECB" />
        </Pressable>
      </View>

      <View className="gap-3 px-4 pb-4 pt-3">
        {/* День записи: подпись и пилюли в одной строке. Для новой — куда
            записать (после полуночи по умолчанию «Вчера»), при изменении
            выбор «Вчера» переносит запись в предыдущий день */}
        <View>
          <View className="flex-row flex-wrap items-center justify-between gap-x-2.5 gap-y-1.5">
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
            <Text className="mt-1 font-sans text-[13.5px] text-bear-dim">
              Сохраните — запись перенесётся за вчера
            </Text>
          ) : null}
        </View>

        {/* 1. Выбор тренировки — выпадающий список (схема Кати) */}
        <View>
          <Text className="mb-1.5 font-sans text-[15px] text-bear-sub2">Выбор тренировки</Text>
          <Pressable
            onPress={() => setListOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={listOpen ? 'Скрыть список тренировок' : 'Выбрать тренировку'}
            className="flex-row items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 active:opacity-70"
          >
            {ex ? (
              <Text className="text-[22px]">{ex.emoji}</Text>
            ) : (
              <View
                className="h-7 w-7 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: 'rgba(123,108,246,0.18)' }}
              >
                <Dumbbell size={16} color="#A78BFA" />
              </View>
            )}
            <Text
              numberOfLines={1}
              maxFontSizeMultiplier={1.1}
              className={`min-w-0 flex-1 font-semibold text-[16.5px] ${ex ? 'text-bear-text' : 'text-bear-dim'}`}
            >
              {ex ? ex.name : 'Выберите тренировку'}
            </Text>
            {listOpen ? (
              <ChevronUp size={18} color="#A5AECB" />
            ) : (
              <ChevronDown size={18} color="#A5AECB" />
            )}
          </Pressable>

          {/* Выбрана своя тренировка — её можно изменить или удалить */}
          {ex && ex.id.startsWith('custom-') && !creating && (
            <View className="mt-1.5 flex-row items-center gap-5 pl-1">
              <Pressable
                onPress={startEditCustom}
                accessibilityRole="button"
                accessibilityLabel={`Изменить ${ex.name}`}
                className="flex-row items-center gap-1.5 active:opacity-70"
              >
                <Pencil size={13} color="#A5AECB" />
                <Text className="font-sans text-[14px] text-bear-sub2">Изменить</Text>
              </Pressable>
              <Pressable
                onPress={forgetCustom}
                accessibilityRole="button"
                accessibilityLabel={`Удалить ${ex.name} из моих тренировок`}
                className="flex-row items-center gap-1.5 active:opacity-70"
              >
                <Trash2 size={13} color="#98A2C2" />
                <Text className="font-sans text-[14px] text-bear-sub2">Удалить из списка</Text>
              </Pressable>
            </View>
          )}

          {/* Раскрытый список тренировок: каталог + свои, внизу —
              «Своя тренировка» с формой запоминания */}
          {listOpen && !creating && (
            <View className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              <ScrollView
                style={{ maxHeight: 248 }}
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
                      className={`flex-row items-center gap-2.5 border-b border-white/5 px-3.5 py-2.5 active:opacity-70 ${
                        active ? 'bg-[#7B6CF6]/10' : ''
                      }`}
                    >
                      <Text className="text-[20px]">{e.emoji}</Text>
                      <Text
                        numberOfLines={1}
                        maxFontSizeMultiplier={1.1}
                        className={`min-w-0 flex-1 font-semibold text-[15.5px] ${
                          active ? 'text-[#C4B5FD]' : 'text-bear-text'
                        }`}
                      >
                        {e.name}
                      </Text>
                      {isCustom && (
                        <Text className="shrink-0 font-sans text-[12px] text-bear-dim">моё</Text>
                      )}
                      {active && (
                        <View
                          className="h-5 w-5 shrink-0 items-center justify-center rounded-full"
                          style={{ backgroundColor: '#7B6CF6' }}
                        >
                          <Check size={13} color="#FFFFFF" />
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
                  className="flex-row items-center justify-center gap-2 py-3 active:opacity-70"
                >
                  <Plus size={16} color="#A5AECB" />
                  <Text className="font-bold text-[15px] text-bear-soft">Своя тренировка</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {/* Форма своей тренировки — вместо списка, прямо в панели */}
          {listOpen && creating && (
            <View className="mt-2 gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <View>
                <Text className="mb-1.5 font-sans text-[14.5px] text-bear-sub2">Название</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  maxLength={24}
                  placeholder="Например: Бокс, скакалка, падел"
                  placeholderTextColor="#8B96B8"
                  accessibilityLabel="Название своей тренировки"
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 font-sans text-[17px] text-bear-text"
                />
              </View>

              {/* Иконка — свёрнута: одна строка с текущим выбором,
                  сетка раскрывается только по тапу */}
              <View>
                <Text className="mb-1.5 font-sans text-[14.5px] text-bear-sub2">Иконка</Text>
                <Pressable
                  onPress={() => setEmojiOpen((v) => !v)}
                  accessibilityRole="button"
                  accessibilityLabel={emojiOpen ? 'Скрыть выбор иконки' : 'Выбрать иконку'}
                  className="flex-row items-center gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 active:opacity-70"
                >
                  <Text className="text-[22px]">{newEmoji}</Text>
                  <Text className="min-w-0 flex-1 font-semibold text-[15.5px] text-bear-soft">
                    {emojiOpen ? 'Свернуть' : 'Выбрать иконку'}
                  </Text>
                  {emojiOpen ? (
                    <ChevronUp size={17} color="#A5AECB" />
                  ) : (
                    <ChevronDown size={17} color="#A5AECB" />
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
                        <Text className="text-[20px]">{em}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>

              <View>
                <Text className="mb-1.5 font-sans text-[14.5px] text-bear-sub2">
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
                  <View className="mt-2">
                    <Pills
                      items={INTENSITY_LEVELS}
                      value={newLevel}
                      onChange={setNewLevel}
                      size="md"
                      accessibilityLabel="Интенсивность"
                    />
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
                        className="w-24 rounded-2xl border border-white/10 bg-white/5 py-2 text-center font-bold text-[17px] text-bear-text"
                      />
                      <Text className="min-w-0 flex-1 font-sans text-[13.5px] leading-snug text-bear-sub2">
                        ккал за 30 минут этой активности — цифра с тренажёра или часов
                      </Text>
                    </View>
                    {kcalMet && (
                      <Text className="font-sans text-[13.5px] text-bear-dim">
                        {`≈ MET ${Math.round(kcalMet * 10) / 10} · как ${
                          closestExercise(kcalMet).emoji
                        } ${closestExercise(kcalMet).name.toLowerCase()}`}
                      </Text>
                    )}
                  </View>
                )}
                {previewMet && (
                  <Text className="mt-2 font-sans text-[14px] leading-snug text-bear-sub2">
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
                  className="shrink-0 items-center justify-center rounded-xl bg-white/5 px-4 py-2.5 active:opacity-70"
                >
                  <Text className="font-bold text-[15.5px] text-bear-soft">Отмена</Text>
                </Pressable>
                <Pressable
                  onPress={saveCustom}
                  accessibilityRole="button"
                  accessibilityLabel="Запомнить тренировку"
                  className="min-w-0 flex-1 items-center justify-center rounded-xl py-2.5 active:opacity-80"
                  style={{ backgroundColor: '#7B6CF6' }}
                >
                  <Text className="font-bold text-[15.5px] text-white">
                    {editingCustomId ? 'Сохранить' : 'Запомнить'}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* 2. Время и калории — оба вписываются вручную (схема Кати).
            Калории можно оставить пустыми: тогда посчитаем по формуле
            MET, подсказка под полями покажет сколько получается */}
        <View className="flex-row gap-2.5">
          <View className="min-w-0 flex-1">
            <Text className="mb-1.5 font-sans text-[15px] text-bear-sub2">Время, мин</Text>
            <TextInput
              value={minutesStr}
              onChangeText={setMinutesStr}
              keyboardType="number-pad"
              maxLength={3}
              placeholder="30"
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Время тренировки в минутах"
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center font-bold text-[19px] text-bear-text"
            />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="mb-1.5 font-sans text-[15px] text-bear-sub2">Калории</Text>
            <TextInput
              value={kcalStr}
              onChangeText={setKcalStr}
              keyboardType="number-pad"
              maxLength={5}
              placeholder={autoKcal ? `≈${formatNum(autoKcal)}` : '—'}
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Сожжённые калории — вручную"
              className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-center font-bold text-[19px] text-bear-text"
            />
          </View>
        </View>
        {ex && minutesNum > 0 && kcalEmpty && autoKcal > 0 ? (
          <Text className="-mt-1.5 font-sans text-[13.5px] leading-snug text-bear-dim">
            {`Пусто — посчитаем сами: ≈ ${formatNum(autoKcal)} ккал за ${minutesNum} мин при весе ${weightKg} кг. Впишите свою цифру (тренажёр, часы) — запишется она.`}
          </Text>
        ) : null}

        {/* 3. Записать: добавляет тренировку (при изменении — «Сохранить»
            и корзина). Без серых блокировок: если чего-то не хватает,
            подсказка придёт тостом */}
        <View className="mt-0.5 flex-row items-center gap-2">
          <Pressable
            onPress={save}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Сохранить изменения' : 'Записать тренировку'}
            className="min-w-0 flex-1 overflow-hidden active:opacity-80"
          >
            <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} colors={['#7B6CF6', '#A45BFF']}>
              <Text className="w-full py-3 text-center font-bold text-[17.5px] text-white">
                {editing ? 'Сохранить' : 'Записать'}
              </Text>
            </LinearGradient>
          </Pressable>
          {editing && (
            <Pressable
              onPress={deleteEntry}
              accessibilityRole="button"
              accessibilityLabel={`Удалить ${editing.name}`}
              className="h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl active:opacity-70"
              style={{ backgroundColor: 'rgba(248,113,113,0.12)' }}
            >
              <Trash2 size={18} color="#f87171" />
            </Pressable>
          )}
        </View>
      </View>
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
