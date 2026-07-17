# Handoff: Electrical Module for the HomeReno App

## ⚡ STATUS UPDATE 2026-07-16 (late) — phases 1–5 SHIPPED

A full session ran the scoping interview (5 rounds, decisions in the project memory file
`electrical-module-scope.md` and the approved plan) and built + verified + **deployed**:

1. **Engine wave 1+2** (`app/src/lib/modules/electrical/`): whole-circuit model
   (panel → breakers → circuits → devices), device catalog with per-config connection
   steps for ALL families (duplex/GFCI/half-hot, single-pole incl. 404.2(C) loops,
   3-way/4-way, dimmers, smart, fixtures/fans on lead splices, NEMA 240V), NEC 314.16
   box fill in quarter-in³, loads (125% continuous) + one-breaker-or-two advisor,
   Wake County validations (gauge/breaker, GFCI zones, NC-amended AFCI = bedrooms,
   laundry/bath dedicated, 210.52 spacing via RoomFacts, panel slots, 120/240 poles),
   schematic model, spool-packed shopping, verify-dead-first tasks. **129 electrical
   tests** (golden fixtures = mudroom laundry + printing-room advisor + coverage runs;
   catalog invariants: every conductor consumed exactly once, grounds always grounded,
   box always fits, wire nuts sized).
2. **Designer UI** at `/electrical` (scratch, localStorage) — pictorial in-box SVG w/
   step-synced highlighting (`PictorialBox` + `deviceGlyphs`), circuit schematic,
   forms (panel/rooms/circuits/devices/loads w/ presets), tabs (Connections/Steps/
   Load & Advisor/Shopping/Code Notes), live warnings banner, framed-wall box markers
   (`WallElevation markers` prop). Supabase: bound designs work module-aware
   (`module_id: "electrical"`), "+ Electrical design" button on projects.
3. **Troubleshoot wizard** at `/electrical/troubleshoot` — 36-node tree
   (`data/troubleshootTree.ts`), breadcrumb rewind, device-context field notes
   (saved onto DeviceInput.fieldNotes → shown on card + task detail).
4. **Print** at `/electrical/print` — schematic + per-device diagrams + steps +
   **panel directory label** (odd/even columns) + shopping. Wire colors are CSS
   tokens (`--wire-*`) remapped by `.print-sheet` so white wires get outlines on paper.
5. **Illustrations** in `app/public/steps/electrical/` (5 × 1400px JPEG, nano-banana-2
   2K, every image inspected; wirenut one regenerated once for a wrong terminal).

**UPDATE (2026-07-17): phases 6 + 7 also SHIPPED.**
Phase 6 (opt-in): `engine/wallRouting.ts` snaps device boxes against the nearest
mountable stud face, plans centered 3/4" bore holes through every crossed vertical
(cripples included), dedupes shared holes, warns on opening collisions (NEC 300.4
nail-plate note). Wall Routing panel renders per referenced wall — the framing
designer wall OR any room-planner wall (device wall selector) — with entry-side +
drill-height controls. Rooms panel gained "⤓ From planner" (RoomFacts from drawn
walls, door widths subtracted). All opt-in: renders only when devices are marked.
Phase 7: Low-Voltage Lab at `/electrical/low-voltage` — 16-component Class-2
catalog + 4 wired ESP32/ESPHome recipes (motion shop light, door sensor, WS2812
accent, relay-switched 12V load) with component diagrams, click-to-highlight wire
tables, power budgets vs the supply's 80% ceiling, parts lists (Amazon/AliExpress),
copyable ESPHome YAML. 243 tests total; everything deployed.

**Still excluded by scope choice:** 3D for electrical, tracking hooks,
panel-audit walkthrough, mains-switching relay recipes (deliberate — separate
project with enclosure/separation rules). Possible future: LV recipes as saved
designs, cable-length estimation from routed walls into shopping, more recipes.

**Gotchas added this session:** browser-pane screenshots only capture at scrollY 0
(verify below-the-fold via `get_page_text`/JS); React batching means JS-driven UI
walks need one click per tick (async IIFE + ~120ms sleeps); zod v4 `.default({})`
does NOT apply inner defaults (spell the full object); commits are LOCAL — push when
Sebastian says so. Deploys of phases 3/5 are live on homereno-puce.vercel.app.

