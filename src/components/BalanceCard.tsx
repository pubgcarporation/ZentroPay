import { ArrowDownLeft, ArrowUpRight, Plus, Share2 } from 'lucide-react'
import { useUsdcBalance } from '@/hooks/useApiQueries'
import { splitUsdc } from '@/lib/format'

interface Props {
  onPay: () => void
  onRequest: () => void
  onAddMoney: () => void
  onShare: () => void
}

/** Purple balance card with Pay and Request actions. */
export function BalanceCard({ onPay, onRequest, onAddMoney, onShare }: Props) {
  const { data: balance, isLoading } = useUsdcBalance()
  const parts = balance === undefined ? undefined : splitUsdc(balance)

  return (
    <section className="rounded-[28px] p-5" style={{ background: 'linear-gradient(160deg, #4a1fe0 0%, #3b12c8 55%, #320fb0 100%)' }}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-white/70">Balance</div>
          <div className="display mt-1 flex items-baseline text-[40px] font-bold tabular-nums leading-none">
            {parts ? (
              <>
                ${parts.whole}
                <span className="text-xl font-semibold text-white/80">.{parts.cents}</span>
              </>
            ) : (
              <span className="text-white/60">{isLoading ? '…' : '$0.00'}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onAddMoney} aria-label="Add money" className="grid size-11 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
            <Plus className="size-5" />
          </button>
          <button onClick={onShare} aria-label="Share your handle link" className="grid size-11 place-items-center rounded-full bg-white/15 transition-colors hover:bg-white/25">
            <Share2 className="size-[18px]" />
          </button>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <button onClick={onPay} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-semibold text-black transition-transform active:scale-[0.97]">
          <ArrowUpRight className="size-4" /> Pay
        </button>
        <button onClick={onRequest} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white/20 text-sm font-semibold transition-transform active:scale-[0.97]">
          <ArrowDownLeft className="size-4" /> Request
        </button>
      </div>
    </section>
  )
}
