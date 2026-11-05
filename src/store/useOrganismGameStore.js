// Прогресс игровых систем организма: гены, кристаллы, мутаген, капсулы,
// эволюция (ветка и стадия), рейд стаи (вклад по дням) и комбо-стрик.
// Экономика отдельная от монеток useShopStore — по макету «демо-экономика
// без pay-to-win»: ресурсы приходят только из дневника, воды и тренировок.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { dayKeyOf } from './useHistoryStore'
import { makeId } from '@/lib/format'
import {
  ARTIFACTS,
  AURAS,
  CHAPTER_WIN_DAYS,
  CODEX,
  CODEX_REWARD,
  CRAFT_COST,
  CRAFTS,
  DUP_MUTAGEN,
  MUTAGEN_PER_CAPSULE,
  QUEST_REWARD,
  STREAK_FOR_CAPSULE,
  crystalsLabel,
  craftOf,
  craftedHas,
  expeditionOf,
  expeditionProgress,
  expeditionTale,
  genesLabel,
  mondayKeyOf,
  questProgress,
  questsForDay,
  rollDrop,
  yesterdayKeyOf,
} from '@/lib/data/organism-game'

// За «хороший» день организм делится генами (тяни оси событиями дневника).
// Питомец и синтез добавляют бонус сверху: уровень питомца — до +2,
// Тотем изобилия — ещё +1.
const GENES_BLOOM_DAY = 3

// Бонус генов за расцвет от питомца: с 3-й кормёжки +1, с 6-й +2
const petLevelOf = (fedDays) => Math.floor((fedDays || 0) / 3) + 1
const petBloomBonus = (fedDays) => Math.min(2, Math.floor((fedDays || 0) / 3))
const MUTATION_MUTAGEN = 5

// Гигиена хранилища: не копим историю бесконечно (AsyncStorage не резиновый).
// log — последние 30 событий, вклад рейда — только текущая неделя,
// дни расцвета — последние 14 (стрику нужен только вчера).
// comboDays удалён: лучший комбо дня нигде не читался — мёртвые данные.
const LOG_MAX = 30
const DAYS_KEEP = 14

const pushLog = (log, entry) => [entry, ...log].slice(0, LOG_MAX)

function cutoffKey(dayKey) {
  const [y, m, d] = dayKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - DAYS_KEEP)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

// Убрать накопившееся: старые недели рейда, дни старше 14 дней, хвосты лога.
// Ключи «ГГГГ-ММ-ДД» сравниваются как строки — это корректно для ISO-дат.
// Возвращает только то, что реально изменилось ({} — если подрезать нечего).
function prune(s) {
  const week = mondayKeyOf()
  const cut = cutoffKey(dayKeyOf())
  let changed = false
  const raidDays = {}
  for (const [k, v] of Object.entries(s.raidDays)) {
    if (v && v.weekKey === week) raidDays[k] = v
    else changed = true
  }
  const goodDays = {}
  for (const [k, v] of Object.entries(s.goodDays)) {
    if (k >= cut) goodDays[k] = v
    else changed = true
  }
  const auditDays = {}
  for (const [k, v] of Object.entries(s.auditDays || {})) {
    if (k >= cut) auditDays[k] = v
    else changed = true
  }
  // квесты: держим 14 дней (как goodDays)
  const questClaims = {}
  for (const [k, v] of Object.entries(s.questClaims || {})) {
    if (k >= cut) questClaims[k] = v
    else changed = true
  }
  // главы: последние 5 недель
  const weeks = Object.keys(s.chapters || {}).sort()
  let chapters = s.chapters || {}
  if (weeks.length > 5) {
    chapters = Object.fromEntries(weeks.slice(-5).map((w) => [w, s.chapters[w]]))
    changed = true
  }
  const log = s.log.length > LOG_MAX ? s.log.slice(0, LOG_MAX) : s.log
  if (log !== s.log) changed = true
  // разовая уборка comboDays у тех, кто обновился со старой версией
  if (s.comboDays && Object.keys(s.comboDays).length) changed = true
  return changed ? { raidDays, goodDays, auditDays, questClaims, chapters, log, comboDays: undefined } : {}
}

