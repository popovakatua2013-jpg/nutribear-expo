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
      // Обучающая подсказка на вкладке «Организм» закрыта крестиком
      orgHintDone: false,
      // «Совет дня» на вкладке «Тело» закрыт крестиком: храним день
      // («ГГГГ-ММ-ДД»), в котором его закрыли — назавтра придёт новый
      // совет, и карточка снова появится
      tipHiddenDay: null,
      // Персональная подсказка на Главной закрыта крестиком — тоже до
      // конца дня: назавтра может прийти другая подсказка
      insightHiddenDay: null,
      // Подсказки «Как это работает», закрытые крестиком (отзыв Кати:
      // «все подсказки закрываются на крестик»): { [id]: true } —
      // переживают перезапуск и больше не показываются
      closedHints: {},
      // Обучающее окно «Как фотографировать еду» уже показывали: оно
      // само открывается один раз при первом входе в «Сканер еды»
      // (образец — окно конкурента, скриншот Кати от 11.11); после
      // закрытия не показывается снова, вернуть — кнопка
      // «Как фотографировать?» на пустом экране режима
      photoGuideSeen: false,

      setExpanded: (key, value) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !!value } })),

      setHaptics: (value) => set({ haptics: !!value }),

      setWeighNudgeDays: (n) =>
        set({ weighNudgeDays: [5, 7, 10].includes(n) ? n : 7 }),

      dismissWeightGoalCelebration: (key) =>
        set({ weightGoalCelebrationDismissed: key }),

      setBmiAdviceHidden: (value) => set({ bmiAdviceHidden: !!value }),

      setOrgHintDone: (value) => set({ orgHintDone: !!value }),

      dismissTipOfDay: (dayKey) => set({ tipHiddenDay: dayKey }),

      dismissInsight: (dayKey) => set({ insightHiddenDay: dayKey }),

      closeHint: (id) =>
        set((s) => ({ closedHints: { ...s.closedHints, [id]: true } })),

      setPhotoGuideSeen: (value) => set({ photoGuideSeen: !!value }),
    }),
    {
      name: 'nutribear-ui-prefs-v1',
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
