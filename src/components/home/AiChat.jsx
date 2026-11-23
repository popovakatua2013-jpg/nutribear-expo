// ИИ-чат «конвертик»: плавающая кнопка на главной (крупная, заметная).
// Сам диалог — отдельный экран /ai-chat (app/ai-chat.jsx): раньше он
// был модалкой, но внутри RN-Modal на Android устройства Кати система
// не давала ни одного сигнала о клавиатуре (окно не ужалось, события
// keyboardDidShow не приходили) и клавиатура перекрывала ввод —
// два фикса внутри модалки не помогли. Отдельный экран живёт в главном
// окне, где клавиатура работает во всём приложении. История диалога —
// в useAiChatStore, переживает закрытие экрана.

import { Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Mail } from 'lucide-react-native'
import { router } from 'expo-router'
import { useThemeColors } from '@/lib/use-theme'

export function AiChat() {
  // Конвертик — в цвете активной темы (правка Кати 24.11 «сделай
  // в точности как на скрине»: на макете плавающая кнопка светится
  // неоном темы — лайм/лазурь/орхидея/бирюза/янтарь); иконка белая
  const c = useThemeColors()
  return (
    <Pressable
      onPress={() => router.push('/ai-chat')}
      accessibilityLabel="Открыть ИИ-чат"
      accessibilityRole="button"
      className="absolute bottom-6 right-4 active:opacity-80"
      style={{
        width: 60,
        height: 60,
        elevation: 6,
        shadowColor: c.accent,
        shadowOpacity: 0.55,
        shadowRadius: 12,
      }}
    >
      {/* Градиент — явным размером, иконка ВНУТРИ него: заливка
          «растяжкой на весь родитель» (absolute-инсеты) не рендерится —
          вместо неонового круга на устройстве Кати был голый конверт */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={[c.accentBright, c.accent]}
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Mail size={28} color="#FFFFFF" strokeWidth={2.2} />
      </LinearGradient>
    </Pressable>
  )
}
