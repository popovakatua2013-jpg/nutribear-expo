// Этап 3. «Выбери напарника» — выбор помощника на всё время использования
// приложения. Доступные варианты: 2 бесплатных (Кедр/Кира) и Pro-медведь
// Фит, доступный с триала. Premium (Топаз/Бусинка) показываем с замком —
// тап открывает пейволл.
//
// После выбора помощник определяет:
//   • тон пинков (bear/spicy) — bearPhrases.js
//   • системный промпт ИИ-чата — companionSystemPrompt
//   • аватар в чате и на главной — useCompanionStore.current.image
//
// Пропустить шаг нельзя, но есть дефолт — Кедр, если пользователь
// ничего не выбрал и нажал «Далее»

import { Image, Pressable, Text, View } from 'react-native'
import { Check, Lock } from 'lucide-react-native'
import { ObShell } from './ObShell'
import { COMPANIONS, useCompanionStore, isCompanionAvailable } from '@/store/useCompanionStore'
import { useProStore } from '@/store/useProStore'
import { useOnboardingStore } from '@/store/useOnboardingStore'

// Триал активен, если pro=true и plan='trial'
function isTrialActive(pro, plan) {
  return Boolean(pro) && plan === 'trial'
}

export function CompanionStep({ onBack, onNext }) {
  const companionId = useCompanionStore((s) => s.companionId)
  const select = useCompanionStore((s) => s.select)
  const pro = useProStore((s) => s.pro)
  const plan = useProStore((s) => s.plan)
  const trialActive = isTrialActive(pro, plan)
  const patch = useOnboardingStore((s) => s.patchAnswers)

  function pick(c) {
    if (!isCompanionAvailable(c, pro, trialActive)) {
      // Premium-медведь без оплаты — на пейволл (он откроется следом)
      return
    }
    select(c.id)
    patch({ companionId: c.id })
  }

  return (
    <ObShell
      sub="Шаг 3 из 6"
      title="Напарник"
      onBack={onBack}
      onNext={onNext}
      nextLabel="Далее"
    >
      <Text className="mt-1 font-sans text-[16.5px] leading-relaxed text-bear-sub2">
        Медведь будет с тобой каждый день: подсказывать, подкалывать,
        поддерживать. Выбери того, кто тебе ближе.
      </Text>

      <View className="mt-5 gap-3">
        {COMPANIONS.map((c) => {
          const active = companionId === c.id
          const available = isCompanionAvailable(c, pro, trialActive)
          const locked = !available
          return (
            <Pressable
              key={c.id}
              onPress={() => pick(c)}
              accessibilityLabel={`Выбрать ${c.name}`}
              accessibilityState={{ selected: active, disabled: locked }}
              className="overflow-hidden rounded-3xl"
            >
              <View
                className={`flex-row items-center gap-3 border px-4 py-3.5 ${
                  active
                    ? 'border-[#A45BFF] bg-[#A45BFF]/10'
                    : locked
                      ? 'border-white/5 bg-white/[0.02]'
                      : 'border-white/10 bg-white/[0.03]'
                }`}
              >
                {/* Аватар медведя */}
                <View
                  className="h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl"
                  style={{ backgroundColor: `${c.color}22` }}
                >
                  <Image
                    source={c.image}
                    style={{ width: 56, height: 56 }}
                    resizeMode="cover"
                    accessibilityLabel={`${c.name} — аватар`}
                  />
                </View>

                {/* Имя и описание */}
                <View className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text
                      numberOfLines={1}
                      className={`font-bold text-[18px] ${
                        active ? 'text-white' : 'text-bear-text'
                      }`}
                    >
                      {c.name}
                    </Text>
                    {c.tier === 'pro' && (
                      <Text className="rounded-full bg-[#1F2937]/50 px-2 py-0.5 font-bold text-[11.5px] text-white">
                        PRO
                      </Text>
                    )}
                    {c.tier === 'premium' && (
                      <Text className="rounded-full bg-amber-400/15 px-2 py-0.5 font-bold text-[11.5px] text-amber-300">
                        Premium
                      </Text>
                    )}
                  </View>
                  <Text
                    numberOfLines={2}
                    className="mt-0.5 font-sans text-[14px] leading-snug text-bear-sub2"
                  >
                    {c.description}
                  </Text>
                  {locked && (
                    <Text className="mt-1 font-sans text-[12.5px] text-amber-300">
                      Доступен с Premium
                    </Text>
                  )}
                  {c.tier === 'pro' && trialActive && (
                    <Text className="mt-1 font-sans text-[12.5px] text-emerald-300">
                      Доступен в триале
                    </Text>
                  )}
                </View>

                {/* Состояние: галочка / замок */}
                {active ? (
                  <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#A45BFF]">
                    <Check size={18} color="#FFFFFF" strokeWidth={3} />
                  </View>
                ) : locked ? (
                  <View className="h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5">
                    <Lock size={16} color="#8B96B8" />
                  </View>
                ) : null}
              </View>
            </Pressable>
          )
        })}
      </View>

      <Text className="mt-4 font-sans text-[13.5px] leading-relaxed text-bear-dim">
        Можно сменить позже в «Ещё → Помощник». Фит доступен с триала —
        попробуй дерзкий характер, пока действует.
      </Text>
    </ObShell>
  )
}
