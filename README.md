<p align="center">
  <img src="src/assets/banner.png" alt="folklore — a doc viewer for superlore files" />
</p>

<h1 align="center">
  <img src="src/assets/accordion.svg" width="28" alt="" align="center" />
  folklore
</h1>

<p align="center">A viewer for <a href="https://superlore.vercel.app">superlore</a> docs — desktop app and web app, one codebase.</p>

## What is superlore?

[superlore](https://superlore.vercel.app) is a content model for docs that are readable by both humans and AI agents from the same source. A superlore doc is MDX plus a typed frontmatter schema and a library of "dual-representation" components — cards, timelines, boards, entity cards, tables, and an interactive Canvas — each of which renders a polished page for people *and* serializes to a typed knowledge graph an agent can query over MCP. One file, two audiences, never out of sync.

The atom of superlore is a single `.mdx` file: no project, no deploy, no build step required to read one.

## What is folklore?

folklore is that reading experience, taken out of the browser. Open a `.superlore` bundle or a plain `.mdx` file and it renders using superlore's own official runtime — the exact same components, Canvas, and syntax highlighting as the hosted docs site and the [online Viewer](https://superlore.vercel.app/viewer) — just running natively, with your own files, in a window instead of a tab.

## Features

- **Open `.superlore` bundles and plain `.mdx` files.** A `.superlore` file is a zip bundle — the doc, its images, comment threads, and metadata all in one — for when a doc needs to travel with its assets. A bare `.mdx` just opens straight up.
- **Live-reload.** Edit the file in your own editor and the view updates automatically — no manual refresh, no re-opening. Works on both desktop (a real filesystem watch) and the web (polling a File System Access handle in Chromium-based browsers).
- **Desktop and web from one codebase.** Ships as a native Tauri app (Linux/macOS/Windows) with a native open dialog, drag-and-drop, and "open with" / CLI launching — or as a plain static web app you can host anywhere, with the same file picker and drag-and-drop experience in the browser.
- **Word-style reading layout.** A centered, paginated content column with a left-hand outline sidebar (built from the doc's own headings) — closer to a document than a docs-site sidebar-and-hero layout.
- **7 color schemes, 14 accents.** Catppuccin's four flavors (Latte, Frappé, Macchiato, Mocha) plus Darcula, VS Code, and Adwaita, each with the full accent palette — switch live from Settings, no restart.
- **A flat, consistent design language.** 2px border radius everywhere in the app's own chrome, while still letting superlore's Canvas diagrams render their real shapes (circles, diamonds, pills) undistorted.

## Getting started

```bash
pnpm install

# web dev server
pnpm dev

# desktop dev (wraps the same dev server in a native window)
pnpm tauri dev
```

### Building

```bash
# web — static output in dist/
pnpm build

# desktop installer for your current OS
pnpm tauri build
```

> **Linux AppImage note:** if bundling fails with `failed to run linuxdeploy`, run with `NO_STRIP=1 pnpm tauri build`. linuxdeploy's bundled `strip` can't parse the ELF `.relr.dyn` section some modern system libraries emit — this skips its (redundant) strip pass. See `CLAUDE.md` for details.

### Releasing

Pushing a `v*.*.*` tag (or running the *Release* workflow manually from the Actions tab) builds installers for Linux, macOS (Intel + Apple Silicon), and Windows, and publishes them as a draft GitHub Release, and separately deploys the web build to GitHub Pages.

## Project layout

See `CLAUDE.md` for the full architecture rundown, and `progress.md` for a running log of what's built and what's next.

## License

MIT © [Piyush Raj](mailto:piyushxcoder@gamil.com) — see [LICENSE](LICENSE).
