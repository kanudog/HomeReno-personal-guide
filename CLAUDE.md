# Claude Code Project Instructions

## Project: HomeReno-personal-guide

This repo is a personal home renovation knowledge base + a parametric web app. It pairs with Claude Code for interactive planning.

### What this repo contains
- `Guides/` — HTML reference site (open `Guides/index.html` in browser)
- Each guide is a self-contained HTML page with embedded SVG diagrams
- `Guides/assets/style.css` — shared stylesheet (modify here to restyle all pages)
- `app/` — **HomeReno app** (Next.js 16 + Supabase, deployed at https://homereno-puce.vercel.app)

### The app (`app/`)
- Parametric framing designer: exact-dimension wall input → stud layout, rough openings, headers, cut lists, bin-packed shopping lists, nailing schedule, printable cut sheet, interactive 3D (r3f) with .glb/.obj/.scad export.
- **All lengths are integer sixteenths** (`Sixteenths` branded type in `app/src/lib/units`) — never floats. Metric is display-only.
- The framing engine is pure functions in `app/src/lib/modules/framing/engine/` with golden + invariant tests (`npm test` in `app/`). Data tables (RO tolerances, header sizing, nailing rules, prices, NC-Wake code notes) are editable constants in `data/`.
- New trade modules (electrical, plumbing, drop-ceiling) follow the same shape: pure engine + data tables + module folder under `src/lib/modules/`.
- Supabase project ref `owsuopmdjkrctohkfucm` (schema in `app/supabase/migrations/`); auth-gated `/projects` (proxy.ts), scratch designer at `/design` needs no login.
- Dev: `npm run dev` in `app/` (predev syncs `Guides/` → `public/guides/`). Deploy: `npx vercel build --prod && npx vercel deploy --prebuilt --prod --yes` from `app/` (CLI is authenticated; local build includes the guides).
- Gotchas: Turbopack dev cache can serve stale CSS — `rm -rf .next` if styles don't update. Vercel env vars must be added `--no-sensitive` or `vercel env pull` redacts them to empty strings and breaks local prod builds.

### When working with Claude Code on this repo

**Adding guides from videos:**
- User provides a YouTube URL
- Extract transcript with `yt-dlp --write-auto-sub --skip-download`
- Pull exact dimensions, drill sizes, pipe/wire types, materials
- Generate SVG dimensional diagrams (floor plans, elevations, isometric views)
- Generate illustrative images via OpenArt MCP if available
- Save to `Guides/<category>/<guide-name>.html`
- Update `Guides/index.html` to link the new guide
- Follow the existing style conventions (see `bathroom-rough-in.html` as template)

**Interactive layout planning:**
- User describes a project (shelving, framing, drop ceiling, etc.)
- Generate cut lists, materials lists, cost estimates
- Create 3D models (Blender Python scripts, Three.js, or OpenSCAD)
- Cross-reference existing guides for relevant specs
- Save models to `models/` directory

**Style conventions:**
- All HTML pages use `../assets/style.css`
- SVG diagrams use the established color coding:
  - 🔴 Red (#ef4444) = Hot water
  - 🔵 Blue (#3b82f6) = Cold water
  - 🟢 Green (#10b981) = Drain/Waste
  - 🟣 Purple (#8b5cf6) = Vent
  - 🟠 Orange (#f59e0b) = Gas or warnings
- Tables use `<table-wrap>` div wrapper
- Callouts: `callout-info`, `callout-warn`, `callout-danger`, `callout-tip`, `callout-code`
- Steps use `.steps` container with `.step` children

### Categories
1. **Plumbing** — DWV systems, water supply, fixtures
2. **Electrical** — Wiring, outlets, panels, lighting
3. **Drop Ceiling** — Grid systems, tiles, LED integration
4. **Carpentry** — Framing, shelving, trim, structural
