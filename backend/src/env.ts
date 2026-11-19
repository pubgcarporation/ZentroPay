import type { Context } from 'hono'

export interface Env {
  DB: D1Database
  ALLOWED_ORIGINS: string
  ARC_RPC_URL: string
  USDC_ADDRESS: string
  EXPLORER_URL: string
}

export interface Vars {
  /** Lowercase wallet address of the signed-in caller. */
  address: string
}

export type AppEnv = { Bindings: Env; Variables: Vars }
export type Ctx = Context<AppEnv>

export interface UserRow {
  address: string
  handle: string
  name: string
  city: string
  bio: string
  created_at: number
}

/** Public shape of a user returned by the API. */
export const publicUser = (u: UserRow) => ({
  address: u.address,
  handle: u.handle,
  name: u.name,
  city: u.city,
  bio: u.bio,
})
