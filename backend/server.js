import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import itemsRouter from './src/routes/items.js'
import composeRouter from './src/routes/compose.js'
import chatRouter from './src/routes/chat.js'

const app = express()
app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Mounted ahead of itemsRouter so /analyze and /commit resolve here before
// they can be mistaken for an item id; anything unmatched falls through.
app.use('/api/items', composeRouter)
app.use('/api/items', itemsRouter)
app.use('/api/chat', chatRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`)
})
