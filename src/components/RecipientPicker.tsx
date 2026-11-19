import { useEffect, useState } from 'react'
import { AtSign } from 'lucide-react'
import { Avatar, CloseButton, Spinner } from '@/components/ui'
import { useUserSearch } from '@/hooks/useApiQueries'
import type { User } from '@/lib/types'

interface Props {
  title: string
  onPick: (user: User) => void
  onClose: () => void
}

/** Search registered handles and names; shows your contacts first. */
export function RecipientPicker({ title, onPick, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const results = useUserSearch(debounced)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 250)
    return () => clearTimeout(timer)
  }, [query])

  return (
    <div className="flex min-h-dvh flex-col">
      <div className="flex items-center justify-between pb-2 pt-4">
        <h1 className="display text-2xl font-bold">{title}</h1>
        <CloseButton onClick={onClose} />
      </div>
      <label className="mt-3 flex min-h-12 items-center gap-2 rounded-full surface-2 px-4">
        <AtSign className="size-4" style={{ color: 'var(--muted)' }} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Handle or name"
          aria-label="Search by handle or name"
          autoCapitalize="none"
          autoCorrect="off"
          className="w-full bg-transparent text-[15px]"
        />
      </label>

      <p className="mb-1 mt-5 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--muted)' }}>
        {debounced ? 'Results' : 'Your friends'}
      </p>
      {results.isLoading ? (
        <div className="grid place-items-center py-10" style={{ color: 'var(--muted)' }}><Spinner /></div>
      ) : results.data && results.data.length > 0 ? (
        <ul>
          {results.data.map((u) => (
            <li key={u.address}>
              <button onClick={() => onPick(u)} className="flex min-h-16 w-full items-center gap-3 rounded-2xl px-1 text-left transition-colors hover:bg-white/5">
                <Avatar name={u.name} seed={u.handle} size={44} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">@{u.handle}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--muted)' }}>{u.name}{u.city ? ` · ${u.city}` : ''}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
          {debounced ? 'No one found with that handle.' : 'No friends yet. Search for a handle to pay someone new.'}
        </p>
      )}
    </div>
  )
}
