import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { Loader2, Lock, Mail, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../components/auth/AuthProvider.jsx'
import VaultConstellation from '../components/decorations/VaultConstellation.jsx'

// Google's mark, inline. A remote image would be one more thing that can fail
// to load on the one screen the user cannot get past.
function GoogleMark() {
  return (
    <svg viewBox="0 0 18 18" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z" />
    </svg>
  )
}

function Login() {
  const { session, ready } = useAuth()
  const location = useLocation()
  const reduceMotion = useReducedMotion()

  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  // Already signed in — going back to /login shouldn't strand you here.
  if (ready && session) return <Navigate to={location.state?.from || '/'} replace />

  const signInWithGoogle = async () => {
    setError(null)
    setBusy('google')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    // On success the browser navigates away, so this only runs on failure.
    if (oauthError) {
      setError(oauthError.message)
      setBusy(null)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setBusy('email')

    try {
      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
        if (signUpError) throw signUpError
        // With email confirmation on, there's no session yet — saying so beats
        // a form that looks like it did nothing.
        if (!data.session) setNotice('Check your email to confirm the account, then sign in.')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) throw signInError
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-app px-4 py-10">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="w-full max-w-[400px]"
      >
        <div className="flex flex-col items-center text-center">
          <VaultConstellation />
          <h1 className="mt-1 flex items-center gap-2 text-[24px] font-semibold tracking-tight text-text-primary">
            <Sparkles className="h-5 w-5 text-primary" strokeWidth={2} />
            PM Content Vault
          </h1>
          <p className="mt-1.5 text-body text-text-secondary">
            Sign in to reach everything you've saved.
          </p>
        </div>

        <div className="mt-6 rounded-2xl bg-surface p-5 shadow-card ring-1 ring-border-subtle">
          <button
            onClick={signInWithGoogle}
            disabled={Boolean(busy)}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-surface px-4 py-2.5 text-sm font-medium text-text-primary shadow-card ring-1 ring-border-subtle transition-colors duration-200 hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-60"
          >
            {busy === 'google' ? (
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </button>

          <div className="my-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-border-subtle" />
            <span className="text-[11px] uppercase tracking-wide text-text-secondary">or</span>
            <span className="h-px flex-1 bg-border-subtle" />
          </div>

          <form onSubmit={submit} className="flex flex-col gap-2.5">
            <label className="relative block">
              <span className="sr-only">Email</span>
              <Mail
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                strokeWidth={1.75}
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl bg-muted/60 py-2.5 pl-9 pr-3 text-sm text-text-primary transition-all duration-200 placeholder:text-text-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">Password</span>
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
                strokeWidth={1.75}
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full rounded-xl bg-muted/60 py-2.5 pl-9 pr-3 text-sm text-text-primary transition-all duration-200 placeholder:text-text-secondary focus:bg-surface focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </label>

            <button
              type="submit"
              disabled={Boolean(busy)}
              className="mt-1 flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-card transition-colors duration-200 hover:bg-primary-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {busy === 'email' && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
              {mode === 'signup' ? 'Create account' : 'Sign in'}
            </button>
          </form>

          {error && (
            <p className="mt-3 rounded-xl bg-warning/10 px-3 py-2 text-caption text-warning">{error}</p>
          )}
          {notice && (
            <p className="mt-3 rounded-xl bg-primary-light px-3 py-2 text-caption text-primary">{notice}</p>
          )}

          <button
            onClick={() => {
              setMode(mode === 'signup' ? 'signin' : 'signup')
              setError(null)
              setNotice(null)
            }}
            className="mt-4 w-full rounded-lg py-1 text-caption text-text-secondary transition-colors duration-150 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {mode === 'signup' ? 'Already have an account? Sign in' : "New here? Create an account"}
          </button>
        </div>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-text-secondary">
          Your vault is private to your account. Nothing you save is shared.
        </p>
      </motion.div>
    </div>
  )
}

export default Login
