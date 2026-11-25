// Контракт ИИ-чата с медведем-напарником и лимитами этапа 1.
// Регрессия 15.11: коммит «финальная сборка» переписал ai-chat.jsx и
// потерял шапку с аватаром/именем медведя, приветствие характера,
// аватар у ответов и лимиты ИИ — CI это пропустил, потому что UI
// в тестах не рендерится. Проверяем исходник экрана на все точки
// интеграции: если что-то снова выпадет — тест падает до коммита.

import { COMPANIONS, companionSystemPrompt } from '@/store/useCompanionStore'
import { AI_GREETING } from '@/store/useAiChatStore'

const fs = require('fs')
const path = require('path')
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app', 'ai-chat.jsx'), 'utf8')

describe('ai-chat.jsx: медведь-напарник не потерялся', () => {
  test('экран подписан на выбранного медведя из COMPANIONS', () => {
    expect(SRC).toContain("useCompanionStore((s) => s.companionId)")
    expect(SRC).toContain('COMPANIONS.find((c) => c.id === companionId)')
  })

  test('шапка: аватар и имя медведя вместо обезличенного «ИИ-помощник»', () => {
    expect(SRC).toContain('companion.image')
    expect(SRC).toContain('{companion.name}')
    // заголовок больше не хардкод-строка «ИИ-помощник»
    expect(SRC).not.toMatch(/^\s*ИИ-помощник$/m)
  })

  test('приветствие выбранного медведя подставляется вместо дефолтного', () => {
    expect(SRC).toContain('companion.greeting')
    expect(SRC).toContain('AI_GREETING.content')
    expect(SRC).toContain("[companionId]")
  })

  test('у ответов медведя — его аватар (как минимум два использования image)', () => {
    const uses = SRC.split('companion.image').length - 1
    expect(uses).toBeGreaterThanOrEqual(2)
  })

  test('характер медведя уходит в системный промпт ИИ', () => {
    expect(SRC).toContain('buildCompanionSystem(buildContext())')
  })

  test('подписи честности под пузырями: офлайн-режим и лимит', () => {
    expect(SRC).toContain('🧸 офлайн-режим')
    expect(SRC).toContain('дневной лимит ИИ исчерпан')
  })

  test('лимиты ИИ этапа 1: проверка до запроса и списание после успеха', () => {
    expect(SRC).toContain("canUse('chat', pro)")
    expect(SRC).toContain("record('chat')")
    expect(SRC).toContain('ИИ-чата осталось')
  })
})

