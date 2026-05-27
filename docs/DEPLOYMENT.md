# Deployment (Vercel — frontend + API)

See the [README](../README.md) for product overview, local setup, and architecture. This document covers production on Vercel.

BitePick runs as a **single Vercel project**: the React app is static files, and the Express API is one serverless function at `/api/*`.

Local development is unchanged: Vite on port 5173 with `/api` proxied to Express on port 5000.

---

## 1. Vercel project settings

In [Vercel Dashboard](https://vercel.com) → your project → **Settings**:

| Setting | Value |
|--------|--------|
| **Root Directory** | `.` (repository root — not `frontend/`) |
| **Framework Preset** | Other |
| **Build Command** | *(leave empty — uses `vercel.json`)* |
| **Output Directory** | *(leave empty — uses `vercel.json`)* |
| **Install Command** | *(leave empty — uses `vercel.json`)* |

If the project was previously linked with **Root Directory = `frontend`**, change it to the repo root and redeploy.

---

## 2. Environment variables (Vercel)

**Project → Settings → Environment Variables**

Add these for **Production** (and **Preview** if you use preview deployments):

| Variable | Required | Notes |
|----------|----------|--------|
| `JWT_SECRET` | Yes | Long random string (same value you used on Render) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (server only — never expose to the browser) |
| `ADMIN_EMAILS` | Yes | Comma-separated admin emails |
| `FRONTEND_URL` | Recommended | Production site URL, e.g. `https://bitepick.vercel.app` or your custom domain |
| `YELP_API_KEY` | If used | For restaurant sync scripts |
| `DATABASE_URL` | If used | Only if you run Prisma scripts against prod |

**Do not set** `VITE_API_BASE_URL` in production. The frontend uses the same origin as the page (`window.location.origin`), so API calls go to `/api/...` on your Vercel domain.

**Remove** any old variable pointing at Render (e.g. `VITE_API_BASE_URL=https://your-app.onrender.com`).

`PORT` is not needed on Vercel.

---

## 3. Custom domain (optional)

**Project → Settings → Domains**

- Add your domain and follow DNS instructions.
- Set `FRONTEND_URL` to that domain (with `https://`).
- Redeploy after DNS propagates.

---

## 4. Decommission Render

After a successful Vercel deploy:

1. Open `https://<your-vercel-domain>/api/health` — expect `{"ok":true}`.
2. Smoke-test login, restaurants, and group sessions in the browser.
3. In [Render Dashboard](https://dashboard.render.com), **suspend or delete** the old web service.
4. Remove Render URLs from DNS/bookmarks/README if any remain.

---

## 5. Supabase

No change required for the database itself. Ensure Supabase **Auth / API** settings still allow your Vercel URL if you use Supabase Auth redirects (this app uses custom JWT on the API).

---

## 6. Local full-stack (optional)

Install [Vercel CLI](https://vercel.com/docs/cli):

```bash
npm i -g vercel
vercel link
vercel env pull .env.local   # optional: pull production-like env
vercel dev
```

Or keep the usual split:

```bash
npm run dev:backend   # terminal 1 — port 5000
npm run dev:frontend  # terminal 2 — port 5173, proxies /api
```

---

## 7. Troubleshooting

| Symptom | Check |
|--------|--------|
| 404 on `/api/health` | Root Directory must be repo root; `vercel.json` at root |
| CORS errors on preview URL | Redeploy; preview `*.vercel.app` origins are allowed when `VERCEL=1` |
| API 500 / DB errors | `SUPABASE_*` and `JWT_SECRET` set on Vercel for the right environment |
| UI loads but API hits Render | Remove `VITE_API_BASE_URL` from Vercel env and rebuild |
| Cold starts | Normal on serverless; only API routes cold-start, not static HTML/JS |
