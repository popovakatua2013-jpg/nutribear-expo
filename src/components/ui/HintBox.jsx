// Подсказка «Как это работает» — общая для вкладки «План» (отзыв Кати:
// «все подсказки в приложении должны закрываться на крестик, по
// умолчанию свернуть»). По умолчанию видна ТОЛЬКО шапка-строка
// («💡 Как это работает» + шеврон) — тап раскрывает шаги; крестик в
// раскрытом виде закрывает подсказку насовсем и запоминает это в
// useUiPrefsStore.closedHints — после перезапуска она не вернётся.
// Шаги — список строк с номерами в лаймовых кружках (стиль бокса
// подсказок «Меню на неделю», палитра planPalette).

import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { ChevronDown, X } from 'lucide-react-native'
import { useUiPrefsStore } from '@/store/useUiPrefsStore'
import { P } from '../planner/planPalette'
import { spacing, radius, type, F } from '@/features/workouts/theme'

export function HintBox({ id, title = 'Как это работает', steps = [], style }) {
  const closed = useUiPrefsStore((s) => Boolean(s.closedHints?.[id]))
  const closeHint = useUiPrefsStore((s) => s.closeHint)
  // open — локальное раскрытие: по умолчанию свернуто (отзыв Кати)
  const [open, setOpen] = useState(false)
  if (closed) return null

  return (
    <View style={[S.card, style]} accessibilityLabel={`Подсказка: ${title}`}>
      <Pressable
        onPress={() => setOpen((s) => !s)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? `Свернуть подсказку «${title}»` : `Показать подсказку «${title}»`}
        hitSlop={6}
        style={S.head}
      >
        <Text style={S.title} numberOfLines={1}>{`💡 ${title}`}</Text>
        {open ? (
          // Раскрыта — крестик закрывает насовсем (запоминается)
          <Pressable
            onPress={() => closeHint(id)}
            accessibilityRole="button"
            accessibilityLabel="Закрыть подсказку"
            hitSlop={8}
            style={S.xbtn}
          >
            <X size={15} color={P.text3} />
          </Pressable>
        ) : (
          <ChevronDown size={16} color={P.text3} />
        )}
      </Pressable>
      {open && (
        <View pointerEvents="none">
          {steps.map((s, i) => (
            <View key={i} style={S.row}>
              <View style={S.num}>
                <Text style={S.numText}>{i + 1}</Text>
              </View>
              <Text style={S.text}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

const S = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(198,251,75,0.06)',
    borderColor: P.accentBorder,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.l,
    marginTop: spacing.m,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.s },
  title: { ...type.title, fontSize: 15, color: P.text, flex: 1 },
  xbtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s, marginTop: spacing.s },
  num: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: P.accentSoft,
    borderColor: P.accentBorder,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numText: { fontSize: 13, fontWeight: '800', fontFamily: F[700], color: P.accent },
  text: { ...type.body, fontSize: 13, color: P.text2, flex: 1, lineHeight: 19 },
})
