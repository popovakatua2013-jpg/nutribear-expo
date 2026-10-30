// Состояние активности за сегодня: вода и добавленные вручную шаги.
// Хранится в AsyncStorage отдельно от дневника питания.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { makeId } from '@/lib/format'
import { dayKeyOf } from './useHistoryStore'

export const DEFAULT_VESSELS = [
  { id: 'glass', label: 'Стакан', ml: 250 },
  { id: 'mug', label: 'Кружка', ml: 300 },
  { id: 'bottle', label: 'Бутылка', ml: 500 },
  { id: 'jug', label: 'Кувшин', ml: 700 },
]

// Текущее время «ЧЧ:ММ» для журнала воды
const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })

// Старый набор по умолчанию (до добавления кувшина) — для миграции
const OLD_DEFAULT = DEFAULT_VESSELS.slice(0, 3)

export const useActivityStore = create(
  persist(
    (set) => ({
      waterMl: 0, // выпито воды сегодня, мл
      extraSteps: 0, // шаги, добавленные вручную
      lastWaterAt: 0, // когда последний раз добавляли воду (timestamp)
      // Журнал воды за сегодня: [{id, ml, time "ЧЧ:ММ", at}] — свежие сверху
      waterLog: [],
      // Ёмкости для окна добавления воды (редактируются пользователем)
      vessels: DEFAULT_VESSELS,
      // Напоминания о воде: интервал и время последнего срабатывания
      reminder: { enabled: false, everyMin: 60, lastAt: 0 },
      // Локальный день, к которому относятся вода и шаги
      dayKey: dayKeyOf(),

      setVessels: (vessels) => set({ vessels }),
      setReminder: (patch) => set((s) => ({ reminder: { ...s.reminder, ...patch } })),

      // Выпить воду: time можно передать вручную («ЧЧ:ММ»), иначе — сейчас
      addWater: (ml, time) => {
        const safeMl = Math.max(1, Math.round(Number(ml) || 0))
        set((s) => ({
          waterMl: Math.min(6000, s.waterMl + safeMl),
          lastWaterAt: Date.now(),
          waterLog: [
            { id: makeId(), ml: safeMl, time: time || nowTime(), at: Date.now() },
            ...s.waterLog,
          ].slice(0, 60),
        }))
      },

      // Удалить запись из журнала воды (минус её объём из дневной суммы)
      removeWaterLog: (id) =>
        set((s) => {
          const gone = s.waterLog.find((w) => w.id === id)
          return {
            waterLog: s.waterLog.filter((w) => w.id !== id),
            waterMl: gone ? Math.max(0, s.waterMl - gone.ml) : s.waterMl,
          }
        }),

      // Изменить запись журнала: объём и/или время (дневная сумма пересчитывается)
      editWaterLog: (id, patch) =>
        set((s) => {
          const old = s.waterLog.find((w) => w.id === id)
          if (!old) return {}
          const ml = Math.max(1, Math.round(Number(patch.ml) || old.ml))
          const time = patch.time || old.time
          const delta = ml - old.ml
          return {
            waterMl: Math.min(6000, Math.max(0, s.waterMl + delta)),
            waterLog: s.waterLog.map((w) => (w.id === id ? { ...w, ml, time } : w)),
          }
        }),

      addSteps: (n) => {
        set((s) => ({ extraSteps: Math.min(50000, s.extraSteps + n) }))
      },

      resetToday: () =>
        set({ waterMl: 0, extraSteps: 0, lastWaterAt: Date.now(), waterLog: [], dayKey: dayKeyOf() }),

      // Авто-переход на новый день (вызывается из lib/rollover.js):
      // вода и шаги обнуляются, журнал воды очищается.
      // У кого dayKey ещё не сохранялся — просто фиксируем день.
      rollDay: (key) =>
        set((s) => {
          if (s.dayKey === key) return {}
          if (!s.dayKey) return { dayKey: key }
          return {
            waterMl: 0,
            extraSteps: 0,
            waterLog: [],
            lastWaterAt: 0,
            dayKey: key,
          }
        }),
    }),
    {
      name: 'nutribear-activity-v1',
      version: 1,
      storage: createJSONStorage(() => AsyncStorage),
      // У кого остался старый набор из 3 ёмкостей — добавляем «Кувшин 700»
      migrate: (state, version) => {
        if (version < 1 && state && Array.isArray(state.vessels)) {
          const isOld =
            state.vessels.length === OLD_DEFAULT.length &&
            state.vessels.every(
              (v, i) => v && v.id === OLD_DEFAULT[i].id && v.ml === OLD_DEFAULT[i].ml
            )
          if (isOld) state.vessels = DEFAULT_VESSELS
        }
        return state
      },
      partialize: (state) => ({
        waterMl: state.waterMl,
        waterLog: state.waterLog,
        extraSteps: state.extraSteps,
        lastWaterAt: state.lastWaterAt,
        vessels: state.vessels,
        reminder: state.reminder,
        dayKey: state.dayKey,
      }),
    }
  )
)
