# folklore — superlore Viewer

Viewer app for [superlore](https://superlore.vercel.app) docs. Opens `.superlore` bundles and plain `.mdx` files, renders them with the official `superlore` package. Ships two ways from one codebase: Tauri desktop app + plain web build.

Progress log: `progress.md`. Feature plans: `plans/`.

## Stack

- Vite + React 19 + TypeScript, Tauri 2 (`src-tauri/`) for desktop.
- Rendering: `superlore` npm package (`SuperloreDoc`, `useSuperloreMdx`, `superlore/runtime.css`). Never hand-roll MDX compilation — same renderer as the docs site and the online Viewer.

## Commands

- `pnpm dev` — web dev server (Vite, port 1420)
- `pnpm tauri dev` — desktop dev (wraps the same Vite server)
- `pnpm build` — web production build (`tsc && vite build`)
- `pnpm tauri build` — desktop bundle

## Architecture

- **`.superlore` file** (format defined by this app, not upstream): zip bundle — `doc.mdx`, `assets/` (referenced images), `comments.json` (Viewer-style comment threads), `meta.json` (title, timestamps, source path). Unzipped client-side (`src/lib/superloreFile.ts`, via `fflate`) into `{ mdx, assets, comments, meta }`. Plain `.mdx` loads as a bare source string — no comments/assets.
- **Platform split**: one `isDesktop()` check (`src/lib/platform.ts`, tests `window.__TAURI_INTERNALS__`) branches only file acquisition (`src/lib/openFile.ts`) and settings storage (`src/lib/storage.ts`). Rendering, layout, and settings UI are shared code — no per-platform component forks.
  - Web: `<input type=file>` + drag-drop only.
  - Desktop: native open dialog (`@tauri-apps/plugin-dialog`), native drag-drop (`getCurrentWebview().onDragDropEvent`), and CLI-arg opening (`folklore path/to.superlore` / OS "Open with"). Rust side (`src-tauri/src/lib.rs`): `get_launch_path` command returns (and consumes) the launch arg captured at `run()` startup; `read_file_bytes` reads any path handed back by the dialog, drag-drop, or launch arg — both are plain `#[tauri::command]`s, not plugin commands, so they aren't gated by the capabilities ACL.
- **Layout**: MS-Word-style, not a docs-site chrome. `AppShell` (`src/App.tsx`) = titlebar (filename + open button) + left `OutlineSidebar` + centered `Page` column (fixed max-width, page-like padding/shadow) wrapping `<SuperloreDoc>`. The outline is scanned off the *rendered* `h1`–`h4` DOM inside the page (`src/components/PageViewer.tsx`, via `MutationObserver`), not hand-parsed from the MDX source — that way it always matches whatever ids `rehype-slug` actually assigned.
- **Settings**: flavor picker (Catppuccin Latte/Frappé/Macchiato/Mocha) + accent swatch, via one `useSettings()` hook (`src/hooks/useSettings.ts`). Light/dark isn't a separate toggle — Catppuccin's flavor already encodes it (Latte is the one light flavor; Frappé/Macchiato/Mocha are dark), so `flavorMode()` derives `SuperloreDoc`'s `theme` prop straight from the chosen flavor. Storage adapter: `localStorage` always; mirrored through `@tauri-apps/plugin-store` on desktop so it persists to the app-data dir.

## Design system

- Catppuccin palette only — no raw hex in components. Flavors + all 14 accents live as CSS custom properties in `src/theme/catppuccin.css`, applied via `data-flavor`/`data-accent` on `<html>` (matches superlore's own `data-theme`-on-container pattern).
- **`border-radius: 2px` everywhere**, no exceptions — one global rule in `catppuccin.css`, applied after `superlore/runtime.css` import so it wins the cascade.
- `SuperloreDoc` is re-skinned via its `tokens` prop (`src/theme/tokens.ts`'s `SUPERLORE_TOKENS`) — every value is a `var(--app-*)` reference, never a resolved color, so a flavor/accent change re-colors the doc for free with zero re-render logic (no branching on theme in JS).

## Gotchas

- **`vendor/next-shim`**: superlore's `Canvas` component (`superlore-canvas` fenced blocks) imports `next/dynamic.js` directly and unconditionally — even though `next` is an *optional* peer dep and this app has no Next.js. Vite's optional-peer-dep handling throws at runtime the moment that import is reached (a real white-screen cause, not a build-time error), and a plain `resolve.alias` doesn't intercept it — Vite's dep-optimizer special-cases "known-optional-and-not-installed" before alias resolution runs. Fix: `vendor/next-shim` is a real (tiny, local) `next` package — `"next": "file:./vendor/next-shim"` in `package.json` — whose `dynamic.js`/`dynamic` exports are a `React.lazy` + `Suspense` equivalent. Because it's a genuinely resolvable package, Vite treats it as normal and never engages the optional-peer-dep path. Don't remove this dependency without re-testing Canvas rendering.
