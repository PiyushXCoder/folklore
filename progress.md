# Progress

## Done

- [x] Tauri + React + Vite + TS scaffold (default template)
- [x] `CLAUDE.md`, `progress.md`, `plans/` — project docs scaffolding
- [x] Deps: `superlore`, `fumadocs-core`, `fumadocs-ui`, `next-themes` (superlore's runtime peers), `fflate` (zip), `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-store`
- [x] Rust: `get_launch_path` (CLI-arg open) + `read_file_bytes` commands; dialog/store plugins registered; capabilities updated
- [x] Catppuccin theme (`src/theme/catppuccin.css`) — 4 flavors + 14 accents as CSS vars on `<html data-flavor data-accent>`, global 2px radius override
- [x] `SUPERLORE_TOKENS` (`src/theme/tokens.ts`) — maps `SuperloreDoc`'s `tokens` prop onto `var(--app-*)`, so flavor/accent switches re-color the doc for free (no JS re-render)
- [x] `.superlore` bundle format + parser (`src/lib/superloreFile.ts`, zip via fflate: `doc.mdx` + `assets/` + `comments.json` + `meta.json`); plain `.mdx` passthrough
- [x] `rehypeResolveAssets` — rewrites `<img src="assets/...">` to blob URLs, passed via `SuperloreDoc`'s `rehypePlugins`
- [x] File acquisition: web picker/drag-drop, desktop dialog + native drag-drop + CLI-arg launch — all funnel through `openFile.ts`
- [x] `useSettings()` — flavor/accent, persisted via `localStorage` (web) / `@tauri-apps/plugin-store` (desktop)
- [x] `AppShell` layout: titlebar + `OutlineSidebar` (scanned from rendered `<h1-4>` DOM, not hand-parsed) + centered `Page` column wrapping `SuperloreDoc`
- [x] `SettingsPanel` — flavor swatches + accent grid
- [x] Fixed white screen: superlore's Canvas component imports `next/dynamic.js` unconditionally (Canvas is lazy-loaded even in non-Next apps), which Vite treats as a missing optional peer dep and throws at runtime. Fixed with `vendor/next-shim` — a minimal local `next` package (`file:./vendor/next-shim` dependency) whose `dynamic.js`/`dynamic` exports are a `React.lazy` + `Suspense` equivalent, so Vite resolves it as a real installed package instead of special-casing it as missing.
- [x] Verified: `tsc --noEmit` clean, `vite build` clean, `cargo check` clean, headless Playwright check (empty state renders; dropping a real `.mdx` renders content + outline sidebar picks up headings, no console/page errors)

## Next

- [ ] `pnpm tauri dev` smoke test (CLI-arg open: `tauri dev -- -- /path/to/file.mdx`, drag-drop, dialog)
- [ ] OS file-association registration (`tauri.conf.json` `bundle.fileAssociations`) so double-clicking `.superlore`/`.mdx` launches folklore directly, not just `folklore <path>` from a terminal
- [ ] Comments UI for `.superlore` bundles (parsed into `bundle.comments`, not yet rendered)
- [ ] Single-instance handling (`tauri-plugin-single-instance`) so a second `folklore <path>` launch reuses the open window instead of spawning a new one

## Plans

See `plans/0001-viewer-foundation.md` for the foundational architecture plan.
