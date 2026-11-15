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
