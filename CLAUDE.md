# Claude Code Project Instructions

## Project: HomeReno-personal-guide

This repo is a personal home renovation knowledge base. It pairs with Claude Code for interactive planning.

### What this repo contains
- `Guides/` — HTML reference site (open `Guides/index.html` in browser)
- Each guide is a self-contained HTML page with embedded SVG diagrams
- `Guides/assets/style.css` — shared stylesheet (modify here to restyle all pages)

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
