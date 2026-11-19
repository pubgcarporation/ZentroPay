import { useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, Globe, Lock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'
import { txUrl } from '@/lib/chain'
import { shortAddress, splitUsdc } from '@/lib/format'
import { PrimaryButton, Row, Screen, Spinner } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import type { Payment, User, Visibility } from '@/lib/types'

export interface PayResult {
  hash: `0x${string}`
  amount: bigint
  to: User
  note: string
  visibility: Visibility
  seconds: number
  fee: string
  payment?: Payment
  recordError?: string
}

const VIS: Record<Visibility, { label: string; icon: typeof Globe }> = {
  public: { label: 'Public', icon: Globe },
  friends: { label: 'Friends', icon: Users },
  private: { label: 'Only us', icon: Lock },
}

interface Props {
  result: PayResult
  retrying: boolean
  onRetry: () => void
  onDone: () => void
}

export function PaySuccess({ result, retrying, onRetry, onDone }: Props) {
  const { token } = useSession()
  const queryClient = useQueryClient()
  const [visibility, setVisibility] = useState(result.visibility)
  const [menu, setMenu] = useState(false)
  const { whole, cents } = splitUsdc(result.amount)

  async function changeVisibility(next: Visibility) {
    setMenu(false)
    if (next === visibility) return
    if (!result.payment) {
      toast.error('Save the payment to your feed first.')
      return
    }
    try {
      await api(`/payments/${result.payment.id}`, { token, method: 'PATCH', body: { visibility: next } })
      setVisibility(next)
      void queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not change visibility.')
    }
  }

  async function copyHash() {
    await navigator.clipboard.writeText(result.hash)
    toast.success('Transaction hash copied.')
  }

  const Icon = VIS[visibility].icon
  return (
    <Screen className="pb-6 pt-10">
      <div className="flex flex-col items-center text-center">
        <div className="pop grid size-[120px] place-items-center rounded-full" style={{ background: 'rgba(111,242,179,0.14)' }}>
          <div className="grid size-[96px] place-items-center rounded-full text-black" style={{ background: 'var(--success)' }}>
            <Check className="size-12" strokeWidth={2.2} />
          </div>
        </div>
        <p className="mt-5 text-[17px] text-white/75">Sent to @{result.to.handle}</p>
        <p className="display mt-2 flex items-baseline text-[60px] font-bold leading-none tabular-nums">
          ${whole}<span className="text-[34px] font-semibold text-white/85">.{cents}</span>
        </p>
        <p className="mt-5 rounded-full border border-white/15 bg-white/[0.08] px-4 py-2 text-[16px] font-semibold" style={{ color: 'var(--success)' }}>
          Arrived in {result.seconds.toFixed(1)}s
        </p>
      </div>

      <div className="card relative mt-8 rounded-[26px]">
        {result.note && <Row label="Note">{result.note}</Row>}
        <Row label="Visible to">
          <button onClick={() => setMenu((v) => !v)} className="-my-3 flex h-14 items-center gap-2" aria-haspopup="menu" aria-expanded={menu}>
            <Icon className="size-[18px]" /> {VIS[visibility].label} <ChevronDown className="size-4 text-white/60" />
          </button>
        </Row>
        {menu && (
          <div role="menu" className="rise absolute right-4 top-[calc(100%-8px)] z-10 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#38383c] shadow-xl" style={{ top: result.note ? 112 : 56 }}>
            {(Object.keys(VIS) as Visibility[]).map((key) => {
              const Item = VIS[key].icon
              return (
                <button key={key} role="menuitem" onClick={() => changeVisibility(key)} className="flex h-12 w-full items-center gap-2.5 px-4 text-[16px] font-medium hover:bg-white/10">
                  <Item className="size-[18px]" /> {VIS[key].label}
                  {key === visibility && <Check className="ml-auto size-4" />}
                </button>
              )
            })}
          </div>
        )}
        <Row label="Fee">{result.fee}</Row>
        <Row label="Paid in">USDC on Arc</Row>
        <Row label="Transaction">
          <button onClick={copyHash} aria-label="Copy transaction hash" className="mono -my-3 flex h-14 items-center gap-2 text-[15px]">
            {shortAddress(result.hash)} <Copy className="size-4 text-white/70" />
          </button>
        </Row>
      </div>

      {result.recordError && (
        <div className="mt-4 rounded-[22px] border px-5 py-4 text-[15px]" style={{ background: 'rgba(245,164,91,0.09)', borderColor: 'rgba(245,164,91,0.35)', color: '#f6e1cb' }}>
          Your payment went through, but it could not be added to your feed: {result.recordError}
          <button onClick={onRetry} disabled={retrying} className="mt-2 flex h-11 items-center gap-2 font-bold underline">
            {retrying ? <Spinner className="size-4" /> : 'Try again'}
          </button>
        </div>
      )}

      <a href={txUrl(result.hash)} target="_blank" rel="noopener noreferrer" className="mt-5 flex h-12 items-center justify-center gap-2 text-[17px] font-semibold" style={{ color: 'var(--lavender)' }}>
        View on Arc <ExternalLink className="size-[18px]" />
      </a>
      <div className="mt-auto pt-4"><PrimaryButton onClick={onDone}>Done</PrimaryButton></div>
    </Screen>
  )
}
