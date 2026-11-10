// Подтверждение удаления записи дневника (урок из отзывов конкурента —
// скриншоты Кати от 11.11, отзыв Иришки про правку/удаление): раньше
// корзина удаляла запись мгновенно — случайный тап терял блюдо без
// возврата. Тестируем хелпер confirm-remove.js: диалог показывается,
// «Отмена» ничего не делает, «Удалить» убирает запись и показывает тост.

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
}))

import { confirmRemoveEntry } from '@/lib/confirm-remove'
import { Alert } from 'react-native'

const ENTRY = { id: 'e1', emoji: '🥣', name: 'Овсянка', grams: 250, kcal: 255 }

// Нажатие кнопки диалога по её подписи
function pressButton(title) {
  const buttons = Alert.alert.mock.calls[0][2]
  const btn = buttons.find((b) => b.text === title)
  return btn && btn.onPress
}

describe('подтверждение удаления записи дневника', () => {
  let removeEntry
  let toast

  beforeEach(() => {
    Alert.alert.mockClear()
    removeEntry = jest.fn()
    toast = jest.fn()
    confirmRemoveEntry({ removeEntry, mealId: 'breakfast', entry: ENTRY, mealName: 'Завтрак', toast })
  })

  test('показывается диалог: название, граммовка, калории, приём', () => {
    expect(Alert.alert).toHaveBeenCalledTimes(1)
    const [title, message, buttons] = Alert.alert.mock.calls[0]
    expect(title).toBe('Удалить запись?')
    expect(message).toContain('🥣 Овсянка')
    expect(message).toContain('250 г')
    expect(message).toContain('255 ккал')
    expect(message).toContain('«Завтрак»')
    expect(buttons.map((b) => b.text)).toEqual(['Отмена', 'Удалить'])
  })

  test('«Отмена» ничего не удаляет — случайный тап безопасен', () => {
    const cancel = pressButton('Отмена')
    if (cancel) cancel()
    expect(removeEntry).not.toHaveBeenCalled()
    expect(toast).not.toHaveBeenCalled()
  })

  test('«Удалить» убирает запись из дневника и показывает тост', () => {
    const del = pressButton('Удалить')
    expect(typeof del).toBe('function')
    del()
    expect(removeEntry).toHaveBeenCalledWith('breakfast', 'e1')
    expect(toast).toHaveBeenCalledTimes(1)
    expect(toast.mock.calls[0][0].title).toContain('Запись удалена')
  })

  test('без граммовки (г=0) — «0 г» в тексте нет, но ккал видны; пустой приём не выводится', () => {
    Alert.alert.mockClear()
    confirmRemoveEntry({
      removeEntry,
      mealId: 'snack',
      entry: { ...ENTRY, grams: 0 },
      mealName: '',
      toast,
    })
    const [, message] = Alert.alert.mock.calls[0]
    expect(message).not.toContain('0 г')
    expect(message).toContain('255 ккал')
    expect(message).not.toContain('«')
  })
})
