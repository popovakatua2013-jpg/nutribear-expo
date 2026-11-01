// Поздравление медвежонка: окно появляется один раз — при живом
// переходе ИМТ в категорию «Норма» (записал вес / поправил рост —
// и попал в здоровый диапазон). Последняя известная категория хранится
// в профиле (lastBmiCat), поэтому после перезапуска приложения окно
// само не выскакивает — только на реальном переходе. Поп-анимация и
// разлёт эмодзи — на нативном Animated (в разметке нет SVG).

import { useEffect, useRef, useState } from 'react'
import { Animated, Easing, Image, Modal, Pressable, Share, Text, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Share2 } from 'lucide-react-native'
import { useProfileStore } from '@/store/useProfileStore'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { fmtDecimal } from '@/lib/data/bmi'

const BEAR = require('../../../assets/images/bear.webp')

// Праздничный burst: эмодзи разлетаются из-за медвежонка и тают —
// те же частицы, что в поздравлении цели по весу (GoalCelebration)
function makeParticles() {
  return ['🎉', '✨', '⭐️', '🎊', '✨', '🎉'].map((emoji, i) => ({
    emoji,
    dx: (i % 2 === 0 ? -1 : 1) * (30 + Math.random() * 48),
    dy: -(64 + Math.random() * 54),
    delay: i * 50,
    dur: 720 + Math.random() * 380,
    size: 15 + Math.random() * 10,
  }))
}

export function NormCongrats({ open, onClose, bmi }) {
  const haptics = useUiPrefsStore((s) => s.haptics)
  const name = useProfileStore((s) => s.name)
  const pop = useRef(new Animated.Value(0)).current
  const [burst, setBurst] = useState(null)

  // Открытие: успех-вибрация (если включена в «Ещё»), поп карточки,
  // разлёт праздничных эмодзи
  useEffect(() => {
    if (!open) return
    if (haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {})
    pop.setValue(0)
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 120,
      useNativeDriver: true,
    }).start()
    setBurst(makeParticles().map((p) => ({ ...p, anim: new Animated.Value(0) })))
  }, [open, pop])

  // Прогоняем частицы и убираем, когда все долетели
  useEffect(() => {
    if (!burst) return
    Animated.parallel(
      burst.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          delay: p.delay,
          duration: p.dur,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        })
      )
    ).start(({ finished }) => {
      if (finished) setBurst(null)
    })
  }, [burst])

  // Похвастаться результатом — системное меню «Поделиться»
  async function shareResult() {
    try {
      await Share.share({
        message: `Мой ИМТ теперь ${fmtDecimal(bmi)} — категория «Норма»! 🐻🎉`,
      })
    } catch {}
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/60 px-6">
        <Animated.View
          accessibilityLabel="Поздравление: ИМТ вернулся в норму"
          className="w-full items-center overflow-hidden rounded-3xl border border-white/10 bg-bear-pop px-5 pb-5 pt-6"
          style={{
            opacity: pop.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [
              { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            ],
          }}
        >
          {/* Эмодзи-бурст из-за медвежонка */}
          {burst && (
            <View pointerEvents="none" style={{ position: 'absolute', left: '50%', top: 96 }}>
              {burst.map((p, i) => (
                <Animated.Text
                  key={i}
                  style={{
                    position: 'absolute',
                    fontSize: p.size,
                    opacity: p.anim.interpolate({
                      inputRange: [0, 0.75, 1],
                      outputRange: [1, 0.85, 0],
                    }),
                    transform: [
                      {
                        translateX: p.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dx],
                        }),
                      },
                      {
                        translateY: p.anim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dy],
                        }),
                      },
                      { scale: p.anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.15] }) },
                    ],
                  }}
                >
                  {p.emoji}
                </Animated.Text>
              ))}
            </View>
          )}

          <Image
            source={BEAR}
            accessibilityLabel="Радостный медвежонок"
            resizeMode="contain"
            style={{ width: 128, height: 128 }}
          />
          <Text maxFontSizeMultiplier={1.2} className="mt-1 font-extrabold text-[20px] text-bear-text">
            {name ? `${name}, ты в норме! 🎉` : 'Ты в норме! 🎉'}
          </Text>
          <Text className="mt-1.5 text-center font-sans text-[13px] leading-relaxed text-bear-soft">
            Твой ИМТ теперь {fmtDecimal(bmi)} — он вошёл в здоровый диапазон 18.5–24.9. Это
            настоящий результат: медвежонок тобой гордится! 🐻💜
          </Text>

          <View className="mt-5 w-full flex-row gap-2">
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть поздравление"
              className="min-w-0 flex-1 items-center rounded-2xl bg-[#7B6CF6] py-3 active:opacity-80"
            >
              <Text className="font-bold text-[14px] text-white">Ура! 🎉</Text>
            </Pressable>
            <Pressable
              onPress={shareResult}
              accessibilityRole="button"
              accessibilityLabel="Поделиться результатом"
              className="w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 active:opacity-70"
            >
              <Share2 size={16} color="#AEB9D9" />
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  )
}
