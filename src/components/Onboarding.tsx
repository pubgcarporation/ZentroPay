import { useEffect, useState } from 'react'
import { Check, ChevronLeft, Globe, X } from 'lucide-react'
import { toast } from 'sonner'
import { ApiError, api } from '@/lib/api'
import { Avatar, CircleButton, Field, PrimaryButton, Screen, Spinner } from '@/components/ui'
import { useSession } from '@/hooks/useSession'
import type { User } from '@/lib/types'

const HANDLE_MAX = 20

type Availability = { state: 'idle' | 'checking' } | { state: 'ok' } | { state: 'bad'; reason: string }

/** Two-step profile setup: name and city, then handle and bio. */
export function Onboarding() {
  const { token, setMe } = useSession()
  const [step, setStep] = useState<1 | 2>(1)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [handle, setHandle] = useState('')
  const [bio, setBio] = useState('')
  const [availability, setAvailability] = useState<Availability>({ state: 'idle' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (handle.length < 3) {
      setAvailability({ state: 'idle' })
      return
    }
    setAvailability({ state: 'checking' })
    const timer = setTimeout(async () => {
      try {
        const res = await api<{ available: boolean; reason?: string }>(`/handles/${handle}/available`)
        setAvailability(res.available ? { state: 'ok' } : { state: 'bad', reason: res.reason ?? 'Not available.' })
      } catch {
        setAvailability({ state: 'idle' })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [handle])

  async function claim() {
    setSaving(true)
    try {
      const { user } = await api<{ user: User }>('/users', { token, body: { name: name.trim(), city: city.trim(), handle, bio: bio.trim() } })
      setMe(user)
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : 'Could not claim your handle.')
    } finally {
      setSaving(false)
    }
  }

  if (step === 1) {
    return (
      <Screen className="pb-8 pt-6">
        <p className="text-right text-[15px] text-white/80">Step 1 of 2</p>
        <h1 className="display mt-14 text-[40px] font-bold leading-[1.1]">
          Pay anyone by
          <br />
          @handle
        </h1>
        <p className="mt-4 text-[17px] text-white/85">No account numbers. No addresses.</p>
        <div className="mt-9 space-y-3.5">
          <Field label="Your name">
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Your name" autoFocus className="mt-0.5 w-full bg-transparent text-[18px] font-semibold" />
          </Field>
          <Field label="City">
            <input value={city} onChange={(e) => setCity(e.target.value)} maxLength={40} placeholder="London, UK" className="mt-0.5 w-full bg-transparent text-[18px] font-semibold" />
          </Field>
        </div>
        <div className="mt-auto pt-8">
          <PrimaryButton disabled={!name.trim()} onClick={() => setStep(2)}>Continue</PrimaryButton>
        </div>
      </Screen>
    )
  }

  const canClaim = availability.state === 'ok' && !saving
  return (
    <Screen className="pb-8 pt-4">
      <div className="flex items-center justify-between">
        <CircleButton onClick={() => setStep(1)} label="Back" size={50}><ChevronLeft className="size-6" /></CircleButton>
        <p className="text-[15px] text-white/80">Step 2 of 2</p>
      </div>
      <h1 className="display mt-10 text-[36px] font-bold leading-[1.1]">Claim your handle</h1>
      <p className="mt-3 text-[17px] text-white/85">Friends anywhere can pay you with it.</p>

      <div className="mt-7 flex items-center gap-4">
        <Avatar name={name} seed={name} size={82} />
        <div>
          <div className="text-[19px] font-bold">{name}</div>
          <div className="text-[15px] text-white/70">{city || 'Add a city later'}</div>
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <Field label="Handle">
          <div className="flex items-center text-[26px] font-semibold">
            <span className="text-white/60">@</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, HANDLE_MAX))}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              aria-label="Handle"
              className="w-full bg-transparent"
            />
          </div>
        </Field>
        <div className="flex items-center justify-between px-1.5 text-[15px]" aria-live="polite">
          <span className="flex items-center gap-2" style={{ color: availability.state === 'ok' ? 'var(--success)' : availability.state === 'bad' ? 'var(--danger)' : 'var(--muted)' }}>
            {availability.state === 'ok' && <><Check className="size-4" /> Available</>}
            {availability.state === 'bad' && <><X className="size-4" /> {availability.reason}</>}
            {availability.state === 'checking' && 'Checking…'}
            {availability.state === 'idle' && 'Use 3 to 20 letters, numbers or underscores.'}
          </span>
          <span className="tabular-nums text-white/70">{handle.length}/{HANDLE_MAX}</span>
        </div>
        <Field label="Bio">
          <input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={80} placeholder="Building on Arc" className="mt-0.5 w-full bg-transparent text-[18px] font-semibold" />
        </Field>
        <div className="flex items-center gap-3.5 rounded-[20px] border border-white/10 bg-white/[0.06] px-4 py-3.5">
          <Globe className="size-5" style={{ color: 'var(--lavender)' }} />
          <div>
            <div className="text-[15px] font-semibold">Your ZentroPay name</div>
            <div className="text-[14px] text-white/75">{handle || 'handle'}.zentropay.eth</div>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8">
        <PrimaryButton disabled={!canClaim} busy={saving} onClick={claim}>
          {saving ? <Spinner /> : `Claim @${handle || 'handle'}`}
        </PrimaryButton>
      </div>
    </Screen>
  )
}
