// Профиль пользователя: имя, биоданные (пол/возраст/активность), рост, вес
// и история измерений (вес + замеры тела сантиметром). Используется
// в разделах «Тело» (бывш. «ИМТ») и «Ещё».
// Биоданные нужны калькулятору ИМТ: базовый обмен и суточная норма
// считаются по полу, возрасту и уровню активности.
// Хранится профиль в защищённом хранилище платформы (Android Keystore /
// iOS Keychain): рост, вес, история взвешиваний и замеры тела — данные
// о здоровье, открытому AsyncStorage им не место (аудит 12.11, блокер 2).

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { secureStorage } from '@/lib/secure-storage'
import { makeId } from '@/lib/format'

// Встроенные замеры тела — единый реестр для карточки «Замеры» и
// проверки дублей в addCustomMeasurement. slimGood: «похудение» —
// хорошо (талия/живот) — у остальных замеров размер нейтрален
export const BASE_MEASUREMENTS = [
  { key: 'chest', label: 'Грудь', color: '#A78BFA' },
  { key: 'waist', label: 'Талия', color: '#F87171', slimGood: true },
  { key: 'belly', label: 'Живот', color: '#FB923C', slimGood: true },
  { key: 'glutes', label: 'Попа', color: '#F472B6' },
  { key: 'hips', label: 'Бёдра', color: '#38BDF8' },
]

