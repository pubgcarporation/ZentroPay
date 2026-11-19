import type { MiddlewareHandler } from 'hono'
import { verifyMessage } from 'viem'
import type { AppEnv, Env } from './env'

const NONCE_TTL_S = 5 * 60
const SESSION_TTL_S = 7 * 24 * 60 * 60
export const nowS = () => Math.floor(Date.now() / 1000)

const randomHex = (bytes: number) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, '0')).join('')

export function signInMessage(address: string, nonce: string, issuedAt: string) {
  return `Sign in to ZentroPay\n\nThis proves you own ${address}. It costs nothing and sends no transaction.\n\nNonce: ${nonce}\nIssued: ${issuedAt}`
}

/** Create a one-time sign-in message for a wallet. */
export async function createNonce(env: Env, address: string) {
  const message = signInMessage(address, randomHex(16), new Date().toISOString())
  await env.DB.prepare(
    'INSERT INTO nonces (address, message, expires_at) VALUES (?1, ?2, ?3) ON CONFLICT(address) DO UPDATE SET message = ?2, expires_at = ?3',
  )
    .bind(address, message, nowS() + NONCE_TTL_S)
    .run()
  return message
}

/** Verify the wallet signature for the pending nonce and open a session. EOA wallets only. */
export async function createSession(env: Env, address: string, signature: string): Promise<string | undefined> {
  const row = await env.DB.prepare('SELECT message, expires_at FROM nonces WHERE address = ?1')
    .bind(address)
    .first<{ message: string; expires_at: number }>()
  if (!row || row.expires_at < nowS()) return undefined

  let valid = false
  try {
    valid = await verifyMessage({ address: address as `0x${string}`, message: row.message, signature: signature as `0x${string}` })
  } catch {
    valid = false
  }
  if (!valid) return undefined

  // One-time use: a signature cannot be replayed.
  await env.DB.prepare('DELETE FROM nonces WHERE address = ?1').bind(address).run()
  const token = randomHex(32)
  await env.DB.prepare('INSERT INTO sessions (token, address, expires_at) VALUES (?1, ?2, ?3)')
    .bind(token, address, nowS() + SESSION_TTL_S)
    .run()
  return token
}

async function addressForToken(env: Env, token: string): Promise<string | undefined> {
  const row = await env.DB.prepare('SELECT address, expires_at FROM sessions WHERE token = ?1')
    .bind(token)
    .first<{ address: string; expires_at: number }>()
  return row && row.expires_at >= nowS() ? row.address : undefined
}

const bearer = (header: string | undefined) => (header?.startsWith('Bearer ') ? header.slice(7) : undefined)

/** Requires a valid session; sets `address` on the context. */
export const requireAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearer(c.req.header('Authorization'))
  const address = token ? await addressForToken(c.env, token) : undefined
  if (!address) return c.json({ error: 'Sign in with your wallet to continue.' }, 401)
  c.set('address', address)
  await next()
}

/** Optional session: sets `address` to '' when the caller is anonymous. */
export const optionalAuth: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = bearer(c.req.header('Authorization'))
  c.set('address', (token ? await addressForToken(c.env, token) : undefined) ?? '')
  await next()
}
