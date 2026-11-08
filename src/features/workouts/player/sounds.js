// src/features/workouts/player/sounds.js — короткие сигналы плеера.
// Три вшитых wav (src/assets/sounds): отсчёт 3-2-1, смена фазы, финиш.
// Плееры создаются лениво при первом проигрывании и живут всё время
// работы приложения; любые ошибки звука глушатся — тренировка не должна
// ломаться из-за аудио. Включается/выключается тумблером в каталоге
// (prefs.soundOn), проверка — на стороне usePlayerEngine.

import { createAudioPlayer, setAudioModeAsync } from 'expo-audio'

const SOURCES = {
  count: require('@/assets/sounds/beep-count.wav'),
  switch: require('@/assets/sounds/beep-switch.wav'),
  done: require('@/assets/sounds/beep-done.wav'),
}

const players = {}
let silentModeSet = false

/** Проиграть сигнал по имени: 'count' | 'switch' | 'done' */
export function playWorkoutSound(name) {
  try {
    const src = SOURCES[name]
    if (!src) return
    let p = players[name]
    if (!p) {
      p = createAudioPlayer(src)
      players[name] = p
    }
    if (!silentModeSet) {
      silentModeSet = true
      // Звучим даже в беззвучном режиме — это сигнал таймера, не музыка
      setAudioModeAsync({ playsInSilentMode: true }).catch(() => {})
    }
    p.seekTo(0)
    p.play()
  } catch {
    // Нет аудио (веб без поддержки и т.п.) — просто молчим
  }
}
