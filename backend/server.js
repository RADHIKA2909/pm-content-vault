import 'dotenv/config'
import app from './src/app.js'

// Local development only. In production the same app is exported as a
// serverless handler from /api/index.js, and nothing calls listen().
const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`Backend server listening on port ${PORT}`)
})
