// Раздел «Меню на неделю» вкладки «План» — встраивается в общий скролл
// PlanScreen, поэтому корень — View, а не ScrollView.
// Редизайн 1:1 с макетом Кати от 08.11 (IMG_20261108_230729): ОДНА
// карточка с шапкой «плитка + заголовок + навигация недели ‹ 2–8 ноя ›»,
// полоса дней Пн–Вс с датами (выбранный день — фиолетовая рамка + точка
// — как активная вкладка), приёмы пищи строками («эмодзи-плитка +
// название + блюда + ккал» и фиолетовый «+»), внизу «Показать все
// приёмы пищи ⌄» — раскрывает перекус. Действия дня и недели — серые
// значки БЕЗ подписей под шапкой карточки (просьба Кати 09.11:
// выпадающий список с подписями раздувал низ карточки).
// Заполненные дни помечены точкой. Пока неделя пустая —
// карточка «Как это работает». Тап по «+» — окно «Добавить блюдо» (база
// продуктов или своё блюдо, галочка «в покупки»). Тап по пилюле
// «80 г · 200 ккал» — правка граммовки (GramsModal). Тап по названию
// блюда — замены «похожее по ккал» из базы продуктов (SwapDishModal,
// просьба Кати 10.11). «Шаблоны» — сохранить любимый день меню и
// вставить его в любой день одним тапом (просьба Кати 10.11).
// Копирование дня, очистка дня/недели, «взять меню прошлой недели»;
// на сегодняшнем дне —
// «В дневник»: переносит блюда в дневник питания через
// useFoodStore.addEntry (полный БЖУ по граммовке).
// Режим compact — узкая колонка: «Меню на неделю» стоит РЯДОМ с
// «Интервальным питанием» (макет Кати от 09.11): дни без месяца,
// ккал по приёму столбиком, сокращённые пилюли блюд; вся
// функциональность сохранена.
// Кнопка «Добавить рецепт» переехала ИЗ этой карточки в правую колонку
// PlanScreen — под «Интервальное питание», в пустое место (просьба Кати
// 09.11); окно рецептов и запись рецепта теперь тоже живут там же.
// Палитра — planPalette.js (цвета приложения), сетка и шрифты — theme.js.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Bookmark, BookmarkPlus, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardCheck, Copy, Eraser, History, Plus, Trash2, X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { tapGuard } from '@/lib/tap-guard'
import { buildFood } from '@/lib/data/pick'
import { useFoodStore } from '@/store/useFoodStore'
import {
  dayDate, dayKcal, MEAL_EMOJI, MEAL_IDS, MEAL_NAMES,
  useMealPlanStore, weekKeyOf, weekKeyShift, WEEKDAYS,
} from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { HintBox } from '../ui/HintBox'
import { AddDishModal } from './AddDishModal'
import { GramsModal } from './GramsModal'
import { SwapDishModal } from './SwapDishModal'
import { P } from './planPalette'
import { spacing, radius, F, type } from '@/features/workouts/theme'

const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек']

// Максимум шаблонов дней: без ограничителя список растёт бесконечно
const MAX_TPL = 12

const WEEKDAYS_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье']

// Подсказка для пустой недели (исчезает, как только неделя заполнена)
const HOW_STEPS = [
  'Выберите день в полосе Пн–Вс: заполненные дни помечены точкой',
  '«+» у приёма — найдите продукт: порция и ккал считаются сами, галочка «в покупки» — для того, чего нет дома',
  'Тап по названию приёма — показать/скрыть блюда; тап по «80 г · 200 ккал» — изменить порцию',
]

// «1 блюдо / 2 блюда / 5 блюд» — для подписей доступности
const dishWord = (n) => {
  const m10 = Math.abs(Math.round(n)) % 10
  const m100 = Math.abs(Math.round(n)) % 100
  if (m10 === 1 && m100 !== 11) return 'блюдо'
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return 'блюда'
  return 'блюд'
}

const pad = (n) => String(n).padStart(2, '0')

const dayKeyOfDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

