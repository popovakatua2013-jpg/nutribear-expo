// Офлайн-помощник: советы под три цели приложения — похудение,
// поддержание и набор веса (задача «приложение не только для похудения»).
// Проверяем раскладку веток: явные цели раньше «веса/ИМТ», иначе
// «набрать вес» уходил бы в ответ про индекс массы тела.

import { offlineReply } from '@/lib/chat'

const CTX = {
  goal: 2000,
  eaten: 1200,
  waterMl: 1000,
  waterGoal: 2000,
  steps: 5000,
  stepsGoal: 8000,
  bmi: 22.4,
  weightKg: 65,
  heightCm: 170,
}

describe('offlineReply: советы под цель пользователя', () => {
  test('похудение — про дефицит и личную норму', () => {
    const r = offlineReply('хочу похудеть', CTX)
    expect(r).toContain('дефицит')
    expect(r).toContain('2000')
  })

  test('«сбросить вес» ведёт к совету про дефицит, а не к статусу ИМТ', () => {
    const r = offlineReply('хочу сбросить вес', CTX)
    expect(r).toContain('дефицит')
  })

  test('набор веса — профицит, без слова «дефицит»', () => {
    const r = offlineReply('хочу набрать вес', CTX)
    expect(r).toContain('профицит')
    expect(r).not.toMatch(/дефицит/i)
  })

  test('поддержание — про стабильные привычки', () => {
    const r = offlineReply('как поддержать вес?', CTX)
    expect(r).toContain('стабильные привычки')
  })

  test('ИМТ ниже нормы — совет набирать, а не худеть', () => {
    const r = offlineReply('какой у меня имт?', { ...CTX, bmi: 17.2 })
    expect(r).toContain('профицит')
    expect(r).not.toMatch(/дефицит/i)
  })

  test('«индекс массы тела» не проваливается в советы про набор', () => {
    const r = offlineReply('расскажи про индекс массы тела и имт', CTX)
    expect(r).toContain('ИМТ — 22.4')
  })

  test('белок — нейтрален к цели (и дефицит, и набор)', () => {
    const r = offlineReply('расскажи про протеин', CTX)
    expect(r).toContain('любой цели')
  })
})
