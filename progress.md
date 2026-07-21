# Progress

## Done

- [x] Tauri + React + Vite + TS scaffold (default template)
- [x] `CLAUDE.md`, `progress.md`, `plans/` — project docs scaffolding
- [x] Deps: `superlore`, `fumadocs-core`, `fumadocs-ui`, `next-themes` (superlore's runtime peers), `fflate` (zip), `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-store`
- [x] Rust: `get_launch_path` (CLI-arg open) + `read_file_bytes` commands; dialog/store plugins registered; capabilities updated
- [x] Color scheme system (`src/theme/schemes.css`) — 7 schemes (Catppuccin Latte/Frappé/Macchiato/Mocha, Darcula, VS Code, Adwaita) + 14 accents as CSS vars on `<html data-scheme data-accent>`, global 2px radius override
- [x] `SUPERLORE_TOKENS` (`src/theme/tokens.ts`) — maps `SuperloreDoc`'s `tokens` prop onto `var(--app-*)`, so scheme/accent switches re-color the doc for free (no JS re-render)
- [x] `.superlore` bundle format + parser (`src/lib/superloreFile.ts`, zip via fflate: `doc.mdx` + `assets/` + `comments.json` + `meta.json`); plain `.mdx` passthrough
- [x] `rehypeResolveAssets` — rewrites `<img src="assets/...">` to blob URLs, passed via `SuperloreDoc`'s `rehypePlugins`
- [x] File acquisition: web picker/drag-drop, desktop dialog + native drag-drop + CLI-arg launch — all funnel through `openFile.ts`
- [x] `useSettings()` — scheme/accent, persisted via `localStorage` (web) / `@tauri-apps/plugin-store` (desktop)
- [x] `AppShell` layout: titlebar (with collapsible outline toggle) + `OutlineSidebar` (scanned from rendered `<h1-4>` DOM, not hand-parsed) + centered `Page` column wrapping `SuperloreDoc` (transparent bg, height fits content, no forced `min-height`)
- [x] `SettingsPanel` — scheme swatches (7) + accent grid (14)
- [x] Fixed white screen: superlore's Canvas component imports `next/dynamic.js` unconditionally (Canvas is lazy-loaded even in non-Next apps), which Vite treats as a missing optional peer dep and throws at runtime. Fixed with `vendor/next-shim` — a minimal local `next` package (`file:./vendor/next-shim` dependency) whose `dynamic.js`/`dynamic` exports are a `React.lazy` + `Suspense` equivalent, so Vite resolves it as a real installed package instead of special-casing it as missing.
- [x] Fixed doubled content-box artifact: `SuperloreDoc`'s `background` token now `transparent` (was `var(--app-bg)`), since `.page` alone should paint the surface
- [x] Verified: `tsc --noEmit` clean, `vite build` clean, `cargo check` clean, headless Playwright check (empty state renders; dropping a real `.mdx` renders content + outline sidebar picks up headings; all 7 schemes swap correctly; no console/page errors)
- [x] App icon/logo: `src/assets/accordion.svg` (svgrepo #396194) used as web favicon, titlebar + empty-state logo, and regenerated all Tauri desktop/iOS/Android icon sizes via `npx tauri icon`
- [x] Live-reload: doc view refreshes automatically when the source file changes on disk. Desktop via `@tauri-apps/plugin-fs` `watch()` (new `tauri-plugin-fs` dep + `fs:allow-watch`/`fs:allow-unwatch`/`fs:scope` capability); web via polling a `FileSystemFileHandle`'s `lastModified` (File System Access API — Chromium's `showOpenFilePicker` and `DataTransferItem.getAsFileSystemHandle()` on drag-drop; Firefox/Safari fall back to the old `<input>`/`DataTransfer.files` path with no live-reload). `src/lib/watchSource.ts` + `OpenedDoc.watch` in `src/lib/openFile.ts`.
- [x] Verified live-reload build: `tsc --noEmit` clean, `cargo check` clean, headless Playwright check of both the plain-`<input>` path and a simulated drag-drop (including the null-handle fallback case, which surfaced and got fixed — a `getAsFileSystemHandle()` resolving to `null` was throwing instead of falling back to the plain `File`)

## Next

- [ ] `pnpm tauri dev` smoke test (CLI-arg open: `tauri dev -- -- /path/to/file.mdx`, drag-drop, dialog, and now live-reload against a real filesystem watch)
- [ ] OS file-association registration (`tauri.conf.json` `bundle.fileAssociations`) so double-clicking `.superlore`/`.mdx` launches folklore directly, not just `folklore <path>` from a terminal
- [ ] Comments UI for `.superlore` bundles (parsed into `bundle.comments`, not yet rendered)
- [ ] Single-instance handling (`tauri-plugin-single-instance`) so a second `folklore <path>` launch reuses the open window instead of spawning a new one

## Plans

See `plans/0001-viewer-foundation.md` for the foundational architecture plan.
