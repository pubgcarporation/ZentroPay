import { AtSign, Home, MessageSquareText, Users } from 'lucide-react'

export type Tab = 'home' | 'friends' | 'payments' | 'handle'

const TABS = [
  { key: 'home', label: 'Home', icon: Home },
  { key: 'friends', label: 'Friends', icon: Users },
  { key: 'payments', label: 'Payments', icon: MessageSquareText },
  { key: 'handle', label: 'Handle', icon: AtSign },
] as const

/** Floating pill navigation; the active tab sits in a lighter pill. */
export function TabBar({ tab, onChange }: { tab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main" className="absolute inset-x-4 bottom-4 z-20 rounded-full border border-white/10 bg-[#1b1b1e]/95 p-1.5 shadow-[0_10px_30px_-8px_rgba(0,0,0,0.7)] backdrop-blur">
      <div className="grid grid-cols-4">
        {TABS.map(({ key, label, icon: Icon }) => {
          const active = tab === key
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              aria-current={active ? 'page' : undefined}
              className="flex h-14 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-semibold transition-colors"
              style={{ background: active ? 'rgba(255,255,255,0.16)' : 'transparent', color: active ? '#fff' : 'rgba(255,255,255,0.62)' }}
            >
              <Icon className="size-[22px]" strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
