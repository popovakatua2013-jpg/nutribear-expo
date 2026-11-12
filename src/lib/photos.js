// Фото прогресса: сохранение снимка в папку приложения с ужиманием
// и подготовка к резервной копии (экспорт в base64 + восстановление).
// Файловый API — expo-file-system/legacy, как в остальном проекте.

import * as FileSystem from 'expo-file-system/legacy'
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator'
import { makeId } from '@/lib/format'
import { useProgressPhotosStore } from '@/store/useProgressPhotosStore'

const DIR = `${FileSystem.documentDirectory}progress-photos`

// Папка под фото (создаётся лениво перед первым сохранением)
export async function ensureDir() {
  const info = await FileSystem.getInfoAsync(DIR)
  if (!info.exists) await FileSystem.makeDirectoryAsync(DIR, { intermediates: true })
}

// Скопировать снимок в папку приложения, ужав до 720 px (JPEG 70%):
// на экране фото показывается максимум во всю ширину телефона, а
// каждый мегабайт здесь — мегабайт в бандле обновлений. Возвращает uri.
export async function savePhoto(sourceUri) {
  await ensureDir()
  const small = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 720 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  )
  const dest = `${DIR}/photo-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`
  await FileSystem.copyAsync({ from: small.uri, to: dest })
  try {
    await FileSystem.deleteAsync(small.uri, { idempotent: true })
  } catch {}
  return dest
}

// Удалить файл снимка (при удалении фото пользователем)
export async function deletePhotoFile(uri) {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true })
  } catch {}
}

// ── Фото рецептов ───────────────────────────────────────────────────
// Отдельная папка (не трогается при «Стереть все данные» вместе с
// фото прогресса — у рецептов свой жизненный цикл). Снимок ужимается
// до 540 px: показывается в списке маленькой плиткой.
const RECIPE_DIR = `${FileSystem.documentDirectory}recipe-photos`

export async function saveRecipePhoto(sourceUri) {
  const info = await FileSystem.getInfoAsync(RECIPE_DIR)
  if (!info.exists) await FileSystem.makeDirectoryAsync(RECIPE_DIR, { intermediates: true })
  const small = await manipulateAsync(
    sourceUri,
    [{ resize: { width: 540 } }],
    { compress: 0.7, format: SaveFormat.JPEG }
  )
  const dest = `${RECIPE_DIR}/recipe-${Date.now()}-${Math.round(Math.random() * 1e6)}.jpg`
  await FileSystem.copyAsync({ from: small.uri, to: dest })
  try {
    await FileSystem.deleteAsync(small.uri, { idempotent: true })
  } catch {}
  return dest
}

// Полная зачистка папки фото (кнопка «Стереть все данные»)
export async function wipePhotoDir() {
  try {
    await FileSystem.deleteAsync(DIR, { idempotent: true })
  } catch {}
}

// ── Бэкап ──────────────────────────────────────────────────────────
// В копию фото уходят как base64, ужатые до 540 px (JPEG 50%) —
// файл бэкапа остаётся компактным (~40–80 КБ на снимок), максимум
// 24 последних фото. Текстовые данные при ошибке чтения не теряем.

const BACKUP_WIDTH = 540
const BACKUP_MAX = 24

export async function collectPhotosForBackup(items) {
  const out = []
  for (const p of (items || []).slice(0, BACKUP_MAX)) {
    if (!p?.uri) continue
    try {
      const small = await manipulateAsync(
        p.uri,
        [{ resize: { width: BACKUP_WIDTH } }],
        { compress: 0.5, format: SaveFormat.JPEG }
      )
      const data = await FileSystem.readAsStringAsync(small.uri, {
        encoding: FileSystem.EncodingType.Base64,
      })
      try {
        await FileSystem.deleteAsync(small.uri, { idempotent: true })
      } catch {}
      out.push({ id: p.id, date: p.date, data })
    } catch {
      // файл недоступен (снимок удалён вручную) — пропускаем
    }
  }
  return out
}

// Восстановить фото из копии: пишем файлы в папку приложения
// и подменяем список в сторе (массив из копии — источник истины,
// даже если он пустой). Ошибка отдельного снимка не срывает
// восстановление остального. Старые файлы удаляются.
// Защита от двойного запуска (аудит 13.11 баг-2): если «Восстановить»
// нажали дважды, второй запуск мог удалить файлы, которые первый только
// что записал (они уже попали в стор к моменту удаления старых).
// Мьютекс делает второй вызов ожиданием первого, а повторное
// восстановление после завершения — штатной заменой того же списка
let restoreInFlight = null

export function restorePhotos(list) {
  if (restoreInFlight) return restoreInFlight
  restoreInFlight = doRestorePhotos(list).finally(() => {
    restoreInFlight = null
  })
  return restoreInFlight
}

async function doRestorePhotos(list) {
  if (!Array.isArray(list)) return // копия без фото (старый формат) — не трогаем
  await ensureDir()
  const items = []
  for (const p of list) {
    if (!p || typeof p !== 'object' || typeof p.data !== 'string' || !p.data) continue
    const uri = `${DIR}/photo-${Date.now()}-${makeId()}.jpg`
    try {
      await FileSystem.writeAsStringAsync(uri, p.data, {
        encoding: FileSystem.EncodingType.Base64,
      })
      items.push({
        id: String(p.id || makeId()),
        date: typeof p.date === 'string' && p.date ? p.date : new Date().toISOString(),
        uri,
      })
    } catch {}
  }
  // Файлы прежнего списка больше не нужны
  for (const p of useProgressPhotosStore.getState().items) {
    await deletePhotoFile(p.uri)
  }
  useProgressPhotosStore.setState({ items })
}
