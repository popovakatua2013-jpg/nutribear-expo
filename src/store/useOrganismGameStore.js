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
  DUP_MUTAGEN,
  STREAK_FOR_CAPSULE,
  crystalsLabel,
  expeditionOf,
  expeditionProgress,
  expeditionTale,
  genesLabel,
  mondayKeyOf,
  rollDrop,
  yesterdayKeyOf,
} from '@/lib/data/organism-game'

// За «хороший» день организм делится генами (тяни оси событиями дневника)
const GENES_BLOOM_DAY = 3
const MUTATION_MUTAGEN = 5

// Гигиена хранилища: не копим историю бесконечно (AsyncStorage не резиновый).
// log — последние 30 событий, вклад рейда — только текущая неделя,
// комбо/хорошие дни — последние 14 дней (стрику нужен только вчера).
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
  const comboDays = {}
  for (const [k, v] of Object.entries(s.comboDays)) {
    if (k >= cut) comboDays[k] = v
    else changed = true
  }
  const goodDays = {}
  for (const [k, v] of Object.entries(s.goodDays)) {
    if (k >= cut) goodDays[k] = v
    else changed = true
  }
  const log = s.log.length > LOG_MAX ? s.log.slice(0, LOG_MAX) : s.log
  if (log !== s.log) changed = true
  return changed ? { raidDays, comboDays, goodDays, log } : {}
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
      comboDays: {}, // { dayKey: лучший комбо дня }
      goodDays: {}, // { dayKey: true } — день в расцвете (гены начислены)
      streak: 0,
      streakLastKey: null,

      // коллекция и статистика капсул
      items: [], // артефакты и ауры (дубликаты → мутаген)
      opened: 0,
      log: [], // история организма (новые сверху)

      // экспедиция (idle): организм в походе на реальное время
      expedition: null, // { key, startedAt } | null

      /* ── Ежедневная синхронизация: вызывается при открытии экрана ── */
      syncDay: ({ dayKey, combo, state }) => {
        // гигиена: сперва подрезать накопившееся (раз в открытие экрана),
        // затем вся логика ниже работает с уже чистым состоянием
        const cleaned = prune(get())
        if (Object.keys(cleaned).length) set(cleaned)
        const s = get()
        if (!s.createdAt) set({ createdAt: mondayKeyOf() })
        if (s.raidWeekStart !== mondayKeyOf()) {
          // новая неделя рейда — новый босс, старая неделя закрыта
          set({ raidWeekStart: mondayKeyOf(), raidKilled: false, raidRewarded: false })
        }
        const patch = {}

        // комбо дня (лучшее значение за день)
        const prevCombo = s.comboDays[dayKey] || 0
        if (combo > prevCombo) patch.comboDays = { ...s.comboDays, [dayKey]: combo }

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

        // гены за расцвет (раз в день)
        if (state === 'bloom' && !s.goodDays[dayKey]) {
          patch.goodDays = { ...s.goodDays, [dayKey]: true }
          patch.genes = s.genes + GENES_BLOOM_DAY
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

      /* ── Экспедиция: забрать добычу, когда время вышло ── */
      collectExpedition: () => {
        const s = get()
        const pr = expeditionProgress(s.expedition)
        if (!pr || !pr.done) return null
        const e = expeditionOf(s.expedition.key)
        const tale = expeditionTale(s.expedition.key)
        set({
          expedition: null,
          genes: s.genes + e.genes,
          crystals: s.crystals + e.crystals,
          log: pushLog(s.log, {
            id: makeId(), ts: Date.now(),
            text: `Экспедиция «${e.name}»: +${genesLabel(e.genes)}, +${crystalsLabel(e.crystals)}. ${tale}`,
          }),
        })
        return { name: e.name, genes: e.genes, crystals: e.crystals, tale }
      },

      /* ── Полный сброс (вместе с «Стереть все данные») ── */
      resetAll: () =>
        set({
          genes: 12, crystals: 0, mutagen: 0, capsules: 1,
          evoStage: 0, evoBranch: '', createdAt: mondayKeyOf(),
          stableDays: 0, stableLastKey: null, mutationUnlocked: false,
          raidWeekStart: mondayKeyOf(), raidDays: {}, raidKilled: false, raidRewarded: false,
          comboDays: {}, goodDays: {}, streak: 0, streakLastKey: null,
          items: [], opened: 0, log: [], expedition: null,
        }),
    }),
    {
      name: 'nutribear-organism-game-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        genes: s.genes, crystals: s.crystals, mutagen: s.mutagen, capsules: s.capsules,
        evoStage: s.evoStage, evoBranch: s.evoBranch, createdAt: s.createdAt,
        stableDays: s.stableDays, stableLastKey: s.stableLastKey, mutationUnlocked: s.mutationUnlocked,
        raidWeekStart: s.raidWeekStart, raidDays: s.raidDays, raidKilled: s.raidKilled, raidRewarded: s.raidRewarded,
        comboDays: s.comboDays, goodDays: s.goodDays, streak: s.streak, streakLastKey: s.streakLastKey,
        items: s.items, opened: s.opened, log: s.log,
        expedition: s.expedition,
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

export { dayKeyOf }
