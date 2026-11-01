// Мини-история ИМТ по неделям: открывается тапом по бейджу
// «В норме N недель» под кольцом. Для каждой из последних 8 недель —
// снимок ИМТ на конец недели: последнее измерение «на тот день или
// раньше»; недель до первой записи касаемся честно — «нет данных»,
// никаких вымышленных значений. Цвет точки — по категории ИМТ.
// Над списком — спарклайн тех же снимков: сглаженная кривая идёт только
// по неделям с данными (до первой записи — разрыв), точки окрашены
// по категории. Кнопка «Поделиться» отправляет историю текстом
// через системное меню телефона.

import { useState } from 'react'
import { Modal, Pressable, ScrollView, Share, Text, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg'
import { Share2, X } from 'lucide-react-native'
import { calcBmi, bmiCategory, fmtDecimal, shortDate } from '@/lib/data/bmi'
import { smoothPath } from '../ui/SvgAreaChart'
import { useToast } from '../ui/Toast'

// Короткие названия категорий — чтобы строка помещалась в один ряд
const SHORT = {
  low: 'Дефицит',
  norm: 'Норма',
  over: 'Лишний вес',
  obese1: 'Ожирение',
  obese2: 'Ожирение',
}

const WEEKS = 8

// Спарклайн снимков ИМТ: слева — самая старая неделя, справа — сегодняшняя.
// Кривая идёт только по неделям с данными: до первой записи разрыв —
// никаких вымышленных значений. Точки окрашены по категории ИМТ,
// у последней — белая обводка (текущий снимок). Ширина меряется onLayout.
function WeeksSparkline({ rows }) {
  const [w, setW] = useState(0)
  const chrono = [...rows].reverse() // старые слева, сегодняшняя справа
  const valid = chrono.filter((r) => r.kg != null)

  if (!valid.length) {
    return (
      <View className="rounded-2xl bg-white/[0.04] px-3 py-3">
        <Text className="font-sans text-[11px] text-bear-sub">
          Запишите вес — и здесь появится динамика ИМТ по неделям 🐻
        </Text>
      </View>
    )
  }

  const H = 54
  const pad = 7
  const n = chrono.length
  const bmis = valid.map((r) => r.bmi)
  const max = Math.max(...bmis)
  const min = Math.min(...bmis)
  // Ровная линия по центру, если ИМТ не менялся (иначе деление на ноль)
  const lo = min === max ? min - 0.6 : min
  const hi = min === max ? max + 0.6 : max
  const y = (v) => pad + ((H - pad * 2) * (hi - v)) / (hi - lo)
  const x = (i) => (n === 1 ? w / 2 : (w * i) / (n - 1))
  const pts = chrono.map((r, i) => ({
    x: x(i),
    y: y(r.bmi),
    valid: r.kg != null,
    color: r.cat.color,
  }))
  const lastIdx = pts.reduce((acc, p, i) => (p.valid ? i : acc), -1)

  // Непрерывные отрезки из недель с данными — между ними честный разрыв
  const runs = []
  let cur = []
  for (const p of pts) {
    if (p.valid) cur.push(p)
    else if (cur.length) {
      runs.push(cur)
      cur = []
    }
  }
  if (cur.length) runs.push(cur)
  const lines = runs.filter((run) => run.length >= 2)

  return (
    <View className="rounded-2xl bg-white/[0.04] px-2 pb-1 pt-2">
      <View
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        style={{ height: H }}
        accessibilityLabel="Спарклайн: снимок ИМТ на конец каждой недели"
      >
        {w > 0 && (
          <Svg width={w} height={H}>
            <Defs>
              {/* свой id — чтобы не пересекаться с другими заливками вкладки */}
              <LinearGradient id="nbsStreakFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#A78BFA" stopOpacity={0.26} />
                <Stop offset="1" stopColor="#A78BFA" stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            {lines.map((run, ri) => {
              const d = smoothPath(run)
              const area = `${d} L ${run[run.length - 1].x} ${H} L ${run[0].x} ${H} Z`
              return <Path key={`ar${ri}`} d={area} fill="url(#nbsStreakFill)" />
            })}
            {lines.map((run, ri) => (
              <Path
                key={`ln${ri}`}
                d={smoothPath(run)}
                stroke="#A78BFA"
                strokeWidth={2}
                strokeLinecap="round"
                fill="none"
              />
            ))}
            {pts.map(
              (p, i) =>
                p.valid && (
                  <Circle
                    key={`dot${i}`}
                    cx={p.x}
                    cy={p.y}
                    r={i === lastIdx ? 3.8 : 3}
                    fill={p.color}
                    stroke={i === lastIdx ? '#FFFFFF' : 'none'}
                    strokeWidth={i === lastIdx ? 1.6 : 0}
                  />
                )
            )}
          </Svg>
        )}
      </View>
      <View className="flex-row items-center justify-between px-1.5 pb-1.5">
        <Text className="font-sans text-[9.5px] text-bear-sub">{chrono[0].label}</Text>
        <Text className="font-sans text-[9.5px] text-bear-sub">сегодня</Text>
      </View>
    </View>
  )
}

export function StreakHistoryModal({ open, onClose, weightKg, weights, heightCm }) {
  const { toast } = useToast()

  // Измерения по возрастанию времени — для поиска «на тот день или раньше»
  const asc = (weights || [])
    .map((r) => ({ t: new Date(r.date).getTime(), kg: r.kg }))
    .sort((a, b) => a.t - b.t)

  // Снимок на конец каждой недели: сегодня, неделю назад, две… (новые сверху)
  const rows = []
  for (let k = 0; k < WEEKS; k++) {
    const end = new Date()
    end.setHours(0, 0, 0, 0)
    end.setDate(end.getDate() - k * 7)
    const tEnd = end.getTime()
    let kg = null
    for (const r of asc) {
      if (r.t <= tEnd) kg = r.kg
      else break
    }
    const bmi = kg != null ? calcBmi(kg, heightCm) : 0
    const cat = bmiCategory(bmi)
    rows.push({ label: shortDate(end), kg, bmi, cat })
  }

  // Экспорт истории по неделям в системное «Поделиться» — текстом:
  // старые недели сверху, свежие внизу, недели без данных пропускаем
  async function shareHistory() {
    const valid = [...rows].reverse().filter((r) => r.kg != null)
    if (!valid.length) {
      toast({
        title: 'Пока нет данных',
        description: 'Запишите вес — и историю ИМТ можно будет отправить',
      })
      return
    }
    const lines = valid.map(
      (r) => `${r.label} — ИМТ ${fmtDecimal(r.bmi)} · ${SHORT[r.cat.id] || r.cat.label}`
    )
    try {
      await Share.share({
        title: 'История ИМТ — NutriBear',
        message: `Мой ИМТ по неделям 🐻 NutriBear:\n\n${lines.join('\n')}`,
      })
    } catch {}
  }

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60 px-3 pb-3">
        <View className="max-h-[85%] overflow-hidden rounded-3xl border border-white/10 bg-bear-pop">
          {/* Шапка */}
          <View className="flex-row items-start justify-between border-b border-bear-line px-5 pb-3 pt-4">
            <View className="min-w-0 flex-1 pr-2">
              <Text className="font-bold text-[15px] text-bear-text">
                Как менялся твой ИМТ
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-bear-sub">
                Снимок на конец каждой из последних {WEEKS} недель
              </Text>
            </View>
            <Pressable
              onPress={shareHistory}
              accessibilityRole="button"
              accessibilityLabel="Поделиться историей ИМТ по неделям"
              className="mr-1 h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <Share2 size={15} color="#AEB9D9" />
            </Pressable>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Закрыть историю ИМТ"
              className="h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/5 active:opacity-70"
            >
              <X size={16} color="#AEB9D9" />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16 }}>
            {/* Спарклайн поверх списка недель */}
            <WeeksSparkline rows={rows} />

            <View className="mt-2.5 gap-1.5">
              {rows.map((row) => (
                <View
                  key={row.label}
                  className="flex-row items-center gap-2.5 rounded-xl bg-white/[0.04] px-3 py-2.5"
                >
                  <Text className="w-[42px] shrink-0 font-sans text-[11px] text-bear-dim">
                    {row.label}
                  </Text>
                  {row.kg != null ? (
                    <>
                      <View
                        className="h-[9px] w-[9px] shrink-0 rounded-full"
                        style={{
                          backgroundColor: row.cat.color,
                          shadowColor: row.cat.color,
                          shadowOpacity: 0.8,
                          shadowRadius: 5,
                        }}
                      />
                      <Text numberOfLines={1} className="min-w-0 flex-1 font-semibold text-[13px] text-bear-text">
                        {`${fmtDecimal(row.bmi)} · ${SHORT[row.cat.id] || row.cat.label}`}
                      </Text>
                    </>
                  ) : (
                    <Text numberOfLines={1} className="min-w-0 flex-1 font-sans text-[12px] text-bear-sub">
                      Нет данных — до первой записи
                    </Text>
                  )}
                </View>
              ))}
            </View>

            <Text className="mt-3 px-1 font-sans text-[10.5px] leading-snug text-bear-sub">
              🛡 Бейдж у кольца показывает стрик — недели подряд, когда ИМТ в «Норме».
              Держи вес — стрик растёт каждую неделю. Поделиться — иконка справа сверху.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}
