// Стор ИИ-чата: история диалога переживает закрытие экрана /ai-chat,
// «Очистить чат» возвращает приветствие и чистит черновик.

import { AI_GREETING, useAiChatStore } from '@/store/useAiChatStore'

describe('useAiChatStore', () => {
  beforeEach(() => {
    useAiChatStore.getState().reset()
  })

  test('начальное состояние — только приветствие', () => {
    const s = useAiChatStore.getState()
    expect(s.messages).toEqual([AI_GREETING])
    expect(s.text).toBe('')
    expect(s.busy).toBe(false)
    expect(AI_GREETING.role).toBe('assistant')
    expect(AI_GREETING.content).toContain('NutriBear')
  })

  test('setMessages/setText/setBusy обновляют состояние', () => {
    const s = useAiChatStore.getState()
    const next = [
      AI_GREETING,
      { role: 'user', content: 'сколько воды пить?' },
      { role: 'assistant', content: 'Около 2 литров в день' },
    ]
    s.setMessages(next)
    s.setText('черновик')
    s.setBusy(true)
    const after = useAiChatStore.getState()
    expect(after.messages).toHaveLength(3)
    expect(after.messages[1].content).toBe('сколько воды пить?')
    expect(after.text).toBe('черновик')
    expect(after.busy).toBe(true)
  })

  test('reset возвращает приветствие и очищает черновик и busy', () => {
    const s = useAiChatStore.getState()
    s.setMessages([
      AI_GREETING,
      { role: 'user', content: 'привет' },
    ])
    s.setText('незаконченный ввод')
    s.setBusy(true)
    s.reset()
    const after = useAiChatStore.getState()
    expect(after.messages).toEqual([AI_GREETING])
    expect(after.text).toBe('')
    expect(after.busy).toBe(false)
  })

  test('append добавляет сообщение к текущему диалогу', () => {
    const s = useAiChatStore.getState()
    const before = s.messages.length
    s.append({ role: 'assistant', content: 'работаем' })
    expect(useAiChatStore.getState().messages).toHaveLength(before + 1)
    expect(useAiChatStore.getState().messages.at(-1).content).toBe('работаем')
  })
})

describe('смена напарника — диалог начинается заново (отзыв Кати 15.11)', () => {
  test('resetFor стирает диалог прошлого медведя и ставит его приветствие', () => {
    const s = useAiChatStore.getState()
    s.setMessages([
      { role: 'assistant', content: 'Ну привет. Я Фит, твой дерзкий тренер' },
      { role: 'user', content: 'ГОТОВ' },
      { role: 'assistant', content: 'Отлично! Начнём с питания…' },
    ])
    s.setText('недописанный черновик')
    s.setBusy(true)
    s.resetFor('businka')
    const after = useAiChatStore.getState()
    expect(after.companionId).toBe('businka')
    expect(after.messages).toHaveLength(1)
    expect(after.messages[0].role).toBe('assistant')
    // приветствие БУСИНКИ, а не реплика Фита («выбрала Бусинку —
    // а сообщение от Фита»)
    expect(after.messages[0].content).toContain('Бусинка')
    expect(after.messages[0].content).not.toContain('Фит')
    expect(after.messages[0].greeting).toBe(true)
    expect(after.text).toBe('')
    expect(after.busy).toBe(false)
    // номер диалога вырос — на него сверяется запоздалый ответ ИИ
    expect(after.conversation).toBe(s.conversation + 1)
  })

  test('resetFor с неизвестным id даёт приветствие Кедра (фолбэк)', () => {
    useAiChatStore.getState().resetFor('unknown-bear')
    const after = useAiChatStore.getState()
    expect(after.companionId).toBe('unknown-bear')
    expect(after.messages[0].content).toContain('Кедр')
  })

  test('reset после resetFor возвращает приветствие текущего медведя', () => {
    useAiChatStore.getState().resetFor('fit')
    useAiChatStore.getState().reset()
    const after = useAiChatStore.getState()
    expect(after.messages).toHaveLength(1)
    expect(after.messages[0].content).toContain('Фит')
  })
})
