import { Navigate, useLocation } from 'react-router-dom'
import { Sparkles } from 'lucide-react'
import { useAuth } from './AuthProvider.jsx'

/**
 * The gate in front of every page.
 *
 * While the stored session is still resolving it shows a placeholder rather
 * than redirecting — `ready` is false for a moment on every reload, and
 * treating that as "signed out" would bounce an authenticated user to /login
 * each time they refresh.
 *
 * The attempted path rides along in location state so signing in returns you
 * to where you were headed instead of dumping you on the dashboard.
 */
function RequireAuth({ children }) {
  const { session, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg-app">
        <span className="flex h-11 w-11 animate-pulse items-center justify-center rounded-2xl bg-primary-light">
          <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.75} />
        </span>
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return children
}

export default RequireAuth