describe('ai-chat.jsx: оформление как в мессенджере (отзыв Кати 15.11)', () => {
  test('пока медведь думает — «{имя} печатает» с живыми точками', () => {
    // Индикатор носит имя выбранного медведя (Фит/Кедр/Кира/…), а не
    // безличное «Печатает…»
    expect(SRC).toContain('{companion.name} печатает')
    expect(SRC).not.toMatch(/^\s*Печатает…\s*$/m)
    // Анимированные точки: нативный Animated, цикл, три точки
    expect(SRC).toContain('function TypingDots()')
    expect(SRC).toContain('Animated.loop(')
    const dotViews = SRC.split('Animated.View').length - 1
    expect(dotViews).toBeGreaterThanOrEqual(1)
  })

  test('пузыри узкие — по ширине текста, а не в столбик на весь экран', () => {
    // У колонки ответа медведя больше нет flex-1 (растягивал пузырь
    // на всю ширину) — вместо него flexShrink: 1 (длинный ответ
    // переносится, короткий обнимает текст)
    expect(SRC).toContain('flexShrink: 1')
    // старый класс пузыря медведя на всю ширину исчез
    expect(SRC).not.toContain('rounded-2xl rounded-bl-md')
    expect(SRC).not.toContain('rounded-2xl rounded-br-md')
    // Ограничение ширины: медведь до 85%, пользователь до 80% экрана
    expect(SRC).toContain("maxWidth: '85%'")
    expect(SRC).toContain("maxWidth: '80%'")
  })

  test('у пузырей «хвостик» — маленький радиус угла у отправителя', () => {
    // Медведь слева — скруглён нижний левый (className на View работает),
    // пользователь справа — нижний правый. ВАЖНО (скриншот Кати 15.11:
    // «ГОТОВ» — узкой строкой без паддингов и углов): на LinearGradient
    // className игнорируется (expo-linear-gradient без cssInterop),
    // поэтому у градиента пользователя ВСЕ размеры — явные style-пропсы
    expect(SRC).toContain('rounded-[18px]')
    expect(SRC).toContain('rounded-bl-[5px]')
    expect(SRC).toContain('borderRadius: 18')
    expect(SRC).toContain('borderBottomRightRadius: 5')
    expect(SRC).toContain('paddingHorizontal: 14')
    expect(SRC).toContain('paddingVertical: 10')
    expect(SRC).toContain('minWidth: 110')
    // прежний вариант — классы на градиенте — не должен вернуться
    expect(SRC).not.toContain('rounded-br-[5px]')
  })

  test('кнопка отправки и «конвертик» — градиент явным размером, без absoluteFill', () => {
    // На устройстве Кати expo-linear-gradient не растягивается по
    // inset-позиционированию (absoluteFillObject) — вместо кнопки была
    // голая иконка самолётика, вместо конвертика на главной — голый
    // конверт. Заливка обязана иметь явные width/height, иконка —
    // внутри градиента
    expect(SRC).toContain('width: 42')
    expect(SRC).toContain('height: 42')
    // Правка Кати 25.11 («проверь замечания по всем темам»): кнопка и
    // пузыри ИИ-чата светятся цветом АКТИВНОЙ темы (accentBright →
    // accent), иконка на градиенте — accentOn
    expect(SRC).toContain('<Send size={19} color={themeColors.accentOn} />')
    expect(SRC).toContain("colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}")
    expect(SRC).not.toContain('#4D7CFE')
    const after = SRC.slice(SRC.indexOf("colors={[themeColors.accentBright, themeColors.accent, themeColors.accentBright]}", SRC.indexOf('Отправить')))
    expect(after).toContain('<Send')
    expect(SRC).not.toContain('absoluteFillObject')
    const conv = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'home', 'AiChat.jsx'), 'utf8')
    expect(conv).not.toContain('absoluteFillObject')
    expect(conv).toContain('borderRadius: 30')
    expect(conv).toContain('<Mail')
  })
})

describe('ai-chat.jsx: смена напарника начинает диалог заново (отзыв Кати 15.11)', () => {
  test('экран сверяет напарника диалога с выбранным и зовёт resetFor', () => {
    expect(SRC).toContain('s.companionId !== companionId')
    expect(SRC).toContain('s.resetFor(companionId)')
    // приветствие выбранного медведя — в сторе, не хардкод
    expect(SRC).toContain('companion.greeting')
  })

  test('запоздалый ответ ИИ адресуется диалогу: conversation + append', () => {
    expect(SRC).toContain('useAiChatStore.getState().conversation')
    expect(SRC).toContain('s.conversation !== conv')
    expect(SRC).toContain('s.append(message)')
  })
})

describe('приветствия и характеры всех медведей', () => {
  test('у всех пяти медведей непустое уникальное приветствие', () => {
    const greetings = COMPANIONS.map((c) => c.greeting)
    for (const g of greetings) {
      expect(typeof g).toBe('string')
      expect(g.length).toBeGreaterThan(10)
    }
    expect(new Set(greetings).size).toBe(COMPANIONS.length)
  })

  test('приветствие Фита — дерзкое, от первого лица, с именем', () => {
    const fit = COMPANIONS.find((c) => c.id === 'fit')
    expect(fit.greeting).toContain('Фит')
    expect(fit.greeting).toMatch(/Готов|дерзк|пахать/i)
  })

  test('приветствие каждого медведя называет его имя', () => {
    for (const c of COMPANIONS) {
      expect(`${c.id}: ${c.greeting}`).toContain(c.name)
    }
  })

  test('дефолтное приветствие стора отличается от персональных', () => {
    for (const c of COMPANIONS) {
      expect(c.greeting).not.toBe(AI_GREETING.content)
    }
  })

  test('системный промпт Фита — дерзкий тренер; у всех пяти промпт есть', () => {
    for (const c of COMPANIONS) {
      const p = companionSystemPrompt(c.id)
      expect(p).toContain(c.name)
    }
    expect(companionSystemPrompt('fit')).toMatch(/дерзкий|без сюсюканья|как есть/)
    expect(companionSystemPrompt('kedr')).toMatch(/дружелюбн/)
    // неизвестный id → null, фолбэк на Кедра делает buildCompanionSystem
    expect(companionSystemPrompt('unknown')).toBeNull()
  })
})
