import { useState } from 'react'
import { Copy, ExternalLink, LogOut, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { addressUrl } from '@/lib/chain'
import { shortAddress } from '@/lib/format'
import { Avatar, Row } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import type { User } from '@/lib/types'

export function HandleTab({ onAddMoney, onShare }: { onAddMoney: () => void; onShare: () => void }) {
  const { me, address, token, setMe, signOut } = useSession()
  const [editing, setEditing] = useState(false)
  const [bio, setBio] = useState(me?.bio ?? '')
  if (!me || !address) return null

  async function saveBio() {
    try {
      const { user } = await api<{ user: User }>('/me', { token, method: 'PATCH', body: { bio } })
      setMe(user)
      setEditing(false)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not save your bio.')
    }
  }

  async function copyAddress() {
    await navigator.clipboard.writeText(address as string)
    toast.success('Wallet address copied.')
  }

  return (
    <div className="pb-6 pt-5">
      <h1 className="display text-2xl font-bold">Handle</h1>

      <section className="mt-4 flex flex-col items-center rounded-[28px] surface px-5 py-6 text-center">
        <Avatar name={me.name} seed={me.handle} size={72} />
        <h2 className="display mt-3 text-2xl font-bold">@{me.handle}</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>{me.name}{me.city ? ` · ${me.city}` : ''}</p>
        {editing ? (
          <div className="mt-3 flex w-full items-center gap-2">
            <input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={80} aria-label="Bio" className="min-h-11 w-full rounded-full surface-2 px-4 text-sm" />
            <button onClick={saveBio} className="min-h-11 rounded-full bg-white px-4 text-sm font-semibold text-black">Save</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-2 flex min-h-11 items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
            {me.bio || 'Add a bio'} <Pencil className="size-3.5" />
          </button>
        )}
      </section>

      <div className="mt-4 overflow-hidden rounded-2xl surface">
        <Row label="ENS name">{me.handle}.zentropay.eth</Row>
        <Row label="Wallet">
          <button onClick={copyAddress} className="mono -my-2 flex min-h-11 items-center gap-1.5 py-2 text-xs">{shortAddress(address)} <Copy className="size-3.5" /></button>
        </Row>
        <Row label="Network">Arc Testnet</Row>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <button onClick={onAddMoney} className="flex min-h-12 items-center justify-center gap-1.5 rounded-full bg-white text-sm font-semibold text-black"><Plus className="size-4" /> Add money</button>
        <a href={addressUrl(address)} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center justify-center gap-1.5 rounded-full surface-2 text-sm font-semibold">View on Arc <ExternalLink className="size-4" /></a>
      </div>
      <button onClick={onShare} className="mt-3 min-h-12 w-full rounded-full surface-2 text-sm font-semibold">Share my pay link</button>
      <button onClick={signOut} className="mt-3 flex min-h-12 w-full items-center justify-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}><LogOut className="size-4" /> Sign out</button>
    </div>
  )
}
