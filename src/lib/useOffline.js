// Единый офлайн-детектор на NetInfo — один слушатель сети на компонент.
// isInternetReachable === null (нет данных от ОС) считаем сетью:
// лучше без предупреждения, чем ложная тревога на некоторых Wi-Fi.
// Используется полоской «Нет сети» (ui/OfflineBar) и чипом ИИ-чата.

import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useOffline() {
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    let alive = true
    NetInfo.fetch()
      .then((s) => {
        if (alive) setOffline(!s.isConnected || s.isInternetReachable === false)
      })
      .catch(() => {})
    const unsub = NetInfo.addEventListener((s) =>
      setOffline(!s.isConnected || s.isInternetReachable === false)
    )
    return () => {
      alive = false
      unsub()
    }
  }, [])

  return offline
}
