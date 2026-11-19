export const HANDLE_RE = /^[a-z0-9_]{3,20}$/
const RESERVED = new Set(['admin', 'support', 'zentropay', 'orbit', 'circle', 'arc', 'usdc', 'help', 'root', 'api', 'me'])

export const normalizeHandle = (raw: unknown): string =>
  typeof raw === 'string' ? raw.trim().replace(/^@/, '').toLowerCase() : ''

export const isValidHandle = (handle: string) => HANDLE_RE.test(handle) && !RESERVED.has(handle)

export function text(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined
  const value = raw.trim()
  return value.length <= max ? value : undefined
}

export const isAddress = (v: unknown): v is string => typeof v === 'string' && /^0x[0-9a-fA-F]{40}$/.test(v)
export const isTxHash = (v: unknown): v is string => typeof v === 'string' && /^0x[0-9a-fA-F]{64}$/.test(v)
export const VISIBILITIES = ['public', 'friends', 'private'] as const
export type Visibility = (typeof VISIBILITIES)[number]
export const isVisibility = (v: unknown): v is Visibility => VISIBILITIES.includes(v as Visibility)

/** USDC base-unit amount (6 decimals) as a positive integer string. */
export const isAmount = (v: unknown): v is string => typeof v === 'string' && /^[1-9]\d{0,17}$/.test(v)
