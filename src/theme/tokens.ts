import type { SuperloreThemeTokens } from "superlore/runtime";

export const SCHEMES = [
  "latte",
  "frappe",
  "macchiato",
  "mocha",
  "darcula",
  "vscode",
  "adwaita",
] as const;
export type Scheme = (typeof SCHEMES)[number];

// The 14 named Catppuccin accent slots. Every scheme in schemes.css defines all 14 (approximated
// onto its own palette for non-Catppuccin schemes) so the accent grid works the same everywhere.
export const ACCENTS = [
  "rosewater",
  "flamingo",
  "pink",
  "mauve",
  "red",
  "maroon",
  "peach",
  "yellow",
  "green",
  "teal",
  "sky",
  "sapphire",
  "blue",
  "lavender",
] as const;
export type Accent = (typeof ACCENTS)[number];

export const SCHEME_LABELS: Record<Scheme, string> = {
  latte: "Latte",
  frappe: "Frappé",
  macchiato: "Macchiato",
  mocha: "Mocha",
  darcula: "Darcula",
  vscode: "VS Code",
  adwaita: "Adwaita",
};

const SCHEME_MODE: Record<Scheme, "light" | "dark"> = {
  latte: "light",
  frappe: "dark",
  macchiato: "dark",
  mocha: "dark",
  darcula: "dark",
  vscode: "dark",
  adwaita: "light",
};

export function schemeMode(scheme: Scheme): "light" | "dark" {
  return SCHEME_MODE[scheme];
}

/**
 * Static — every value is a `var(--app-*)` reference, so it never needs recomputing when the
 * scheme/accent changes. The CSS custom properties themselves (set in schemes.css, keyed off
 * `data-scheme`/`data-accent` on <html>) do the re-coloring. Matches the pattern from
 * /docs/render-in-your-app: "your app's existing light/dark switch re-colors the doc for free".
 */
export const SUPERLORE_TOKENS: SuperloreThemeTokens = {
  accent: "var(--app-accent)",
  accentHover: "var(--app-accent)",
  accentText: "var(--app-accent)",
  accentMuted: "var(--app-surface-hover)",
  accentBorder: "var(--app-accent)",
  accentInk: "var(--app-accent-ink)",
  // transparent, not var(--app-bg) — .page already paints the surface; a second background here
  // just draws a content-width box in a different shade behind the prose.
  background: "transparent",
  surface: "var(--app-surface)",
  surface2: "var(--app-surface-hover)",
  border: "var(--app-border)",
  borderSubtle: "var(--app-border-subtle)",
  text: "var(--app-text)",
  text2: "var(--app-text-muted)",
  text3: "var(--app-text-faint)",
  success: "var(--cs-green)",
  warning: "var(--cs-yellow)",
  danger: "var(--cs-red)",
  vars: { "--radius": "2px" },
};
