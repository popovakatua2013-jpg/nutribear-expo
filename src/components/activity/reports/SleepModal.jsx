// Окно «Записать сон»: ввод «лёг спать» / «встал» — минута сна считается
// автоматически, в том числе через полночь («23:30 → 07:00» = 7 ч 30 мин).
// Запись относится к дню ПРОБУЖДЕНИЯ: вечер одного дня и утро другого —
// одна ночь в одной строке дневника. После полуночи (до 05:00) окно
// открывается с «Вчера» — по той же логике, что «За какой день?»
// у тренировок (утром про вчерашнюю ночь вспоминают чаще).
// Поля времени — с маской «ЧЧ:ММ» и авто-двоеточием (паттерн напоминаний
// приёмов пищи), цифры подставляются чипами в один тап. Кнопка «Сохранить»
// закреплена внизу: на небольшом экране не прячется за краем (отзыв Кати
// про уехавшую кнопку в воде). Запись идёт в useHistoryStore (sleepMin) —
// карточка «Сон», окно истории, теплокарта и сравнение периодов видят её
// сами, отдельной синхронизации не нужно.

import { useState } from 'react'
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { MoonStar, Sunrise, X } from 'lucide-react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Pills } from '../../ui/Pills'
import { useToast } from '../../ui/Toast'
import { dayKeyOf, useHistoryStore } from '@/store/useHistoryStore'
import { fmtSleep, sleepMinutes } from '@/lib/data/sleep'

// После полуночи чаще записывают ПРОШЛУЮ ночь — открываем с «Вчера»
function defaultDayOff() {
  return new Date().getHours() < 5 ? 1 : 0
}

function dayKeyFor(off) {
  const d = new Date()
  d.setDate(d.getDate() - off)
  return dayKeyOf(d)
}

// Поле времени с маской «ЧЧ:ММ»: цифры, авто-двоеточие после часов.
// В поле видно всё, что печатает пользователь, а корректность проверяет
// окно через sleepMinutes (мусор/25 часов — null): кнопка «Сохранить»
// блокируется и появляется подсказка — честнее, чем игнорировать нажатия
function TimeField({ value, onChange, placeholder, icon, color, label }) {
  const Icon = icon
  function handle(t) {
    const d = t.replace(/\D/g, '').slice(0, 4)
    let next = d
    if (d.length > 2) next = `${d.slice(0, 2)}:${d.slice(2)}`
    onChange(next)
  }
  return (
    <View className="min-w-0 flex-1">
      <View className="mb-1.5 flex-row items-center gap-1.5">
        <Icon size={14} color={color} />
        <Text maxFontSizeMultiplier={1.2} className="font-sans text-[13.5px] text-bear-sub">
          {label}
        </Text>
      </View>
      <TextInput
        value={value}
        onChangeText={handle}
        keyboardType="number-pad"
        maxLength={5}
        placeholder={placeholder}
        placeholderTextColor="#5A6390"
        textAlign="center"
        accessibilityLabel={label}
        className="rounded-xl border border-white/10 bg-white/5 py-2.5 font-bold text-[21px] text-bear-text"
      />
    </View>
  )
}

