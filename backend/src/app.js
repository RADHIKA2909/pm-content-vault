import express from 'express'
import cors from 'cors'
import itemsRouter from './routes/items.js'
import composeRouter from './routes/compose.js'
import chatRouter from './routes/chat.js'
import annotationsRouter from './routes/annotations.js'
import { requireAuth } from './middleware/requireAuth.js'
import { MAX_UPLOAD_LABEL } from './services/uploadLimits.js'

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
