# Garage Brain v2 — Design Notes

A modular vehicle maintenance platform. v1 was a stateless React/Pages-Functions/D1 CRUD
app built four days ago, immediately before Cloudflare's Agents Week shipped a stack that
fit the actual problem better. v2 is a clean rebuild on the new primitives.

## Foundations (decided)

### Architecture
- **Cloudflare Agents** — stateful Durable Objects, not stateless functions
- **WebSocket-first** — state lives in agents, syncs to clients in real time
- **No central database** — each agent owns its own SQLite

### Agent topology
- `GarageAgent` — singleton per user. Owns vehicle list, toolbox reference, recent
  activity, preferences, auth identity.
- `VehicleAgent extends Think` — one per vehicle. Owns projects, parts, FSM, maintenance,
  OBD, alignment, AND the conversational diagnostician (because the vehicle is the thing
  that knows itself). Sub-agents were a wrong instinct — `Think` is a base class, the
  vehicle just extends it.
- `ToolboxAgent` — singleton per user. Tools and consumables. Cross-vehicle.

### Frontend stack
- **Kumo** — Cloudflare's React component library, accessible, themeable, has a
  machine-readable component registry built for AI consumers
- **Tailwind v4** — comes with Kumo
- **Vite + Cloudflare Vite plugin** — dev/build toolchain
- No full-stack framework (TanStack Start, React Router) — agents ARE the backend, no
  server routes/loaders/server-functions needed. Agents-starter does this.

### State continuity (the "Minority Report" property)
- Falls out of the architecture for free. State lives in DOs, not on devices.
- Phone and desktop are two WebSocket connections to the same agent.
- Continuity isn't a feature we build — it's a consequence of the architecture being
  right.

## Feature list (carried from v1, the only thing worth carrying)

- Vehicle garage — manage multiple vehicles with project tracking
- Project system — steps, parts, tools, FSM references, journal notes
- Troubleshooting — diagnostic paths with branching, measurements, known-facts elimination
- FSM Library — crawl, upload, browse factory service manual PDFs
- Alignment module (planned) — camera-based wheel alignment
- OBD2 module (planned) — BLE ELM327 + scanner integration

## Open questions

### Per-agent specifics
- **VehicleAgent / Projects** — lifecycle, step reordering, sub-steps?
- **VehicleAgent / Parts** — belong to project, or to vehicle with project references?
- **VehicleAgent / FSM** — how do sections get crawled and stored? search story?
- **VehicleAgent / Maintenance log** — free-form or structured?
- **VehicleAgent / OBD + Alignment** — design the data shape now or stub for later?
- **GarageAgent / Recent activity** — what counts? pointers vs content? granularity?
- **ToolboxAgent / Tools** — how added? barcode? photo+AI? what is "location"?

### Cross-agent contracts
- How does `VehicleAgent` reference a tool in `ToolboxAgent`? ID? Name?
- What happens when a referenced tool gets deleted from the toolbox?
- Generally: how do cross-agent references stay consistent?

### Diagnostic loop (VehicleAgent's Think tools)
What tools does the model get? Sketch:
- read journal entries (filtered by date / project / keyword)
- search FSM sections by keyword
- list parts replaced
- append measurement to current diagnostic thread
- mark fact as ruled-in / ruled-out
- look up recent OBD snapshots
- check maintenance history
This tool surface basically defines what the diagnostician can DO.

### Frontend shape
- Open the app — what do you see first?
- Vehicle picker, last-project, dashboard?
- How do you navigate between vehicles?
- Diagnostic chat — full-screen mode, or panel beside the project?
- Phone vs ultrawide layout differences?

### Minority Report UX
- State continuity is automatic. But what about the *active gesture*?
- Do you want to "send" something to phone (literal hand gesture)?
- Or do you just want it to be already there when you pick up the phone?
- Different experiences.

### Auth
- v1 used Cloudflare Access at the edge. Still right? Or different now?

### FSM crawler
- Does v2 even need crawling, or upload-only?
- If crawling: it's an `AgentWorkflow` job. What sources? What format?

### Misc
- OBD/alignment are "planned" in v1 — do we design now or stub?
- Recent-activity feed — does it deserve its own design pass?

## What we're doing first

Build a tiny working interface where the `GarageAgent` says hi. Smallest possible thing
that proves the stack works end to end. Then start filling in the open questions one by
one as we build.
