import { useState } from 'react'
import { QrCode, Search } from 'lucide-react'
import { BalanceCard } from '@/components/BalanceCard'
import { FeedItem } from '@/components/FeedItem'
import { Avatar, Spinner } from '@/components/ui'
import { useFeed } from '@/hooks/useApiQueries'
import { useSession } from '@/hooks/useSession'

interface Props {
  onPay: () => void
  onRequest: () => void
  onAddMoney: () => void
  onShare: () => void
  onProfile: () => void
}

export function Home({ onPay, onRequest, onAddMoney, onShare, onProfile }: Props) {
  const { me } = useSession()
  const [scope, setScope] = useState<'friends' | 'you'>('friends')
  const feed = useFeed(scope)

  return (
    <div className="pb-6 pt-4">
      <header className="flex items-center gap-2.5">
        <button onClick={onProfile} aria-label="Your profile" className="shrink-0">
          <Avatar name={me?.name ?? ''} seed={me?.handle} size={40} />
        </button>
        <button onClick={onPay} className="flex min-h-11 flex-1 items-center gap-2 rounded-full surface-2 px-4 text-left text-sm" style={{ color: 'var(--muted)' }}>
          <Search className="size-4" /> Search ZentroPay
        </button>
        <button onClick={onShare} aria-label="Share your handle link" className="grid size-11 shrink-0 place-items-center rounded-full surface-2 transition-colors hover:bg-white/10">
          <QrCode className="size-[18px]" />
        </button>
      </header>

      <div className="mt-4">
        <BalanceCard onPay={onPay} onRequest={onRequest} onAddMoney={onAddMoney} onShare={onShare} />
      </div>

      <div className="mt-6 flex items-center justify-between">
        <h2 className="display text-lg font-semibold">Your Orbit</h2>
        <div role="tablist" className="flex rounded-full surface-2 p-1 text-xs font-semibold">
          {(['friends', 'you'] as const).map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={scope === key}
              onClick={() => setScope(key)}
              className="min-h-8 rounded-full px-3.5 capitalize transition-colors"
              style={scope === key ? { background: 'rgba(255,255,255,0.14)' } : { color: 'var(--muted)' }}
            >
              {key}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-1">
        {feed.isLoading ? (
          <div className="grid place-items-center py-12" style={{ color: 'var(--muted)' }}><Spinner /></div>
        ) : feed.data && feed.data.length > 0 ? (
          feed.data.map((p) => <FeedItem key={p.id} payment={p} />)
        ) : (
          <p className="py-12 text-center text-sm" style={{ color: 'var(--muted)' }}>
            {scope === 'you' ? 'No payments yet. Tap Pay to send your first one.' : 'Payments between you and your friends show up here.'}
          </p>
        )}
      </div>
    </div>
  )
}
