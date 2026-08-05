import express from 'express'
import cors from 'cors'
import itemsRouter from './routes/items.js'
import composeRouter from './routes/compose.js'
import chatRouter from './routes/chat.js'
import annotationsRouter from './routes/annotations.js'
import { requireAuth } from './middleware/requireAuth.js'
import { MAX_UPLOAD_LABEL } from './services/uploadLimits.js'
import supabase from './services/supabaseClient.js'

/**
 * The Express app, with no server attached.
 *
 * Kept separate from server.js so the same app can be listened on locally and
 * exported as a serverless handler in production (see /api/index.js). A file
 * that calls `listen()` at import time can't be either.
 */
const app = express()

// In production the frontend is served from this same origin, so no browser
// request is cross-origin and CORS never applies. It exists for local
// development, where Vite runs on :5173 and this on :3001 — and for that,
// naming the allowed origins beats reflecting whatever asks.
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:4173')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean)

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header: same-origin fetches, curl, health checks.
      if (!origin) return callback(null, true)
      callback(null, ALLOWED_ORIGINS.includes(origin))
    },
  }),
)

app.use(express.json())

// Unauthenticated on purpose — it reports that the process is up and says
// nothing about anyone's data.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

/**
 * Keeps the database from being paused for inactivity.
 *
 * Supabase pauses Free Plan projects that show "low activity" over 7 days, and
 * a paused project means the first person to open the app waits for it to wake
 * — which, for a portfolio link, is likely to be exactly the person you least
 * want waiting. A daily cron (vercel.json) hits this.
 *
 * It has to touch Postgres to count: /health only reports that the process is
 * alive and never opens a connection, so pinging it would prove nothing. The
 * query is a HEAD count — no rows cross the wire.
 *
 * Deliberately outside the /api auth gate, since a cron has no session. When
 * CRON_SECRET is set, Vercel sends it as a bearer token and it's enforced;
 * when it isn't, the endpoint still works. That way round on purpose: a
 * forgotten secret should degrade to an unauthenticated HEAD count, not to a
 * cron that silently 401s every day while appearing configured.
 */
app.get('/keepalive', async (req, res) => {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (!secret) console.warn('CRON_SECRET is not set — /keepalive is unauthenticated')

  const { error } = await supabase.from('items').select('id', { count: 'exact', head: true })
  if (error) {
    // A non-200 makes the failure visible in Vercel's cron log rather than
    // leaving a green tick over a database that never woke up.
    console.error('Keepalive query failed:', error.message)
    return res.status(503).json({ ok: false })
  }

  res.json({ ok: true, at: new Date().toISOString() })
})

// Everything under /api requires a verified session. Mounted here rather than
// per-router so a new route file can't be added later and quietly ship
// unauthenticated: the default for anything under this path is now "closed".
app.use('/api', requireAuth)

// Mounted ahead of itemsRouter so /analyze and /commit resolve here before
// they can be mistaken for an item id; anything unmatched falls through.
app.use('/api/items', composeRouter)
app.use('/api/items', itemsRouter)
app.use('/api/chat', chatRouter)
// Mounted at /api rather than /api/items: it owns both /items/:id/annotations
// and /annotations/:annotationId, and an annotation is edited by its own id
// without the item in the path.
app.use('/api', annotationsRouter)

// Multer rejects an oversize file by throwing, and nothing was catching it —
// the upload died as an unhandled error and the browser saw a bare 500 with
// no hint that the file was simply too big. Named limits get a sentence the
// user can act on; anything else is logged and reported generically rather
// than leaking an internal message.
//
// Four arguments, or Express treats it as ordinary middleware.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `That file is over ${MAX_UPLOAD_LABEL}. Try a smaller one.` })
  }
  if (err?.name === 'MulterError') {
    return res.status(400).json({ error: `That upload couldn't be read (${err.code}).` })
  }

  console.error('Unhandled API error:', err)
  res.status(500).json({ error: 'Something went wrong on our side.' })
})

export default app
