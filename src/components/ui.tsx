import type { ReactNode } from 'react'
import { X } from 'lucide-react'

/** Concentric ring pattern from the brand backdrop; anchored bottom-right. */
export function Rings({ className = '', opacity = 0.1 }: { className?: string; opacity?: number }) {
  return (
    <svg aria-hidden viewBox="0 0 1280 720" preserveAspectRatio="xMaxYMax slice" className={`pointer-events-none absolute inset-0 size-full ${className}`}>
      {Array.from({ length: 22 }, (_, i) => (
        <circle key={i} cx="1160" cy="640" r={47 + i * 47} fill="none" stroke="#fff" strokeOpacity={opacity} strokeWidth="1.2" />
      ))}
    </svg>
  )
}

const GRADIENTS = [
  ['#ffa070', '#f0608a'],
  ['#58c4ff', '#4f7bff'],
  ['#8cf5a8', '#3fd08a'],
  ['#c2a8ff', '#8f6bff'],
  ['#ffd36e', '#f59f58'],
  ['#7be9e0', '#4fb4f5'],
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
      className="grid shrink-0 place-items-center rounded-full font-bold text-black/85"
      style={{ width: size, height: size, fontSize: size * 0.42, background: `linear-gradient(145deg, ${a}, ${b})`, boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,0.35)' }}
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </div>
  )
}

export function CircleButton({ onClick, label, children, size = 52, disabled }: { onClick: () => void; label: string; children: ReactNode; size?: number; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{ width: size, height: size }}
      className="field grid shrink-0 place-items-center rounded-full transition-colors hover:bg-white/20 disabled:opacity-50"
    >
      {children}
    </button>
  )
}

export const CloseButton = ({ onClick, label = 'Close' }: { onClick: () => void; label?: string }) => (
  <CircleButton onClick={onClick} label={label}><X className="size-6" /></CircleButton>
)

export function PrimaryButton({ children, disabled, busy, onClick, type = 'button' }: {
  children: ReactNode
  disabled?: boolean
  /** Shows progress: stays fully opaque while disabled. */
  busy?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
}) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-[17px] font-semibold text-black transition-transform active:scale-[0.98] disabled:cursor-not-allowed"
      style={{ opacity: disabled && !busy ? 0.4 : 1 }}
    >
      {children}
    </button>
  )
}

/** Labeled glass input container. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field block rounded-[22px] px-5 pb-3.5 pt-3">
      <span className="block text-[15px]" style={{ color: 'rgba(255,255,255,0.78)' }}>{label}</span>
      {children}
    </label>
  )
}

/** One row of an info card: muted label left, bold value right. */
export function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-14 items-center justify-between gap-4 border-b border-white/[0.07] px-5 py-3 text-[16px] last:border-b-0">
      <span style={{ color: 'var(--muted)' }}>{label}</span>
      <span className="min-w-0 truncate text-right font-semibold">{children}</span>
    </div>
  )
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return <span className={`${className} inline-block animate-spin rounded-full border-2 border-current border-t-transparent`} role="status" aria-label="Loading" />
}

interface ScreenProps {
  children: ReactNode
  /** Floating navigation rendered over the bottom of the screen. */
  nav?: ReactNode
  /** `brand` paints the purple backdrop used by the welcome screen. */
  tone?: 'dark' | 'brand'
  /** Render children in a rounded bottom sheet. */
  sheet?: boolean
  className?: string
}

/** Phone-sized shell: full screen on mobile, a framed phone on larger screens. */
export function Screen({ children, nav, tone = 'dark', sheet = false, className = '' }: ScreenProps) {
  const brand = tone === 'brand'
  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#3a10c0] sm:grid sm:place-items-center sm:p-6">
      <Rings className="hidden sm:block" opacity={0.14} />
      <div
        className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden sm:h-[min(880px,calc(100dvh-3rem))] sm:rounded-[54px] sm:border-[10px] sm:border-[#17171a] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)]"
        style={{ background: brand ? '#3a10c0' : 'var(--bg)' }}
      >
        <Rings opacity={brand ? 0.16 : 0.045} />
        <div className={`relative flex-1 overflow-y-auto no-scrollbar ${sheet ? '' : 'px-5'}`}>
          <div className={`flex min-h-full flex-col ${className}`}>{sheet ? null : children}</div>
        </div>
        {sheet && (
          <div className="rise absolute inset-x-0 bottom-0 top-14 flex flex-col overflow-y-auto rounded-t-[30px] px-5 no-scrollbar" style={{ background: 'var(--sheet)' }}>
            <div className={`flex min-h-full flex-col ${className}`}>{children}</div>
          </div>
        )}
        {nav}
      </div>
    </div>
  )
}
