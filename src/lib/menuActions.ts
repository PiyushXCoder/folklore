import { isDesktop } from "./platform";

export function openExternal(url: string) {
  if (isDesktop()) {
    import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url));
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export type MenuActionId =
  | "open"
  | "home"
  | "exit"
  | "find"
  | "metadata"
  | "sidebar"
  | "settings"
  | "about"
  | "repo"
  | "report-issue";

export interface MenuAction {
  id: MenuActionId;
  label: string;
  section: "file" | "view" | "help";
  accelerator?: string;
  kind: "normal" | "checkbox";
  enabled: boolean;
  checked?: boolean;
  run: () => void;
}

export const REPO_URL = "https://github.com/PiyushXCoder/folklore";
export const ISSUES_URL = "https://github.com/PiyushXCoder/folklore/issues";

interface MenuActionsContext {
  doc: unknown;
  view: "doc" | "settings" | "metadata";
  sidebarCollapsed: boolean;
  outlineLength: number;
  handlePickFile: () => void;
  setSearchOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  setView: (v: "doc" | "settings" | "metadata") => void;
  setSidebarCollapsed: (v: (c: boolean) => boolean) => void;
  openAbout: () => void;
  openRepo: () => void;
  openReportIssue: () => void;
  goHome: () => void;
  exitApp: () => void;
}

export function buildMenuActions(ctx: MenuActionsContext): MenuAction[] {
  return [
    {
      id: "open",
      label: "Open…",
      section: "file",
      kind: "normal",
      accelerator: "CmdOrCtrl+O",
      enabled: true,
      run: ctx.handlePickFile,
    },
    {
      id: "home",
      label: "Home",
      section: "file",
      kind: "normal",
      enabled: Boolean(ctx.doc),
      run: ctx.goHome,
    },
    {
      id: "exit",
      label: "Exit",
      section: "file",
      kind: "normal",
      enabled: true,
      run: ctx.exitApp,
    },
    {
      id: "sidebar",
      label: "Toggle Sidebar",
      section: "view",
      kind: "checkbox",
      accelerator: "CmdOrCtrl+B",
      enabled: ctx.view === "doc" && ctx.outlineLength > 0,
      checked: !ctx.sidebarCollapsed,
      run: () => ctx.setSidebarCollapsed((c) => !c),
    },
    {
      id: "find",
      label: "Find",
      section: "view",
      kind: "normal",
      accelerator: "CmdOrCtrl+F",
      enabled: Boolean(ctx.doc) && ctx.view === "doc",
      run: () => ctx.setSearchOpen(true),
    },
    {
      id: "metadata",
      label: "Metadata",
      section: "view",
      kind: "normal",
      enabled: Boolean(ctx.doc),
      run: () => ctx.setView("metadata"),
    },
    {
      id: "settings",
      label: "Settings",
      section: "view",
      kind: "normal",
      enabled: true,
      run: () => ctx.setView("settings"),
    },
    {
      id: "about",
      label: "About",
      section: "help",
      kind: "normal",
      enabled: true,
      run: ctx.openAbout,
    },
    {
      id: "repo",
      label: "Repository",
      section: "help",
      kind: "normal",
      enabled: true,
      run: ctx.openRepo,
    },
    {
      id: "report-issue",
      label: "Report Issue",
      section: "help",
      kind: "normal",
      enabled: true,
      run: ctx.openReportIssue,
    },
  ];
}
