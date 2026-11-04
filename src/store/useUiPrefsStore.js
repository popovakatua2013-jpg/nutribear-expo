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
      weighNudgeDays: 7, // порог напоминания мишки о взвешивании (5/7/10 дней)
      // Ключ закрытой крестиком золотой карточки «Цель по весу достигнута»
      // («дата достижения|цель в кг»): переживёт перезапуск, а при смене
      // цели ключ изменится и карточка покажется снова
      weightGoalCelebrationDismissed: null,
      // Блок «Рекомендации» на вкладке «Тело» закрыт крестиком: переживает
      // перезапуск; возвращается кнопкой «К рекомендациям» из окна
      // «Что означает твой ИМТ»
      bmiAdviceHidden: false,

      setExpanded: (key, value) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !!value } })),

      setHaptics: (value) => set({ haptics: !!value }),

      setWeighNudgeDays: (n) =>
        set({ weighNudgeDays: [5, 7, 10].includes(n) ? n : 7 }),

      dismissWeightGoalCelebration: (key) =>
        set({ weightGoalCelebrationDismissed: key }),

      setBmiAdviceHidden: (value) => set({ bmiAdviceHidden: !!value }),
    }),
    {
      name: 'nutribear-ui-prefs-v1',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
