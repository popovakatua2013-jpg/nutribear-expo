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
})