const fmtDate = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`

export function MealPlanScreen({ compact = false }) {
  const { toast } = useToast()
  const [weekKey, setWeekKey] = useState(() => weekKeyOf(new Date()))
  const [sel, setSel] = useState(0) // выбранный день 0…6
  const [picker, setPicker] = useState(null) // { dayIdx, mealId }
  const [copyFrom, setCopyFrom] = useState(null) // idx дня-источника
  const [gramsFor, setGramsFor] = useState(null) // { dayIdx, mealId, itemId }
  // Раскрытые приёмы (после добавления сворачиваются — просьба Кати)
  const [openMeals, setOpenMeals] = useState({})
  // «Показать все приёмы пищи»: перекус + действия дня; по умолчанию
  // видно три строки (Завтрак / Обед / Ужин) — как в макете
  const [showAll, setShowAll] = useState(false)
  // Замены блюда («похожее по ккал», просьба Кати 10.11): тап по
  // названию блюда открывает окно замен из базы продуктов
  const [swapFor, setSwapFor] = useState(null) // { mealId, itemId }
  // Шаблоны дней (просьба Кати 10.11): сохранить любимый день меню
  // и вставить его в любой день одним тапом
  const [tplOpen, setTplOpen] = useState(false)
  const [tplName, setTplName] = useState('')

  const plan = useMealPlanStore((s) => s.plans[weekKey])
  const templates = useMealPlanStore((s) => s.templates)

  const store = useMealPlanStore
  const todayKey = dayKeyOfDate(new Date())
  const todayIdx = useMemo(() => {
    const idx = WEEKDAYS.findIndex((_, i) => dayKeyOfDate(dayDate(weekKey, i)) === todayKey)
    return idx // -1 — неделя без сегодня (листаем прошлое/будущее)
  }, [weekKey, todayKey])

  // При входе в текущую неделю сразу открываем сегодняшний день
  useEffect(() => {
    if (todayIdx >= 0) setSel(todayIdx)
  }, [todayIdx])

  const week = plan || {}

  const countDay = (idx) =>
    MEAL_IDS.reduce((n, m) => n + (week[idx]?.[m]?.length || 0), 0)

  const weekDishes = useMemo(
    () => WEEKDAYS.reduce((acc, _, i) => acc + countDay(i), 0), // eslint-disable-line react-hooks/exhaustive-deps
    [week],
  )
  const weekEmpty = weekDishes === 0

  const weekLabel = useMemo(() => {
    const a = dayDate(weekKey, 0)
    const b = dayDate(weekKey, 6)
    const sameMonth = a.getMonth() === b.getMonth()
    // Компактный формат для шапки карточки: «2–8 ноя» / «29 сен–5 окт»
    return sameMonth
      ? `${a.getDate()}–${b.getDate()} ${MONTHS[b.getMonth()]}`
      : `${fmtDate(a)}–${fmtDate(b)}`
  }, [weekKey])

  const day = week[sel]
  const selKcal = dayKcal(day)
  const dayDishes = countDay(sel)
  const isSelToday = sel === todayIdx

  // Три приёма всегда, перекус — за «Показать все» (действия теперь
  // — серые значки под шапкой, просьба Кати 09.11)
  const visibleMeals = showAll ? MEAL_IDS : MEAL_IDS.slice(0, 3)

  const onPick = (item) => {
    if (!picker) return
    store.getState().addItem(weekKey, picker.dayIdx, picker.mealId, item)
    setOpenMeals((s) => ({ ...s, [picker.mealId]: false }))
    toast({
      title: `${item.emoji} ${item.name}`,
      description: `${item.grams} г · ${formatNum(item.kcal)} ккал — в «${MEAL_NAMES[picker.mealId]}»${item.shopAdded ? ' · 🛒 добавлено в покупки' : ''}`,
    })
    setPicker(null)
  }

  const removeItem = (mealId, itemId) =>
    store.getState().removeItem(weekKey, sel, mealId, itemId)

  const saveGrams = (g) => {
    if (!gramsFor) return
    const { mealId, itemId } = gramsFor
    const it = (day?.[mealId] || []).find((x) => x.id === itemId)
    store.getState().updateGrams(weekKey, sel, mealId, itemId, g)
    const kcal = Math.round(((Number(it?.kcal100) || 0) * g) / 100)
    toast({
      title: '⚖️ Порция обновлена',
      description: `${it?.name || 'Блюдо'}: ${g} г · ${formatNum(kcal)} ккал`,
    })
    setGramsFor(null)
  }

  const clearDay = () => {
    Alert.alert(`Очистить ${WEEKDAYS_FULL[sel].toLowerCase()}?`, 'Меню этого дня будет удалено.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: () => store.getState().clearDay(weekKey, sel) },
    ])
  }

  const doCopy = (toIdx) => {
    if (copyFrom === null || toIdx === copyFrom) {
      setCopyFrom(null)
      return
    }
    store.getState().copyDay(weekKey, copyFrom, weekKey, toIdx)
    toast({ title: '📋 День скопирован', description: `${WEEKDAYS[copyFrom]} → ${WEEKDAYS[toIdx]}` })
    setCopyFrom(null)
  }

  const copyPrevWeek = () => {
    const ok = store.getState().copyPrevWeek(weekKey)
    toast(
      ok
        ? { title: '📋 Прошлая неделя скопирована', description: 'Меню можно подправить по дням' }
        : { title: 'У прошлой недели нет меню', description: 'Сначала заполните её в разделе «Меню»' },
    )
  }

  const clearWeek = () => {
    Alert.alert('Очистить неделю?', 'Меню всех семи дней будет удалено.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Очистить', style: 'destructive', onPress: () => store.getState().clearWeek(weekKey) },
    ])
  }

  // ─── Шаблоны дней: сохранить выбранный день / вставить шаблон ───
  const saveTemplate = () => {
    if (countDay(sel) === 0) {
      toast({ title: 'День пустой', description: 'Сначала добавьте блюда — потом сохраните день в шаблон' })
      return
    }
    if (templates.length >= MAX_TPL) {
      toast({ title: 'Шаблоны заполнены', description: `Максимум ${MAX_TPL} — удалите лишний крестиком` })
      return
    }
    const tpl = store.getState().saveDayAsTemplate(weekKey, sel, tplName)
    if (!tpl) return
    setTplName('')
    toast({
      title: `💾 «${tpl.name}» — в шаблонах`,
      description: 'Вставить в любой день: кнопка «Шаблоны» — один тап',
    })
  }

  const applyTemplate = (tpl) => {
    const ok = store.getState().applyTemplate(tpl.id, weekKey, sel)
    if (!ok) return
    toast({
      title: '🗓️ Шаблон вставлен',
      description: `${tpl.name} → ${WEEKDAYS_FULL[sel].toLowerCase()}, меню дня заменено`,
    })
    setTplOpen(false)
  }

  const delTemplate = (tpl) => {
    Alert.alert(`Удалить шаблон «${tpl.name}»?`, 'Меню в днях недели останется — удалится только шаблон.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: () => store.getState().removeTemplate(tpl.id) },
    ])
  }

  // ─── Замены блюда: тап по названию → окно «похожее по ккал» ───
  const onSwapReplace = (newItem) => {
    if (!swapFor) return
    const { mealId, itemId } = swapFor
    const old = (day?.[mealId] || []).find((x) => x.id === itemId)
    store.getState().replaceItem(weekKey, sel, mealId, itemId, newItem)
    toast({
      title: '🔁 Блюдо заменено',
      description: `${old?.name || 'Блюдо'} → ${newItem.name}: ${newItem.grams} г · ${formatNum(newItem.kcal)} ккал`,
    })
    setSwapFor(null)
  }

  // Перенос меню в дневник: защита от двойного тапа — двойной тап
  // переносил всё меню дважды (урок из отзывов конкурента).
  // Проверка «меню пустое» — ДО защиты: неудачная попытка не должна
  // съедать следующую
  const transferOnce = useRef(tapGuard()).current
  const transferToDiary = () => {
    if (!day) return
    const total = MEAL_IDS.reduce((acc, m) => acc + (day[m]?.length || 0), 0)
    if (!total) {
      toast({ title: 'Меню дня пустое', description: 'Сначала добавьте блюда' })
      return
    }
    transferOnce(() => {
      let n = 0
      for (const mealId of MEAL_IDS) {
        for (const it of day[mealId] || []) {
          useFoodStore.getState().addEntry(mealId, {
            food: buildFood({
              id: it.source === 'custom' ? undefined : it.id,
              name: it.name, emoji: it.emoji, kcal100: it.kcal100,
              p: it.p, f: it.f, c: it.c, source: it.source,
            }),
            grams: it.grams, kcal: it.kcal, desc: '',
          })
          n += 1
        }
      }
      toast({ title: '🍽️ Меню перенесено в дневник', description: `Сегодня: ${n} блюд` })
    })
  }

  return (
    <View style={styles.card}>
      {/* Шапка карточки: плитка + заголовок + навигация недели.
          В компактном режиме навигация недели переносится на строку
          под заголовком (flexWrap: заголовку хватает ширины) */}
      <View style={styles.cardHead}>
        <View style={styles.iconTile}>
          <CalendarDays size={compact ? 14 : 16} color={P.accentText} />
        </View>
        <Text
          style={[styles.cardTitle, compact && styles.cardTitleC]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
        >
          Меню на неделю
        </Text>
        <View style={styles.weekNav}>
          <Pressable
            onPress={() => setWeekKey(weekKeyShift(weekKey, -1))}
            style={styles.weekArrow}
            accessibilityLabel="Прошлая неделя"
          >
            <ChevronLeft size={16} color={P.text2} />
          </Pressable>
          <Text style={styles.weekLabel} numberOfLines={1}>{weekLabel}</Text>
          <Pressable
            onPress={() => setWeekKey(weekKeyShift(weekKey, 1))}
            style={styles.weekArrow}
            accessibilityLabel="Следующая неделя"
          >
            <ChevronRight size={16} color={P.text2} />
          </Pressable>
        </View>
      </View>

      {/* Действия дня и недели — серые значки БЕЗ подписей под шапкой
          (просьба Кати 09.11: выпадающий список с подписями раздувал
          низ карточки). Поведение то же: копия дня, шаблоны, очистка
          дня, «в дневник» (только на сегодняшнем дне), меню прошлой
          недели, очистка недели */}
      <View style={styles.headActions}>
        <Pressable onPress={() => setCopyFrom(sel)} style={styles.headAction} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Копировать меню ${WEEKDAYS_FULL[sel]}`}>
          <Copy size={13} color={P.text2} />
        </Pressable>
        <Pressable onPress={() => setTplOpen(true)} style={styles.headAction} hitSlop={6} accessibilityRole="button" accessibilityLabel="Шаблоны дней: сохранить выбранный день или вставить шаблон">
          <Bookmark size={13} color={P.text2} />
        </Pressable>
        <Pressable onPress={clearDay} style={styles.headAction} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Очистить ${WEEKDAYS_FULL[sel]}`}>
          <Eraser size={13} color={P.text2} />
        </Pressable>
        {isSelToday && (
          <Pressable onPress={transferToDiary} style={styles.headAction} hitSlop={6} accessibilityRole="button" accessibilityLabel="Перенести меню дня в дневник">
            <ClipboardCheck size={13} color={P.text2} />
          </Pressable>
        )}
        <Pressable onPress={copyPrevWeek} style={styles.headAction} hitSlop={6} accessibilityRole="button" accessibilityLabel="Взять меню прошлой недели">
          <History size={13} color={P.text2} />
        </Pressable>
        <Pressable onPress={clearWeek} style={styles.headAction} hitSlop={6} accessibilityRole="button" accessibilityLabel="Очистить всю неделю">
          <Trash2 size={13} color={P.text2} />
        </Pressable>
      </View>

      {/* Полоса дней Пн–Вс с датами — как в макете: выбранный день в
          лаймовой рамке с точкой, заполненные дни — с точкой */}
      <View style={styles.daysStrip}>
        {WEEKDAYS.map((label, idx) => {
          const active = idx === sel
          const filled = countDay(idx) > 0
          const isToday = idx === todayIdx
          const d = dayDate(weekKey, idx)
          return (
            <Pressable
              key={idx}
              onPress={() => setSel(idx)}
              style={styles.dayCol}
              accessibilityLabel={`${WEEKDAYS_FULL[idx]}, ${d.getDate()}.${d.getMonth() + 1},${filled ? ' меню заполнено' : ' пусто'}`}
              accessibilityState={{ selected: active }}
            >
              <View
                style={[
                  styles.dayBox,
                  compact && styles.dayBoxC,
                  active && styles.dayBoxOn,
                  !active && isToday && styles.dayBoxToday,
                ]}
              >
                <Text style={[styles.dayName, active && styles.dayNameOn]}>{label}</Text>
                <Text style={[styles.dayNum, active && styles.dayNumOn]}>
                  {/* в компактном режиме — только число: месяц виден в
                      надписи недели «2–8 ноя» */}
                  {compact ? d.getDate() : `${d.getDate()}.${d.getMonth() + 1}`}
                </Text>
              </View>
              <View style={[styles.dayDot, filled && styles.dayDotOn]} />
            </Pressable>
          )
        })}
      </View>

      {/* Подсказка для пустой недели — свёрнута в строку по умолчанию,
          тап раскрывает шаги, крестик закрывает насовсем (отзыв Кати).
          Строки приёмов с «+» видны ВСЕГДА (выбор Кати: раньше при пустой
          неделе был только текст подсказки, и было неясно, куда вводить
          продукты) */}
      {weekEmpty && (
        <HintBox id="mealplan-how" steps={HOW_STEPS} />
      )}
      <>
          {/* Шапка выбранного дня: название + план дня в ккал */}
          <View style={styles.dayHead}>
            <Text style={styles.dayName2} numberOfLines={1}>
              {WEEKDAYS_FULL[sel]}
              {isSelToday ? ' · сегодня' : ''}
            </Text>
            {dayDishes > 0 && (
              <View style={styles.kcalPill}>
                {/* «по плану» — чтобы не путать план дня со «съедено» из «Прогресса» */}
                <Text numberOfLines={1} style={styles.kcalPillText}>по плану · {formatNum(selKcal)} ккал</Text>
              </View>
            )}
          </View>

          {/* Приёмы пищи строками — как в макете; тап — раскрыть блюда,
              «+» — добавить */}
          {visibleMeals.map((mealId) => {
            const items = day?.[mealId] || []
            const open = Boolean(openMeals[mealId])
            const mealKcal = items.reduce((n, it) => n + (Number(it.kcal) || 0), 0)
            const summary = items.length
              ? items.length === 1
                ? items[0].name
                : `${items[0].name} и ещё ${items.length - 1}`
              : 'пусто'
            return (
              <View key={mealId} style={styles.mealBlock}>
                <Pressable
                  onPress={() => setOpenMeals((s) => ({ ...s, [mealId]: !s[mealId] }))}
                  style={[styles.mealRow, compact && styles.mealRowC]}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={
                    `${MEAL_NAMES[mealId]}: ${items.length ? `${items.length} ${dishWord(items.length)}, ${formatNum(mealKcal)} ккал` : 'пусто'}. Тап — ${open ? 'скрыть' : 'показать'} блюда`
                  }
                >
                  <View style={[styles.mealTile, compact && styles.mealTileC]}>
                    <Text style={{ fontSize: compact ? 13 : 15 }}>{MEAL_EMOJI[mealId]}</Text>
                  </View>
                  <View style={styles.mealTexts}>
                    <Text numberOfLines={1} style={[styles.mealName, compact && styles.mealNameC]}>{MEAL_NAMES[mealId]}</Text>
                    <Text numberOfLines={1} style={[styles.mealSummary, compact && styles.mealSummaryC]}>{summary}</Text>
                  </View>
                  {items.length > 0 && (
                    compact ? (
                      /* компактно: ккал столбиком — число + «ккал» */
                      <View style={styles.mealKcalCol}>
                        <Text style={styles.mealKcalVal}>{formatNum(mealKcal)}</Text>
                        <Text style={styles.mealKcalUnit}>ккал</Text>
                      </View>
                    ) : (
                      <Text style={styles.mealKcal}>{formatNum(mealKcal)} ккал</Text>
                    )
                  )}
                  <Pressable
                    onPress={() => setPicker({ dayIdx: sel, mealId })}
                    style={[styles.mealAdd, compact && styles.mealAddC]}
                    hitSlop={6}
                    accessibilityLabel={`${MEAL_NAMES[mealId]}: добавить блюдо`}
                  >
                    <Plus size={compact ? 11 : 13} color={P.accentText} />
                  </Pressable>
                </Pressable>
                {open && items.map((it) => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemEmoji}>{it.emoji}</Text>
                    <Pressable
                      onPress={() => setSwapFor({ mealId, itemId: it.id })}
                      style={styles.itemNameBtn}
                      accessibilityLabel={`${it.name}: заменить на похожее по ккал`}
                    >
                      <Text style={styles.itemName} numberOfLines={1}>{it.name}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setGramsFor({ dayIdx: sel, mealId, itemId: it.id })}
                      style={[styles.itemMetaBtn, compact && styles.itemMetaBtnC]}
                      accessibilityLabel={`Изменить порцию: ${it.name}`}
                    >
                      {/* компактно — только граммы: ккал по приёму видны
                          столбиком справа от названия приёма */}
                      <Text
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                        style={[styles.itemMeta, compact && styles.itemMetaC]}
                      >
                        {compact ? `${it.grams} г` : `${it.grams} г · ${formatNum(it.kcal)} ккал`}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeItem(mealId, it.id)}
                      style={[styles.itemDel, compact && styles.itemDelC]}
                      hitSlop={6}
                      accessibilityLabel="Убрать блюдо"
                    >
                      <X size={13} color={P.text3} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )
          })}

          {/* «Показать все приёмы пищи» — раскрывает перекус (действия
              переехали под шапку). Ровная строка (отзыв Кати 09.11):
              без сжатия шрифта — на узкой карточке подпись короче
              («Все приёмы пищи»), чтобы влезала целиком и не съезжала */}
          <Pressable
            style={styles.showAll}
            onPress={() => setShowAll((v) => !v)}
            accessibilityRole="button"
            accessibilityState={{ expanded: showAll }}
            accessibilityLabel={showAll ? 'Скрыть перекус' : 'Показать все приёмы пищи'}
          >
            <Text style={styles.showAllText} numberOfLines={1}>
              {showAll ? 'Скрыть' : compact ? 'Все приёмы пищи' : 'Показать все приёмы пищи'}
            </Text>
            {showAll
              ? <ChevronUp size={13} color={P.text2} />
              : <ChevronDown size={13} color={P.text2} />}
          </Pressable>
      </>

      {/* Окно добавления блюда */}
      <AddDishModal open={!!picker} onClose={() => setPicker(null)} onPick={onPick} />

      {/* Окно правки граммовки блюда */}
      <GramsModal
        item={gramsFor ? (day?.[gramsFor.mealId] || []).find((x) => x.id === gramsFor.itemId) : null}
        onClose={() => setGramsFor(null)}
        onSave={saveGrams}
      />

      {/* Окно замен блюда: «похожее по ккал» из базы — тап по названию
          блюда (просьба Кати 10.11); порция замены подгоняется под те
          же ккал, что у текущего блюда */}
      <SwapDishModal
        item={swapFor ? (day?.[swapFor.mealId] || []).find((x) => x.id === swapFor.itemId) : null}
        onClose={() => setSwapFor(null)}
        onReplace={onSwapReplace}
      />

      {/* Окно копирования дня: куда */}
      <Modal visible={copyFrom !== null} transparent animationType="fade" onRequestClose={() => setCopyFrom(null)}>
        <Pressable style={styles.copyBackdrop} onPress={() => setCopyFrom(null)}>
          <Pressable style={styles.copySheet} onPress={() => {}}>
            <Text style={styles.copyTitle}>Куда скопировать {copyFrom !== null ? WEEKDAYS[copyFrom] : ''}?</Text>
            <View style={styles.copyGrid}>
              {WEEKDAYS.map((label, toIdx) => (
                <Pressable
                  key={toIdx}
                  onPress={() => doCopy(toIdx)}
                  style={[styles.copyPill, toIdx === copyFrom && styles.copyPillOff]}
                  disabled={toIdx === copyFrom}
                >
                  <Text style={[styles.copyPillText, toIdx === copyFrom && { color: P.text3 }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.copyHint}>Меню выбранного дня будет заменено</Text>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Окно шаблонов дней: список + сохранение выбранного дня.
          Тап по шаблону — вставить в выбранный день одним тапом
          (просьба Кати 10.11: «сохраняешь любимый день меню и вставляешь
          его на любой день одним тапом») */}
      <Modal visible={tplOpen} transparent animationType="fade" onRequestClose={() => setTplOpen(false)}>
        <Pressable style={styles.copyBackdrop} onPress={() => setTplOpen(false)}>
          <Pressable style={styles.tplSheet} onPress={() => {}}>
            <Text style={styles.copyTitle}>Шаблоны дней</Text>
            <Text style={styles.tplHint}>
              Тап по шаблону — вставить в {WEEKDAYS_FULL[sel].toLowerCase()}, меню дня заменится
            </Text>
            {templates.length === 0 ? (
              <Text style={styles.tplEmpty}>
                Пока нет шаблонов — заполни день и сохрани его внизу: любимое меню вставится в любой день одним тапом
              </Text>
            ) : (
              <View style={styles.tplList}>
                {templates.map((t) => (
                  <View key={t.id} style={styles.tplRow}>
                    <Pressable
                      onPress={() => applyTemplate(t)}
                      style={styles.tplMain}
                      accessibilityRole="button"
                      accessibilityLabel={`Вставить шаблон «${t.name}» в ${WEEKDAYS_FULL[sel].toLowerCase()}`}
                    >
                      <Text style={styles.tplName} numberOfLines={1}>{t.name}</Text>
                      <Text style={styles.tplMeta} numberOfLines={1}>
                        {formatNum(t.kcal)} ккал · {t.dishes} {dishWord(t.dishes)}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => delTemplate(t)}
                      style={styles.tplDel}
                      hitSlop={6}
                      accessibilityLabel={`Удалить шаблон «${t.name}»`}
                    >
                      <Trash2 size={14} color={P.text3} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <View style={styles.tplSaveRow}>
              <TextInput
                style={styles.tplInput}
                placeholder="Название шаблона"
                placeholderTextColor={P.text3}
                value={tplName}
                onChangeText={setTplName}
                maxLength={30}
                accessibilityLabel="Название шаблона, например Любимый день"
              />
              <Pressable
                onPress={saveTemplate}
                style={styles.tplSaveBtn}
                accessibilityRole="button"
                accessibilityLabel="Сохранить меню выбранного дня как шаблон"
              >
                <BookmarkPlus size={15} color={P.accentInk} />
                <Text style={styles.tplSaveText}>Сохранить день</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = {
  // Карточка «Меню на неделю» — единый контейнер, как в макете
  card: {
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: 22,
    padding: spacing.l,
    marginTop: spacing.l,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: P.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { ...type.title, fontSize: 15.5, color: P.text, flex: 1 },
  // компактный режим: заголовок ужается сам, навигация недели
  // переносится под него (minWidth выталкивает её на новую строку)
  cardTitleC: { fontSize: 13.5, minWidth: 100 },
  weekNav: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  weekArrow: { width: 24, height: 28, alignItems: 'center', justifyContent: 'center' },
  weekLabel: { fontSize: 12, fontWeight: '600', fontFamily: F[600], color: P.text2, minWidth: 52, textAlign: 'center' },

  // Полоса дней: имя + дата в рамке у выбранного, точка у заполненных
  daysStrip: { flexDirection: 'row', gap: 4, marginTop: 10 },
  dayCol: { flex: 1, alignItems: 'center', gap: 3 },
  dayBox: {
    width: '100%',
    height: 40,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  dayBoxOn: { borderColor: P.accentText, backgroundColor: 'rgba(123,108,246,0.14)' },
  dayBoxC: { height: 34 },
  dayBoxToday: { borderColor: 'rgba(255,255,255,0.16)' },
  dayName: { fontSize: 11.5, fontWeight: '700', fontFamily: F[700], color: P.text2 },
  dayNameOn: { color: P.accentText },
  dayNum: { fontSize: 10, fontWeight: '600', fontFamily: F[600], color: P.text3 },
  dayNumOn: { color: P.text },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  dayDotOn: { backgroundColor: P.accentText },

  // Шапка дня: название + пилюля «по плану · N ккал»
  dayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.s,
    marginTop: spacing.m,
  },
  dayName2: { ...type.title, fontSize: 15.5, color: P.text, flex: 1 },
  kcalPill: {
    backgroundColor: P.accentSoft,
    borderColor: P.accentBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  kcalPillText: { fontSize: 12, fontWeight: '700', fontFamily: F[700], color: P.accentText },

  // Строки приёмов: плитка-эмодзи + название + блюда + ккал + «+»
  mealBlock: { marginTop: 8 },
  mealRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 42 },
  // компактный режим: ужаться, чтобы строка поместилась в узкую колонку
  mealRowC: { gap: 5, minHeight: 36 },
  mealTile: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: P.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealTileC: { width: 24, height: 24, borderRadius: 8 },
  mealTexts: { flex: 1, minWidth: 0 },
  mealName: { fontSize: 14.5, fontWeight: '700', fontFamily: F[700], color: P.text },
  mealNameC: { fontSize: 13 },
  mealSummary: { fontSize: 12, fontWeight: '400', fontFamily: F[400], color: P.text3, marginTop: 1 },
  mealSummaryC: { fontSize: 11 },
  mealKcal: { fontSize: 13, fontWeight: '700', fontFamily: F[700], color: P.text },
  mealAdd: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: P.accentSoft,
    borderColor: P.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealAddC: { width: 22, height: 22, borderRadius: 11 },
  // ккал по приёму столбиком (компактный режим)
  mealKcalCol: { alignItems: 'flex-end', flexShrink: 0 },
  mealKcalVal: { fontSize: 12.5, fontWeight: '800', fontFamily: F[800], color: P.text, fontVariant: ['tabular-nums'] },
  mealKcalUnit: { fontSize: 9, fontWeight: '600', fontFamily: F[600], color: P.text3, marginTop: -1 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: P.tileSoft,
    borderRadius: radius.row,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 5,
    minHeight: 32,
  },
  itemEmoji: { fontSize: 14, width: 20, textAlign: 'center' },
  // тап по названию блюда — окно замен «похожее по ккал» (просьба Кати 10.11)
  itemNameBtn: { flex: 1, minWidth: 0 },
  itemName: { ...type.body, color: P.text, fontSize: 13 },
  itemMetaBtn: {
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  itemMetaBtnC: { paddingHorizontal: 7, paddingVertical: 2 },
  itemMeta: { fontSize: 12.5, fontWeight: '600', fontFamily: F[600], color: P.text2 },
  itemMetaC: { fontSize: 11 },
  itemDel: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  itemDelC: { width: 22, height: 22 },

  // «Показать все приёмы пищи» — ровная строка: текст по центру без
  // сжатия, шеврон по середине; подпись на узкой карточке короче
  showAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: P.tileSoft,
    borderRadius: 10,
    height: 34,
    marginTop: 8,
  },
  showAllText: { fontSize: 12.5, fontWeight: '600', fontFamily: F[600], color: P.text2 },

  // Действия дня/недели — серые значки без подписей под шапкой
  // (просьба Кати 09.11); ВСЕГДА в одну строку — чипы ужаты и
  // растягиваются равными долями, без переноса (отзыв Кати 10.11:
  // «серые чипы установить в одну строчку»)
  headActions: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  headAction: {
    flex: 1,
    maxWidth: 26,
    aspectRatio: 1,
    borderRadius: 9,
    backgroundColor: P.tile,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Окно «куда скопировать день»
  copyBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  copySheet: {
    backgroundColor: P.tile,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.xl,
    width: '86%',
  },
  copyTitle: { ...type.title, color: P.text, textAlign: 'center' },
  copyGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.s, marginTop: spacing.l },
  copyPill: {
    backgroundColor: P.card,
    borderColor: P.accentBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 56,
  },
  copyPillOff: { borderColor: P.line, opacity: 0.5 },
  copyPillText: { fontSize: 14, fontWeight: '700', fontFamily: F[700], color: P.text },
  copyHint: { ...type.caption, color: P.text3, textAlign: 'center', marginTop: spacing.m },

  // Окно шаблонов дней (список + сохранение выбранного дня)
  tplSheet: {
    backgroundColor: P.tile,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.xl,
    width: '86%',
    gap: spacing.m,
  },
  tplHint: { ...type.caption, color: P.text3, textAlign: 'center' },
  tplEmpty: { ...type.caption, color: P.text2, textAlign: 'center', paddingVertical: spacing.s },
  tplList: { gap: 6 },
  tplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.row,
    paddingRight: 6,
  },
  tplMain: { flex: 1, minWidth: 0, paddingHorizontal: 12, paddingVertical: 8 },
  tplName: { fontSize: 13.5, fontWeight: '700', fontFamily: F[700], color: P.text },
  tplMeta: { fontSize: 11.5, fontWeight: '400', fontFamily: F[400], color: P.text3, marginTop: 1 },
  tplDel: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  tplSaveRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, marginTop: spacing.xs },
  tplInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: 12,
    height: 42,
    color: P.text,
    fontSize: 14,
    fontFamily: F[400],
  },
  tplSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: P.accent,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 42,
  },
  tplSaveText: { fontSize: 12.5, fontWeight: '800', fontFamily: F[800], color: P.accentInk },
}
