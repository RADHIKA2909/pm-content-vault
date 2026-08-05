/**
 * Where the API lives.
 *
 * In production the frontend and the API are one Vercel project on one domain,
 * so `/api/...` is same-origin and needs no base — which also means there is
 * no CORS in play at all. Locally the backend runs on its own port.
 *
 * `??` rather than `||` so an explicitly empty VITE_API_URL is honoured as
 * "same origin" instead of falling through to localhost.
 */
export const API_URL =
  import.meta.env.VITE_API_URL ?? (import.meta.env.PROD ? '' : 'http://localhost:3001')
