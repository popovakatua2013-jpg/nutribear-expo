// Мелкие настройки интерфейса, которые должны переживать перезапуск
// приложения: какие карточки на вкладке «Ещё» раскрыты и включён ли
// вибро-отклик. Отдельный стор (не zustand-состояние компонента),
// чтобы любые экраны могли читать эти настройки по ключу.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const useUiPrefsStore = create(
  persist(
    (set) => ({
      expanded: {}, // { [storageKey]: true|false }
      haptics: true, // вибро-отклик в приложении (тап по кольцу ИМТ и т.д.)

      setExpanded: (key, value) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !!value } })),

      setHaptics: (value) => set({ haptics: !!value }),
    }),
    {
      name: 'nutribear-ui-prefs-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
