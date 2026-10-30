// Режим «Сканер штрих-кода»: наводите камеру на штрих-код упаковки —
// продукт ищется в открытой базе Open Food Facts (бесплатно, без ИИ)
// и открывается экран подтверждения порции. Работает в Expo Go.

import { useEffect, useRef, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Flashlight, FlashlightOff } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'

const OFF_URL = 'https://world.openfoodfacts.org/api/v2/product'

// Нормализация ответа Open Food Facts → вид «выбранной еды» (на 100 г)
function offToItem(code, product) {
  const n = product?.nutriments || {}
  const kcal =
    Number(n['energy-kcal_100g']) ||
    (Number(n.energy_100g) ? Math.round(Number(n.energy_100g) / 4.184) : 0)
  const name = String(product?.product_name_ru || product?.product_name || '').trim()
  return {
    id: `off-${code}`,
    name: name || `Продукт ${code}`,
    emoji: '📦',
    kcal100: Math.max(1, Math.min(950, Math.round(kcal) || 1)),
    p: Math.max(0, Math.min(100, Number(n.proteins_100g) || 0)),
    f: Math.max(0, Math.min(100, Number(n.fat_100g) || 0)),
    c: Math.max(0, Math.min(100, Number(n.carbohydrates_100g) || 0)),
    fib: Math.max(0, Math.min(50, Number(n.fiber_100g) || 0)),
    sug: Math.max(0, Math.min(100, Number(n.sugars_100g) || 0)),
    defaultGrams:
      Number(product?.serving_quantity) > 0 && Number(product.serving_quantity) <= 1000
        ? Math.round(Number(product.serving_quantity))
        : 100,
    sub: String(product?.brands || '').split(',')[0]?.trim() || 'Open Food Facts',
    source: 'off',
  }
}

export function BarcodeMode({ onPick }) {
  const [permission, requestPermission] = useCameraPermissions()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [torch, setTorch] = useState(false)
  const lastCode = useRef(null)

  useEffect(() => {
    if (permission && !permission.granted) requestPermission()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission?.granted])

  async function lookup(code) {
    if (busy) return
    lastCode.current = code
    setBusy(true)
    setError('')
    try {
      const res = await fetch(`${OFF_URL}/${code}.json`, {
        headers: { Accept: 'application/json' },
      })
      const json = await res.json()
      if (json?.status !== 1 || !json?.product) {
        setError(`Продукт со штрих-кодом ${code} не нашёлся в открытой базе. Добавьте его вручную или сфотографируйте этикетку.`)
        return
      }
      onPick(offToItem(code, json.product))
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
        <Text className="text-center font-sans text-[13px] leading-relaxed text-bear-sub">
          Нужен доступ к камере, чтобы сканировать штрих-коды{'\n'}(Настройки → Приложения → Expo Go)
        </Text>
        <Pressable
          onPress={requestPermission}
          accessibilityRole="button"
          accessibilityLabel="Разрешить камеру"
          className="rounded-2xl px-5 py-2.5"
          style={{ backgroundColor: '#7B6CF6' }}
        >
          <Text className="font-bold text-sm text-white">Разрешить камеру</Text>
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
            <Text className="font-sans text-[12px] leading-[17px] text-bear-text">{error}</Text>
          </View>
        ) : null}
        <View className="flex-row items-center gap-2">
          <View className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/50 px-4 py-3">
            <Text className="font-semibold text-[12.5px] text-bear-text">
              {busy ? 'Ищем продукт в базе…' : 'Наведите на штрих-код упаковки'}
            </Text>
            <Text className="font-sans text-[10.5px] text-bear-sub">
              Открытая база Open Food Facts · точные КБЖУ с упаковки
            </Text>
          </View>
          <Pressable
            onPress={() => setTorch((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={torch ? 'Выключить фонарик' : 'Включить фонарик'}
            className="h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/50 active:opacity-70"
          >
            {torch ? <Flashlight size={18} color="#FBBF24" /> : <FlashlightOff size={18} color="#AEB9D9" />}
          </Pressable>
        </View>
      </View>
    </View>
  )
}
