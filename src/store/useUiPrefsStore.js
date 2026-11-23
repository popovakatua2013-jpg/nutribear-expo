// Мелкие настройки интерфейса, которые должны переживать перезапуск
// приложения: какие карточки на вкладке «Ещё» раскрыты и включён ли
// вибро-отклик. Отдельный стор (не zustand-состояние компонента),
// чтобы любые экраны могли читать эти настройки по ключу.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { THEME_ORDER, DEFAULT_THEME_ID } from '@/lib/themes'

export const useUiPrefsStore = create(
  persist(
    (set) => ({
      expanded: {}, // { [storageKey]: true|false }
      haptics: true, // вибро-отклик в приложении (меню, тумблеры, плеер, ИМТ)
      // Тема оформления (Premium-фича, задача Кати 23.11): id из
      // src/lib/themes.js. «classic» — классическая navy-палитра;
      // премиум-темы при отсутствии подписки сами заменяются на
      // «Классику» (resolveThemeId) — выбор сохраняется и возвращается
      // после оплаты
      themeId: DEFAULT_THEME_ID,
      weighNudgeDays: 7, // порог напоминания мишки о взвешивании (5/7/10 дней)
      // Само напоминание мишки: можно выключить целиком (тумблер в блоке
      // «Напоминания» — отзыв Кати 16.11: один компактный блок вместо
      // разбросанных строк). По умолчанию включено — как раньше
      weighNudgeOn: true,
      // Уведомление мишки о взвешивании закрыто крестиком (просьба Кати
      // 24.11: «добавить крестик — закрыть, смахнуть»): храним дату
      // последнего взвешивания на момент закрытия. Полоска не вернётся,
      // пока не появится НОВЫЙ вес (запись веса сбрасывает напоминание,
      // а после следующего порога дней без записи она покажется снова)
      weighNudgeDismissedAt: null,
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
      // Обучающие окна сканера штрихкода и режима «Этикетка» (по образцу
      // «Как фотографировать еду»): показываются один раз при входе в
      // режим, вернуть — кнопкой (Info) на экране сканера/ссылкой
      barcodeGuideSeen: false,
      labelGuideSeen: false,

      setExpanded: (key, value) =>
        set((s) => ({ expanded: { ...s.expanded, [key]: !!value } })),

      setHaptics: (value) => set({ haptics: !!value }),

      // Переключение темы оформления: валидируем id — битое значение из
      // хранилища не должно сломать рендер (use-theme.js отдаст «Классику»,
      // но стор хранит только корректные id)
      setTheme: (id) => set({ themeId: THEME_ORDER.includes(id) ? id : DEFAULT_THEME_ID }),

      setWeighNudgeOn: (value) => set({ weighNudgeOn: !!value }),

      setWeighNudgeDays: (n) =>
        set({ weighNudgeDays: [5, 7, 10].includes(n) ? n : 7 }),

      dismissWeighNudge: (weightDate) => set({ weighNudgeDismissedAt: weightDate }),

      dismissWeightGoalCelebration: (key) =>
        set({ weightGoalCelebrationDismissed: key }),

      setBmiAdviceHidden: (value) => set({ bmiAdviceHidden: !!value }),

      setOrgHintDone: (value) => set({ orgHintDone: !!value }),

      dismissTipOfDay: (dayKey) => set({ tipHiddenDay: dayKey }),

      dismissInsight: (dayKey) => set({ insightHiddenDay: dayKey }),

      closeHint: (id) =>
        set((s) => ({ closedHints: { ...s.closedHints, [id]: true } })),

      setPhotoGuideSeen: (value) => set({ photoGuideSeen: !!value }),

      setBarcodeGuideSeen: (value) => set({ barcodeGuideSeen: !!value }),

      setLabelGuideSeen: (value) => set({ labelGuideSeen: !!value }),
    }),
    {
      name: 'nutribear-ui-prefs-v1',
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
