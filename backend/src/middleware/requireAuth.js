import supabase from '../services/supabaseClient.js'

/**
 * Establishes who is making the request.
 *
 * The token is **verified with Supabase**, not merely decoded. A JWT is signed
 * but readable by anyone holding it, so trusting a `sub` claim parsed locally
 * would let anyone mint a token for any user id and read the whole vault. The
 * round trip is what makes the signature mean something.
 *
 * Everything downstream reads `req.userId`. Until this middleware existed the
 * backend used a fixed DEFAULT_USER_ID for every query, which is exactly the
 * behaviour that had to stop before this app could be deployed anywhere.
 */
export async function requireAuth(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null

  if (!token) {
    return res.status(401).json({ error: 'Sign in to continue' })
  }

  try {
    const { data, error } = await supabase.auth.getUser(token)

    if (error || !data?.user) {
      return res.status(401).json({ error: 'Your session has expired — sign in again' })
    }

    req.userId = data.user.id
    req.user = data.user
    next()
  } catch (err) {
    // A network failure reaching Supabase is not the caller's fault, and
    // answering 401 would send them to a login screen that can't help.
    console.error('Auth check failed:', err.message)
    res.status(503).json({ error: 'Could not verify your session — try again' })
  }
}
