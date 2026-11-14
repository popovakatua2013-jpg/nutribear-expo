// Окно «Меню от ИИ» — Premium-функция этапа 2 монетизации. Открывается
// со значка ✨ в ряду действий карточки «Меню на неделю» (MealPlanScreen).
// Free: честный paywall — состав выгод + планы из PremiumCard (демо-
// активация работает сразу, после неё окно само превращается в форму
// генерации). Premium: норма калорий подставляется из целей (можно
// поправить), поле пожеланий («без свинины», «быстрые завтраки»),
// генерация — 7 дней за один запрос; если в неделе уже есть блюда —
// подтверждение с заменой. Сеть недоступна → menu-ai сам собирает меню
// из встроенной базы (source: 'offline') — тост с честной подписью.

import { useEffect, useRef, useState } from 'react'
import { Alert, Modal, Pressable, Text, TextInput, View } from 'react-native'
import { Sparkles, X } from 'lucide-react-native'
import { formatNum } from '@/lib/format'
import { tapGuard } from '@/lib/tap-guard'
import { GOALS } from '@/lib/data/goals'
import { useProStore } from '@/store/useProStore'
import { useGoalsStore } from '@/store/useGoalsStore'
import { useFoodStore } from '@/store/useFoodStore'
import { useMealPlanStore } from '@/store/useMealPlanStore'
import { useToast } from '../ui/Toast'
import { PremiumCard } from '@/components/more/PremiumCard'
import { generateWeekMenu } from '@/lib/menu-ai'
import { P } from './planPalette'
import { spacing, radius, F, type } from '@/features/workouts/theme'

// Норма калорий для ИИ-меню: здравые границы — за ними просим поправить
const MIN_KCAL = 1000
const MAX_KCAL = 5000

