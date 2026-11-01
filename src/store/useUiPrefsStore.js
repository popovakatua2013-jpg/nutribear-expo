// Мелкие настройки интерфейса, которые должны переживать перезапуск
// приложения: сейчас — какие карточки на вкладке «Ещё» раскрыты.
// Отдельный стор (не zustand-состояние компонента), чтобы любые
// сворачиваемые карточки могли сохранять своё состояние по ключу.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useUiPrefsStore = create(
  persist(
    (set) => ({
      expanded: {}, // { [storageKey]: true|false }

      setExpanded: (key, value) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !!value } })),
    }),
    {
      name: 'nutribear-ui-prefs-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
