// Vercel serverless entrypoint.
//
// Everything under /api on the deployed domain is routed here by vercel.json
// and handed to the same Express app that runs locally, so there is exactly
// one implementation of the API rather than a server version and a cloud
// version that drift apart.
//
// Express's `(req, res)` signature is already what a Vercel Node function
// expects, so the app is the handler.
import app from '../backend/src/app.js'

export default app
