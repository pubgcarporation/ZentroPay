import { useState } from 'react'
import { Copy, ExternalLink, LogOut, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { addressUrl } from '@/lib/chain'
import { shortAddress } from '@/lib/format'
import { Avatar, Row } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import type { User } from '@/lib/types'

const pill = 'flex h-16 items-center justify-center gap-2.5 rounded-full border border-white/10 bg-white/[0.14] text-[18px] font-semibold transition-colors hover:bg-white/20'

export function HandleTab({ onAddMoney }: { onAddMoney: () => void }) {
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

  async function copy(value: string, what: string) {
    await navigator.clipboard.writeText(value)
    toast.success(`${what} copied.`)
  }

  return (
    <div className="pb-32 pt-8">
      <h1 className="display text-[36px] font-bold">Handle</h1>

      <section className="card mt-5 flex flex-col items-center rounded-[30px] px-5 pb-6 pt-7 text-center">
        <Avatar name={me.name} seed={me.name} size={88} />
        <h2 className="display mt-4 text-[34px] font-bold leading-none">@{me.handle}</h2>
        <p className="mt-2.5 text-[17px] text-white/85">{me.name}</p>
        {editing ? (
          <div className="mt-3 flex w-full items-center gap-2">
            <input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={80} aria-label="Bio" className="field h-12 w-full rounded-full px-4 text-[16px]" />
            <button onClick={saveBio} className="h-12 rounded-full bg-white px-5 text-[16px] font-semibold text-black">Save</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="mt-0.5 flex h-10 items-center gap-2 text-[16px] text-white/65">
            {me.bio || 'Add a bio'} <Pencil className="size-3.5" />
          </button>
        )}
      </section>

      <div className="card mt-4 overflow-hidden rounded-[26px]">
        <Row label="ENS name">
          <button onClick={() => copy(`${me.handle}.zentropay.eth`, 'Name')} className="-my-3 flex h-14 items-center gap-2.5">
            {me.handle}.zentropay.eth <Copy className="size-4 text-white/70" />
          </button>
        </Row>
        <Row label="Wallet">
          <button onClick={() => copy(address, 'Wallet address')} aria-label="Copy wallet address" className="mono -my-3 flex h-14 items-center gap-2.5 text-[16px]">
            {shortAddress(address)} <Copy className="size-4 text-white/70" />
          </button>
        </Row>
        <Row label="Network">Arc Testnet</Row>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3.5">
        <button onClick={onAddMoney} className={pill}><Plus className="size-5" /> Add money</button>
        <a href={addressUrl(address)} target="_blank" rel="noopener noreferrer" className={pill}>View on Arc <ExternalLink className="size-[18px]" /></a>
      </div>
      <button onClick={signOut} className="mt-4 flex h-12 w-full items-center justify-center gap-2 text-[16px] text-white/60"><LogOut className="size-4" /> Sign out</button>
    </div>
  )
}
