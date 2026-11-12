// Карточка «Помощник» для вкладки «Ещё»: выбор медведя-напарника
// и его характер. Доступность по уровню Premium: free всегда доступны,
// premium/pro — при оплате или в триале. После смены помощника
// пересчитываются пулы фраз в bearPhrases.js и системный промпт ИИ.
//
// Режим embedded: без своей шапки и карточки — содержимое встраивается
// в строку меню «Помощник» (как CycleCard, SleepDashboardCard и пр.)

import { Image, Pressable, Text, View } from 'react-native'
import { Check, Lock } from 'lucide-react-native'
import {
  COMPANIONS,
  useCompanionStore,
  isCompanionAvailable,
} from '@/store/useCompanionStore'
import { useProStore } from '@/store/useProStore'
import { useToast } from '@/components/ui/Toast'

// Триал активен, если pro=true и plan='trial'
function isTrialActive(pro, plan) {
  return Boolean(pro) && plan === 'trial'
}

export function CompanionCard({ embedded = false }) {
  const companionId = useCompanionStore((s) => s.companionId)
  const select = useCompanionStore((s) => s.select)
  const pro = useProStore((s) => s.pro)
  const plan = useProStore((s) => s.plan)
  const trialActive = isTrialActive(pro, plan)
  const { toast } = useToast()

  function pick(c) {
    if (!isCompanionAvailable(c, pro, trialActive)) {
      toast({
        title: `${c.name} — Premium`,
        description: 'Доступен с подпиской или в триале',
      })
      return
    }
    select(c.id)
    toast({
      title: `🐻 Напарник: ${c.name}`,
      description: c.hint,
    })
  }

  const content = (
    <View className="gap-2" accessibilityLabel="Выбор помощника">
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
            className="overflow-hidden rounded-2xl"
          >
            <View
              className={`flex-row items-center gap-3 border px-3 py-2.5 ${
                active
                  ? 'border-[#A45BFF] bg-[#A45BFF]/10'
                  : locked
                    ? 'border-white/5 bg-white/[0.02]'
                    : 'border-white/10 bg-white/[0.03]'
              }`}
            >
              {/* Аватар */}
              <View
                className="h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                style={{ backgroundColor: `${c.color}22` }}
              >
                <Image
                  source={c.image}
                  style={{ width: 42, height: 42 }}
                  resizeMode="cover"
                  accessibilityLabel={`${c.name} — аватар`}
                />
              </View>

              {/* Имя и описание */}
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    numberOfLines={1}
                    className={`font-bold text-[15.5px] ${
                      active ? 'text-white' : 'text-bear-text'
                    }`}
                  >
                    {c.name}
                  </Text>
                  {c.tier === 'pro' && (
                    <Text className="rounded-full bg-[#1F2937]/50 px-1.5 py-0.5 font-bold text-[10.5px] text-white">
                      PRO
                    </Text>
                  )}
                  {c.tier === 'premium' && (
                    <Text className="rounded-full bg-amber-400/15 px-1.5 py-0.5 font-bold text-[10.5px] text-amber-300">
                      Premium
                    </Text>
                  )}
                </View>
                <Text
                  numberOfLines={2}
                  className="mt-0.5 font-sans text-[13px] leading-snug text-bear-sub2"
                >
                  {c.description}
                </Text>
              </View>

              {/* Состояние: галочка / замок */}
              {active ? (
                <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#A45BFF]">
                  <Check size={15} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : locked ? (
                <View className="h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5">
                  <Lock size={14} color="#8B96B8" />
                </View>
              ) : null}
            </View>
          </Pressable>
        )
      })}

      <Text className="mt-1 font-sans text-[12.5px] leading-relaxed text-bear-dim">
        Фит доступен с триала — попробуй дерзкий характер.
        Можно менять в любой момент.
      </Text>
    </View>
  )

  if (embedded) {
    return <View accessibilityLabel="Помощник">{content}</View>
  }

  // Не embedded — отдельной карточкой (например, на главной)
  return (
    <View
      accessibilityLabel="Помощник"
      className="rounded-3xl border border-bear-bodyLine bg-bear-bodyCard p-4"
    >
      {content}
    </View>
  )
}
