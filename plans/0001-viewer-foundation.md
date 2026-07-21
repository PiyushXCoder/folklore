# Folklore — superlore Viewer (desktop + web)

## Context

Repo currently bare Tauri+React+Vite+TS scaffold (default template, unmodified). Goal: build "folklore" — a viewer app for [superlore](https://superlore.vercel.app) docs, mirroring the online Viewer (superlore.vercel.app/viewer) but as a real app: open `.superlore` bundle files or plain `.mdx` files and render them using the official `superlore` npm package (`SuperloreDoc` / `superlore/runtime`). Same codebase ships as a Tauri desktop app AND a plain web build (browser-only, no Tauri APIs).

Visual direction: layout modeled on MS Word — centered paginated content column + left outline sidebar, not a docs-site chrome. Design system: Catppuccin palette (latte/frappe/macchiato/mocha flavors + accent choice), flat `border-radius: 2px` everywhere (overrides superlore's own component radii via the `tokens`/CSS-var escape hatch documented on `/docs/render-in-your-app`). Settings page lets user change flavor/accent/light-dark at runtime, persisted (Tauri store plugin on desktop, localStorage on web, same settings UI/hook for both).

This is a first-cut plan for foundational scaffolding: task tracking files + app architecture + first milestone. Full feature build happens in follow-up implementation sessions, tracked via `progress.md`.

## Architecture decisions

- **Rendering**: use `superlore` package's `SuperloreDoc` (client component) + `superlore/runtime.css` — do not hand-roll MDX compilation. Re-skin via the documented `tokens` prop / `--kp-*` CSS vars (Catppuccin colors mapped onto `accent`, `surface`, `text`, `border`, etc.), not by fighting the stylesheet.
- **`.superlore` format** (undocumented upstream — this app defines it): a zip bundle containing `doc.mdx`, `assets/` (images referenced by the doc), `comments.json` (Viewer-style comment threads), `meta.json` (title, created/modified, source path). Parse with a zip lib (`fflate` or similar, works in both web + Tauri webview) into an in-memory `{ mdx, assets: Map<name, blob-url>, comments, meta }` shape. Plain `.mdx` files load directly as source string, no comments/assets.
- **Two runtime targets from one codebase**:
  - Web: file picker (`<input type=file>`) + drag-drop. No filesystem access beyond what's dropped/picked.
  - Desktop (Tauri): native open dialog (`@tauri-apps/plugin-dialog`), drag-drop onto window, **and CLI-arg opening** (register `.superlore`/`.mdx` as args so `folklore some.superlore` / OS "Open with" launches straight into that doc) via Tauri's single-instance + arg-parsing (`tauri-plugin-cli` or reading `std::env::args()` in `lib.rs` `run()` and emitting an event to frontend on startup).
  - A small platform-detection hook (`useIsDesktop` checking `window.__TAURI_INTERNALS__`) branches only the file-acquisition layer; the rendering/settings/layout code is shared.
- **Layout**: `AppShell` = top titlebar (filename, open button) + left `OutlineSidebar` (derived from doc headings, same heading list `superlore/runtime`'s `useSuperloreMdx` frontmatter/headings expose) + centered `Page` column (fixed max-width, page-like padding/shadow, mimicking Word) wrapping `<SuperloreDoc>`.
- **Settings page**: route/panel with flavor picker (Latte/Frappé/Macchiato/Mocha) + accent color swatch grid (Catppuccin's named accents) + light/dark toggle (flavor implies base lightness but allow override). Persisted via a small storage adapter: `localStorage` always works; on desktop, mirror through `@tauri-apps/plugin-store` so it survives app-data dir properly. One `useSettings()` hook, storage backend swapped by platform check.
- **Design tokens**: define Catppuccin flavors as CSS custom property sets (values from the published Catppuccin palette) in a `theme.css`, applied via `data-flavor`/`data-theme` attributes on root — same pattern superlore's own runtime uses (`data-theme` on container). Global `border-radius: 2px` via a single CSS rule (`* { border-radius: 2px }` scoped appropriately, or a design-token `--radius: 2px` threaded through overridable components) — apply this after importing `superlore/runtime.css` so it wins the cascade.

## Files touched (this pass)

- `CLAUDE.md` (repo root)
- `progress.md` (repo root)
- `plans/0001-viewer-foundation.md` (this file)
- No code changes yet — implementation is a separate follow-up pass.

## Verification

- `CLAUDE.md` and `progress.md` render sensibly as markdown, no broken links.
- `plans/` directory exists with this seed plan file.
- Confirm with user before starting actual code implementation (package installs: `superlore`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-store`, zip lib; Tauri capability updates for dialog/store/CLI-args).