// Закрытие главы недели: считаем дни расцвета этой недели из goodDays.
// 5+ дней расцвета — глава пройдена: артефакт + 3 кристалла. Дубликат
// артефакта — как обычно, в мутаген. Без победы — мягкий итог без штрафа.
function settleChapterOf(state, weekKey, setFn) {
  if (!weekKey || state.chapters?.[weekKey]) return
  const best = Object.entries(state.goodDays || {}).filter(([k, v]) => v && k >= weekKey && k < nextWeekKeyOf(weekKey)).length
  const patch = { chapterLastWeek: weekKey, chapters: { ...(state.chapters || {}), [weekKey]: { win: best >= CHAPTER_WIN_DAYS, best } } }
  if (best >= CHAPTER_WIN_DAYS) {
    const name = ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)]
    const dup = state.items.includes(name)
    patch.crystals = (state.crystals || 0) + 3
    if (dup) patch.mutagen = (state.mutagen || 0) + DUP_MUTAGEN
    else patch.items = [...(state.items || []), name]
    patch.log = pushLog(state.log || [], {
      id: makeId(), ts: Date.now(),
      text: `Глава закрыта победой: ${best} дней расцвета — ${dup ? `${name} (дубликат → +${DUP_MUTAGEN} мутагена)` : name} и +3 кристалла.`,
    })
  } else {
    patch.log = pushLog(state.log || [], {
      id: makeId(), ts: Date.now(),
      text: `Глава закрыта: ${best} дней расцвета из ${CHAPTER_WIN_DAYS}. В новой главе получится.`,
    })
  }
  setFn(patch)
}

// Понедельник следующей недели (для границ недели главы)
function nextWeekKeyOf(weekKey) {
  const [y, m, d] = weekKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + 7)
  const p = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

