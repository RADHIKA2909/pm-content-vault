// The biggest file the API will accept.
//
// A Vercel serverless function rejects a request body over 4.5MB before any of
// our code runs, so accepting more here would only turn a clear "that file is
// too large" into an opaque platform error partway through an upload. The
// ceiling is set just under the platform's so the message comes from us.
//
// Raising it means moving uploads to a direct browser-to-Supabase transfer,
// which bypasses the function entirely — worth doing if it ever bites.
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
export const MAX_UPLOAD_LABEL = '4MB'
