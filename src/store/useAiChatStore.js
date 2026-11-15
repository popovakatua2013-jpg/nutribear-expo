// Состояние ИИ-чата: живёт отдельно от экрана, чтобы история диалога
// сохранялась между открытиями (раньше чат жил в компоненте на «Главной»,
// теперь это отдельный экран — без стора история обнулялась бы при
// каждом закрытии). В памяти сессии, без persist: диалог — временный.
//
// Смена напарника (жалоба Кати 15.11: «выбираю Бусинку — а сообщение
// от Фита»): диалог хранит companionId, с которого начат. Экран чата
// при монтировании сверяет его с выбранным сейчас медведем и зовёт
// resetFor — диалог начинается заново с приветствием нового напарника,
// старые реплики другого медведя не остаются. Второй уровень защиты —
// счётчик conversation: ответ ИИ приходит через 3–20 секунд, и если за
// это время диалог сменился (смена напарника или «Очистить»), запоздалая
// реплика не вставляется в новый диалог и busy не гасит чужой индикатор.

import { create } from 'zustand'
import { COMPANIONS } from './useCompanionStore'

export const AI_GREETING = {
  role: 'assistant',
  content:
    'Привет! Я ИИ-помощник NutriBear 🐻 Спросите про питание, калории, воду или привычки — помогу!',
}

// Приветствие конкретного медведя: «Привет! Я Бусинка…», а не реплика
// прошлого напарника
function greetingFor(companionId) {
  const c = COMPANIONS.find((x) => x.id === companionId) || COMPANIONS[0]
  return [{ role: 'assistant', greeting: true, content: c.greeting }]
}

export const useAiChatStore = create((set, get) => ({
  messages: [AI_GREETING],
  text: '', // черновик ввода — тоже переживает закрытие экрана
  busy: false,
  // Напарник, с которого начат текущий диалог (null — ещё не открывали
  // чат после запуска приложения). Экран чата сравнивает с выбранным
  // сейчас и зовёт resetFor при расхождении
  companionId: null,
  // Номер диалога: растёт при каждом reset/resetFor. Ответ ИИ вставляется
  // только в диалог, которому он адресован
  conversation: 0,

  setMessages: (messages) => set({ messages }),
  setText: (text) => set({ text }),
  setBusy: (busy) => set({ busy }),

  // Добавить сообщение к ТЕКУЩЕМУ диалогу стора (а не к копии, снятой
  // в замыкание до запроса) — запоздалый ответ не воскрешает стёртые
  // сообщения. Вызов после проверки conversation
  append: (message) => set((s) => ({ messages: [...s.messages, message] })),

  // Смена напарника: диалог начинается заново — приветствие нового
  // медведя, без старых реплик («выбрала Бусинку — а в чате Фит»)
  resetFor: (companionId) =>
    set((s) => ({
      messages: greetingFor(companionId),
      text: '',
      busy: false,
      companionId,
      conversation: s.conversation + 1,
    })),

  // «Очистить чат»: диалог начинается заново с приветствием текущего
  // напарника (дефолтное «ИИ-помощник» — только пока медведь не выбран)
  reset: () => {
    const companionId = get().companionId
    set((s) => ({
      messages: companionId ? greetingFor(companionId) : [AI_GREETING],
      text: '',
      busy: false,
      conversation: s.conversation + 1,
    }))
  },
}))
