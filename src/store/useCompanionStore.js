// ═══════════════════════════════════════════════════════════════
//  Стор помощника NutriBear
// ═══════════════════════════════════════════════════════════════
//  Каталог из 5 помощников-медведей. Пользователь выбирает одного
//  на онбординге (Кедр/Кира бесплатные, Фит доступен с триала).
//  Помощник определяет тон пинков (bear/spicy), системный промпт
//  ИИ-чата, пулы фраз для уведомлений и аватарку в UI.
//
//  Иерархия помощников:
//   FREE:
//    • Кедр    — мальчик, зелёный, повязка. Тон bear: тёплый, подкалывает
//    • Кира    — девочка, розовая. Тон bear: мягкая, заботливая
//   PREMIUM (с покупки):
//    • Топаз   — мальчик, шорты/худи. Тон bear+: расширенные фразы
//    • Бусинка — девочка, шорты/худи. Тон bear+: расширенные фразы
//   PRO (с триала):
//    • Фит     — мальчик, чёрный, шейкер. Тон spicy: прямой, с перцем
//
//  Три Pro-функции доступен с триала (3 дня) — пользователь может
//  попробовать «Грозного» характер, прежде чем платить. После триала
//  без оплаты возвращается к Кедру/Кире.

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Аватары: require с относительным путём (как для других картинок —
// bear.webp в WelcomeStep/Greeting). Используем require, а не import,
// чтобы не ломать imports.test.js, который проверяет default-экспорты
const KEDR_IMG = require('../assets/companions/kedr.webp')
const KIRA_IMG = require('../assets/companions/kira.webp')
const TOPAZ_IMG = require('../assets/companions/topaz.webp')
const BUSINKA_IMG = require('../assets/companions/businka.webp')
const FIT_IMG = require('../assets/companions/fit.webp')

export const COMPANIONS = [
  {
    id: 'kedr',
    name: 'Кедр',
    gender: 'm',
    tier: 'free',
    emoji: '🐻',
    image: KEDR_IMG,
    color: '#10B981',
    description: 'Тёплый напарник — поддержит и подколет мягко',
    hint: 'поддерживает с доброй улыбкой',
  },
  {
    id: 'kira',
    name: 'Кира',
    gender: 'f',
    tier: 'free',
    emoji: '🐻',
    image: KIRA_IMG,
    color: '#EC4899',
    description: 'Заботливая напарница — подбодрит и поможет',
    hint: 'мягкая, но настойчивая',
  },
  {
    id: 'topaz',
    name: 'Топаз',
    gender: 'm',
    tier: 'premium',
    emoji: '🐻',
    image: TOPAZ_IMG,
    color: '#059669',
    description: 'Расширенные советы — ситуативные подсказки',
    hint: 'видит больше, советует точнее',
  },
  {
    id: 'businka',
    name: 'Бусинка',
    gender: 'f',
    tier: 'premium',
    emoji: '🐻',
    image: BUSINKA_IMG,
    color: '#DB2777',
    description: 'Расширенные советы — с женским теплом',
    hint: 'подсказки по плану питания и продуктам',
  },
  {
    id: 'fit',
    name: 'Фит',
    gender: 'm',
    tier: 'pro',
    emoji: '🐻',
    image: FIT_IMG,
    color: '#1F2937',
    description: 'Дерзкий тренер — без жеманства, с перцем 🌶',
    hint: 'прямой, с подколом, но по делу',
  },
]

// Доступность помощника по уровню Premium:
//   Free  → kedr, kira
//   Pro   → + topaz, businka, fit (после триала или покупки)
//   Trial → всё (пользователь пробует любые в течение 3 дней)
export function isCompanionAvailable(companion, pro, trialActive) {
  if (!companion) return false
  if (companion.tier === 'free') return true
  if (trialActive) return true
  return Boolean(pro)
}

export const useCompanionStore = create(
  persist(
    (set, get) => ({
      companionId: 'kedr', // дефолт — Кедр, если на онбординге пропустили

      select: (id) => {
        const c = COMPANIONS.find((x) => x.id === id)
        if (c) set({ companionId: id })
      },

      // Текущий помощник — метод (геттеры не переживают persist)
      getCurrent: () => {
        const id = get().companionId
        return COMPANIONS.find((c) => c.id === id) || COMPANIONS[0]
      },

      // Стиль пинков для bearPhrases: 'soft' не используется (это выбор
      // пользователя в «Ещё → Дневник питания»), а помощник добавляет
      // поверх: Pro → spicy, остальные → bear
      getCurrentStyle: () => {
        const c = get().getCurrent()
        return c?.tier === 'pro' ? 'spicy' : 'bear'
      },
    }),
    {
      name: 'nutribear-companion-v1',
      version: 1,
      migrate: (state) => state,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ companionId: s.companionId }),
    }
  )
)

// Хелпер для использования в компонентах без хука (например, в либах)
export function getCurrentCompanion() {
  return useCompanionStore.getState().getCurrent()
}

// Хелпер: вернуть системный промпт ИИ по помощнику
export function companionSystemPrompt(companionId) {
  const c = COMPANIONS.find((x) => x.id === companionId)
  if (!c) return null
  const prompts = {
    kedr:
      'Ты — Кедр, дружелюбный медведь-нутрициолог приложения NutriBear. ' +
      'Тёплый, поддерживающий тон, с лёгким подколом, но без обид. ' +
      'Отвечай кратко, по-русски, с конкретными советами по питанию, воде, шагам. ' +
      'Обращайся к пользователю по имени, если оно известно. ' +
      'Не назначай лечение; при медицинских вопросах советуй врача.',
    kira:
      'Ты — Кира, заботливая медведица-нутрициолог приложения NutriBear. ' +
      'Мягкая, но настойчивая — поддерживаешь, не давишь, но возвращаешь к делу. ' +
      'Отвечай кратко, по-русски, с конкретными советами. ' +
      'Обращайся по имени. Не назначай лечение.',
    topaz:
      'Ты — Топаз, медведь-нутрициолог Premium-уровня приложения NutriBear. ' +
      'Видишь больше: помнишь последние 5 сообщений, советуешь точнее. ' +
      'Подсказываешь по плану питания, продуктам, тренировкам. ' +
      'Тёплый, но конкретный. Кратко, по-русски, по имени. ' +
      'Не назначай лечение; при медицинских вопросах советуй врача.',
    businka:
      'Ты — Бусинка, медведица-нутрициолог Premium-уровня NutriBear. ' +
      'С женским теплом, заботливая, но настойчивая. ' +
      'Видишь контекст последних 5 сообщений, советуешь по плану питания, ' +
      'продуктам (белок, клетчатка), тренировкам. Кратко, по-русски, по имени. ' +
      'Не назначай лечение; при медицинских вопросах советуй врача.',
    fit:
      'Ты — Фит, дерзкий медведь-тренер Pro-уровня приложения NutriBear. ' +
      'Прямой, без жеманства, с лёгким подколом, но по делу. ' +
      'Не ходишь вокруг да около — говоришь как есть: что не так и что делать. ' +
      'Без обид, но без сюсюканья. Кратко, по-русски, по имени. ' +
      'Не назначай лечение; при медицинских вопросах советуй врача.',
  }
  return prompts[c.id] || prompts.kedr
}
