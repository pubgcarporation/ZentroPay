import { Hono } from 'hono'
import { nowS, requireAuth } from '../auth'
import { verifyUsdcTransfers } from '../chain'
import type { AppEnv, Ctx, UserRow } from '../env'
import { isTxHash, isVisibility, text } from '../validate'

export const payments = new Hono<AppEnv>()

interface PaymentRow {
  id: number
  tx_hash: string
  from_address: string
  to_address: string
  amount: string
  note: string
  visibility: 'public' | 'friends' | 'private'
  created_at: number
  fh: string; fn: string; fc: string
  th: string; tn: string; tc: string
  likes: number
  comments: number
  liked: number
}

/** Addresses the viewer has paid or been paid by. */
const FRIENDS = `(SELECT CASE WHEN from_address = ?1 THEN to_address ELSE from_address END FROM payments WHERE from_address = ?1 OR to_address = ?1)`

const SELECT = `
  SELECT p.*, uf.handle AS fh, uf.name AS fn, uf.city AS fc, ut.handle AS th, ut.name AS tn, ut.city AS tc,
    (SELECT COUNT(*) FROM likes l WHERE l.payment_id = p.id) AS likes,
    (SELECT COUNT(*) FROM comments c WHERE c.payment_id = p.id) AS comments,
    EXISTS (SELECT 1 FROM likes l WHERE l.payment_id = p.id AND l.address = ?1) AS liked
  FROM payments p
  JOIN users uf ON uf.address = p.from_address
  JOIN users ut ON ut.address = p.to_address`

/** Visibility rule: parties always; public to all; friends-only to friends of either party. */
const VISIBLE = `(p.from_address = ?1 OR p.to_address = ?1 OR p.visibility = 'public' OR
  (p.visibility = 'friends' AND (p.from_address IN ${FRIENDS} OR p.to_address IN ${FRIENDS})))`

export function serialize(r: PaymentRow, viewer: string) {
  return {
    id: r.id,
    txHash: r.tx_hash,
    amount: r.amount,
    note: r.note,
    visibility: r.visibility,
    createdAt: r.created_at,
    from: { address: r.from_address, handle: r.fh, name: r.fn, city: r.fc },
    to: { address: r.to_address, handle: r.th, name: r.tn, city: r.tc },
    likes: r.likes,
    comments: r.comments,
    liked: Boolean(r.liked),
    mine: r.from_address === viewer || r.to_address === viewer,
  }
}

async function visiblePayment(c: Ctx, id: number): Promise<PaymentRow | null> {
  return c.env.DB.prepare(`${SELECT} WHERE p.id = ?2 AND ${VISIBLE}`).bind(c.get('address'), id).first<PaymentRow>()
}

/** Record a payment after confirming the USDC transfer happened onchain. */
payments.post('/payments', requireAuth, async (c) => {
  const me = c.get('address')
  const body = await c.req.json<Record<string, unknown>>().catch(() => ({}) as Record<string, unknown>)
  const note = text(body.note, 100)
  if (!isTxHash(body.txHash) || note === undefined || !isVisibility(body.visibility)) {
    return c.json({ error: 'Send the transaction hash, a note up to 100 characters and a visibility.' }, 400)
  }
  const txHash = body.txHash.toLowerCase()

  const existing = await c.env.DB.prepare('SELECT id, from_address FROM payments WHERE tx_hash = ?1').bind(txHash).first<{ id: number; from_address: string }>()
  if (existing) {
    if (existing.from_address !== me) return c.json({ error: 'This transaction belongs to another wallet.' }, 403)
    const row = await visiblePayment(c, existing.id)
    return c.json({ payment: row && serialize(row, me) })
  }

  const result = await verifyUsdcTransfers(c.env, txHash)
  if (!result.ok) {
    const message = result.reason === 'pending' ? 'The transaction is not confirmed yet. Try again in a moment.'
      : result.reason === 'failed' ? 'That transaction failed onchain.' : 'Could not reach Arc to verify the payment.'
    return c.json({ error: message }, result.reason === 'failed' ? 422 : 503)
  }

  let transfer: { to: string; amount: string } | undefined
  for (const t of result.transfers) {
    if (t.from !== me || t.to === me) continue
    const recipient = await c.env.DB.prepare('SELECT 1 FROM users WHERE address = ?1').bind(t.to).first()
    if (recipient) { transfer = t; break }
  }
  if (!transfer) return c.json({ error: 'No USDC transfer from your wallet to a ZentroPay handle was found in that transaction.' }, 422)

  let id: number
  try {
    const res = await c.env.DB.prepare(
      'INSERT INTO payments (tx_hash, from_address, to_address, amount, note, visibility, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
    ).bind(txHash, me, transfer.to, transfer.amount, note, body.visibility, nowS()).run()
    id = res.meta.last_row_id
  } catch {
    return c.json({ error: 'This payment was already recorded.' }, 409)
  }

  // Settle a matching money request, if the payer came from one.
  const requestId = Number(body.requestId)
  if (Number.isInteger(requestId) && requestId > 0) {
    await c.env.DB.prepare(
      `UPDATE requests SET status = 'paid', payment_id = ?1 WHERE id = ?2 AND to_address = ?3 AND from_address = ?4 AND amount = ?5 AND status = 'pending'`,
    ).bind(id, requestId, me, transfer.to, transfer.amount).run()
  }

  const row = await visiblePayment(c, id)
  return c.json({ payment: row && serialize(row, me) }, 201)
})

