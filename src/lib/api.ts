/** Backend base URL. Empty in dev (Vite proxies /api); set VITE_API_URL to the Cloudflare Worker URL in production. */
const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

const tokenKey = (address: string) => `zentropay:token:${address.toLowerCase()}`
export const getToken = (address: string) => localStorage.getItem(tokenKey(address)) ?? undefined
export const setToken = (address: string, token: string) => localStorage.setItem(tokenKey(address), token)
export const clearToken = (address: string) => localStorage.removeItem(tokenKey(address))

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

/** Calls the ZentroPay backend with the wallet session token (when given). */
export async function api<T>(path: string, options: { method?: string; body?: unknown; token?: string } = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method: options.method ?? (options.body === undefined ? 'GET' : 'POST'),
      headers: {
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError('Cannot reach the ZentroPay server. Check your connection and try again.', 0)
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string } & T
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong. Please try again.', res.status)
  return data
}
