import { ArrowDownLeft, ArrowUpRight, Plus, Share2 } from 'lucide-react'
import { Rings } from '@/components/ui'
import { useUsdcBalance } from '@/hooks/useApiQueries'
import { splitUsdc } from '@/lib/format'

interface Props {
  onPay: () => void
  onRequest: () => void
  onAddMoney: () => void
  onShare: () => void
}

const glass = 'grid size-12 place-items-center rounded-full border border-white/25 bg-white/15 transition-colors hover:bg-white/25'

/** Purple balance card with the ring pattern, Pay and Request. */
export function BalanceCard({ onPay, onRequest, onAddMoney, onShare }: Props) {
  const { data: balance, isLoading } = useUsdcBalance()
  const parts = balance === undefined ? undefined : splitUsdc(balance)

  return (
    <section className="relative overflow-hidden rounded-[30px] p-[22px]" style={{ background: '#3811c4' }}>
      <Rings opacity={0.14} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[16px] text-white/85">Balance</div>
          <div className="display mt-1.5 flex items-baseline text-[48px] font-bold leading-none tabular-nums">
            {parts ? (
              <>
                ${parts.whole}
                <span className="ml-0.5 text-[26px] font-semibold text-white/85">.{parts.cents}</span>
              </>
            ) : (
              <span className="text-white/60">{isLoading ? '…' : '$0.00'}</span>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onAddMoney} aria-label="Add money" className={glass}><Plus className="size-6" /></button>
          <button onClick={onShare} aria-label="Share your pay link" className={glass}><Share2 className="size-[19px]" /></button>
        </div>
      </div>
      <div className="relative mt-5 grid grid-cols-2 gap-3.5">
        <button onClick={onPay} className="flex h-14 items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black transition-transform active:scale-[0.97]">
          <ArrowUpRight className="size-[18px]" /> Pay
        </button>
        <button onClick={onRequest} className="flex h-14 items-center justify-center gap-2 rounded-full border border-white/25 bg-white/20 text-[17px] font-semibold transition-transform active:scale-[0.97]">
          <ArrowDownLeft className="size-[18px]" /> Request
        </button>
      </div>
    </section>
  )
}
