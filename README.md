# BCF Manager for Topomatic 360

Refactored plugin for Topomatic 360 / Albatros.

## What is inside

- import/export of BCFZIP with selectable BCF versions 2.0 / 2.1 / 3.0
- separate manager window and editor window in BIMcollab-like workflow
- Russian UI
- tree view with topics / viewpoints / comments
- manifest aligned with Albatros actions / menu / pages / views / statusbar

## Project structure

- `src/commands` — command handlers
- `src/providers` — treeview providers
- `src/application` — use cases
- `src/bcf` — BCF import/export engine
- `src/topomatic` — Topomatic host adapter
- `src/ui` — dialogs
- `src/domain` — models and contracts

## Build on Windows

```powershell
npm install
npm run typecheck
npm run build
npm run serve
```

## Install

Build output is generated into `dist/` and can be published to GitHub Pages or packed as APX.
