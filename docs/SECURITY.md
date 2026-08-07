# Security

Brief security notes for Fishmaster production. Not a formal audit.

---

## Authentication

- **JWT** signed with `JWT_SECRET` (7-day expiry).
- Production **requires** a strong `JWT_SECRET` — the API refuses to start if the dev default is used when `NODE_ENV=production`.
- Tokens stored in browser `localStorage` (web) and AsyncStorage (mobile). Acceptable for this app tier; consider httpOnly cookies for higher assurance later.
- Passwords hashed with bcrypt before storage.

## API hardening

| Control | Implementation |
|---------|----------------|
| CORS | Production: only `WEB_URL` + `CORS_ORIGINS` (no wildcard) |
| Headers | `helmet` middleware |
| Rate limiting | 20 requests / 15 min on `/api/auth/login` |
| Trust proxy | `trust proxy` enabled for Render reverse proxy |
| Env validation | `apps/api/src/config.ts` validates required vars at startup |

## Stripe

- Webhook endpoint verifies signature via `STRIPE_WEBHOOK_SECRET`.
- Webhook route uses raw body parser (required for signature verification).
- Never expose secret keys to the client — only `STRIPE_SECRET_KEY` on the API server.
- Use test keys until ready; switch to live keys and update webhook URL for production.

## Secrets management

- **Never commit** `.env`, Stripe keys, or database URLs.
- `.env.example` files contain placeholders only.
- Set secrets in Render, Vercel, and EAS dashboards — not in git.
- Render can auto-generate `JWT_SECRET` via `render.yaml`.

## Database

- Use SSL connection strings (Neon and Render Postgres enforce this).
- Prefer Neon's **pooled** connection string for the API service.
- Restrict database access to the API service IP / connection pool only.
- Do not expose Postgres port publicly.

## Seeding

- Demo users (`demo1234`, `admin1234`) are created by `db:seed`.
- **`SEED_ON_DEPLOY` defaults to `false`** — only enable for first deploy.
- Change or remove demo passwords before public launch if seed is used.

## Mobile

- API URL baked at build time via `EXPO_PUBLIC_API_URL` — rebuild after URL changes.
- No API secrets in the mobile app — JWT obtained via login only.

## Reporting issues

If you discover a vulnerability, contact the project maintainer privately before public disclosure.
