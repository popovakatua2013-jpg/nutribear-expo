// Поле времени «ЧЧ:ММ» — общий компонент настроек напоминаний:
// цифры вводятся подряд, двоеточие ставится само. Время уходит в стор
// только когда введены все 4 цифры и оно корректно.
// (Переехало из MealRemindersCard — раньше карточки напоминаний были
// большими, теперь время стоит прямо в строках компактного списка.)

import { useState } from 'react'
import { TextInput } from 'react-native'

export function TimeField({ value, onChange }) {
  const [text, setText] = useState(value)
  const [focused, setFocused] = useState(false)

  // Пока поле в фокусе показываем локальный ввод, иначе — значение стора
  const shown = focused ? text : value

  function handle(t) {
    const d = t.replace(/\D/g, '').slice(0, 4)
    let next = d
    if (d.length > 2) next = `${d.slice(0, 2)}:${d.slice(2)}`
    setText(next)
    if (d.length === 4) {
      const hh = Number(d.slice(0, 2))
      const mm = Number(d.slice(2))
      if (hh <= 23 && mm <= 59) onChange(`${d.slice(0, 2)}:${d.slice(2)}`)
    }
  }

  return (
    <TextInput
      value={shown}
      onChangeText={handle}
      onFocus={() => {
        setText(value)
        setFocused(true)
      }}
      onEndEditing={() => setFocused(false)}
      keyboardType="number-pad"
      maxLength={5}
      textAlign="center"
      accessibilityLabel="Время напоминания, часы и минуты"
      className="w-[64px] shrink-0 rounded-xl border border-white/10 bg-white/5 py-1.5 font-semibold text-[17.5px] text-bear-text"
    />
  )
}
