// Регрессия 16.11: экран «Виджет дня» падал красным экраном
// «Cannot convert undefined value to object» — селектор
// (s) => s.exercises ссылался на несуществующее поле useExerciseStore
// (поле называется logs), а totalBurned(exercises) вызывался без ключа
// дня. Краш всплывал дважды в логе: сам экран и вторая трасса через
// <Stack> в _layout.jsx (граница навигации). UI в тестах не рендерится,
// поэтому исходник экрана проверяем текстом (как ai-chat), а формулы —
// вызовом: dayBurned/totalBurned обязаны выживать на undefined-логах.

import { dayBurned, totalBurned } from '@/store/useExerciseStore'

const fs = require('fs')
const path = require('path')
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app', 'widget.jsx'), 'utf8')

describe('widget.jsx: виджет дня не падает', () => {
  test('селектор упражнений берёт logs, а не несуществующее exercises', () => {
    expect(SRC).toContain('useExerciseStore((s) => s.logs)')
    // именно селектор «(s) => s.exercises», а не упоминание в комментарии
    expect(SRC).not.toMatch(/\(\s*s\s*\)\s*=>\s*s\.exercises\b/)
  })

  test('totalBurned вызывается с ключом дня и шагами — как на главной и «Активности»', () => {
    expect(SRC).toContain('totalBurned(exLogs, dayKeyOf(), steps)')
    expect(SRC).toContain("import { dayKeyOf } from '@/store/useHistoryStore'")
  })
})

describe('dayBurned/totalBurned: undefined-логи не роняют расчёт', () => {
  test('нет логов — пустой день (0), а не TypeError', () => {
    expect(dayBurned(undefined, '2026-11-16')).toBe(0)
    expect(dayBurned(null, '2026-11-16')).toBe(0)
    expect(totalBurned(undefined, '2026-11-16', 0)).toBe(0)
    // шаги: 100 шагов × 0.04 ккал = 4 ккал
    expect(totalBurned(undefined, '2026-11-16', 100)).toBe(4)
  })

  test('с существующими логами расчёт как раньше', () => {
    const logs = { '2026-11-16': [{ kcal: 120 }, { kcal: '80' }, { kcal: null }] }
    expect(dayBurned(logs, '2026-11-16')).toBe(200)
    expect(dayBurned(logs, 'нет-такого-дня')).toBe(0)
    expect(totalBurned(logs, '2026-11-16', 50)).toBe(202)
  })
})
