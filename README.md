# Garage Brain

A modular vehicle maintenance platform for personal use. Built on Cloudflare's developer platform (Workers, Pages, D1, R2, KV, AI). Designed for a guy with ADHD, four vehicles, and half-finished projects in his garage.

**Live:** https://garage-brain.pages.dev
**Repo:** https://github.com/hockinghills/garage-brain

## The Problem

Working on your own vehicles means juggling factory service manuals (FSMs), troubleshooting across multiple FSM sections, tracking parts and tools, remembering where you left off three years ago, and doing it all from a phone with greasy hands. This platform puts everything in one place with project memory.

## Vehicles

| Vehicle | Bolt Pattern | OBD | Current Projects |
|---|---|---|---|
| 2013 Nissan Leaf SL | 5x114.3 | CAN 11-bit 500k | HVAC blower fix (transistor), alignment |
| 2003 VW Golf | 5x100 | CAN / K-line | No-start diagnosis (fuel pump suspect) |
| 2000 Dodge Ram 2500 Cummins | 8x165.1 | J1850 / CAN | 47RE valve body install (rebuilt trans, VB sitting out 3 years) |
| 2013 Infiniti QX60 (buddy's) | 5x114.3 | CAN 11-bit 500k | Alignment |

## Architecture

```
Frontend (React + Vite -> Cloudflare Pages)
+-- Vehicle garage -- select vehicle, see active projects
+-- Project system -- steps, parts, tools, FSM sections, notes
+-- Troubleshooting module -- flattened FSM diagnostic paths
+-- FSM Library -- browse/download/search service manuals
+-- Alignment module (planned) -- camera-based with checkerboard targets
+-- OBD2 module (planned) -- BLE reader + Foxwell scanner integration

Backend (Cloudflare Pages Functions)
+-- /api/vehicles -- CRUD with input validation
+-- /api/projects -- CRUD with parallel enrichment queries
+-- /api/fsm -- PDF upload to R2 with validation
+-- /api/fsm/crawl -- NICOclub FSM crawler (batch-based)
+-- /api/fsm/crawl/continue -- process next download batch
+-- /api/_middleware.js -- auth on all POST endpoints

Data
+-- D1 (garage-brain-db) -- 12 tables, schema in db/schema.sql
+-- R2 (garage-brain-storage) -- FSM PDFs, photos, alignment captures
+-- KV (garage-brain-cache) -- crawl job state, session cache
+-- Workers AI -- FSM search/indexing (planned)
```

## Cloudflare Resources

| Resource | ID/Name | Status |
|---|---|---|
| Pages project | garage-brain | Deployed |
| D1 database | dd618ed7-b66d-4e8d-91f6-cfe1c2b93df7 | 12 tables migrated |
| R2 bucket | garage-brain-storage | Created |
| KV namespace | 73fdc31ea40a42318eff5b307a45f8d8 | Created |
| Workers AI | binding configured | Not yet used |

Account ID: 7dd472225e9f686337115d818c3930bf

## D1 Schema (12 tables)

vehicles, projects, steps, parts, tools, project_tools, fsm_sections, project_fsm, alignment_readings, obd_snapshots, maintenance_log, project_journal

Full schema: `db/schema.sql`

## Modules

| Module | Status | Description |
|---|---|---|
| Repair Guide | Skeleton | FSM-guided step-by-step repairs |
| Diagnostics | Skeleton | OBD2 + troubleshooting trees |
| Troubleshoot | Functional | Flattened FSM paths with branching, measurements, notes |
| Alignment | Planned | Camera + checkerboard targets, OpenCV solvePnP |
| Maintenance | Planned | Service intervals, fluid tracking |
| OBD2 Live | Planned | BLE ELM327 + Foxwell data import |
| Parts Bin | Planned | Inventory of parts on hand |
| FSM Library | Functional | NICOclub crawler, upload, search |

## Troubleshooting Module

The killer feature. FSMs are written as cross-referenced choose-your-own-adventure books -- "check voltage at C205, if OK see EC-42, which says check G201, if OK see PG-8." The troubleshooting module flattens this into a single linear path that adapts based on your answers.

Features:
- Pass/fail/skip steps -- tap and move on
- Branching choices -- "pump primes with swapped relay" goes to relay fix; "still no prime" goes to fuse check
- Measurement inputs -- enter a reading, auto-compared to spec range
- Known-facts elimination -- "I already replaced the motor" skips those branches
- Per-step FSM references -- see which manual section each step came from
- Result logging with timestamps -- pick up where you left off

Pre-built trees: Leaf HVAC blower, Golf no-start diagnosis.

## FSM Crawler

Downloads factory service manuals from NICOclub automatically.

URL pattern: `https://www.nicoclub.com/service-manual?fsm_download=Model/Year/Code.pdf`

Pre-mapped: 47 sections for 2013 Leaf. Rate-limited to 3s between downloads. Batch-based (5 sections per request via /continue endpoint) to stay within Workers CPU limits. Single-writer model -- no race conditions.

NICOclub also covers Infiniti (QX60 FSM likely available). Golf and Ram FSMs need different sources (owner has full service manuals for all vehicles, just needs to upload or point to URLs).

## Alignment Module (Planned)

Camera-based wheel alignment using the phone (Samsung Galaxy S21 Ultra).

Design:
- Printed checkerboard grid targets (OpenCV standard, 7x5 @ 20-25mm squares)
- 3D printed lug-mount brackets (Ender 3 printer available)
  - Plate A: 5x114.3 + 5x100 dual holes (Leaf, QX60, Golf)
  - Plate B: 8x165.1 (Ram)
- Body reference targets on rocker panels for centerline
- OpenCV findChessboardCorners + solvePnP for 3D angle extraction
- Measures: toe, camber, caster (via steering sweep), thrust angle

Key constraint: Leaf front camber/caster are NOT adjustable (only toe). The app is primarily a measurement tool -- adjustment procedures come from FSMs.

## OBD2 (Planned)

Owner has:
- BLE ELM327 reader (always-connected, lightweight)
- Foxwell scanner (advanced -- bi-directional, ABS bleed, DPF regen)

BLE reader connects via Web Bluetooth for live PID monitoring. Foxwell data imported via photo/export.

## Test Suite

26 tests via vitest covering all API endpoints and auth middleware. Every bug found by review bots has a regression test.

Run: `npm test`

## Development Workflow

**Branch protection is ON for main.** All changes go through PRs.

### Review Bots (free, automatic)

| Bot | What it catches |
|---|---|
| Qodo | Logic bugs, security, correctness, performance |
| CodeAnt | State management, data integrity, race conditions, API contracts |
| CodeRabbit | Walkthroughs/summaries (free/CHILL tier) |

**Review process:**
1. All bot comments are assessed -- would implementing the suggestion harm the code?
2. If no -> implement it
3. If yes -> discuss with owner first, then respond to the bot explaining why it was skipped
4. No suggestion has been skipped yet (15/15 implemented across 3 review rounds)

### Deploy

```bash
npm run build
CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=7dd472225e9f686337115d818c3930bf npx wrangler pages deploy dist --project-name garage-brain --branch main
```

## Review Findings History (15 total, 14 implemented, 1 already resolved)

| # | Bot | Issue | Fix |
|---|---|---|---|
| 1 | qodo | Choice branch override in troubleshooter | autoAdvance flag |
| 2 | qodo | NaN measurement recorded as FAIL | Guard + disabled button |
| 3 | qodo | FSM upload missing File/size/type validation | Full validation |
| 4 | qodo | Unauthenticated POST endpoints | Auth middleware |
| 5 | qodo | Crawler waitUntil exceeds runtime | Batch-based /continue |
| 6 | qodo | KV race between waitUntil and /continue | Removed waitUntil, single-writer |
| 7 | codeant | Notes panel hidden for empty string | != null check |
| 8 | codeant | Notes lost on navigation (CRITICAL) | Persist to vehicles state tree |
| 9 | codeant | in_progress ignored in completion check | 409 response |
| 10 | codeant | INSERT OR REPLACE duplicates without unique constraint | INSERT with NOT EXISTS |
| 11 | codeant | Vehicles POST 500 on missing fields | Input validation |
| 12 | codeant | FSM File type check | Already fixed -- responded to reviewer |
| 13 | codeant | Discover endpoint hint to 404 | Changed to 501 + correct hint |
| 14 | codeant | N+1 sequential queries in projects GET | Promise.all |
| 15 | codeant | Projects POST 500 on missing fields | Input validation |

## What's Next

Roughly in priority order:

1. Wire frontend to D1 API -- replace hardcoded demo data with fetch calls
2. FSM ingestion -- run the NICOclub crawler for the Leaf, upload Golf/Ram manuals
3. AI Search integration -- index FSM content, enable natural language queries
4. Alignment module -- printable targets, photo capture, angle calculation
5. OBD2 BLE integration -- Web Bluetooth connection to ELM327
6. Troubleshooting AI -- auto-generate diagnostic trees from FSM content
7. Split app.jsx -- 1,600+ lines in one file, should be componentized
8. FSM cross-reference flattening -- the AI reads across sections automatically

## Tokens / Secrets

- GitHub and Cloudflare tokens used during initial setup should be ROLLED
- API_SECRET for the auth middleware needs to be set: `wrangler secret put API_SECRET`
- No secrets are stored in the repo

## Tech Stack

- Frontend: React 18, Vite 6, deployed to Cloudflare Pages
- Backend: Cloudflare Pages Functions (Workers runtime)
- Database: Cloudflare D1 (SQLite)
- Storage: Cloudflare R2 (S3-compatible, zero egress)
- Cache: Cloudflare KV
- AI: Cloudflare Workers AI + AI Search (planned)
- Tests: Vitest 4
- Owner's tools: Ender 3 printer, Samsung S21 Ultra, BLE OBD2 reader, Foxwell scanner
