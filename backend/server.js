import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import itemsRouter from './src/routes/items.js'
import composeRouter from './src/routes/compose.js'
import chatRouter from './src/routes/chat.js'
import annotationsRouter from './src/routes/annotations.js'
import { requireAuth } from './src/middleware/requireAuth.js'

const app = express()
app.use(cors())
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

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`)
})
