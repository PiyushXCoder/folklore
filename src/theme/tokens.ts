import type { SuperloreThemeTokens } from "superlore/runtime";

export const FLAVORS = ["latte", "frappe", "macchiato", "mocha"] as const;
export type Flavor = (typeof FLAVORS)[number];

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

export const FLAVOR_LABELS: Record<Flavor, string> = {
  latte: "Latte",
  frappe: "Frappé",
  macchiato: "Macchiato",
  mocha: "Mocha",
};

/** Latte is Catppuccin's only light flavor; the other three are dark. */
export function flavorMode(flavor: Flavor): "light" | "dark" {
  return flavor === "latte" ? "light" : "dark";
}

/**
 * Static — every value is a `var(--app-*)` reference, so it never needs recomputing when the
 * flavor/accent changes. The CSS custom properties themselves (set in catppuccin.css, keyed off
 * `data-flavor`/`data-accent` on <html>) do the re-coloring. Matches the pattern from
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
  success: "var(--ctp-green)",
  warning: "var(--ctp-yellow)",
  danger: "var(--ctp-red)",
  vars: { "--radius": "2px" },
};