export const useOrganismGameStore = create(
  persist(
    (set, get) => ({
      // ресурсы
      genes: 12, // стартовые — на первую эволюцию почти хватит
      crystals: 0,
      mutagen: 0,
      capsules: 1, // стартовая капсула, как в макете

      // эволюция
      evoStage: 0, // 0 Протоплазма … 4 Титан
      evoBranch: '', // имя ветки фиксируется на первой эволюции
      createdAt: null, // неделя создания (понедельник)
      stableDays: 0,
      stableLastKey: null,
      mutationUnlocked: false,

      // рейд
      raidWeekStart: '', // понедельник текущей недели рейда
      raidDays: {}, // { '2026-11-01': { weekKey, dmg, shield, crit } }
      raidKilled: false,
      raidRewarded: false,

      // комбо и стрик
      goodDays: {}, // { dayKey: true } — день в расцвете (гены начислены)
      streak: 0,
      streakLastKey: null,

      // коллекция и статистика капсул
      items: [], // артефакты и ауры (дубликаты → мутаген)
      opened: 0,
      log: [], // история организма (новые сверху)

      // экспедиция (idle): организм в походе на реальное время
      expedition: null, // { key, startedAt } | null

      // прыщи от игнора: какие пятна выдавлены сегодня и за какой день
      // уже выдан бонус за полную чистку
      pimplePop: { dayKey: null, popped: [] },
      pimpleBonusDay: null,

      // аудит организма: счёт за день (для истории в Premium) и день,
      // когда уже выдан +1 ген за медосмотр
      auditDays: {}, // { '2026-11-03': 78 }
      auditBonusDay: null,

      // ── Новые игровые системы (v2) ──
      questClaims: {}, // { dayKey: ['water','steps'] } — закрытые квесты дня
      pet: { fedDays: 0, lastFedKey: null }, // питомец: кормёжка за хороший день
      codex: [], // открытые жители энциклопедии (ключи CODEX)
      crafted: [], // синтезированные артефакты (ключи CRAFTS)
      tower: { wave: 0, lastKey: null }, // башня испытаний: волна дней
      chapterLastWeek: null, // понедельник последней закрытой главы
      chapters: {}, // { weekKey: { win, best } } — итоги закрытых глав
      activeSkin: null, // наложенная аура (скин сцены)
      prestigeCount: 0, // сколько раз достигнут Титан и начата новая игра+
      lastReactKey: null, // день последней утренней реплики

      /* ── Ежедневная синхронизация: вызывается при открытии экрана.
           unlocks — впервые закрытые сегодня цели (ключи CODEX) ── */
      syncDay: ({ dayKey, combo, state, unlocks = [] }) => {
        // гигиена: сперва подрезать накопившееся (раз в открытие экрана),
        // затем вся логика ниже работает с уже чистым состоянием
        const cleaned = prune(get())
        if (Object.keys(cleaned).length) set(cleaned)
        const s0 = get()
        if (!s0.createdAt) set({ createdAt: mondayKeyOf() })
        // смена недели: закрываем главу (итоги прошлой недели) + новый босс
        if (s0.raidWeekStart !== mondayKeyOf()) {
          settleChapterOf(s0, s0.raidWeekStart, (patchChapter) => set(patchChapter))
          set({ raidWeekStart: mondayKeyOf(), raidKilled: false, raidRewarded: false })
        }
        const s = get()
        const patch = {}

        // питомец: кормёжка за день с заполненной шкалой; каждые 3 кормёжки —
        // уровень (+2 кристалла за рост)
        const pet = s.pet || { fedDays: 0, lastFedKey: null }
        if (combo >= 100 && pet.lastFedKey !== dayKey) {
          const fedDays = pet.fedDays + 1
          const grew = fedDays % 3 === 0
          patch.pet = { fedDays, lastFedKey: dayKey }
          if (grew) {
            patch.crystals = s.crystals + 2
            patch.log = pushLog(s.log, {
              id: makeId(), ts: Date.now(),
              text: `Питомец подрос до уровня ${petLevelOf(fedDays)} (+2 кристалла от радости).`,
            })
          }
        }

        // башня испытаний: хороший день — волна вверх (каждая 3-я — награда),
        // плохой день после серии — мягкий откат на одну волну
        if (combo >= 100 && s.tower.lastKey !== dayKey) {
          const cont = s.tower.lastKey === yesterdayKeyOf(dayKey)
          const wave = cont ? s.tower.wave + 1 : 1
          patch.tower = { wave, lastKey: dayKey }
          if (wave > 0 && wave % 3 === 0) {
            patch.genes = (patch.genes ?? s.genes) + 2
            patch.crystals = (patch.crystals ?? s.crystals) + 2
            patch.log = pushLog(patch.log || s.log, {
              id: makeId(), ts: Date.now(),
              text: `Башня: волна ${wave} взята — +2 гена, +2 кристалла.`,
            })
          }
        } else if (combo < 100 && s.tower.wave > 0 && s.tower.lastKey === yesterdayKeyOf(dayKey) && s.tower.lastKey !== dayKey) {
          patch.tower = { wave: s.tower.wave - 1, lastKey: dayKey }
          patch.log = pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: 'Башня: день выбился из ритма — спуск на одну волну (мягко).',
          })
        }

        // энциклопедия: впервые закрытые цели открывают жителей (+2 кристалла);
        // дубли в самом батче unlocks убираем, чтобы житель не открылся дважды
        const fresh = [...new Set(unlocks || [])].filter(
          (k) => CODEX.some((c) => c.key === k) && !s.codex.includes(k)
        )
        if (fresh.length) {
          patch.codex = [...s.codex, ...fresh]
          patch.crystals = (patch.crystals ?? s.crystals) + fresh.length * CODEX_REWARD
          patch.log = pushLog(patch.log || s.log, {
            id: makeId(), ts: Date.now(),
            text: `Энциклопедия: новый${fresh.length > 1 ? 'е' : ''} житель${fresh.length > 1 ? 'и' : ''} биома (+${fresh.length * CODEX_REWARD} кристалла).`,
          })
        }

        // стрик: день с заполненной шкалой; стрик 7 → капсула
        if (combo >= 100 && s.streakLastKey !== dayKey) {
          const cont = s.streakLastKey === yesterdayKeyOf(dayKey)
          const streak = cont ? s.streak + 1 : 1
          if (streak >= STREAK_FOR_CAPSULE) {
            patch.streak = 0
            patch.streakLastKey = dayKey
            patch.capsules = s.capsules + 1
            patch.log = pushLog(s.log, { id: makeId(), ts: Date.now(), text: 'Серия 7 дней — выдана генная капсула.' })
          } else {
            patch.streak = streak
            patch.streakLastKey = dayKey
          }
        }

        // стабильность: день без упадка; 7 дней подряд → первая мутация
        if (state !== 'decline' && s.stableLastKey !== dayKey) {
          const cont = s.stableLastKey === yesterdayKeyOf(dayKey)
          const stableDays = cont ? s.stableDays + 1 : 1
          patch.stableDays = stableDays
          patch.stableLastKey = dayKey
          if (stableDays >= 7 && !s.mutationUnlocked) {
            patch.mutationUnlocked = true
            patch.mutagen = s.mutagen + MUTATION_MUTAGEN
            patch.log = pushLog(patch.log || s.log, {
              id: makeId(), ts: Date.now(), text: `Стабильность 7 дней — открыта первая мутация (+${MUTATION_MUTAGEN} мутагена).`,
            })
          }
        }

        // гены за расцвет (раз в день): базовые + бонус питомца (уровень 3/6)
        // + Тотем изобилия (синтез)
        if (state === 'bloom' && !s.goodDays[dayKey]) {
          const fedToday = (patch.pet || s.pet || {}).fedDays || 0
          const bonus = petBloomBonus(fedToday) + (craftedHas(s.crafted, 'bloom') ? 1 : 0)
          patch.goodDays = { ...s.goodDays, [dayKey]: true }
          patch.genes = (patch.genes ?? s.genes) + GENES_BLOOM_DAY + bonus
          if (bonus > 0) {
            patch.log = pushLog(patch.log || s.log, {
              id: makeId(), ts: Date.now(),
              text: `Расцвет дня: +${GENES_BLOOM_DAY + bonus} генов (бонус ${bonus} — союзники помогают).`,
            })
          }
        }

        if (Object.keys(patch).length) set(patch)
      },

      /* ── Рейд: зафиксировать мой вклад за сегодня ── */
      syncRaid: ({ dayKey, dmg, shield, crit }) => {
        const s = get()
        const weekKey = mondayKeyOf()
        const prev = s.raidDays[dayKey] || {}
        if (prev.dmg === dmg && prev.shield === shield && prev.crit === crit) return
        set({ raidDays: { ...s.raidDays, [dayKey]: { weekKey, dmg, shield, crit } } })
      },

      /* ── Рейд: зафиксировать победу над боссом (раз в неделю) ── */
      settleRaid: ({ bossName }) => {
        const s = get()
        if (s.raidKilled || s.raidRewarded) return false
        set({
          raidKilled: true,
          raidRewarded: true,
          genes: s.genes + 15,
          crystals: s.crystals + 5,
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(), text: `Рейд: ${bossName} павший. Награда стаи: +15 генов, +5 кристаллов.`,
          }),
        })
        return true
      },

      /* ── Эволюция: тратим гены, поднимаем стадию ── */
      evolve: ({ cost, fromName, toName }) => {
        const s = get()
        if (s.genes < cost || s.evoStage >= 4) return false
        const branch = s.evoBranch || toName.split(' ')[0]
        set({
          genes: s.genes - cost,
          evoStage: s.evoStage + 1,
          evoBranch: branch,
          log: pushLog(s.log, { id: makeId(), ts: Date.now(), text: `Эволюция: ${fromName} → ${toName}.` }),
        })
        return true
      },

      /* ── Капсула: честный ролл, дубликаты → мутаген ── */
      openCapsule: () => {
        const s = get()
        if (s.capsules <= 0) return null
        const drop = rollDrop()
        let itemName = null
        let dup = false
        const patch = { capsules: s.capsules - 1, opened: s.opened + 1 }

        if (drop.genes) patch.genes = s.genes + drop.genes
        if (drop.crystals) patch.crystals = s.crystals + drop.crystals

        if (drop.key === 'artifact') {
          itemName = ARTIFACTS[Math.floor(Math.random() * ARTIFACTS.length)]
        } else if (drop.key === 'aura') {
          itemName = AURAS[Math.floor(Math.random() * AURAS.length)]
        }
        if (itemName) {
          dup = s.items.includes(itemName)
          if (dup) {
            patch.mutagen = s.mutagen + DUP_MUTAGEN
            patch.items = s.items
          } else {
            patch.items = [...s.items, itemName]
          }
        }

        patch.log = pushLog(s.log, {
          id: makeId(), ts: Date.now(),
          text: `Капсула: ${itemName ? (dup ? `${itemName} (дубликат → +${DUP_MUTAGEN} мутагена)` : itemName) : drop.reward}.`,
        })
        set(patch)
        return { drop, itemName, dup }
      },

      /* ── Мутации: обменять мутаген на капсулу (9 → 1) ── */
      convertMutagen: () => {
        const s = get()
        if (s.mutagen < MUTAGEN_PER_CAPSULE) return false
        set({
          mutagen: s.mutagen - MUTAGEN_PER_CAPSULE,
          capsules: s.capsules + 1,
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `Мутации: ${MUTAGEN_PER_CAPSULE} мутагена превращены в генную капсулу.`,
          }),
        })
        return true
      },

      /* ── Прыщи от игнора: выдавить пятно № index (один тап — один прыщ) ── */
      popPimple: ({ dayKey, total, index }) => {
        const s = get()
        const prev = s.pimplePop.dayKey === dayKey ? s.pimplePop.popped : []
        if (prev.includes(index)) return { popped: prev, doneAll: false }
        const popped = [...prev, index]
        const patch = { pimplePop: { dayKey, popped } }
        let doneAll = false
        // выдавил все — раз в день +1 ген «за чистоту»
        if (total > 0 && popped.length >= total && s.pimpleBonusDay !== dayKey) {
          patch.pimpleBonusDay = dayKey
          patch.genes = s.genes + 1
          patch.log = pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: 'Все прыщи выдавлены — организм сияет от чистоты (+1 ген).',
          })
          doneAll = true
        }
        set(patch)
        return { popped, doneAll }
      },

      /* ── Аудит организма: штамп медосмотра за день (+1 ген раз в день).
           Повторные осмотры в тот же день — только ради свежих шуток ── */
      runAudit: ({ dayKey, score }) => {
        const s = get()
        const patch = { auditDays: { ...(s.auditDays || {}), [dayKey]: score } }
        let awarded = false
        if (s.auditBonusDay !== dayKey) {
          patch.auditBonusDay = dayKey
          patch.genes = s.genes + 1
          patch.log = pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `Медосмотр: ${score}/100. Доктор Топтыгин доволен (+1 ген).`,
          })
          awarded = true
        }
        set(patch)
        return { awarded }
      },

      /* ── Экспедиция: отправить организм в поход (idle, реальное время) ── */
      startExpedition: (key) => {
        const s = get()
        if (s.expedition || !expeditionOf(key)) return false
        const e = expeditionOf(key)
        set({
          expedition: { key, startedAt: Date.now() },
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(), text: `Ушёл в поход: «${e.name}» — вернусь через ${e.hours} ч.`,
          }),
        })
        return true
      },

      /* ── Экспедиция: забрать добычу, когда время вышло.
           Кристалл потока: +2 кристалла; Компас: походы на 10% быстрее ── */
      collectExpedition: () => {
        const s = get()
        const speed = craftedHas(s.crafted, 'speed') ? 0.9 : 1
        const pr = expeditionProgress(s.expedition, Date.now(), speed)
        if (!pr || !pr.done) return null
        const e = expeditionOf(s.expedition.key)
        const tale = expeditionTale(s.expedition.key)
        const bonusCrystals = craftedHas(s.crafted, 'expedition') ? 2 : 0
        set({
          expedition: null,
          genes: s.genes + e.genes,
          crystals: s.crystals + e.crystals + bonusCrystals,
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `Экспедиция «${e.name}»: +${genesLabel(e.genes)}, +${crystalsLabel(e.crystals + bonusCrystals)}. ${tale}`,
          }),
        })
        return { name: e.name, genes: e.genes, crystals: e.crystals + bonusCrystals, tale }
      },

      /* ── Квест дня: забрать награду (+2 гена; все три — +1 кристалл).
           Проверяем по живым метрикам — награду не получить обманом ── */
      claimQuest: ({ dayKey, questKey, metrics }) => {
        const s = get()
        const quest = questsForDay(dayKey).find((q) => q.key === questKey)
        if (!quest || !questProgress(quest, metrics).done) return false
        const claimed = s.questClaims[dayKey] || []
        if (claimed.includes(questKey)) return false
        const claims = [...claimed, questKey]
        const allDone = questsForDay(dayKey).every((q) => claims.includes(q.key))
        set({
          questClaims: { ...s.questClaims, [dayKey]: claims },
          genes: s.genes + QUEST_REWARD.genes,
          crystals: s.crystals + (allDone ? QUEST_REWARD.allBonusCrystals : 0),
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `Квест «${quest.name}» закрыт: +${QUEST_REWARD.genes} гена${allDone ? ', плюс кристалл за все три' : ''}.`,
          }),
        })
        return true
      },

      /* ── Скин: наложить найденную ауру на сцену ── */
      setSkin: (auraName) => {
        const s = get()
        if (auraName && !s.items.includes(auraName)) return false
        set({ activeSkin: auraName || null })
        return true
      },

      /* ── Отметить утреннюю реплику показанной (раз в день) ── */
      markReacted: (dayKey) => {
        if (get().lastReactKey === dayKey) return
        set({ lastReactKey: dayKey })
      },

      /* ── Синтез: мутаген → именной артефакт с пассивным бонусом.
           Каждый рецепт — один раз; выбор «капсула или крафт» за игроком ── */
      craftArtifact: (recipeKey) => {
        const s = get()
        const recipe = craftOf(recipeKey)
        if (!recipe || s.mutagen < CRAFT_COST || s.crafted.includes(recipeKey)) return false
        set({
          mutagen: s.mutagen - CRAFT_COST,
          crafted: [...s.crafted, recipeKey],
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `Синтез: ${recipe.emoji} ${recipe.name} готов (${recipe.bonusText}).`,
          }),
        })
        return true
      },

      /* ── Престиж: после Титана — новая игра+. Формы и гены обнуляются,
           коллекция, энциклопедия, питомец и синтез остаются; боссы-легенды
           и золотой окрас сцены ── */
      doPrestige: () => {
        const s = get()
        if (s.evoStage < 4) return false
        set({
          prestigeCount: s.prestigeCount + 1,
          evoStage: 0,
          evoBranch: '',
          genes: 12 + (s.prestigeCount + 1) * 10,
          stableDays: 0,
          stableLastKey: null,
          mutationUnlocked: false,
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `НОВАЯ ИГРА+ №${s.prestigeCount + 1}: Титан достигнут, путь начат заново с бонусом. Легенды ждут!`,
          }),
        })
        return true
      },

      /* ── Полный сброс (вместе с «Стереть все данные») ── */
      resetAll: () =>
        set({
          genes: 12, crystals: 0, mutagen: 0, capsules: 1,
          evoStage: 0, evoBranch: '', createdAt: mondayKeyOf(),
          stableDays: 0, stableLastKey: null, mutationUnlocked: false,
          raidWeekStart: mondayKeyOf(), raidDays: {}, raidKilled: false, raidRewarded: false,
          goodDays: {}, streak: 0, streakLastKey: null,
          items: [], opened: 0, log: [], expedition: null,
          pimplePop: { dayKey: null, popped: [] }, pimpleBonusDay: null,
          auditDays: {}, auditBonusDay: null,
          questClaims: {}, pet: { fedDays: 0, lastFedKey: null }, codex: [], crafted: [],
          tower: { wave: 0, lastKey: null }, chapterLastWeek: null, chapters: {},
          activeSkin: null, prestigeCount: 0, lastReactKey: null,
        }),
    }),
    {
      name: 'nutribear-organism-game-v1',
      version: 2,
      // v2: новые игровые системы — недостающие поля добираются дефолтами
      migrate: (state) => ({
        ...state,
        questClaims: state.questClaims || {},
        pet: state.pet || { fedDays: 0, lastFedKey: null },
        codex: state.codex || [],
        crafted: state.crafted || [],
        tower: state.tower || { wave: 0, lastKey: null },
        chapterLastWeek: state.chapterLastWeek ?? null,
        chapters: state.chapters || {},
        activeSkin: state.activeSkin ?? null,
        prestigeCount: state.prestigeCount || 0,
        lastReactKey: state.lastReactKey ?? null,
      }),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        genes: s.genes, crystals: s.crystals, mutagen: s.mutagen, capsules: s.capsules,
        evoStage: s.evoStage, evoBranch: s.evoBranch, createdAt: s.createdAt,
        stableDays: s.stableDays, stableLastKey: s.stableLastKey, mutationUnlocked: s.mutationUnlocked,
        raidWeekStart: s.raidWeekStart, raidDays: s.raidDays, raidKilled: s.raidKilled, raidRewarded: s.raidRewarded,
        goodDays: s.goodDays, streak: s.streak, streakLastKey: s.streakLastKey,
        items: s.items, opened: s.opened, log: s.log,
        expedition: s.expedition,
        pimplePop: s.pimplePop, pimpleBonusDay: s.pimpleBonusDay,
        auditDays: s.auditDays, auditBonusDay: s.auditBonusDay,
        questClaims: s.questClaims, pet: s.pet, codex: s.codex, crafted: s.crafted,
        tower: s.tower, chapterLastWeek: s.chapterLastWeek, chapters: s.chapters,
        activeSkin: s.activeSkin, prestigeCount: s.prestigeCount, lastReactKey: s.lastReactKey,
      }),
    }
  )
)

// Номер недели с первой записи (неделя 1 = неделя создания организма)
export function weekNumberOf(createdAt) {
  const start = createdAt ? Date.parse(`${createdAt}T00:00:00`) : Date.parse(`${mondayKeyOf()}T00:00:00`)
  const now = Date.parse(`${mondayKeyOf()}T00:00:00`)
  return Math.max(1, Math.floor((now - start) / (7 * 86400000)) + 1)
}

export { dayKeyOf, petLevelOf }
