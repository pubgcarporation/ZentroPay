import { useState } from 'react'
import { Search } from 'lucide-react'
import { Avatar, Spinner } from '@/components/ui'
import { useFriends, useUserSearch } from '@/hooks/useApiQueries'
import { timeAgo } from '@/lib/format'
import type { FlowStart } from '@/components/PayFlow'
import type { User } from '@/lib/types'

export function FriendsTab({ onStart }: { onStart: (start: FlowStart) => void }) {
  const [query, setQuery] = useState('')
  const friends = useFriends()
  const search = useUserSearch(query.trim())
  const searching = query.trim().length > 0

  const people: (User & { lastAt?: number })[] = searching ? (search.data ?? []) : (friends.data ?? [])
  const loading = searching ? search.isLoading : friends.isLoading

  return (
    <div className="pb-6 pt-5">
      <h1 className="display text-2xl font-bold">Friends</h1>
      <label className="mt-4 flex min-h-12 items-center gap-2 rounded-full surface-2 px-4">
        <Search className="size-4" style={{ color: 'var(--muted)' }} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find people on ZentroPay" aria-label="Find people" autoCapitalize="none" className="w-full bg-transparent text-[15px]" />
      </label>

      <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
        {searching ? 'Results' : 'People you have paid'}
      </p>
      {loading ? (
        <div className="grid place-items-center py-10" style={{ color: 'var(--muted)' }}><Spinner /></div>
      ) : people.length === 0 ? (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
          {searching ? 'No one found with that handle.' : 'Pay someone and they show up here.'}
        </p>
      ) : (
        <ul>
          {people.map((u) => (
            <li key={u.address} className="flex items-center gap-3 border-b border-white/[0.07] py-3 last:border-b-0">
              <Avatar name={u.name} seed={u.handle} size={44} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">@{u.handle}</div>
                <div className="truncate text-xs" style={{ color: 'var(--muted)' }}>
                  {u.name}{u.city ? ` · ${u.city}` : ''}{u.lastAt ? ` · ${timeAgo(u.lastAt)}` : ''}
                </div>
              </div>
              <button onClick={() => onStart({ mode: 'pay', user: u })} className="min-h-11 rounded-full bg-white px-4 text-[13px] font-semibold text-black">Pay</button>
              <button onClick={() => onStart({ mode: 'request', user: u })} className="min-h-11 rounded-full surface-2 px-4 text-[13px] font-semibold">Request</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
