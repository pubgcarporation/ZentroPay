import { Hono } from 'hono'
import { nowS, requireAuth } from '../auth'
import { publicUser, type AppEnv, type UserRow } from '../env'
import { isAmount, normalizeHandle, text } from '../validate'

export const requests = new Hono<AppEnv>()

interface RequestRow {
  id: number
  from_address: string
  to_address: string
  amount: string
  note: string
  status: string
  created_at: number
}

/** A money request: the requester (from) asks the other person (to) to pay them. */
requests.post('/requests', requireAuth, async (c) => {
  const me = c.get('address')
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>)
  const note = text(body.note, 100)
  if (!isAmount(body.amount) || note === undefined) return c.json({ error: 'Enter an amount and a note up to 100 characters.' }, 400)
  const target = await c.env.DB.prepare('SELECT * FROM users WHERE handle = ?1').bind(normalizeHandle(body.toHandle)).first<UserRow>()
  if (!target) return c.json({ error: 'No one has that handle.' }, 404)
  if (target.address === me) return c.json({ error: 'You cannot request money from yourself.' }, 400)
  const mine = await c.env.DB.prepare('SELECT 1 FROM users WHERE address = ?1').bind(me).first()
  if (!mine) return c.json({ error: 'Claim a handle first.' }, 403)

  const res = await c.env.DB.prepare('INSERT INTO requests (from_address, to_address, amount, note, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
    .bind(me, target.address, body.amount, note, nowS()).run()
  return c.json({ id: res.meta.last_row_id }, 201)
})

requests.get('/requests', requireAuth, async (c) => {
  const me = c.get('address')
  const { results } = await c.env.DB.prepare(
    `SELECT r.*, uf.handle AS fh, uf.name AS fn, uf.city AS fc, uf.bio AS fb, ut.handle AS th, ut.name AS tn, ut.city AS tc, ut.bio AS tb
     FROM requests r JOIN users uf ON uf.address = r.from_address JOIN users ut ON ut.address = r.to_address
     WHERE (r.from_address = ?1 OR r.to_address = ?1) ORDER BY r.id DESC LIMIT 50`,
  ).bind(me).all<RequestRow & { fh: string; fn: string; fc: string; fb: string; th: string; tn: string; tc: string; tb: string }>()

  const items = results.map((r) => ({
    id: r.id,
    amount: r.amount,
    note: r.note,
    status: r.status,
    createdAt: r.created_at,
    direction: r.to_address === me ? ('incoming' as const) : ('outgoing' as const),
    from: publicUser({ address: r.from_address, handle: r.fh, name: r.fn, city: r.fc, bio: r.fb, created_at: 0 }),
    to: publicUser({ address: r.to_address, handle: r.th, name: r.tn, city: r.tc, bio: r.tb, created_at: 0 }),
  }))
  return c.json({ items })
})

async function close(c: { env: AppEnv['Bindings']; get: (k: 'address') => string }, id: number, side: 'to_address' | 'from_address', status: 'declined' | 'cancelled') {
  const res = await c.env.DB.prepare(`UPDATE requests SET status = ?3 WHERE id = ?1 AND ${side} = ?2 AND status = 'pending'`)
    .bind(id, c.get('address'), status).run()
  return res.meta.changes > 0
}

requests.post('/requests/:id/decline', requireAuth, async (c) =>
  (await close(c, Number(c.req.param('id')), 'to_address', 'declined')) ? c.json({ ok: true }) : c.json({ error: 'Request not found.' }, 404))

requests.post('/requests/:id/cancel', requireAuth, async (c) =>
  (await close(c, Number(c.req.param('id')), 'from_address', 'cancelled')) ? c.json({ ok: true }) : c.json({ error: 'Request not found.' }, 404))
