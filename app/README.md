# HomeReno App

Parametric DIY renovation assistant. Next.js (App Router) + Supabase, tablet-first, blueprint aesthetic.

## Development

```bash
npm run dev      # syncs ../Guides → public/guides, starts dev server
npm test         # engine + units unit tests (vitest)
npm run build    # production build
```

## Deployment (Vercel)

**Important:** set the Vercel project **Root Directory to `app`** — the repo root contains the static guide library (`Guides/`), not the Next.js project. The `prebuild` script copies `../Guides` into `public/guides` so the original guide site is served at `/guides/`.

## Architecture notes

- All lengths app-wide are **integer sixteenths of an inch** (`Sixteenths` branded type in `src/lib/units`). No float lengths are ever stored or compared; metric is display-only conversion.
- Trade modules (framing, later electrical/plumbing/drop-ceiling) are pure-function engines under `src/lib/modules/`. `compute(input)` is deterministic and fully unit-tested; UI and persistence resolve modules through the registry.
- The in-app AI chat is intentionally stubbed (`/api/chat` returns 501). Configure a future OpenAI-compatible provider via `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` (see `src/lib/ai/provider.ts`).
