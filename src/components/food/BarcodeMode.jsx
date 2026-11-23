// Режим «Сканер штрих-кода»: наводите камеру на штрих-код упаковки —
// продукт ищется в открытой базе Open Food Facts (бесплатно, без ИИ)
// и открывается экран подтверждения порции. Работает в Expo Go.
//
// Раньше здесь был свой сырой запрос к OFF с подстановкой имени
// «Продукт {штрихкод}» и калорийности «не меньше 1 ккал» — безымянные
// заглушки базы (есть запись, но нет названия/КБЖУ) превращались в
// «Продукт 46902… — 1 ккал» (отзыв Кати 23.11: сканировала молоко).
// Теперь поиск идёт через getBarcodeCached: продукт БЕЗ настоящего
// названия и калорийности считается не найденным — честная ошибка с
// подсказками вместо выдуманной карточки

import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Flashlight, FlashlightOff, Info } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { getBarcodeCached } from '@/store/useOffCacheStore'
import { BarcodeGuideModal } from './BarcodeGuideModal'
import { useThemeColors } from '@/lib/use-theme'


// Ответ OFF-поиска (off-search.js) → вид «выбранной еды» (на 100 г).
// parseOFFProduct уже отфильтровал записи без названия/калорийности
function offToItem(code, off) {
  return {
    id: off.id || `off-${code}`,
    name: off.name,
    emoji: '📦',
    kcal100: Math.max(0, Math.min(950, Math.round(off.kcal))),
    p: Math.max(0, Math.min(100, Number(off.p) || 0)),
    f: Math.max(0, Math.min(100, Number(off.f) || 0)),
    c: Math.max(0, Math.min(100, Number(off.c) || 0)),
    fib: Math.max(0, Math.min(50, Number(off.fib) || 0)),
    sug: Math.max(0, Math.min(100, Number(off.sug) || 0)),
    defaultGrams: off.defaultGrams || 100,
    sub: off.brand || 'Open Food Facts',
    source: 'off',
  }
}

export function BarcodeMode({ onPick }) {
  const themeColors = useThemeColors()
  const [permission, requestPermission] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [torch, setTorch] = useState(false)
  const lastCode = useRef(null)

  // Обучающее окно «Как сканировать штрихкод» — по образцу подсказки
  // конкурента (скрин Кати 16.11): показывается один раз при входе в
  // режим, вернуть — кнопка (i) рядом с фонариком
  const barcodeGuideSeen = useUiPrefsStore((s) => s.barcodeGuideSeen)
  const setBarcodeGuideSeen = useUiPrefsStore((s) => s.setBarcodeGuideSeen)
  const [guideOpen, setGuideOpen] = useState(false)

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted])

  // Автопоказ окна — один раз на устройство, при первом входе в режим
  useEffect(() => {
    if (!barcodeGuideSeen) setGuideOpen(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function closeGuide() {
    setGuideOpen(false)
    setBarcodeGuideSeen(true) // больше не показываем автоматически
  }

  async function lookup(code) {
    if (busy) return
    lastCode.current = code
    setBusy(true)
    setError('')
    try {
      const off = await getBarcodeCached(code)
      if (!off) {
        setError(
          `Штрихкод ${code} не нашёлся в открытой базе — добавьте продукт ` +
            'вручную, введите название голосом или сфотографируйте этикетку'
        )
        return
      }
      onPick(offToItem(code, off))
    } catch {
      setError('Нет связи с базой продуктов. Проверьте интернет и попробуйте ещё раз')
    } finally {
      setBusy(false)
      lastCode.current = null
    }
  }

  if (!permission) {
    return <View className="flex-1" />
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center gap-3 px-6">
        <Text className="text-center font-sans text-[17.5px] leading-relaxed text-bear-sub">
          Нужен доступ к камере, чтобы сканировать штрих-коды{'\n'}(Настройки → Приложения → Expo Go)
        </Text>
        <Pressable
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Разрешить камеру"
          className="rounded-2xl px-5 py-2.5"
          style={{ backgroundColor: themeColors.accent }}
        >
          <Text className="font-bold text-[19px]" style={{ color: themeColors.accentOn }}>
            Разрешить камеру
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View className="flex-1 overflow-hidden rounded-2xl border border-white/10">
      <CameraView
        style={{ flex: 1 }}
        enableTorch={torch}
        barcodeScannerSettings={{
          barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128'],
        }}
        onBarcodeScanned={({ data }) => {
          if (data && data !== lastCode.current) lookup(data)
        }}
      />
      {/* Рамка прицела */}
      <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
        <View className="h-[150px] w-[70%] rounded-2xl border-2 border-white/70" />
      </View>
      <LinearGradient
        pointerEvents="none"
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        colors={['transparent', 'rgba(10,16,32,0.85)']}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 110 }}
      />
      {/* Подпись и ошибки */}
      <View className="absolute inset-x-4 bottom-4">
        {error ? (
          <View className="mb-2 rounded-2xl border border-white/10 bg-bear-pop px-4 py-3">
            <Text className="font-sans text-[16.5px] leading-[19px] text-bear-text">{error}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-2">
          {/* Подсказка про открытую базу убрана по отзыву: вторая строка
              ломала выравнивание плашки рядом с кнопкой фонарика.
              Размер 13px, а не 17px: на узких экранах (361dp) «Наведите на
              штрих-код упаковки» в одну строку 17px не влезало и обрезалось
              до «Наведите на штрих-код уп…»; 2 строки разрешены как страховка
              на случай увеличенного системного шрифта — текст не режется никогда */}
          <View className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
            <Text
              numberOfLines={2}
              className="font-semibold text-[13px] leading-[17px] text-bear-text"
            >
              {busy ? 'Ищем продукт в базе…' : 'Наведите на штрих-код упаковки'}
            </Text>
          </View>
          <Pressable
            onPress={() => setTorch((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Выключить фонарик' : 'Включить фонарик'}
            className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/50 active:opacity-70"
          >
            {torch ? <Flashlight size={20} color="#FBBF24" /> : <FlashlightOff size={20} color={themeColors.soft} />}
          </Pressable>
          {/* Подсказка «как сканировать» — вернуть окно вручную */}
          <Pressable
            onPress={() => setGuideOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Как сканировать штрихкод"
            className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/50 active:opacity-70"
          >
            <Info size={20} color={themeColors.link} />
          </Pressable>
        </View>
      </View>

      {/* Обучающее окно «Как сканировать штрихкод» */}
      <BarcodeGuideModal visible={guideOpen} onClose={closeGuide} />
    </View>
  )
}
