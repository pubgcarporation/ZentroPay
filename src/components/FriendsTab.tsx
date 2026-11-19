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
  const search = useUserSearch(query.trim().replace(/^@/, ''))
  const searching = query.trim().length > 0

  const people: (User & { lastAt?: number })[] = searching ? (search.data ?? []) : (friends.data ?? [])
  const loading = searching ? search.isLoading : friends.isLoading

  return (
    <div className="pb-32 pt-8">
      <h1 className="display text-[36px] font-bold">Friends</h1>
      <label className="field mt-5 flex h-14 items-center gap-3 rounded-full px-5">
        <Search className="size-5 text-white/70" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find people on ZentroPay" aria-label="Find people" autoCapitalize="none" className="w-full bg-transparent text-[17px] font-medium" />
      </label>

      <p className="mb-1 mt-6 text-[15px] text-white/60">{searching ? 'Results' : 'People you have paid'}</p>
      {loading ? (
        <div className="grid place-items-center py-10 text-white/60"><Spinner /></div>
      ) : people.length === 0 ? (
        <p className="py-10 text-center text-[16px] text-white/60">
          {searching ? 'No one found with that handle.' : 'Pay someone and they show up here.'}
        </p>
      ) : (
        <ul>
          {people.map((u) => (
            <li key={u.address} className="flex items-center gap-3.5 border-b border-white/[0.07] py-3.5 last:border-b-0">
              <Avatar name={u.name} seed={u.name} size={52} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[17px] font-bold">{u.name}</div>
                <div className="truncate text-[15px] text-white/65">@{u.handle}{u.city ? ` · ${u.city}` : ''}{u.lastAt ? ` · ${timeAgo(u.lastAt)}` : ''}</div>
              </div>
              <button onClick={() => onStart({ mode: 'pay', user: u })} className="h-11 rounded-full bg-white px-4 text-[15px] font-semibold text-black">Pay</button>
              <button onClick={() => onStart({ mode: 'request', user: u })} className="field h-11 rounded-full px-4 text-[15px] font-semibold">Request</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