---

*Original scoping handoff below (historical — the interview + plan happened).*

**Audience:** a fresh Claude Code session starting the ELECTRICAL trade module.
**Date:** 2026-07-16. **Author:** previous session (built the app + framing module end-to-end).

---

## 1. Where things stand

- **Live app:** https://homereno-puce.vercel.app (Vercel project `homereno`, CLI authenticated on this Mac).
- **Repo:** this repo, pushed to `github.com/kanudog/HomeReno-personal-guide`. App lives in `app/` (Next.js 16 App Router + React 19 + TS strict + Tailwind v4). The old static guide site (`Guides/`) is served at `/guides/` via a predev/prebuild copy script.
- **Supabase:** project ref `owsuopmdjkrctohkfucm` (us-east-1). Tables: projects, designs (module_id + input JSONB + output_cache), tasks, journal_entries, photos, receipts, material_estimates/actuals + variance view. RLS everywhere. Migrations in `app/supabase/migrations/`, applied via the Supabase MCP.
- **Done and battle-tested:** the FRAMING module — parametric wall designer (`/design`), room planner (`/rooms`), 3D with fasteners + exports, print cut sheets, per-step illustrated instructions with inline code notes, tracking (tasks/journal/budget/material variance).
- **Deploy:** from `app/`: `npx vercel build --prod && npx vercel deploy --prebuilt --prod --yes` (build locally — the guides copy needs `../Guides`). Tests: `npm test` in `app/` (43 passing).

## 2. Architecture contracts the electrical module MUST follow

The framing module is the reference implementation — mirror its shape:

