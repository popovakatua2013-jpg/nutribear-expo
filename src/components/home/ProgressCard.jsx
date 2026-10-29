// Карточка «Прогресс» 1 в 1 с макетом: неоновая панель со светящейся каймой,
// зелёная плитка с кроссовками, подзаголовок «Шаги к лучшей версии себя»,
// градиентное кольцо «N% от цели», остаток до цели, неоновые кроссовки
// и строка «Текущий прогресс» с полоской. «Все» → раздел Активность.

import { Image, Pressable, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Footprints, Maximize2 } from 'lucide-react-native'
import { ProgressRing } from './ProgressRing'
import { formatNum } from '@/lib/format'

export function ProgressCard({ d, onGoAll }) {
  const pct = Math.max(0, Math.min(100, d.stepsPct || 0))
  const remain = Math.max(0, (d.stepsGoal || 0) - (d.steps || 0))

  return (
    <View
      accessibilityLabel="Прогресс"
      style={{
        shadowColor: '#7C5CFC',
        shadowOpacity: 0.45,
        shadowRadius: 34,
        shadowOffset: { width: 0, height: 10 },
      }}
    >
      {/* Светящаяся кайма панели — как у блока «Ваши цели» */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['rgba(168,152,255,0.90)', 'rgba(105,116,238,0.22)', 'rgba(158,138,255,0.62)']}
        style={{ borderRadius: 21, padding: 1.5 }}
      >
        <LinearGradient
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          colors={['#20327E', '#0D1B5A', '#0A1348']}
          style={{ borderRadius: 20, padding: 12 }}
        >
          {/* Шапка: зелёная плитка, заголовок с подзаголовком, пилюля «Все» */}
          <View className="flex-row items-center gap-2.5">
            <LinearGradient
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              colors={['#34D399', '#059669']}
              style={{
                height: 38,
                width: 38,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: '#34D399',
                shadowOpacity: 0.5,
                shadowRadius: 12,
                shadowOffset: { width: 0, height: 3 },
              }}
            >
              <Footprints size={19} color="#FFFFFF" />
            </LinearGradient>

            <View className="min-w-0 flex-1">
              <Text
                maxFontSizeMultiplier={1.25}
                className="font-extrabold text-[16.5px] leading-tight text-bear-text"
              >
                Прогресс
              </Text>
              <Text
                numberOfLines={1}
                maxFontSizeMultiplier={1.15}
                className="mt-0.5 font-medium text-[10.5px] leading-tight"
                style={{ color: '#A9B4E6' }}
              >
                Шаги к лучшей версии себя
              </Text>
            </View>

            <Pressable
              onPress={onGoAll}
              accessibilityLabel="Открыть всю статистику активности"
              accessibilityRole="button"
              className="h-[26px] shrink-0 flex-row items-center gap-1 rounded-full px-2.5 active:opacity-80"
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.16)',
              }}
            >
              <Maximize2 size={10} color="#DCE4FA" />
              <Text className="font-semibold text-[11px]" style={{ color: '#DCE4FA' }}>
                Все
              </Text>
            </Pressable>
          </View>

          {/* Кольцо, остаток до цели и неоновые кроссовки */}
          <View className="mt-3 flex-row items-center gap-3">
            <ProgressRing percent={pct} />

            <View className="shrink-0">
              <Text maxFontSizeMultiplier={1.15} className="font-sans text-[12.5px] text-bear-sub2">
                До цели
              </Text>
              <Text
                maxFontSizeMultiplier={1.15}
                className="mt-0.5 font-extrabold text-[17px] leading-tight text-bear-text"
              >
                {formatNum(remain)} шагов
              </Text>
              <View className="mt-1.5 flex-row items-center">
                <Footprints size={15} color="#4ade80" />
                <Footprints size={15} color="#4ade80" opacity={0.7} style={{ marginLeft: -6 }} />
              </View>
            </View>

            {/* Неоновые кроссовки — как в макете (сердце + листья зашиты в картинку) */}
            <Image
              source={require('../../../assets/images/sneakers.png')}
              resizeMode="contain"
              style={{ flex: 1, height: 112, marginLeft: 2 }}
            />
          </View>

          {/* Строка «Текущий прогресс» с полоской — как в макете */}
          <View
            className="mt-3 rounded-[13px] px-3 pb-2 pt-2.5"
            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
          >
            <View className="flex-row items-center">
              <Footprints size={14} color="#A78BFA" />
              <Text
                maxFontSizeMultiplier={1.15}
                className="ml-1.5 flex-1 font-medium text-[11.5px]"
                style={{ color: '#A9B4E6' }}
              >
                Текущий прогресс
              </Text>
              <Text
                maxFontSizeMultiplier={1.15}
                className="font-semibold text-[12px]"
                style={{ color: '#EEF2FB' }}
              >
                {`${formatNum(d.steps || 0)}\u00A0/\u00A0${formatNum(d.stepsGoal || 0)}`}
              </Text>
            </View>
            <View className="mt-1.5 h-[4px] overflow-hidden rounded-full bg-[rgba(15,21,52,0.85)]">
              <LinearGradient
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                colors={['#C4B5FD', '#F472B6']}
                style={{ width: `${pct}%`, height: '100%', borderRadius: 999 }}
              />
            </View>
          </View>
        </LinearGradient>
      </LinearGradient>
    </View>
  )
}
