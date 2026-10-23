// Распознавание еды через веб-версию на ПК (как ИИ-чат):
// POST /api/food/scan — фото → блюдо (vision-модель),
// POST /api/food/voice — запись/фраза → блюдо и граммы (ASR + LLM).
// Сервер — Next.js веб-версии на том же ПК (порт 3000, тот же Wi-Fi).

import * as FileSystem from 'expo-file-system'
import { getChatApiUrl } from './chat'

function withTimeout(timeoutMs) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  return { signal: ctrl.signal, done: () => clearTimeout(timer) }
}

// Фото (file://) → dataURL base64
async function imageToDataUrl(uri) {
  const res = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  })
  return `data:image/jpeg;base64,${res}`
}

// Скан еды по фото → { items: [{ name, kcal100, p, f, c, source }] }
export async function scanFoodImage(imageUri, timeoutMs = 25000) {
  const url = getChatApiUrl()?.replace('/api/chat', '/api/food/scan')
  if (!url) throw new Error('Сервер веб-версии недоступен')

  const image = await imageToDataUrl(imageUri)
  const { signal, done } = withTimeout(timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }),
      signal,
    })
    const data = await res.json()
    if (data && Array.isArray(data.items) && data.items.length) return data.items
    throw new Error(data?.error || 'Еда на фото не распознана')
  } finally {
    done()
  }
}

// Голос (base64 аудио) → { text, grams, items: [{ name, kcal100, ... }] }
export async function recognizeVoiceAudio(audioBase64, timeoutMs = 25000) {
  const url = getChatApiUrl()?.replace('/api/chat', '/api/food/voice')
  if (!url) throw new Error('Сервер веб-версии недоступен')

  const { signal, done } = withTimeout(timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64 }),
      signal,
    })
    const data = await res.json()
    if (data && (Array.isArray(data.items) ? data.items.length : false)) return data
    throw new Error(data?.error || 'Фраза не распознана')
  } finally {
    done()
  }
}

// Текстовая фраза (правка распознанного) → тот же ответ
export async function recognizeVoiceText(text, timeoutMs = 15000) {
  const url = getChatApiUrl()?.replace('/api/chat', '/api/food/voice')
  if (!url) throw new Error('Сервер веб-версии недоступен')

  const { signal, done } = withTimeout(timeoutMs)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal,
    })
    const data = await res.json()
    if (data && (Array.isArray(data.items) ? data.items.length : false)) return data
    throw new Error(data?.error || 'Фраза не распознана')
  } finally {
    done()
  }
}