payments.get('/feed', requireAuth, async (c) => {
  const me = c.get('address')
  const scope = c.req.query('scope') === 'you' ? 'you' : 'friends'
  const before = Number(c.req.query('before')) || 0
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50)

  const scopeSql = scope === 'you'
    ? '(p.from_address = ?1 OR p.to_address = ?1)'
    : `(p.from_address = ?1 OR p.to_address = ?1 OR p.from_address IN ${FRIENDS} OR p.to_address IN ${FRIENDS})`
  const { results } = await c.env.DB.prepare(
    `${SELECT} WHERE ${scopeSql} AND ${VISIBLE} AND (?2 = 0 OR p.id < ?2) ORDER BY p.id DESC LIMIT ?3`,
  ).bind(me, before, limit).all<PaymentRow>()
  return c.json({ items: results.map((r) => serialize(r, me)), nextBefore: results.length === limit ? results[results.length - 1].id : null })
})

payments.get('/payments/:id', requireAuth, async (c) => {
  const row = await visiblePayment(c, Number(c.req.param('id')))
  return row ? c.json({ payment: serialize(row, c.get('address')) }) : c.json({ error: 'Payment not found.' }, 404)
})

payments.post('/payments/:id/like', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const me = c.get('address')
  if (!(await visiblePayment(c, id))) return c.json({ error: 'Payment not found.' }, 404)
  const removed = await c.env.DB.prepare('DELETE FROM likes WHERE payment_id = ?1 AND address = ?2').bind(id, me).run()
  if (!removed.meta.changes) await c.env.DB.prepare('INSERT INTO likes (payment_id, address, created_at) VALUES (?1, ?2, ?3)').bind(id, me, nowS()).run()
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM likes WHERE payment_id = ?1').bind(id).first<{ n: number }>()
  return c.json({ liked: !removed.meta.changes, likes: count?.n ?? 0 })
})

payments.get('/payments/:id/comments', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  if (!(await visiblePayment(c, id))) return c.json({ error: 'Payment not found.' }, 404)
  const { results } = await c.env.DB.prepare(
    `SELECT c.id, c.body, c.created_at, u.handle, u.name FROM comments c JOIN users u ON u.address = c.address WHERE c.payment_id = ?1 ORDER BY c.id ASC LIMIT 200`,
  ).bind(id).all<{ id: number; body: string; created_at: number; handle: string; name: string }>()
  return c.json({ comments: results.map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at, handle: r.handle, name: r.name })) })
})

payments.post('/payments/:id/comments', requireAuth, async (c) => {
  const id = Number(c.req.param('id'))
  const me = c.get('address')
  if (!(await visiblePayment(c, id))) return c.json({ error: 'Payment not found.' }, 404)
  const body = await c.req.json<{ body?: unknown }>().catch(() => ({}) as { body?: unknown })
  const comment = text(body.body, 200)
  if (!comment) return c.json({ error: 'Write a comment up to 200 characters.' }, 400)
  const author = await c.env.DB.prepare('SELECT * FROM users WHERE address = ?1').bind(me).first<UserRow>()
  if (!author) return c.json({ error: 'Claim a handle first.' }, 403)
  const res = await c.env.DB.prepare('INSERT INTO comments (payment_id, address, body, created_at) VALUES (?1, ?2, ?3, ?4)').bind(id, me, comment, nowS()).run()
  return c.json({ comment: { id: res.meta.last_row_id, body: comment, createdAt: nowS(), handle: author.handle, name: author.name } }, 201)
})
