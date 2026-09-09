# Single-server deployment

Run one app instance: SQLite and the world simulation have a single writer. Do not scale this service into multiple replicas.

1. Use a Linux server with Docker Compose. Point your domain DNS to it and allow inbound ports 80 and 443.
2. Copy .env.example to .env. Set DOMAIN=your-domain.example, APP_ORIGIN=https://your-domain.example, PUBLIC_CONTACT_EMAIL, STRIPE_MODE=test, STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET. Keep this file private. STRIPE_PRICE_* overrides are optional; Checkout uses server-defined USD amounts otherwise.
3. In Stripe register https://your-domain.example/api/stripe/webhook for checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired and charge.refunded. Copy its signing secret to STRIPE_WEBHOOK_SECRET.
4. Run node --env-file=.env scripts/preflight.mjs then docker compose up -d --build. Caddy obtains HTTPS certificates. The app is reachable only through Caddy, which supplies trusted client addresses.
5. Register an account, create the starter citizen, buy a citizen slot with a Stripe test card, confirm the signed webhook grants exactly one slot, then create and switch to that citizen. Test cancellation and full refund. Redirect alone never grants a slot.
6. Before live sales, publish your contact information, terms and refund policy; review founder benefits and prices. Set STRIPE_MODE=live and use the new live key and live webhook secret, then recreate the app. Never use the previously exposed key.

## Compose runtime notes

- Image is `node:24-bookworm-slim` (see Dockerfile). Matches engines `>=24`; do not run production off Node 20.
- `compose.yaml` sets `NODE_ENV=production`, so demo citizenship preview is off even if `ALLOW_DEMO_CITIZENSHIP=1` is left in `.env`.
- App HEALTHCHECK polls `http://localhost:3100/api/health` every 30s inside the container. Through Caddy, confirm `https://$DOMAIN/api/health` returns 200 before handing the URL to Payments/QA.
- Persistent state is the named volume `game-data` → `/app/data/everwick.sqlite`. Never run `docker compose down -v` against a saved world.
- Container deployment has not been executed in this development environment. Staging stays private (no public DNS) until Security’s threat note.

## Backup and restore drill (compose)

Do this once on staging before any paid traffic. Commands assume the compose project directory.

1. **Backup while running:**  
   `docker compose exec app node scripts/backup.mjs /app/data/backups/drill-$(date -u +%Y%m%dT%H%M%SZ).sqlite`  
   Then copy the file off the host (encrypted). The script refuses to overwrite an existing path.
2. **Preserve rollback set:** stop the app (`docker compose stop app`), copy the live DB plus any `-wal`/`-shm` siblings from the volume into a host rollback directory.
3. **Restore:** replace `/app/data/everwick.sqlite` in the volume with the backup file (same path as `DATABASE_PATH`), remove stale WAL/SHM for that restore target, start `docker compose start app`, confirm `/api/health` and a known tick/citizen.
4. **Payments:** after any rollback, reconcile Stripe webhook events (test mode first) so external payment history is not lost — coordinate with Payments.
5. **Alerting minimum:** alert when the container is unhealthy or `/api/health` fails for >2 minutes. Load testing remains separate (QA).

Source: https://docs.stripe.com/checkout/fulfillment
