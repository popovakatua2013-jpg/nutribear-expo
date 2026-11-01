// Живой статус сети: true, когда интернет доступен.
// isInternetReachable бывает null на части устройств — считаем
// «онлайн» пока соединение есть и сеть явно НЕ помечена недоступной.

import { useEffect, useState } from 'react'
import NetInfo from '@react-native-community/netinfo'

export function useIsOnline() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const unsub = NetInfo.addEventListener((st) => {
      setOnline(!!st.isConnected && st.isInternetReachable !== false)
    })
    return () => unsub()
  }, [])

  return online
}
