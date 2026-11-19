import { useEffect, useState } from 'react'
import { AtSign } from 'lucide-react'
import { Avatar, CloseButton, Screen, Spinner } from '@/components/ui'
import { useUserSearch } from '@/hooks/useApiQueries'
import type { User } from '@/lib/types'

interface Props {
  title: string
  onPick: (user: User) => void
  onClose: () => void
}

/** Bottom sheet: search registered handles and names; shows your friends first. */
export function RecipientPicker({ title, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const results = useUserSearch(debounced)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim().replace(/^@/, '')), 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <Screen sheet className="pb-6 pt-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-[28px] font-bold leading-tight">{title}</h1>
        <CloseButton onClick={onClose} />
      </div>

      <label className="mt-6 flex h-16 items-center gap-3 rounded-full border border-white/20 bg-white/[0.2] px-5">
        <AtSign className="size-5 text-white/70" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Handle or name"
          aria-label="Search by handle or name"
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full bg-transparent text-[19px] font-medium"
        />
      </label>

      {!debounced && <p className="mb-1 mt-6 text-[15px] text-white/60">Your friends</p>}
      {results.isLoading ? (
        <div className="grid place-items-center py-10 text-white/60"><Spinner /></div>
      ) : results.data && results.data.length > 0 ? (
        <ul className="mt-2">
          {results.data.map((u) => (
            <li key={u.address} className="border-b border-white/[0.08] last:border-b-0">
              <button onClick={() => onPick(u)} className="flex min-h-[84px] w-full items-center gap-4 text-left">
                <Avatar name={u.name} seed={u.name} size={58} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[19px] font-bold">{u.name}</span>
                  <span className="block truncate text-[16px] text-white/65">@{u.handle}</span>
                </span>
                {u.city && <span className="shrink-0 text-[16px] text-white/60">{u.city}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-[16px] text-white/60">
          {debounced ? 'No one found with that handle.' : 'No friends yet. Search for a handle to pay someone new.'}
        </p>
      )}
    </Screen>
  )
}
