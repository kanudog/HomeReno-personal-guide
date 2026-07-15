# HomeReno — Personal Guide

A personal home renovation knowledge base with precise dimensional diagrams, materials lists, and step-by-step instructions. Designed to pair with [Claude Code](https://docs.anthropic.com/en/docs/claude-code) for interactive 3D layout planning.

## 📁 Structure

```
Guides/
├── index.html                    # Hub page — categories + navigation
├── assets/
│   ├── style.css                 # Shared professional stylesheet
│   └── images/                   # AI-generated illustrations + diagrams
├── plumbing/                     # Plumbing guides
│   └── bathroom-rough-in.html    # Complete bathroom DWV + supply rough-in
├── electrical/                   # (coming soon)
├── drop-ceiling/                 # (coming soon)
└── carpentry/                    # (coming soon)
```

## 🎯 Purpose

1. **Reference during work** — pull up on phone/tablet while doing actual renovations
2. **Claude Code companion** — use as project context for interactive layout tools (framing planners, shelf calculators, 3D model generators)
3. **Growing library** — add new guides by sending video links; specs get extracted and formatted automatically

## 📋 Current Guides

| Category | Guide | Source |
|----------|-------|--------|
| Plumbing | [Bathroom Rough-In](Guides/plumbing/bathroom-rough-in.html) | [YouTube: How To Plumb A Bathroom In 20 Minutes](https://www.youtube.com/watch?v=Jt0VfS6xw2U) + [Hammerpedia](https://www.hammerpedia.com/how-to-plumb-a-bathroom/) |

## 🔧 Using with Claude Code

Open this repo in Claude Code to:
- **Plan layouts** — "Help me plan a 7-foot shelving unit for the garage, generate a cut list and 3D model"
- **Calculate materials** — "How many 2x4s do I need for a 12×8 drop ceiling grid?"
- **Generate 3D models** — "Create a Blender/Three.js model of this bathroom framing layout"
- **Cross-reference guides** — "Check the plumbing guide — what diameter hole do I drill for the shower drain?"

## 📝 Adding New Guides

Send a YouTube video URL or article link. Each new guide will include:
- Exact dimensions (drill sizes, pipe/wire sizes, spacing from walls)
- Custom SVG dimensional diagrams
- Materials & tools checklist with costs
- Numbered step-by-step instructions
- Pro tips and code-compliance notes
- AI-generated illustrative imagery

---

*Last updated: July 15, 2025*
