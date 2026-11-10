// Состояние ИИ-чата: живёт отдельно от экрана, чтобы история диалога
// сохранялась между открытиями (раньше чат жил в компоненте на «Главной»,
// теперь это отдельный экран — без стора история обнулялась бы при
// каждом закрытии). В памяти сессии, без persist: диалог — временный.

import { create } from 'zustand'

export const AI_GREETING = {
  role: 'assistant',
  content:
    'Привет! Я ИИ-помощник NutriBear 🐻 Спросите про питание, калории, воду или привычки — помогу!',
}

export const useAiChatStore = create((set) => ({
  messages: [AI_GREETING],
  text: '', // черновик ввода — тоже переживает закрытие экрана
  busy: false,

  setMessages: (messages) => set({ messages }),
  setText: (text) => set({ text }),
  setBusy: (busy) => set({ busy }),

  // «Очистить чат»: диалог начинается заново с приветствия
  reset: () => set({ messages: [AI_GREETING], text: '', busy: false }),
}))