export const useProfileStore = create(
  persist(
    (set) => ({
      name: '',
      sex: 'female', // female | male
      age: 30,
      heightCm: 175,
      weightKg: 75,
      activityId: 'light', // id из ACTIVITY_LEVELS (онбординг / калькулятор ИМТ)
      hasBio: false, // true — биоданные уже заполнены (онбординг или калькулятор)
      goalWeightKg: null, // цель по весу (кг) или null — показывает прогресс в «Динамике веса»
      goalReachedAt: null, // ISO-дата, когда цель по весу впервые достигнута (награда)
      weights: [], // [{ id, date (ISO), kg }] — новые сверху
      // Замеры тела: { [key]: [{ id, date (ISO), cm }] } — новые сверху.
      // Ключи — встроенные (chest/waist/belly/glutes/hips) или id своего
      // замера из customMeasurements
      measurements: {},
      // Свои замеры через «+» в карточке «Замеры»: [{ id, name }]
      customMeasurements: [],
      // Скрытые замеры (отзыв Кати: снятые галочки в «Записать замеры»
      // не сохранялись): ключи, убранные из карточки и таблицы.
      // Данные не удаляются — вернуть замер можно той же галочкой
      hiddenMeasurements: [],
      lastBmiCat: null, // последняя известная категория ИМТ (low|norm|over|obese1|obese2) — по ней ловим живой переход в «Норму» для поздравления

      setProfile: (patch) =>
        set((s) => ({
          ...s,
          ...patch,
        })),

      // Запомнить категорию ИМТ (для поздравления при переходе в «Норму»)
      setLastBmiCat: (cat) => set({ lastBmiCat: cat }),

      // Новое измерение веса: в историю + текущий вес.
      // Clamp как в updateWeight: мусор/NaN/вне диапазона не пролезает
      addWeight: (kg) => {
        const safe = Math.round(Number(kg) * 10) / 10
        if (!Number.isFinite(safe) || safe < 25 || safe > 300) return
        set((s) => ({
          weightKg: safe,
          weights: [
            { id: makeId(), date: new Date().toISOString(), kg: safe },
            ...s.weights,
          ],
        }))
      },

      // Изменить измерение веса (например, опечатались в цифре).
      // Если поправили самое свежее — обновляется и текущий вес.
      updateWeight: (id, kg) =>
        set((s) => {
          const safe = Math.round(Number(kg) * 10) / 10
          if (!Number.isFinite(safe) || safe < 25 || safe > 300) return {}
          if (!s.weights.some((w) => w.id === id)) return {}
          const weights = s.weights.map((w) => (w.id === id ? { ...w, kg: safe } : w))
          const isTop = s.weights[0] && s.weights[0].id === id
          return { weights, weightKg: isTop ? safe : s.weightKg }
        }),

      // Удалить измерение. Если удалили самое свежее — текущим весом
      // становится предыдущее измерение (данные не «зависают»). 
      removeWeight: (id) =>
        set((s) => {
          const wasTop = s.weights[0] && s.weights[0].id === id
          const weights = s.weights.filter((w) => w.id !== id)
          return {
            weights,
            weightKg: wasTop && weights[0] ? weights[0].kg : s.weightKg,
          }
        }),

      // ─── Замеры тела (сантиметр): грудь, талия, живот, попа, бёдра ───

      // Новый замер: значение в сантиметрах, 20–300, точность 0,1.
      // Возвращает сохранённую запись или null (невалидное значение)
      addMeasurement: (key, cm) => {
        const safe = Math.round(Number(cm) * 10) / 10
        if (!key || !Number.isFinite(safe) || safe < 20 || safe > 300) return null
        const entry = { id: makeId(), date: new Date().toISOString(), cm: safe }
        set((s) => ({
          measurements: { ...s.measurements, [key]: [entry, ...(s.measurements[key] || [])] },
        }))
        return entry
      },

      // Поправить замер (опечатались в цифре). False — записи нет
      updateMeasurement: (key, id, cm) => {
        const safe = Math.round(Number(cm) * 10) / 10
        if (!key || !Number.isFinite(safe) || safe < 20 || safe > 300) return false
        let found = false
        set((s) => ({
          measurements: {
            ...s.measurements,
            [key]: (s.measurements[key] || []).map((m) => {
              if (m.id !== id) return m
              found = true
              return { ...m, cm: safe }
            }),
          },
        }))
        return found
      },

      // Удалить запись замера. False — записи не было
      removeMeasurement: (key, id) => {
        let removed = false
        set((s) => {
          const list = s.measurements[key] || []
          if (!list.some((m) => m.id === id)) return {}
          removed = true
          const next = list.filter((m) => m.id !== id)
          const measurements = { ...s.measurements }
          if (next.length) measurements[key] = next
          else delete measurements[key]
          return { measurements }
        })
        return removed
      },

      // Свой замер через «+»: имя 1–24 символа, без дублей (без учёта
      // регистра, включая встроенные), максимум 10 своих. Возвращает
      // созданный пункт или null
      addCustomMeasurement: (name) => {
        const clean = String(name || '').trim().slice(0, 24)
        if (!clean) return null
        const s = useProfileStore.getState()
        const taken = [
          ...BASE_MEASUREMENTS.map((m) => m.label),
          ...s.customMeasurements.map((m) => m.name),
        ].some((n) => n.toLowerCase() === clean.toLowerCase())
        if (taken || s.customMeasurements.length >= 10) return null
        const item = { id: makeId(), name: clean }
        set((st) => ({ customMeasurements: [...st.customMeasurements, item] }))
        return item
      },

      // Удалить свой замер — вместе со всеми его записями,
      // чтобы не оставлять висячих ключей без названия
      removeCustomMeasurement: (id) => {
        let removed = false
        set((s) => {
          if (!s.customMeasurements.some((m) => m.id === id)) return {}
          removed = true
          const customMeasurements = s.customMeasurements.filter((m) => m.id !== id)
          const measurements = { ...s.measurements }
          delete measurements[id]
          return { customMeasurements, measurements }
        })
        return removed
      },

      // Применить снятые галочки «Записать замеры»: массив СКРЫТЫХ
      // ключей целиком. Данные замеров остаются в measurements —
      // видимость не удаление
      setMeasurementHidden: (keys) =>
        set({
          hiddenMeasurements: Array.isArray(keys)
            ? keys.filter((k) => typeof k === 'string')
            : [],
        }),
    }),
    {
      name: 'nutribear-profile-v1',
      version: 1,
      migrate: (state) => state, // схема меняется — здесь появится миграция
      storage: createJSONStorage(() => secureStorage),
      partialize: (s) => ({
        name: s.name,
        sex: s.sex,
        age: s.age,
        heightCm: s.heightCm,
        weightKg: s.weightKg,
        activityId: s.activityId,
        hasBio: s.hasBio,
        goalWeightKg: s.goalWeightKg,
        goalReachedAt: s.goalReachedAt,
        weights: s.weights,
        measurements: s.measurements,
        customMeasurements: s.customMeasurements,
        hiddenMeasurements: s.hiddenMeasurements,
        lastBmiCat: s.lastBmiCat,
      }),
    }
  )
)
