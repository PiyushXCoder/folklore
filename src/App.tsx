import { useCallback, useEffect, useRef, useState } from "react";
import logo from "./assets/accordion.svg";
import { EmptyState } from "./components/EmptyState";
import { OutlineSidebar } from "./components/OutlineSidebar";
import type { Heading } from "./components/PageViewer";
import { PageViewer } from "./components/PageViewer";
import { SettingsPanel } from "./components/SettingsPanel";
import { useSettings } from "./hooks/useSettings";
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

type View = "doc" | "settings";

function App() {
  const { settings, setSettings, ready } = useSettings();
  const [doc, setDoc] = useState<OpenedDoc | null>(null);
  const [outline, setOutline] = useState<Heading[]>([]);
  const [view, setView] = useState<View>("doc");
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (promise: Promise<OpenedDoc | null>) => {
    try {
      const opened = await promise;
      if (opened) {
        setDoc(opened);
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

      <header className="title-bar">
        <div className="title-bar-left">
          {view === "doc" && outline.length > 0 && (
            <button
              className="sidebar-toggle"
              title={sidebarCollapsed ? "Show outline" : "Hide outline"}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              ☰
            </button>
          )}
          <img src={logo} alt="" className="title-bar-logo" />
          <span className="title-bar-filename">{doc?.filename ?? "folklore"}</span>
        </div>
        <div className="title-bar-actions">
          <button onClick={handlePickFile}>Open</button>
          <button onClick={() => setView(view === "settings" ? "doc" : "settings")}>
            {view === "settings" ? "Close settings" : "Settings"}
          </button>
        </div>
      </header>

      <div className="app-body">
        {view === "doc" && !sidebarCollapsed && <OutlineSidebar headings={outline} />}
        <main className="app-main">
          {view === "settings" ? (
            <SettingsPanel settings={settings} onChange={setSettings} />
          ) : doc ? (
            <PageViewer doc={doc} scheme={settings.scheme} onOutline={setOutline} />
          ) : (
            <EmptyState onPickFile={handlePickFile} error={error} />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
