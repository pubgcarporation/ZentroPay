import { AtSign, Home, Receipt, Users } from 'lucide-react'

export type Tab = 'home' | 'friends' | 'payments' | 'handle'

const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'payments', label: 'Payments', icon: Receipt },
  { key: 'handle', label: 'Handle', icon: AtSign },
] as const

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 border-t border-white/[0.08] bg-[var(--bg)]/95 backdrop-blur">
      <div className="mx-auto grid max-w-md grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            aria-current={tab === key ? 'page' : undefined}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors"
            style={{ color: tab === key ? '#fff' : 'var(--muted)' }}
          >
            <Icon className="size-[22px]" strokeWidth={tab === key ? 2.4 : 1.8} />
            {label}
          </button>
        ))}
      </div>
    </nav>
  )
}
