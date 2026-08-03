# PM Content Vault

A personal knowledge vault for PM interview prep: save posts, PDFs, links and notes, and get them back through search, an annotation workspace, and a RAG assistant that cites your own material.

See `CLAUDE.md` for the product brief and scope decisions.

## Running it

```bash
cd backend  && npm install && npm run dev   # http://localhost:3001
cd frontend && npm install && npm run dev   # http://localhost:5173
```

Both need environment files first — copy each `.env.example` to `.env` and fill it in.

**The service-role key is server-side only.** Anything prefixed `VITE_` is compiled into the JavaScript bundle and readable by anyone who opens the page, so the frontend gets the **anon** key and nothing else.

## Database

Run `backend/supabase/schema.sql` in the Supabase SQL editor, then the files in
`backend/supabase/migrations/` in numeric order.

## Authentication setup

Sign-in is Google OAuth plus email/password. Both need configuration outside this repo.

**1. Google Cloud Console**
- Create (or pick) a project → *APIs & Services* → *OAuth consent screen*. External, add your own email as a test user.
- *Credentials* → *Create credentials* → *OAuth client ID* → Web application.
- Authorised redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`
- Copy the client ID and client secret.

**2. Supabase**
- *Authentication* → *Providers* → **Google**: enable, paste the client ID and secret.
- *Authentication* → *URL Configuration*: set Site URL to `http://localhost:5173` and add it — plus your deployed URL later — to the redirect allow-list.
- Email/password works with no extra setup. If *Confirm email* is on, the first sign-up needs the emailed link before it can sign in.

**3. Existing data**

Anything saved before authentication belongs to the old fixed `DEFAULT_USER_ID`, so a fresh Google account will see an empty vault. After signing in once:

```sql
select id, email from auth.users order by created_at desc;
```

If that id already matches your old `DEFAULT_USER_ID`, Supabase linked the identity and there's nothing to do. Otherwise fill both ids into `backend/supabase/migrations/017_reassign_owner.sql` and run it — it moves every table in one transaction and rolls back if anything is left behind.

For this vault that step is **already done**: the original data was moved to the Google account on 2026-08-04. Migration 017 is kept as the record and the recipe, not as pending work — run as-is it trips its own guard and rolls back.

## How access control works

Requests carry a Supabase JWT (`lib/apiFetch.js` attaches it). `middleware/requireAuth.js` **verifies** the token with Supabase — not merely decodes it — and every query is scoped to the resulting `req.userId`. `/health` is the only unauthenticated route.

Row-level policies exist on all eight tables as a backstop. They aren't what enforces access today, because the API holds the service-role key and bypasses them; they matter if anything ever talks to the database with the anon key.

## Known gap

The `vault-files` storage bucket is **public**. An uploaded PDF or image stays readable by anyone who has its URL, signed in or not. Making it private means switching to signed URLs everywhere a file is rendered.
