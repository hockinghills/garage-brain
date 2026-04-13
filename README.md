# Garage Brain

A modular vehicle maintenance platform built on Cloudflare's developer platform (Workers, Pages, D1, R2, KV, AI).

## Features

- **Vehicle garage** — manage multiple vehicles with project tracking
- **Project system** — steps, parts, tools, FSM references, journal notes
- **Troubleshooting** — flattened FSM diagnostic paths with branching, measurements, and known-facts elimination
- **FSM Library** — crawl, upload, and browse factory service manual PDFs
- **Alignment module** (planned) — camera-based wheel alignment
- **OBD2 module** (planned) — BLE ELM327 + scanner integration

## Stack

- **Frontend:** React 18, Vite 6 → Cloudflare Pages
- **Backend:** Cloudflare Pages Functions
- **Database:** Cloudflare D1
- **Storage:** Cloudflare R2
- **Cache:** Cloudflare KV
- **Auth:** Cloudflare Access
- **Tests:** Vitest

## Setup

```bash
npm install
npm test
npm run dev
```

### Cloudflare Resources

Configure bindings in `wrangler.toml`. Resource IDs are managed via wrangler config and CI secrets — not committed to the repo.

Required bindings: D1 (`DB`), R2 (`STORAGE`), KV (`CACHE`), Workers AI (`AI`).

### Database

```bash
npm run db:migrate        # remote
npm run db:migrate:local  # local dev
```

Schema: `db/schema.sql` (12 tables)

### Deploy

Automatic via GitHub Actions on push to main. See `.github/workflows/deploy.yml`.

Requires `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as CI secrets.

### Auth

Cloudflare Access protects all routes at the edge. API middleware provides additional validation for external/programmatic access.

Set the API secret: `wrangler secret put API_SECRET`

## Tests

26 tests covering all API endpoints and auth middleware.

```bash
npm test
npm run test:watch
```

## License

Private.
