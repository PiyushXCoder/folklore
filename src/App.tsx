import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import logo from "./assets/accordion.svg";
import { EmptyState } from "./components/EmptyState";
import { MenuBar } from "./components/MenuBar";
import { MetadataPanel } from "./components/MetadataPanel";
import { OutlineSidebar } from "./components/OutlineSidebar";
import type { Heading } from "./components/PageViewer";
import { PageViewer } from "./components/PageViewer";
import { SettingsPanel } from "./components/SettingsPanel";
import { useNativeMenu } from "./hooks/useNativeMenu";
import { useSettings } from "./hooks/useSettings";
import { ISSUES_URL, REPO_URL, buildMenuActions, openExternal } from "./lib/menuActions";
import {
  getLaunchPath,
  openFromFile,
  openFromFileHandle,
  openFromPath,
  openViaDialog,
  openViaWebFilePicker,
  reloadBundle,
  type OpenedDoc,
} from "./lib/openFile";
import { isDesktop } from "./lib/platform";
import { watchSource } from "./lib/watchSource";

type View = "doc" | "settings" | "metadata";

function App() {
  const { settings, setSettings, ready } = useSettings();
  const [doc, setDoc] = useState<OpenedDoc | null>(null);
  const [outline, setOutline] = useState<Heading[]>([]);
  const [frontmatter, setFrontmatter] = useState<Record<string, unknown>>({});
  const [view, setView] = useState<View>("doc");
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (promise: Promise<OpenedDoc | null>) => {
    try {
      const opened = await promise;
      if (opened) {
        setDoc(opened);
        setFrontmatter({});
        setError(null);
        setView("doc");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // CLI-arg launch (`folklore some.superlore` / OS "Open with") — desktop only.
  useEffect(() => {
    getLaunchPath().then((path) => {
      if (path) load(openFromPath(path));
    });
  }, [load]);

  // Desktop native drag-drop (Tauri webview event carries filesystem paths, not File objects).
  useEffect(() => {
    if (!isDesktop()) return;
    let unlisten: (() => void) | undefined;
    import("@tauri-apps/api/webview").then(({ getCurrentWebview }) => {
      getCurrentWebview()
        .onDragDropEvent((event) => {
          if (event.payload.type === "drop") {
            const path = event.payload.paths[0];
            if (path) load(openFromPath(path));
          }
        })
        .then((fn) => {
          unlisten = fn;
        });
    });
    return () => unlisten?.();
  }, [load]);

  // Live-reload: re-read and re-parse whenever the doc's source file changes on disk.
  useEffect(() => {
    if (!doc?.watch) return;
    const source = doc.watch;
    const filename = doc.filename;
    return watchSource(source, () => {
      reloadBundle(source, filename)
        .then((bundle) => setDoc((prev) => (prev && prev.filename === filename ? { ...prev, bundle } : prev)))
        .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    });
  }, [doc?.watch, doc?.filename]);

  // Close search on doc switch (not on live-reload, which keeps the same filename).
  useEffect(() => setSearchOpen(false), [doc?.filename]);

  // Keep the native window title in sync with the open doc, since the title-bar row
  // (which used to show the filename) is desktop-only-hidden in favor of the OS menu.
  useEffect(() => {
    if (!isDesktop()) return;
    import("@tauri-apps/api/window").then(({ getCurrentWindow }) => {
      getCurrentWindow().setTitle(doc?.filename ?? "folklore");
    });
  }, [doc?.filename]);

  const handleWebDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const item = e.dataTransfer.items?.[0];
      const file = e.dataTransfer.files[0];
      const getAsFileSystemHandle = (
        item as unknown as { getAsFileSystemHandle?: () => Promise<FileSystemHandle | null> } | undefined
      )?.getAsFileSystemHandle;

      if (getAsFileSystemHandle) {
        // Falls back to the plain File if the browser can't hand back a watchable handle here
        // (e.g. a synthetic drop, or a drag source that isn't backed by a real filesystem entry).
        load(
          getAsFileSystemHandle.call(item).then((handle) => {
            if (handle && handle.kind === "file") return openFromFileHandle(handle as FileSystemFileHandle);
            return file ? openFromFile(file) : null;
          }),
        );
        return;
      }
      if (file) load(openFromFile(file));
    },
    [load],
  );

  const handlePickFile = useCallback(() => {
    if (isDesktop()) {
      load(openViaDialog());
    } else if ("showOpenFilePicker" in window) {
      load(openViaWebFilePicker());
    } else {
      fileInputRef.current?.click();
    }
  }, [load]);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) load(openFromFile(file));
      e.target.value = "";
    },
    [load],
  );

  const goHome = useCallback(() => {
    setDoc(null);
    setView("doc");
    setFrontmatter({});
    setError(null);
    setOutline([]);
    setSearchOpen(false);
    setSidebarCollapsed(false);
  }, []);

  const exitApp = useCallback(() => {
    if (isDesktop()) {
      import("@tauri-apps/api/window").then(({ getCurrentWindow }) => getCurrentWindow().close());
    } else {
      window.close();
    }
  }, []);

  const headingIndexRef = useRef(0);
  const navigateHeading = useCallback(
    (direction: 1 | -1) => {
      if (outline.length === 0) return;
      headingIndexRef.current = Math.min(Math.max(headingIndexRef.current + direction, 0), outline.length - 1);
      document.getElementById(outline[headingIndexRef.current].id)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    },
    [outline],
  );

  // Global shortcuts: Ctrl/Cmd+F (find), Ctrl/Cmd+O (open), Ctrl/Cmd+B (toggle sidebar),
  // vim-style h/l (prev/next heading) and j/k (scroll) while reading a doc.
  useEffect(() => {
    function isEditableTarget(target: EventTarget | null) {
      return target instanceof HTMLElement && (target.tagName === "INPUT" || target.isContentEditable);
    }

    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        if (view === "doc" && doc) setSearchOpen(true);
        return;
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handlePickFile();
        return;
      }
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
        return;
      }
      if (mod || isEditableTarget(e.target) || view !== "doc" || !doc) return;
      switch (e.key) {
        case "j":
          document.querySelector(".app-main")?.scrollBy({ top: 120, behavior: "smooth" });
          break;
        case "k":
          document.querySelector(".app-main")?.scrollBy({ top: -120, behavior: "smooth" });
          break;
        case "h":
          navigateHeading(-1);
          break;
        case "l":
          navigateHeading(1);
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, doc, handlePickFile, navigateHeading]);

  const openAbout = useCallback(() => {
    if (isDesktop()) {
      import("@tauri-apps/api/webviewWindow").then(({ WebviewWindow }) => {
        WebviewWindow.getByLabel("about").then((existing) => {
          if (existing) {
            existing.setFocus();
            return;
          }
          new WebviewWindow("about", {
            url: "index.html?about=1",
            title: "About folklore",
            width: 360,
            height: 420,
            resizable: false,
          });
        });
      });
    } else {
      window.open("?about=1", "_blank", "width=360,height=420");
    }
  }, []);

  const menuActions = useMemo(
    () =>
      buildMenuActions({
        doc,
        view,
        sidebarCollapsed,
        outlineLength: outline.length,
        handlePickFile,
        setSearchOpen,
        setView,
        setSidebarCollapsed,
        openAbout,
        openRepo: () => openExternal(REPO_URL),
        openReportIssue: () => openExternal(ISSUES_URL),
        goHome,
        exitApp,
      }),
    [doc, view, sidebarCollapsed, outline.length, handlePickFile, openAbout, goHome, exitApp],
  );

  useNativeMenu(menuActions);

  if (!ready) return null;

  return (
    <div
      className="app-shell"
      onDragOver={(e) => e.preventDefault()}
      onDrop={isDesktop() ? undefined : handleWebDrop}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".superlore,.mdx"
        style={{ display: "none" }}
        onChange={handleFileInput}
      />

      {!isDesktop() && (
        <header className="title-bar">
          <MenuBar actions={menuActions} />
          <div className="title-bar-left">
            <img src={logo} alt="" className="title-bar-logo" />
            <span className="title-bar-filename">{doc?.filename ?? "folklore"}</span>
          </div>
        </header>
      )}

      <div className="app-body">
        {view === "doc" && !sidebarCollapsed && <OutlineSidebar headings={outline} />}
        <main className="app-main">
          {view === "settings" ? (
            <SettingsPanel settings={settings} onChange={setSettings} onBack={() => setView("doc")} />
          ) : view === "metadata" && doc ? (
            <MetadataPanel doc={doc} frontmatter={frontmatter} onBack={() => setView("doc")} />
          ) : doc ? (
            <PageViewer
              doc={doc}
              scheme={settings.scheme}
              onOutline={setOutline}
              onFrontmatter={setFrontmatter}
              searchOpen={searchOpen}
              onSearchClose={() => setSearchOpen(false)}
            />
          ) : (
            <EmptyState onPickFile={handlePickFile} error={error} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
