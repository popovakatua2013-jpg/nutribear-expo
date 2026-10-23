// Этап 10. Регистрация — В КОНЦЕ, не в начале: аккаунт просят, когда
// план уже увиден. Можно продолжить анонимно (данные на устройстве).

import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { ObShell } from './ObShell'
import { ObField } from './ObField'
import { useOnboardingStore } from '@/store/useOnboardingStore'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function RegisterStep({ onNext, onBack }) {
  const setAccount = useOnboardingStore((s) => s.setAccount)
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')

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
      </View>
    </ObShell>
  )
}
