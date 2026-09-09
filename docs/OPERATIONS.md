# Local operations and deployment

## Installation and migration
Requires Node.js 24 or newer with `node:sqlite`. No third-party npm packages are required. `npm start` or `./start.ps1` starts the website, API and town worker. The server defaults to loopback only.

Schema creation and the wallet-removal migration are applied idempotently on startup by `server/db.mjs`, and `migrations` records its application. `worlds` stores one atomic town snapshot containing NPCs, inventories, businesses, relationships, properties, event history, prices and memories. Accounts, sessions, payments, entitlements, customer IDs, analytics, waitlist, audit and AI tasks are normalized tables. Future changes need numbered migrations and upgrade tests; `CREATE TABLE IF NOT EXISTS` is not a general schema-upgrade strategy.

Environment variables are documented in `.env.example`. Use an absolute `DATABASE_PATH` when running as a service. `APP_ORIGIN` must match the browser URL exactly, including scheme and port, for CSRF checks. Set `HOST=0.0.0.0` only behind an appropriate firewall/reverse proxy for a deliberate deployment.

## Deployment
Run `npm test` and `npm run build`. Deploy `dist/` to a persistent Node host, configure the environment, and start `node --env-file-if-exists=.env server/index.mjs`. Use one application instance per database/town. Provide TLS termination, a writable persistent volume and process supervision. `/api/health` exposes worker timing and the current tick.

Sites hosting was investigated but the required scaffolder repeatedly failed with `EPERM: realpath C:\Users\Glob`, even after filesystem/network permission. This Node/SQLite app is not a Cloudflare Worker and has not been published through Sites. Do not upload `dist/` as a static site: it requires its authoritative server. Portability requires a D1/worker port or a Node-capable host.

Use a restricted OS account. Do not expose raw `.env`, source, database or backup directories through the web server. Only `client/` is served. Add a reverse-proxy request/body/connection limit and operational alerting before internet exposure. The built-in in-memory rate limiter is only suitable for one process and is not a distributed abuse defense.

## Backups
Use the included `scripts/backup.mjs` with an explicit new output path. It uses SQLite `VACUUM INTO` for a consistent backup, including when WAL is active. Keep encrypted off-host copies. For restore: stop the application, preserve the current database/WAL/SHM together in a rollback directory, restore the backup to `DATABASE_PATH`, and restart. Reconcile Stripe webhook events after a rollback to avoid losing external payment history.

Never delete an in-use WAL file. Do not copy only the main SQLite file while the process is writing. Rehearse backup/restore before launch.

For Docker Compose, follow the numbered drill in `docs/DEPLOYMENT.md` (volume `game-data`, HEALTHCHECK on `/api/health`, never `compose down -v`). Local bare-metal uses the same script against `DATABASE_PATH`.

## Security and release limitations
- Passwords use salted scrypt, opaque expiring sessions use HttpOnly/SameSite cookies, and admin checks run on every protected API call.
- Same-origin mutations reject cross-origin requests; production cookies require HTTPS.
- Prices, wages, trade quantities and ownership are validated server-side. Economic commands use durable per-user idempotency keys.
- Purchase fulfillment checks signature, timestamp, mode, tier, user, currency and exact amount. Refund totals are monotonic.
- User text is escaped in HTML. Model replies cannot mutate the economy.
- Administrator TOTP MFA (`/api/admin/mfa/*`), elevating admin sessions, and an audited sales kill-switch (`/api/admin/sales`, Checkout 503 when disabled) are implemented. Email verification and password recovery are not.
- Privacy export (`GET /api/privacy/export`), account deletion (`POST /api/privacy/delete`), and waitlist consent withdrawal (`POST /api/privacy/consent-withdraw`) are implemented. There is still no distributed session store, anti-bot registration, or penetration-test evidence.
- Waitlist consent is stored, but email delivery and confirmation are not connected. Referral counts are provisional and must not grant irreversible rewards before verification/abuse checks.
- The server does not use an AI model for routine actions. The daily inference budget is a call limit, not a dollar cap; accurate reported cost depends on configured pricing and provider token reporting.
- No blockchain is included; it was removed to respect the selected art license.

## Incident procedure
Stop sales via `POST /api/admin/sales` with `{enabled:false}` (preferred) or by removing Stripe configuration, preserve logs and the database, identify the affected command/event IDs, and reconcile against Stripe before changing financial rows. Revoke exposed credentials at the provider and issue replacements. For simulation corruption, stop the worker before restoring a tested backup. Never compensate players by manually writing unlogged client balances.