- **Pure engine, data-table driven.** `app/src/lib/modules/framing/` = `engine/` (pure functions, zero IO), `data/` (editable typed constants: tolerances, sizing tables, prices, code notes), `types.ts`, `fixtures/` (golden test walls), `index.ts` (zod input schema + `compute*()` pipeline). Electrical goes in `app/src/lib/modules/electrical/` with the same layout. Every computation deterministic and unit-tested (golden + invariant tests in vitest; see `engine/engine.test.ts`).
- **All lengths are integer sixteenths** (`Sixteenths` branded type from `app/src/lib/units`) — never floats. Metric is display-only. Electrical will also need non-length quantities (AWG, amps, volts, box volume in cubic inches) — keep those as their natural units but stay integer/exact where possible (box fill uses 0.25 in³ increments; use quarters or hundredths as integers).
- **Designs persist as `{ module_id, input JSONB }`** in Supabase `designs` — the electrical input type gets a zod schema with `.default()`s so old rows stay parseable (see `wallInputSchema`).
- **UI building blocks to reuse, not rebuild:** `TapeMeasureInput` (fraction-native lengths), `UnitToggle`, `OutputTabs` pattern (tabs of cut-list-style tables + steps with images + code notes), `ShoppingList` (editable costs + HD/Lowe's links + overrides in a store), print via `/print` routes + `.print-sheet` CSS variable remap (white paper), blueprint theme tokens in `app/src/app/globals.css`.
- **Code notes** live in `data/codeNotes.ts` keyed `{ jurisdiction: "us-nc-wake", trade, kind }` — electrical notes reference the **NEC as adopted by NC** (NC Electrical Code) + Wake County/Raleigh permitting (NC homeowner exemption allows DIY electrical on your own residence WITH permits + inspection — say so in the notes).
- **Tasks/steps:** `generateTasks()` returns ordered `AssemblyTask`s with `codeNoteIds` and optional step illustrations. Illustration lesson learned: generate with **OpenArt `nano-banana-2` at 2K**, diagram-style prompts (explicit geometry, "wires/screws only at labeled points", arrows for actions, NO people/hands/tools), then **visually inspect every image (Read the file) before shipping**; downscale to 1400px JPEG via `sips`. The lite model produced garbage.
- **Colors:** blueprint theme (deep blue paper, light linework, orange accents). Electrical needs its own semantic wire palette — suggested: black `#2b2b2b`/outlined = hot, white `#e8f2fc` = neutral, green `#10b981` = ground, red `#ef4444` = switched/traveler (and note the repo-wide SVG color convention in root `CLAUDE.md` reserves some of these for plumbing — scope electrical colors to its own components).

## 3. What the electrical module was envisioned to be (from the original scoping)

Sebastian's own words from the app's inception: *"if i want to install a new power outlet on a wall — the app creates a wiring diagram for the specific outlet i plan on using. it asks things like wire colors, readings on multimeter to figure out which is live and neutral, etc, how far it is from the wall, and anything else relevant."*

Planned capability sketch (NOT yet validated in detail — that's this session's job):
- **Device-specific wiring diagrams:** pick the exact device (single-pole switch, 3-way, 4-way, duplex receptacle, GFCI, AFCI, split/switched receptacle, 240V range/dryer, ceiling fixture/fan) → terminal-by-terminal diagram with wire colors, pigtails, wire nut counts.
- **Guided multimeter troubleshooting:** interactive decision tree — "black probe on ground, red on brass terminal — what do you read?" → identifies hot/neutral/miswiring/open grounds. (Deterministic decision-tree data, not AI.)
- **Calculators:** box fill (NEC 314.16 — conductor counts × volume allowances vs box cubic inches), wire gauge + breaker sizing (15A/14AWG, 20A/12AWG, 30A/10AWG…), circuit load estimation, cable length estimation from room geometry.
- **NEC/NC compliance checks:** receptacle spacing (12' rule, 6' from openings), counter rules, GFCI zones (bath/kitchen/garage/exterior/laundry), AFCI requirements, tamper-resistant requirements, box height conventions (12" outlets / 48" switches — conventions, not code).
- **Possible integrations:** place boxes on the framing designer/room planner walls (stud positions are already known — drill/bore rules for studs, nail plates when holes < 1 1/4" from face); shopping list (wire /ft, boxes, devices, plates, staples, breakers); printable circuit sheets; panel/circuit directory tracking per project.

## 4. How to start the new session (IMPORTANT)

**Do NOT start coding.** Replicate the process that worked for the app itself:
1. Read this doc, root `CLAUDE.md`, `app/README.md`, and skim `app/src/lib/modules/framing/` (especially `types.ts`, `engine/layout.ts`, `index.ts`) to internalize the module pattern. Memory files in the project memory dir have decisions + gotchas.
2. Present a **preliminary brainstorm** of the electrical module (features, UX, integration options, risks).
3. Run **multiple rounds of AskUserQuestion** (~4 questions/round) to scope. Suggested areas:
   - Which capability ships FIRST and deep (wiring-diagram generator vs multimeter tree vs calculators vs circuit/panel mapper)?
   - Device catalog: which devices matter to Sebastian's actual upcoming projects? Smart switches? 3-way/4-way? 240V?
   - Diagram style: schematic (line diagram) vs pictorial (looks like the actual device/terminals) vs both; static SVG vs interactive.
   - Existing-wiring workflows: how much of the "what does your multimeter read" identification flow matters vs new-run planning?
   - Circuit context: model whole circuits (panel → runs → devices) or single-point installs first?
   - Integration: boxes placed on framing walls / room planner now or later? Cable routing through the actual stud layout (bore holes, nail plates)?
   - Safety/liability framing: how prominent should verify-dead / permit / inspection warnings be?
   - Outputs: shopping list depth, print sheets, tracking hooks, 3D?
4. Write the plan to the plan file, confirm with Sebastian (ExitPlanMode), then build in small verifiable phases (engine + golden tests first, UI second — same cadence as framing).

## 5. Gotchas that will bite you (learned the hard way)

- **Turbopack dev cache goes stale** (CSS/chunks): `rm -rf app/.next` and restart the dev server. NEVER `rm -rf .next` while the dev server is running.
- **Vercel env vars** on this team default to *sensitive* → `vercel env pull` writes empty strings that break local prod builds. Add with `--no-sensitive --value "..."`.
- Dev server via `.claude/launch.json` (`npm --prefix app run dev`); browser-pane screenshots can't capture WebGL (use the canvas→img overlay trick) and synthetic drags emit no pointer events (dispatch PointerEvents via JS to test canvas interactions).
- `@use-gesture` is incompatible with this stack (setPointerCapture crash) — hand-rolled Pointer Events in `WallCanvas.tsx` are the pattern; wrap `setPointerCapture` in try/catch.
- Sebastian's account/login: single-user Supabase auth; sign-ups may still be enabled — remind him to disable after first login if he hasn't.
