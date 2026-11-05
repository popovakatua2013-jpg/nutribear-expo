// Экспорт дневника питания в CSV (Excel-совместимый) через
// системное окно «Поделиться» (файл можно сохранить куда угодно).

import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { Share } from 'react-native'

const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`

const dateFmt = (iso) => {
  const [y, m, d] = String(iso || '').split('-')
  return y ? `${d}.${m}.${y}` : ''
}

// rows — записи истории [{day, time, mealId, name, grams, kcal, p, f, c}]
// mealName(id) — человекочитаемое название приёма пищи
export function buildCsv(rows, mealName) {
  const head = 'Дата;Время;Приём;Продукт;Граммы;Ккал;Белки;Жиры;Углеводы'
  const lines = rows.map((r) =>
    [
      dateFmt(r.day),
      r.time,
      mealName(r.mealId),
      r.name,
      r.grams,
      r.kcal,
      r.p != null ? r.p : '',
      r.f != null ? r.f : '',
      r.c != null ? r.c : '',
    ]
      .map(esc)
      .join(';')
  )
  return [head, ...lines].join('\r\n')
}

// «Поделиться» CSV-файлом: раньше текст уходил в Share.share({ message })
// и на Android большие дневники обрезались или не сохранялись как файл.
// Теперь CSV пишется во временный файл и отправляется именно файлом
export async function shareCsv(filename, csv) {
  const fileUri = `${FileSystem.cacheDirectory}${filename}`
  // BOM в начале — Excel без него открывает кириллицу кракозябрами
  await FileSystem.writeAsStringAsync(fileUri, '\uFEFF' + csv, {
    encoding: FileSystem.EncodingType.UTF8,
  })
  if (!(await Sharing.isAvailableAsync())) {
    // Крайне редкий случай: шаринга нет — хотя бы текстом, как раньше
    await Share.share({ title: filename, message: csv })
    try {
      await FileSystem.deleteAsync(fileUri, { idempotent: true })
    } catch {}
    return
  }
  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/csv',
    dialogTitle: 'Экспорт дневника NutriBear',
    UTI: 'public.comma-separated-values-text',
  })
  // Чистим кэш за собой (копия уже сохранена/отправлена)
  try {
    await FileSystem.deleteAsync(fileUri, { idempotent: true })
  } catch {}
}