export function AiMenuModal({ open, weekKey, weekDishes = 0, onClose }) {
  const { toast } = useToast()
  const pro = useProStore((s) => s.pro)
  const kcalGoal = useGoalsStore((s) => s.goals.kcal)
  const goalId = useFoodStore((s) => s.goal)
  const [kcal, setKcal] = useState('')
  const [prefs, setPrefs] = useState('')
  const [busy, setBusy] = useState(false)
  // Защита от двойного тапа: двойной запуск генерации два раза
  // перезаписал бы неделю и списал бы деньги за два запроса
  const generateOnce = useRef(tapGuard()).current

  // Открытие: подставляем норму из целей; активация Premium внутри окна
  // (демо) меняет pro → рендер переключается на форму автоматически
  useEffect(() => {
    if (open) {
      setKcal(kcalGoal > 0 ? String(kcalGoal) : '')
      setBusy(false)
    }
  }, [open, kcalGoal])

  const goalLabel = GOALS.find((g) => g.id === goalId)?.label || ''

  const runGeneration = (target) => {
    generateOnce(() => {
      setBusy(true)
      generateWeekMenu({
        kcal: target,
        prefs: prefs.trim().slice(0, 200),
        goal: goalLabel,
      })
        .then((res) => {
          useMealPlanStore.getState().setWeek(weekKey, res.days)
          toast({
            title: res.source === 'ai' ? '✨ Меню на неделю готово' : '🧸 Меню собрано без ИИ',
            description:
              res.source === 'ai'
                ? `Все 7 дней · около ${formatNum(target)} ккал в день. Список покупок — из меню на «Плане»`
                : 'Нет сети — подобрано из встроенной базы блюд, порции под вашу норму',
          })
          onClose()
        })
        .catch((e) => {
          toast({ title: 'Не получилось', description: String(e?.message || 'Попробуйте ещё раз') })
          setBusy(false)
        })
    })
  }

  const start = () => {
    if (busy) return
    const target = Math.round(Number(String(kcal).replace(',', '.')) || 0)
    if (target < MIN_KCAL || target > MAX_KCAL) {
      toast({
        title: 'Проверьте калорийность',
        description: `Для ИИ-меню нужна норма ${MIN_KCAL}–${MAX_KCAL} ккал в день`,
      })
      return
    }
    if (weekDishes > 0) {
      Alert.alert(
        'Заменить меню недели?',
        `Сейчас в меню ${weekDishes} блюд — ИИ заполнит все 7 дней заново.`,
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Заменить', style: 'destructive', onPress: () => runGeneration(target) },
        ],
      )
    } else {
      runGeneration(target)
    }
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHead}>
            <View style={styles.iconTile}>
              <Sparkles size={16} color={P.accentText} />
            </View>
            <Text style={styles.title}>Меню от ИИ на неделю</Text>
            <Pressable
              onPress={onClose}
              style={styles.xBtn}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Закрыть меню от ИИ"
            >
              <X size={18} color={P.text2} />
            </Pressable>
          </View>

          {!pro ? (
            <>
              <Text style={styles.paywallText}>
                ИИ-нутрициолог заполнит все 7 дней под вашу норму калорий: завтрак, обед,
                ужин и перекус. Список покупок соберётся из меню одним тапом.
              </Text>
              <PremiumCard embedded />
            </>
          ) : (
            <>
              <Text style={styles.hint}>
                Норма калорий в день — берётся из ваших целей, можно поправить:
              </Text>
              <TextInput
                style={styles.kcalInput}
                value={kcal}
                onChangeText={setKcal}
                keyboardType="number-pad"
                maxLength={5}
                accessibilityLabel="Норма калорий в день для ИИ-меню"
              />
              <TextInput
                style={styles.prefsInput}
                value={prefs}
                onChangeText={setPrefs}
                placeholder="Пожелания (не обязательно): без свинины, больше рыбы…"
                placeholderTextColor={P.text3}
                multiline
                maxLength={200}
                accessibilityLabel="Пожелания к меню"
              />
              <Pressable
                onPress={start}
                disabled={busy}
                style={[styles.runBtn, busy && styles.runBtnBusy]}
                accessibilityRole="button"
                accessibilityLabel={busy ? 'Медведь составляет меню' : 'Собрать меню на неделю'}
              >
                <Sparkles size={15} color={P.accentInk} />
                <Text style={styles.runBtnText}>
                  {busy ? 'Медведь составляет меню…' : 'Собрать меню на неделю'}
                </Text>
              </Pressable>
              <Text style={styles.note}>
                {busy
                  ? 'Обычно 10–30 секунд. Можно закрыть и вернуться — меню появится само'
                  : `Меню недели будет заменено${weekDishes > 0 ? ` (сейчас в нём ${weekDishes} блюд)` : ''}. Порции легко поправить потом`}
              </Text>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = {
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  sheet: {
    backgroundColor: P.tile,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.screen,
    padding: spacing.xl,
    width: '88%',
    maxHeight: '88%',
    gap: spacing.m,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconTile: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: P.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { ...type.title, color: P.text, flex: 1 },
  xBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },

  // Paywall для free
  paywallText: { ...type.caption, color: P.text2, lineHeight: 18 },

  // Форма генерации (Premium)
  hint: { ...type.caption, color: P.text3 },
  kcalInput: {
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: 12,
    height: 44,
    color: P.text,
    fontSize: 15,
    fontFamily: F[600],
  },
  prefsInput: {
    backgroundColor: P.card,
    borderColor: P.line,
    borderWidth: 1,
    borderRadius: radius.field,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    minHeight: 64,
    color: P.text,
    fontSize: 14,
    fontFamily: F[400],
    textAlignVertical: 'top',
  },
  runBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: P.accent,
    borderRadius: 999,
    height: 46,
    marginTop: 2,
  },
  runBtnBusy: { opacity: 0.7 },
  runBtnText: { fontSize: 13.5, fontWeight: '800', fontFamily: F[800], color: P.accentInk },
  note: { ...type.caption, color: P.text3, textAlign: 'center' },
}
