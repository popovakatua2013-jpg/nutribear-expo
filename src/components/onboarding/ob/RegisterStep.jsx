// Этап 10. Регистрация — В КОНЦЕ, не в начале: аккаунт просят, когда
// план уже увиден. Можно продолжить анонимно (данные на устройстве).
// Под кнопками — согласие с Политикой и Соглашением (152-ФЗ): документы
// открываются прямо из онбординга, ДО сбора данных.

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { ObField } from './ObField'
import { LegalModal } from '@/components/more/LegalModal'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterStep({ onNext, onBack }) {
  const setAccount = useOnboardingStore((s) => s.setAccount)
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [legal, setLegal] = useState(null) // 'privacy' | 'terms' | null

  function submit() {
    if (email && !EMAIL_RE.test(email)) {
      setErr('Похоже, в адресе опечатка')
      return
    }
    setAccount({ email, provider: email ? 'email' : '' })
    onNext()
  }

  return (
    <ObShell sub="Шаг 10 из 12" title="Создайте аккаунт" onBack={onBack} onNext={submit} nextLabel="Продолжить">
      <View className="gap-3">
        <Text className="font-sans text-[13px] leading-relaxed text-bear-sub2">
          Аккаунт нужен, чтобы не терять план и историю. А можно продолжить
          без него — всё хранится только на устройстве.
        </Text>

        <ObField
          label="Email"
          value={email}
          onChange={(v) => {
            setEmail(v)
            setErr('')
          }}
          suffix="✉️"
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        {err ? <Text className="px-1 font-sans text-[11px] text-rose-300">{err}</Text> : null}

        <View className="flex-row gap-2.5 pt-1">
          <Pressable
            onPress={() => {
              setAccount({ provider: 'google', email: '' })
              onNext()
            }}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] py-3 active:opacity-80"
          >
            <Text className="text-center font-bold text-[13px] text-bear-text">G — Google</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setAccount({ provider: 'apple', email: '' })
              onNext()
            }}
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] py-3 active:opacity-80"
          >
            <Text className="text-center font-bold text-[13px] text-bear-text"> Apple</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            setAccount({ email: '', provider: '' })
            onNext()
          }}
          className="py-2.5"
        >
          <Text className="text-center font-semibold text-[13px] text-bear-sub2">
            Продолжить без аккаунта
          </Text>
        </Pressable>

        {/* Согласие до сбора данных (152-ФЗ) */}
        <Text className="px-2 text-center font-sans text-[10.5px] leading-relaxed text-bear-dim">
          Нажимая «Продолжить», вы соглашаетесь с{' '}
          <Text onPress={() => setLegal('privacy')} className="font-semibold text-[#8DABFF]">
            Политикой конфиденциальности
          </Text>{' '}
          и{' '}
          <Text onPress={() => setLegal('terms')} className="font-semibold text-[#8DABFF]">
            Пользовательским соглашением
          </Text>
          . Данные хранятся только на устройстве.
        </Text>
      </View>

      <LegalModal open={Boolean(legal)} onClose={() => setLegal(null)} initialTab={legal || 'privacy'} />
    </ObShell>
  )
}
