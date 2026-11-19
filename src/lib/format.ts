import { formatUnits, parseUnits } from 'viem'
import { arcTestnet } from 'viem/chains'
import { USDC_DECIMALS } from './chain'

export const shortAddress = (addr: string) => `${addr.slice(0, 6)}…${addr.slice(-4)}`

/** Splits a USDC amount into whole dollars and cents for the big-number display. */
export function splitUsdc(raw: bigint): { whole: string; cents: string } {
  const [whole, frac = ''] = formatUnits(raw, USDC_DECIMALS).split('.')
  return { whole: BigInt(whole).toLocaleString('en-US'), cents: frac.padEnd(2, '0').slice(0, 2) }
}

export function formatUsdc(raw: bigint): string {
  const { whole, cents } = splitUsdc(raw)
  return `$${whole}.${cents}`
}

/** Parse a user-entered USDC amount; returns undefined when invalid or zero. */
export function parseUsdc(value: string): bigint | undefined {
  if (!/^\d*\.?\d*$/.test(value) || value === '' || value === '.') return undefined
  const [, frac = ''] = value.split('.')
  if (frac.length > USDC_DECIMALS) return undefined
  const parsed = parseUnits(value, USDC_DECIMALS)
  return parsed > 0n ? parsed : undefined
}

/** Network fee in dollars from gas units and a native gas price (Arc gas is paid in USDC). */
export function formatFee(gas: bigint, gasPrice: bigint): string {
  const usd = Number(formatUnits(gas * gasPrice, arcTestnet.nativeCurrency.decimals))
  if (usd === 0) return '$0.00'
  return usd < 0.0001 ? '<$0.0001' : `$${usd.toFixed(4)}`
}

export function timeAgo(unixSeconds: number): string {
  const s = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds)
  if (s < 30) return 'Now'
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(unixSeconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/** Turns a wallet or network error into a short message; undefined when the user cancelled. */
export function parseOnchainError(error: unknown): string | undefined {
  const err = error as { message?: string; code?: number; shortMessage?: string } | undefined
  const msg = `${err?.shortMessage ?? ''} ${err?.message ?? ''}`.toLowerCase()
  if (err?.code === 4001 || msg.includes('user rejected') || msg.includes('user denied')) return undefined
  if (msg.includes('insufficient funds') || msg.includes('exceeds balance')) {
    return 'Not enough USDC. Tap Add money to get test USDC and try again.'
  }
  if (msg.includes('network') || msg.includes('timeout')) return 'Network issue. Check your connection and retry.'
  return 'Something went wrong. Please try again.'
}
