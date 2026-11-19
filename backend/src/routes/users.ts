import { Hono } from 'hono'
import { createNonce, createSession, nowS, optionalAuth, requireAuth } from '../auth'
import { publicUser, type AppEnv, type UserRow } from '../env'
import { isAddress, isValidHandle, normalizeHandle, text } from '../validate'

export const users = new Hono<AppEnv>()

const userByAddress = (db: D1Database, address: string) =>
  db.prepare('SELECT * FROM users WHERE address = ?1').bind(address).first<UserRow>()

users.post('/auth/nonce', async (c) => {
  const body = await c.req.json<{ address?: unknown }>().catch(() => ({}) as { address?: unknown })
  if (!isAddress(body.address)) return c.json({ error: 'A valid wallet address is required.' }, 400)
  const address = body.address.toLowerCase()
  return c.json({ message: await createNonce(c.env, address) })
})

users.post('/auth/verify', async (c) => {
  const body = await c.req.json<{ address?: unknown; signature?: unknown }>().catch(() => ({}) as Record<string, unknown>)
  if (!isAddress(body.address) || typeof body.signature !== 'string') {
    return c.json({ error: 'Address and signature are required.' }, 400)
  }
  const address = body.address.toLowerCase()
  const token = await createSession(c.env, address, body.signature)
  if (!token) return c.json({ error: 'Signature could not be verified. Please try signing in again.' }, 401)
  const user = await userByAddress(c.env.DB, address)
  return c.json({ token, user: user ? publicUser(user) : null })
})

users.get('/handles/:handle/available', async (c) => {
  const handle = normalizeHandle(c.req.param('handle'))
  if (!isValidHandle(handle)) return c.json({ available: false, reason: 'Use 3 to 20 letters, numbers or underscores.' })
  const taken = await c.env.DB.prepare('SELECT 1 FROM users WHERE handle = ?1').bind(handle).first()
  return c.json({ available: !taken, reason: taken ? 'That handle is taken.' : undefined })
})

users.post('/users', requireAuth, async (c) => {
  const address = c.get('address')
  if (await userByAddress(c.env.DB, address)) return c.json({ error: 'This wallet already has a handle.' }, 409)

  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>)
  const handle = normalizeHandle(body.handle)
  const name = text(body.name, 40)
  const city = text(body.city, 40) ?? ''
  const bio = text(body.bio, 80)
  if (!isValidHandle(handle)) return c.json({ error: 'Use 3 to 20 letters, numbers or underscores for your handle.' }, 400)
  if (!name) return c.json({ error: 'Enter your name (up to 40 characters).' }, 400)
  if (bio === undefined) return c.json({ error: 'Bio can be up to 80 characters.' }, 400)

  try {
    await c.env.DB.prepare('INSERT INTO users (address, handle, name, city, bio, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
      .bind(address, handle, name, city, bio, nowS())
      .run()
  } catch {
    return c.json({ error: 'That handle was just taken. Try another.' }, 409)
  }
  const user = await userByAddress(c.env.DB, address)
  return c.json({ user: user && publicUser(user) }, 201)
})

users.get('/me', requireAuth, async (c) => {
  const user = await userByAddress(c.env.DB, c.get('address'))
  return user ? c.json({ user: publicUser(user) }) : c.json({ error: 'No handle yet.' }, 404)
})

users.patch('/me', requireAuth, async (c) => {
  const user = await userByAddress(c.env.DB, c.get('address'))
  if (!user) return c.json({ error: 'No handle yet.' }, 404)
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>)
  const name = body.name === undefined ? user.name : text(body.name, 40)
  const city = body.city === undefined ? user.city : text(body.city, 40)
  const bio = body.bio === undefined ? user.bio : text(body.bio, 80)
  if (!name || city === undefined || bio === undefined) return c.json({ error: 'Check the length of your name, city and bio.' }, 400)
  await c.env.DB.prepare('UPDATE users SET name = ?2, city = ?3, bio = ?4 WHERE address = ?1').bind(user.address, name, city, bio).run()
  return c.json({ user: publicUser({ ...user, name, city, bio }) })
})

/** People you have paid or been paid by, newest first. */
const CONTACTS_SQL = `
  SELECT u.*, MAX(p.created_at) AS last_at, COUNT(*) AS payments
  FROM payments p
  JOIN users u ON u.address = CASE WHEN p.from_address = ?1 THEN p.to_address ELSE p.from_address END
  WHERE p.from_address = ?1 OR p.to_address = ?1
  GROUP BY u.address
  ORDER BY last_at DESC
  LIMIT 50`

users.get('/friends', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(CONTACTS_SQL).bind(c.get('address')).all<UserRow & { last_at: number; payments: number }>()
  return c.json({ friends: results.map((r) => ({ ...publicUser(r), lastAt: r.last_at, payments: r.payments })) })
})

users.get('/users/search', requireAuth, async (c) => {
  const me = c.get('address')
  const q = c.req.query('q')?.trim().replace(/^@/, '').toLowerCase() ?? ''
  if (!q) {
    const { results } = await c.env.DB.prepare(CONTACTS_SQL).bind(me).all<UserRow>()
    return c.json({ users: results.map(publicUser) })
  }
  const like = `${q.replace(/[%_]/g, '')}%`
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM users WHERE address != ?1 AND (handle LIKE ?2 OR lower(name) LIKE ?3) ORDER BY handle LIMIT 20`,
  )
    .bind(me, like, `%${like}`)
    .all<UserRow>()
  return c.json({ users: results.map(publicUser) })
})

users.get('/users/:handle', optionalAuth, async (c) => {
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE handle = ?1').bind(normalizeHandle(c.req.param('handle'))).first<UserRow>()
  return user ? c.json({ user: publicUser(user) }) : c.json({ error: 'No one has that handle.' }, 404)
})
