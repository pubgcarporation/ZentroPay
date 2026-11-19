import { useState } from 'react'
import { QrCode, Search } from 'lucide-react'
import { BalanceCard } from '@/components/BalanceCard'
import { FeedItem } from '@/components/FeedItem'
import { Avatar, CircleButton, Spinner } from '@/components/ui'
import { useFeed } from '@/hooks/useApiQueries'
import { useSession } from '@/hooks/useSession'

interface Props {
  onPay: () => void
  onRequest: () => void
  onAddMoney: () => void
  onShare: () => void
  onQr: () => void
  onProfile: () => void
}

/** Segmented control used for Friends and You. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: readonly T[]; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex rounded-full border border-white/10 bg-white/[0.07] p-1 text-[15px] font-semibold">
      {options.map((key) => (
        <button
          key={key}
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className="h-9 rounded-full px-4 capitalize transition-colors"
          style={value === key ? { background: 'rgba(255,255,255,0.2)' } : { color: 'rgba(255,255,255,0.75)' }}
        >
          {key}
        </button>
      ))}
    </div>
  )
}

export function Home({ onPay, onRequest, onAddMoney, onShare, onQr, onProfile }: Props) {
  const { me } = useSession()
  const [scope, setScope] = useState<'friends' | 'you'>('friends')
  const feed = useFeed(scope)

  return (
    <div className="pb-32 pt-5">
      <header className="flex items-center gap-3">
        <button onClick={onProfile} aria-label="Your profile" className="shrink-0"><Avatar name={me?.name ?? ''} seed={me?.name} size={48} /></button>
        <button onClick={onPay} className="field flex h-12 flex-1 items-center gap-2.5 rounded-full px-4 text-left text-[17px] text-white/75">
          <Search className="size-5" /> Search ZentroPay
        </button>
        <CircleButton onClick={onQr} label="Show your QR code" size={48}><QrCode className="size-5" /></CircleButton>
      </header>

      <div className="mt-4">
        <BalanceCard onPay={onPay} onRequest={onRequest} onAddMoney={onAddMoney} onShare={onShare} />
      </div>

      <div className="mt-7 flex items-center justify-between">
        <h2 className="display text-[25px] font-bold">Your Orbit</h2>
        <Segmented value={scope} options={['friends', 'you'] as const} onChange={setScope} />
      </div>

      <div className="mt-3">
        {feed.isLoading ? (
          <div className="grid place-items-center py-12 text-white/60"><Spinner /></div>
        ) : feed.data && feed.data.length > 0 ? (
          feed.data.map((p) => <FeedItem key={p.id} payment={p} />)
        ) : (
          <p className="pt-5 text-[17px] text-white/65">
            {scope === 'you' ? 'Pay a friend to start your Orbit.' : 'Payments between you and your friends show up here.'}
          </p>
        )}
      </div>
    </div>
  )
}