// Чипы быстрой подстановки времени («23:00», «07:00» …)
function QuickChips({ times, value, onPick }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-1.5">
      {times.map((t) => (
        <Pressable
          key={t}
          onPress={() => onPick(t)}
          accessibilityRole="button"
          accessibilityLabel={`Подставить ${t}`}
          className="rounded-full bg-white/[0.06] px-2.5 py-1 active:opacity-70"
        >
          <Text maxFontSizeMultiplier={1.2} className="font-semibold text-[13.5px] text-bear-dim">
            {t}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function SleepModal({ open, onClose }) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      {/* Клавиатура не перекрывает поля и закреплённую «Сохранить» (iOS) */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-black/60 px-3 pb-3"
      >
        {open && <SleepBody onClose={onClose} />}
      </KeyboardAvoidingView>
    </Modal>
  )
}

function SleepBody({ onClose }) {
  const { toast } = useToast()
  const record = useHistoryStore((s) => s.record)
  const savedDays = useHistoryStore((s) => s.days)

  const [dayOff, setDayOff] = useState(defaultDayOff)
  const [bed, setBed] = useState('23:00')
  const [wake, setWake] = useState('07:00')

  const mins = sleepMinutes(bed, wake)
  const dayKey = dayKeyFor(dayOff)
  const saved = savedDays?.[dayKey]?.sleepMin || 0
  // Валидно всё, что даёт реальную длительность: мусор в поле — null,
  // одинаковые времена — 0 (бессмысленная запись)
  const valid = mins != null && mins > 0

  function save() {
    if (!valid) return
    record(dayKey, { sleepMin: mins })
    toast({
      title: `🌙 Сон записан: ${fmtSleep(mins)}`,
      description:
        dayOff === 1
          ? 'Ночь учтена во вчерашнем дне — карточка «Сон» в Отчётах обновилась'
          : 'Карточка «Сон» в Отчётах обновилась',
    })
    onClose()
  }

  return (
    <View className="overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
      {/* Шапка */}
      <View className="flex-row items-center gap-2.5 border-b border-bear-line px-5 pb-3 pt-4">
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 12,
            backgroundColor: '#c084fc33',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MoonStar size={18} color="#c084fc" />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="font-bold text-[20px] tracking-tight text-bear-text">Записать сон</Text>
          <Text numberOfLines={1} maxFontSizeMultiplier={1.2} className="mt-0.5 font-sans text-[14px] leading-snug text-bear-sub">
            Укажите, когда легли и когда встали
          </Text>
        </View>
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Закрыть запись сна"
          className="h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
        >
          <X hitSlop={10} size={20} color="#A5AECB" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View className="gap-3 px-5 pb-1 pt-3.5">
          {/* За какой день — день пробуждения */}
          <View>
            <Text maxFontSizeMultiplier={1.2} className="mb-1.5 font-sans text-[13.5px] text-bear-sub">
              Утром какого дня вы встали?
            </Text>
            <Pills
              items={[
                { id: 0, label: 'Сегодня', color: '#c084fc' },
                { id: 1, label: 'Вчера', color: '#c084fc' },
              ]}
              value={dayOff}
              onChange={setDayOff}
              accessibilityLabel="День пробуждения"
            />
          </View>

          {/* Лёг / встал */}
          <View className="flex-row gap-2.5">
            <TimeField
              value={bed}
              onChange={setBed}
              placeholder="23:00"
              icon={MoonStar}
              color="#c084fc"
              label="Легли спать"
            />
            <TimeField
              value={wake}
              onChange={setWake}
              placeholder="07:00"
              icon={Sunrise}
              color="#fbbf24"
              label="Встали"
            />
          </View>
          <QuickChips
            times={['22:30', '23:00', '23:30', '00:00', '01:00']}
            value={bed}
            onPick={setBed}
          />
          <QuickChips
            times={['06:00', '06:30', '07:00', '07:30', '08:00']}
            value={wake}
            onPick={setWake}
          />

          {/* Живой итог: длительность ночи */}
          <View
            className="rounded-2xl border px-4 py-3"
            style={{
              borderColor: valid ? '#c084fc66' : '#ffffff1a',
              backgroundColor: valid ? '#c084fc1f' : 'rgba(255,255,255,0.04)',
            }}
          >
            <Text maxFontSizeMultiplier={1.2} className="font-sans text-[13px] text-bear-sub">
              {valid ? 'Длительность сна' : 'Подсказка'}
            </Text>
            {valid ? (
              <Text
                maxFontSizeMultiplier={1.15}
                adjustsFontSizeToFit
                numberOfLines={1}
                minimumFontScale={0.7}
                className="mt-0.5 font-extrabold text-[24px] leading-tight text-bear-text"
              >
                {fmtSleep(mins)}
                {mins < 420 ? ' · меньше нормы 7 ч' : ''}
              </Text>
            ) : (
              <Text maxFontSizeMultiplier={1.2} className="mt-0.5 font-semibold text-[15px] text-bear-soft">
                {mins === 0 ? 'Время «легли» и «встали» совпадает — заполните оба поля' : 'Часы и минуты, например 23:30 и 07:00'}
              </Text>
            )}
          </View>

          {/* Перезапись существующей записи — честное предупреждение */}
          {saved > 0 ? (
            <Text maxFontSizeMultiplier={1.2} className="font-sans text-[13px] leading-snug text-bear-sub">
              За этот день уже записано {fmtSleep(saved)} — новая запись перезапишет её.
            </Text>
          ) : null}
        </View>
      </ScrollView>

      {/* Сохранить — закреплено внизу: видна всегда (отзыв про воду) */}
      <Pressable
        onPress={save}
        disabled={!valid}
        accessibilityRole="button"
        accessibilityLabel="Сохранить запись сна"
        className={`mt-3 overflow-hidden rounded-2xl px-5 ${!valid ? 'opacity-50' : ''}`}
      >
        <LinearGradient start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} colors={['#4D7CFE', '#8B5CF6', '#A45BFF']}>
          <Text className="py-3.5 text-center font-bold text-[19px] text-white">
            Сохранить{valid ? ` · ${fmtSleep(mins)}` : ''}
          </Text>
        </LinearGradient>
      </Pressable>
    </View>
  )
}
