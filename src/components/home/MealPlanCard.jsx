// Карточка «Приёмы пищи» — классический дневник прямо под шапкой (по
// просьбе Кати: внесённые блюда раньше были видны только в окне «Все
// приёмы пищи», теперь каждый приём — отдельная секция на главной,
// как в классических приложениях). В шапке секции видно: сколько блюд
// в категории и сколько из рекомендованных калорий съедено («340 /
// 454 ккал»), полоска заполнения приёма. По умолчанию ВСЕ секции
// свёрнуты — видно только шапку (отзыв Кати: раскрытые списки делали
// дневник громоздким), тап по заголовку разворачивает список блюд с
// правкой (карандаш) и удалением (корзина), «+» добавляет еду.
// Под секциями — ОДНА раскрывающаяся кнопка «Добавить еду» вместо трёх
// отдельных блоков (отзыв Кати: «Добавить блюдо / Добавить перекус /
// Только калории — переделаем в раскрывающий список»), и первым в
// списке — «Только калории». В списке три пункта: быстрая запись
// калорий, добавление блюда (окно поиска/сканера/ИИ) и «Добавить
// рецепт» — отдельное окно своих рецептов (создание + список уже
// добавленных — перенесено из окна «Добавить приём пищи», где были
// блоки с ИИ-распознаванием). Отдельной кнопки «+ Добавить перекус»
// больше нет (отзыв Кати: «Перекус 2/3/4 туда не добавлять») — свои
// перекусы создаются в окне «Все приёмы пищи», а в уже созданные
// блюда добавляются через «+» их секции.
// Рекомендованные ккал по приёмам считаются
// от дневной нормы (targetsFromKcal: пропорции 25/35/30/10) и видны
// парой «X / Y» в каждой секции. Свои перекусы («Перекус 2»,
// «Перекус 3»…) — ПОЛНОЦЕННЫЕ секции после «Перекус/Полдник», каждая
// со своими блюдами, «+» и корзиной. Управление (повтор дня,
// история, порции) — в шапке, «Все» открывает старое окно со сводкой
// БЖУ. Поверхность — в стиле вкладки «Тело» (фиолетовая bear-bodyCard
// + обводка bear-bodyLine).

import { useState } from 'react'
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  ChefHat,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  Zap,
  X,
} from 'lucide-react-native'
import { PlanHeader } from './PlanHeader'
import { HistoryModal } from './HistoryModal'
import { RecipesModal } from '../food/RecipesModal'
import { EditEntryModal } from '../food/EditEntryModal'
import { MealTabs } from '../food/MealTabs'
import { useFoodStore } from '@/store/useFoodStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { MEALS, customMealCard, getMeal } from '@/lib/data/meals'
import { dishesWord, formatNum } from '@/lib/format'
import { animateExpandCollapse } from '@/lib/anim'
import { targetsFromKcal } from '@/lib/data/goals'
import { useToast } from '../ui/Toast'

const MAX = 1.2
// диаметр круглого фото приёма; радиус = половина
const THUMB = 40

// Однострочный текст, который при нехватке ширины сжимается, а не режется
function Fit({ className, children, max = 1.15, min = 0.8 }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={min}
      maxFontSizeMultiplier={max}
      className={className}
    >
      {children}
    </Text>
  )
}

// Итоги по приёму: только его собственные блюда — у каждого приёма,
// включая свои перекусы («Перекус 2, 3…»), теперь своя секция
function mealTotals(meal, entries) {
  const mealEntries = entries[meal.id] || []
  const count = mealEntries.length
  const consumed = mealEntries.reduce((s, e) => s + e.kcal, 0)
  return { mealEntries, count, consumed }
}

