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

export function AiChat() {
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
        shadowColor: '#4D7CFE',
        shadowOpacity: 0.45,
        shadowRadius: 10,
      }}
    >
      {/* Градиент — явным размером, иконка ВНУТРИ него: заливка
          «растяжкой на весь родитель» (absolute-инсеты) не рендерится —
          вместо фиолетового круга на устройстве Кати был голый конверт */}
      <LinearGradient
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}
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
