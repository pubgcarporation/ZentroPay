import type { Env } from './env'

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

interface Log { address: string; topics: string[]; data: string }
interface Receipt { status: string; logs: Log[] }

const topicAddress = (topic: string) => `0x${topic.slice(-40)}`.toLowerCase()

export interface VerifiedTransfer { from: string; to: string; amount: string }
export type VerifyResult =
  | { ok: true; transfers: VerifiedTransfer[] }
  | { ok: false; reason: 'pending' | 'failed' | 'rpc' }

/** Reads a transaction receipt from Arc and returns every USDC Transfer it emitted. */
export async function verifyUsdcTransfers(env: Env, txHash: string): Promise<VerifyResult> {
  let receipt: Receipt | null
  try {
    const res = await fetch(env.ARC_RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getTransactionReceipt', params: [txHash] }),
    })
    if (!res.ok) return { ok: false, reason: 'rpc' }
    receipt = ((await res.json()) as { result: Receipt | null }).result
  } catch {
    return { ok: false, reason: 'rpc' }
  }
  if (!receipt) return { ok: false, reason: 'pending' }
  if (receipt.status !== '0x1') return { ok: false, reason: 'failed' }

  const usdc = env.USDC_ADDRESS.toLowerCase()
  const transfers = receipt.logs
    .filter((l) => l.address.toLowerCase() === usdc && l.topics[0] === TRANSFER_TOPIC && l.topics.length === 3)
    .map((l) => ({
      from: topicAddress(l.topics[1]),
      to: topicAddress(l.topics[2]),
      amount: BigInt(l.data).toString(),
    }))
  return { ok: true, transfers }
}
