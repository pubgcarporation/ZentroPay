import { useState } from 'react'
import { Check, ChevronDown, Copy, ExternalLink, Globe, Lock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { ApiError, api } from '@/lib/api'
import { txUrl } from '@/lib/chain'
import { shortAddress, splitUsdc } from '@/lib/format'
import { PrimaryButton, Row, Spinner } from '@/components/ui'
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
    <div className="flex min-h-dvh flex-col pb-8 pt-10">
      <div className="flex flex-col items-center text-center">
        <div className="pop grid size-20 place-items-center rounded-full bg-[var(--success)] text-black"><Check className="size-10" strokeWidth={3} /></div>
        <p className="mt-5 text-[15px]" style={{ color: 'var(--muted)' }}>Sent to @{result.to.handle}</p>
        <p className="display mt-1 text-[52px] font-bold tabular-nums leading-none">${whole}<span className="text-2xl text-white/70">.{cents}</span></p>
        <p className="mt-4 rounded-full surface-2 px-3.5 py-1.5 text-xs font-medium">Arrived in {result.seconds.toFixed(1)}s</p>
      </div>

      <div className="relative mt-8 overflow-visible rounded-2xl surface">
        {result.note && <Row label="Note">{result.note}</Row>}
        <Row label="Visible to">
          <button onClick={() => setMenu((v) => !v)} className="-my-2 flex min-h-11 items-center gap-1.5 py-2" aria-haspopup="menu" aria-expanded={menu}>
            <Icon className="size-4" /> {VIS[visibility].label} <ChevronDown className="size-4" />
          </button>
        </Row>
        {menu && (
          <div role="menu" className="absolute right-3 top-[calc(100%-4px)] z-10 w-40 overflow-hidden rounded-2xl surface-2 shadow-xl">
            {(Object.keys(VIS) as Visibility[]).map((key) => {
              const Item = VIS[key].icon
              return (
                <button key={key} role="menuitem" onClick={() => changeVisibility(key)} className="flex min-h-11 w-full items-center gap-2 px-4 text-sm hover:bg-white/10">
                  <Item className="size-4" /> {VIS[key].label}
                  {key === visibility && <Check className="ml-auto size-4" />}
                </button>
              )
            })}
          </div>
        )}
        <Row label="Fee">{result.fee}</Row>
        <Row label="Paid in">USDC on Arc</Row>
        <Row label="Transaction">
          <button onClick={copyHash} className="mono -my-2 flex min-h-11 items-center gap-1.5 py-2 text-xs">
            {shortAddress(result.hash)} <Copy className="size-3.5" />
          </button>
        </Row>
      </div>

      {result.recordError && (
        <div className="mt-4 rounded-2xl p-4 text-sm" style={{ background: 'rgba(245,184,75,0.12)', color: 'var(--warn)' }}>
          Your payment went through, but it could not be added to your feed: {result.recordError}
          <button onClick={onRetry} disabled={retrying} className="mt-2 flex min-h-11 items-center gap-2 font-semibold underline">
            {retrying ? <Spinner className="size-4" /> : 'Try again'}
          </button>
        </div>
      )}

      <a href={txUrl(result.hash)} target="_blank" rel="noopener noreferrer" className="mt-5 flex min-h-11 items-center justify-center gap-1.5 text-sm font-medium" style={{ color: 'var(--brand-soft)' }}>
        View on Arc <ExternalLink className="size-4" />
      </a>
      <div className="mt-auto pt-6"><PrimaryButton onClick={onDone}>Done</PrimaryButton></div>
    </div>
  )
}