// Строка раскрывающегося списка способов добавления: цветная плитка
// с иконкой + название + серая подсказка. Тап — выбрать способ и свернуть
function MenuRow({ icon, tile, title, sub, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${sub}`}
      className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.03] px-2.5 py-2.5 active:bg-white/10"
    >
      <View
        className="h-9 w-9 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: tile }}
      >
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-semibold text-[16px] text-bear-text"
        >
          {title}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-sans text-[13px] text-bear-sub2"
        >
          {sub}
        </Text>
      </View>
      <ChevronRight size={16} color="#8B96B8" />
    </Pressable>
  )
}

// Строка блюда внутри раскрытой секции: эмодзи, название, граммовка,
// калории и время; карандаш — правка веса (с настоящим mealId — у доп.
// перекусов он свой), корзина — удалить
function DishRow({ mealId, mealName, entry, onEdit }) {
  const removeEntry = useFoodStore((s) => s.removeEntry)

  return (
    <View className="flex-row items-center gap-2 rounded-xl bg-bear-card px-2.5 py-2">
      <Text className="shrink-0 text-[16.5px]">{entry.emoji}</Text>
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-medium text-[15.5px] text-bear-bright"
        >
          {entry.name}
        </Text>
        <Text
          numberOfLines={1}
          maxFontSizeMultiplier={MAX}
          className="font-sans text-[13.5px] text-bear-sub2"
        >
          {`${entry.grams > 0 ? `${entry.grams} г · ` : ''}${formatNum(entry.kcal)} ккал${
            entry.time ? ` · ${entry.time}` : ''
          }`}
        </Text>
      </View>
      <Pressable
        onPress={() => onEdit(entry, mealId)}
        accessibilityLabel={`Изменить вес «${entry.name}»`}
        accessibilityRole="button"
        className="shrink-0 rounded p-1"
      >
        <Pencil size={14} color="#8B96B8" />
      </Pressable>
      <Pressable
        onPress={() => removeEntry(mealId, entry.id)}
        accessibilityLabel={`Удалить «${entry.name}» из «${mealName}»`}
        accessibilityRole="button"
        className="shrink-0 rounded p-1"
      >
        <Trash2 size={14} color="#8B96B8" />
      </Pressable>
    </View>
  )
}

// Секция одного приёма пищи: фото + название + счётчик блюд, справа —
// «съедено / рекомендовано ккал» и шеврон; тап по заголовку сворачивает
// и разворачивает список блюд, «+» добавляет без раскрытия
function MealSection({ meal, target, totals, open, onToggle, onAdd, onEdit, onDelete }) {
  const { mealEntries, count, consumed } = totals
  const pct = target > 0 ? Math.round((consumed / target) * 100) : 0
  const barPct = Math.min(100, Math.max(0, pct))
  const over = pct > 100 // перебор нормы — полоска янтарная

  return (
    <View className="rounded-2xl border border-white/[0.06] bg-white/[0.04]">
      {/* заголовок секции */}
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={
          open
            ? `Свернуть приём «${meal.name}», внесено ${count} ${dishesWord(count)}`
            : `Развернуть приём «${meal.name}», внесено ${count} ${dishesWord(count)} из ${formatNum(target)} килокалорий`
        }
        className="min-w-0 flex-row items-center gap-2.5 px-3 pb-1.5 pt-2.5 active:opacity-80"
      >
        <View className="relative shrink-0" style={{ width: THUMB, height: THUMB }}>
          {/* круглое фото: borderRadius на самой картинке — надёжнее
              всего на Android, ничего не вылезает за углы */}
          <Image
            source={meal.image}
            resizeMode="cover"
            style={{ width: THUMB, height: THUMB, borderRadius: THUMB / 2 }}
          />
          {/* галочка «внесено» — фиолетовый кружок на фото */}
          {count > 0 && (
            <View
              className="absolute items-center justify-center rounded-full bg-[#7B6CF6]"
              style={{ width: 17, height: 17, right: -2, bottom: -2, borderWidth: 2, borderColor: '#0C1327' }}
            >
              <Check size={13} color="#FFFFFF" strokeWidth={3.5} />
            </View>
          )}
        </View>

        <View className="min-w-0 flex-1">
          <Fit className="font-semibold text-[17.5px] leading-tight text-bear-text">
            {meal.short || meal.name}
          </Fit>
          <Text
            numberOfLines={1}
            maxFontSizeMultiplier={MAX}
            className="mt-0.5 font-sans text-[13px] text-bear-sub2"
          >
            {count > 0 ? `${count} ${dishesWord(count)}` : 'Пока пусто'}
          </Text>
        </View>

        {/* съедено из рекомендованного — столбиком: числа + подпись */}
        <View className="shrink-0 items-end">
          <Fit
            max={1.1}
            className="font-semibold text-[15.5px] leading-tight text-bear-bright"
          >
            {`${formatNum(consumed)} / ${formatNum(target)}`}
          </Fit>
          <Text
            maxFontSizeMultiplier={1.1}
            className="font-sans text-[11px] leading-tight text-bear-dim"
          >
            ккал
          </Text>
        </View>

        {/* корзина — только у своего перекуса: секция удаляется целиком
            (вложенный Pressable перехватывает тап до сворачивания) */}
        {onDelete && (
          <Pressable
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={`Удалить перекус «${meal.name}»`}
            hitSlop={4}
            className="shrink-0 rounded p-1 active:opacity-60"
          >
            <Trash2 size={14} color="#f87171" />
          </Pressable>
        )}

        {open ? (
          <ChevronUp size={15} color="#98A2C2" />
        ) : (
          <ChevronDown size={15} color="#98A2C2" />
        )}

        {/* быстрое добавление без раскрытия секции */}
        <Pressable
          onPress={onAdd}
          accessibilityRole="button"
          accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
          hitSlop={4}
          className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 active:opacity-70"
        >
          <Plus size={15} color="#8DABFF" />
        </Pressable>
      </Pressable>

      {/* полоска заполнения приёма: доля от рекомендованных ккал */}
      <View className="mx-3 mb-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <View
          className="h-1 rounded-full"
          style={{ width: `${barPct}%`, backgroundColor: over ? '#F59E0B' : '#7B6CF6' }}
        />
      </View>

      {/* блюда — только у раскрытой секции */}
      {open && (
        <View className="gap-1 px-2.5 pb-2.5">
          {mealEntries.map((entry) => (
            <DishRow
              key={entry.id}
              mealId={meal.id}
              mealName={meal.name}
              entry={entry}
              onEdit={onEdit}
            />
          ))}

          {!count && (
            <Text className="px-1 py-1 font-sans text-[14px] text-bear-dim">
              Пока ничего не добавлено
            </Text>
          )}

          <Pressable
            onPress={onAdd}
            accessibilityRole="button"
            accessibilityLabel={`Добавить блюдо в «${meal.name}»`}
            className="mt-1 flex-row items-center justify-center gap-1.5 rounded-xl border border-[#5B7FFF]/30 bg-[#5B7FFF]/10 py-2 active:bg-[#5B7FFF]/20"
          >
            <Plus size={15} color="#8DABFF" />
            <Text className="font-semibold text-[15px] text-[#8DABFF]">
              Добавить блюдо
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  )
}

export function MealPlanCard({ onAdd, onViewAll, onAddRecipe = () => {} }) {
  const entries = useFoodStore((s) => s.entries)
  const customMeals = useFoodStore((s) => s.customMeals)
  const addEntry = useFoodStore((s) => s.addEntry)
  const kcalGoal = useGoalsStore((s) => s.goals.kcal)
  const { toast } = useToast()
  const [historyOpen, setHistoryOpen] = useState(false)
  const [edit, setEdit] = useState(null) // {mealId, entry, mealName}
  // Раскрывающийся список способов добавления — вместо трёх отдельных
  // блоков под секциями (отзыв Кати); сворачивается после выбора пункта
  const [menuOpen, setMenuOpen] = useState(false)
  // Быстрая запись «Только калории»: выбор приёма,
  // калории (10…3000) и необязательное название
  const [quickOpen, setQuickOpen] = useState(false)
  const [qMealId, setQMealId] = useState('snack')
  const [qKcal, setQKcal] = useState('')
  const [qName, setQName] = useState('')
  // Окно рецептов: создание своих рецептов + список уже добавленных
  // (перенесено из окна «Добавить приём пищи» — отзыв Кати)
  const [recipesOpen, setRecipesOpen] = useState(false)
  const removeCustomMeal = useFoodStore((s) => s.removeCustomMeal)
  // Ручное сворачивание: по умолчанию все секции свёрнуты — видно только
  // шапку (отзыв Кати); тап запоминает выбор пользователя
  const [expanded, setExpanded] = useState({})

  // Рекомендованные ккал по приёмам от дневной нормы
  const targets = targetsFromKcal(kcalGoal)

  // Удалить свой перекус: подтверждение — записи уйдут из дневника,
  // журнал приёмов сохранится
  function confirmRemove(meal) {
    Alert.alert(
      `Удалить «${meal.name}»?`,
      'Записи этого перекуса уйдут из дневника за сегодня — журнал приёмов сохранится.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: () => {
            removeCustomMeal(meal.id)
            toast({ title: '🗑 Перекус удалён', description: `«${meal.name}» больше не в списке приёмов` })
          },
        },
      ]
    )
  }

  function isOpen(meal) {
    return Boolean(expanded[meal.id])
  }

  function toggle(meal) {
    animateExpandCollapse()
    setExpanded((s) => ({ ...s, [meal.id]: !isOpen(meal) }))
  }

  // Быстрая запись: только калории в выбранный пилюлей приём. Пишем
  // за сегодня — окно открывается с главной, дневник «сегодня»
  function submitQuick() {
    const kcal = Math.round(Number(String(qKcal).replace(',', '.')) || 0)
    if (kcal < 10 || kcal > 3000) {
      toast({ title: '⚡ Укажите калории', description: 'От 10 до 3000 ккал, например 250' })
      return
    }
    const name = qName.trim().slice(0, 40) || 'Быстрая запись'
    const mealName = getMeal(qMealId, customMeals).name
    addEntry(qMealId, {
      food: { id: 'quick', name, emoji: '⚡', kcal, p: 0, f: 0, c: 0, fib: 0, sug: 0 },
      grams: 0,
      kcal,
      desc: '',
    })
    toast({ title: `⚡ ${kcal} ккал — в «${mealName}»`, description: name })
    setQuickOpen(false)
    setQKcal('')
    setQName('')
  }

  return (
    <View
      accessibilityLabel="Приёмы пищи на сегодня"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      <PlanHeader
        onViewAll={onViewAll}
        onHistory={() => setHistoryOpen(true)}
      />

      {/* секции приёмов, одна под другой; после «Перекус/Полдник» —
          свои перекусы («Перекус 2», «Перекус 3»…) отдельными секциями:
          у каждой свои блюда и «+», корзина в шапке удаляет секцию.
          Новые свои перекусы создаются в окне «Все приёмы пищи» —
          на главной их больше не создаём (отзыв Кати) */}
      <View className="gap-2">
        {[...MEALS, ...customMeals.map(customMealCard)].map((meal) => (
          <MealSection
            key={meal.id}
            meal={meal}
            target={targets[meal.id] ?? targets.snack}
            totals={mealTotals(meal, entries)}
            open={isOpen(meal)}
            onToggle={() => toggle(meal)}
            onAdd={() => onAdd(meal.id)}
            onEdit={(entry, mealId) =>
              setEdit({ mealId: mealId || meal.id, entry, mealName: meal.name })
            }
            onDelete={meal.id.startsWith('custom-') ? () => confirmRemove(meal) : undefined}
          />
        ))}
      </View>

      {/* Раскрывающийся список способов добавления — вместо трёх отдельных
          блоков «Добавить блюдо / Добавить перекус / Только калории»
          (отзыв Кати). Первым в списке — «Только калории» */}
      <Pressable
        onPress={() => setMenuOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: menuOpen }}
        accessibilityLabel={menuOpen ? 'Свернуть способы добавления еды' : 'Добавить еду — раскрыть способы'}
        className="mt-2 h-[42px] flex-row items-center justify-center gap-1.5 rounded-2xl active:opacity-80"
        style={{ backgroundColor: '#7B6CF6' }}
      >
        <Plus size={17} color="#FFFFFF" />
        <Text maxFontSizeMultiplier={MAX} className="font-bold text-[16px] text-white">
          Добавить еду
        </Text>
        <ChevronDown
          size={17}
          color="#FFFFFF"
          style={{ transform: [{ rotate: menuOpen ? '180deg' : '0deg' }] }}
        />
      </Pressable>

      {menuOpen && (
        <View
          className="mt-2 gap-1 overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.04] p-1.5"
          accessibilityLabel="Способы добавления еды"
        >
          {/* 1. Только калории — первым (отзыв Кати): перекус в один тап,
              когда некогда искать блюдо */}
          <MenuRow
            icon={<Zap size={17} color="#FBBF24" />}
            tile="#FBBF2422"
            title="Только калории"
            sub="Быстрая запись, без поиска блюд"
            onPress={() => {
              setMenuOpen(false)
              setQuickOpen(true)
            }}
          />
          {/* 2. Добавить блюдо — окно поиска, сканера, фото и ИИ */}
          <MenuRow
            icon={<UtensilsCrossed size={17} color="#8DABFF" />}
            tile="#5B7FFF22"
            title="Добавить блюдо"
            sub="Поиск, сканер, фото, голос, этикетка"
            onPress={() => {
              setMenuOpen(false)
              onAdd('snack')
            }}
          />
          {/* 3. Добавить рецепт — отдельное окно своих рецептов: создание
              + список уже добавленных (перенесено из окна «Добавить
              приём пищи», отзыв Кати) */}
          <MenuRow
            icon={<ChefHat size={17} color="#4ADE80" />}
            tile="#22C55E22"
            title="Добавить рецепт"
            sub="Свой рецепт · мои рецепты"
            onPress={() => {
              setMenuOpen(false)
              setRecipesOpen(true)
            }}
          />
        </View>
      )}

      {/* Окно рецептов: монтируется только открытым — каждый раз
          стартует со списка (или формы, если рецептов ещё нет) */}
      {recipesOpen && (
        <RecipesModal
          onClose={() => setRecipesOpen(false)}
          onLogRecipe={(item) => {
            setRecipesOpen(false)
            onAddRecipe(item)
          }}
        />
      )}

      {/* окно быстрой записи: пилюли приёмов + калории + название */}
      <Modal
        visible={quickOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setQuickOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 items-center justify-center bg-black/60 px-8"
        >
          <View className="w-full rounded-3xl border border-white/10 bg-bear-pop p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <View
                  className="h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: '#F59E0B' }}
                >
                  <Zap size={16} color="#FFFFFF" />
                </View>
                <Text className="font-bold text-[20px] text-bear-text">Быстрая запись</Text>
              </View>
              <Pressable
                onPress={() => setQuickOpen(false)}
                accessibilityLabel="Закрыть быструю запись"
                className="p-1"
              >
                <X hitSlop={10} size={20} color="#A5AECB" />
              </Pressable>
            </View>
            <Text className="mt-3 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Куда записать?
            </Text>
            {/* Только базовые приёмы (отзыв Кати: «Перекус 2/3/4 туда
                не добавлять» — в свои перекусы записывают через «+» их
                секции) */}
            <MealTabs meals={MEALS} mealId={qMealId} onChange={setQMealId} />

            <Text className="mt-3 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Калории
            </Text>
            <View className="mt-1.5 flex-row items-center gap-2">
              <TextInput
                value={qKcal}
                onChangeText={setQKcal}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="250"
                placeholderTextColor="#8B96B8"
                accessibilityLabel="Калории за порцию"
                autoFocus
                maxFontSizeMultiplier={1.3}
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 py-2.5 text-center text-[19px] text-bear-text"
              />
              <Text maxFontSizeMultiplier={1.3} className="shrink-0 font-sans text-[19px] text-bear-sub">
                ккал
              </Text>
            </View>

            <Text className="mt-3 font-sans text-[15px] font-semibold uppercase text-bear-sub">
              Название (необязательно)
            </Text>
            <TextInput
              value={qName}
              onChangeText={setQName}
              maxLength={40}
              placeholder="Перекус в офисе"
              placeholderTextColor="#8B96B8"
              accessibilityLabel="Название быстрой записи"
              maxFontSizeMultiplier={1.3}
              className="mt-1.5 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-[19px] text-bear-text"
            />

            <Pressable
              onPress={submitQuick}
              accessibilityRole="button"
              accessibilityLabel="Добавить быструю запись"
              className="mt-4 rounded-2xl py-3 active:opacity-80"
              style={{ backgroundColor: '#7B6CF6' }}
            >
              <Text maxFontSizeMultiplier={1.25} className="text-center font-bold text-[19px] text-white">
                {`Добавить в «${getMeal(qMealId, customMeals).name}»`}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <HistoryModal visible={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Редактирование граммовки записи прямо с главной */}
      {edit && (
        <EditEntryModal
          key={edit.entry.id}
          open={Boolean(edit)}
          onClose={() => setEdit(null)}
          mealId={edit.mealId}
          entry={edit.entry}
          mealName={edit.mealName}
        />
      )}
    </View>
  )
}
