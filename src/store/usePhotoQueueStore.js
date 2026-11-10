// Очередь фото, снятых без интернета (отзыв Кирилла из RuStore, 4 звезды,
// скриншот Кати от 11.11: «опять прошу программу поддерживала офлайн
// съёмку, после подключение к сети чтобы сделанные фото automatically
// отправлялись на анализ»). Фото сохраняется в очередь, когда
// распознавание упало из-за сети; PhotoMode при появлении интернета
// сам достаёт фото из очереди и прогоняет через ИИ — в обычное окно
// подтверждения порции. Стор отдельный и персистится (AsyncStorage):
// очередь переживает перезапуск приложения и закрытие окна добавления.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Столько неуспешных попыток (не сетевых!) переживает фото в очереди:
// если файл битый или ИИ стабильно не видит еду — выкидываем, чтобы
// автопрогонка не молотила по одному и тому же фото вечно
export const MAX_ATTEMPTS = 3

// Пауза перед повторной попыткой после не-сетевой ошибки (сервер моргнул,
// ИИ не ответил): каждая попытка стоит денег — не долбим API тем же фото
// подряд, ждём полторы минуты
export const RETRY_AFTER_MS = 90_000

export const usePhotoQueueStore = create(
  persist(
    (set, get) => ({
      // [{ id, uri, createdAt, attempts, nextAttemptAt }] — uri снимка
      // из кэша ImagePicker (файл живёт в кэше приложения до успеха);
      // nextAttemptAt — время, раньше которого повторную попытку
      // не делаем (ставится после не-сетевой ошибки)
      items: [],

      add: (uri) => {
        const u = String(uri || '')
        if (!u) return null
        // то же фото уже ждёт? Второй раз не дублируем
        if (get().items.some((it) => it.uri === u)) return null
        const item = {
          id: `pq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          uri: u,
          createdAt: Date.now(),
          attempts: 0,
          nextAttemptAt: 0,
        }
        set((s) => ({ items: [...s.items, item] }))
        return item
      },

      remove: (id) => set((s) => ({ items: s.items.filter((it) => it.id !== id) })),

      // Неудачная попытка (не сетевая): считаем и откладываем повтор на
      // RETRY_AFTER_MS; после MAX_ATTEMPTS PhotoMode уберёт фото из очереди
      markFailed: (id) =>
        set((s) => ({
          items: s.items.map((it) =>
            it.id === id
              ? {
                  ...it,
                  attempts: (it.attempts || 0) + 1,
                  nextAttemptAt: Date.now() + RETRY_AFTER_MS,
                }
              : it
          ),
        })),

      clear: () => set({ items: [] }),
    }),
    {
      name: 'nutribear-photo-queue-v1',
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
