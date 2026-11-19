import type { ReactNode } from 'react'
import { X } from 'lucide-react'

const GRADIENTS = [
  ['#ff8a5c', '#e8508b'],
  ['#4fb0ff', '#7b5cff'],
  ['#4ade80', '#2dd4bf'],
  ['#c084fc', '#7c5cff'],
  ['#fbbf24', '#fb7185'],
  ['#38bdf8', '#34d399'],
]

function hash(text: string) {
  let h = 0
  for (const ch of text) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h
}

/** Gradient initial avatar, stable per handle. */
export function Avatar({ name, seed, size = 40 }: { name: string; seed?: string; size?: number }) {
  const [a, b] = GRADIENTS[hash(seed ?? name) % GRADIENTS.length]
  return (
    <div
      aria-hidden
      className="grid shrink-0 place-items-center rounded-full font-semibold text-black/80"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

export function CloseButton({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="grid size-11 shrink-0 place-items-center rounded-full surface-2 transition-colors hover:bg-white/10"
    >
      <X className="size-5" />
    </button>
  )
}

/** Full-screen white-on-dark primary button. */
export function PrimaryButton({ children, disabled, onClick, type = 'button' }: {
  children: ReactNode
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-semibold text-black transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <label className="block rounded-2xl surface px-4 pb-3 pt-2.5 focus-within:border-white/30">
        <span className="block text-xs" style={{ color: 'var(--muted)' }}>{label}</span>
        {children}
      </label>
      {hint}
    </div>
  )
}

export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-white/[0.07] px-4 py-3 text-sm last:border-b-0">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="min-w-0 truncate text-right font-medium">{children}</span>
    </div>
  )
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`} aria-label="Loading" />
}

/** Page container sized like a phone. */
export function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 ${className}`}>{children}</div>
}
