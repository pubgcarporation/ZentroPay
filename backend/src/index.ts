import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { AppEnv } from './env'
import { payments } from './routes/payments'
import { requests } from './routes/requests'
import { users } from './routes/users'

const app = new Hono<AppEnv>()

app.use('/api/*', async (c, next) => {
  const allowed = c.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
  return cors({
    origin: allowed.includes('*') ? '*' : allowed,
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    maxAge: 600,
  })(c, next)
})

app.get('/api/health', (c) => c.json({ ok: true }))
app.route('/api', users)
app.route('/api', payments)
app.route('/api', requests)

app.notFound((c) => c.json({ error: 'Not found.' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Something went wrong. Please try again.' }, 500)
})

export default app
