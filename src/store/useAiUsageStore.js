// Счётчики дневных ИИ-запросов — лимиты Free-тарифа (этап 1 монетизации,
// матрица 14.11). Три вида запросов тратят деньги через ProxyAPI:
//   chat  — сообщение настоящему ИИ в чате (лимит 15/день);
//   photo — ИИ-распознавание фото блюда/этикетки (общий пул, 3/день);
//   voice — распознавание голосовой записи (10/день).
// Всё остальное — офлайн-помощник, ручной ввод, простые фразы, кэш —
// лимитами не затронуто: дневник работает всегда.
//
// Правила расхода (честный счётчик):
//   - списываем ТОЛЬКО успешные запросы (ошибка сети/сервера — не расход);
//   - офлайн-фолбэки не списывают ничего;
//   - при исчерпании лимита чат не блокируется: отвечает встроенный
//     помощник по дневнику (см. ai-chat.jsx), фото/голос показывают
//     подсказку про Premium.
// Счётчики обнуляются с локальным днём («дд.мм.гггг», как в дневнике).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { FREE_LIMITS } from '@/lib/entitlements'

// Локальная дата «дд.мм.гггг» — тот же формат, что у дневника (dot-date)
export function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`
}

// Чистый расчёт остатка — без сетов, безопасен в zustand-селекторах:
//   pro=true → Infinity (безлимит); счётчики чужого дня считаются нулём
// (завтра лимит восстановится, даже если rollover ещё не сработал)
export function aiRemaining(state, kind, pro) {
  if (pro) return Infinity
  if (!FREE_LIMITS[kind]) return Infinity // неизвестный вид не лимитируем
  const day = todayKey()
  const used = state && state.day === day ? state[kind] || 0 : 0
  return Math.max(0, FREE_LIMITS[kind] - used)
}

const ZERO = { chat: 0, photo: 0, voice: 0 }

export const useAiUsageStore = create(
  persist(
    (set, get) => ({
      day: todayKey(),
      chat: 0,
      photo: 0,
      voice: 0,

      // Ролловер: при смене локального дня счётчики обнуляются.
      // Вызывается на старте (onRehydrateStorage) и перед проверками
      rollIfNeeded: () =>
        set((s) =>
          s.day === todayKey()
            ? s
            : { day: todayKey(), chat: 0, photo: 0, voice: 0 }
        ),

      // Можно ли потратить запрос этого вида: Premium — всегда да
      canUse: (kind, pro) => {
        get().rollIfNeeded()
        return aiRemaining(get(), kind, pro) > 0
      },

      // Списать ОДИН успешный запрос. Вызывается после ответа ИИ, а не
      // при отправке: сгоревший на ошибке сети запрос денег не стоит
      record: (kind) =>
        set((s) => {
          const day = todayKey()
          const cur = s.day === day ? { chat: s.chat || 0, photo: s.photo || 0, voice: s.voice || 0 } : { ...ZERO }
          cur[kind] = (cur[kind] || 0) + 1
          return { day, ...cur }
        }),
    }),
    {
      name: 'nutribear-ai-usage-v1',
      version: 1,
      migrate: (state) => state,
      storage: createJSONStorage(() => AsyncStorage),
      // Ролловер сразу после догрузки: хранилище может принести вчерашний
      // день (как activatedAt в useProStore — при простом вызове стор пуст)
      onRehydrateStorage: () => (state) => {
        try {
          state?.rollIfNeeded?.()
        } catch {}
      },
    }
  )
)
