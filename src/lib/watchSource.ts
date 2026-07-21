/**
 * Where a doc came from, for live-reload purposes. Desktop watches the real filesystem path;
 * the web has no push-based watch API for local files, so it polls a File System Access handle
 * (Chromium only — Firefox/Safari fall back to no live-reload, see `openFile.ts`).
 */
export type WatchSource =
  | { kind: "path"; path: string }
  | { kind: "handle"; handle: FileSystemFileHandle };

const POLL_INTERVAL_MS = 1000;
const DEBOUNCE_MS = 200;

/** Starts watching `source`, calling `onChange` whenever the underlying file is modified. Returns a cleanup function. */
export function watchSource(source: WatchSource, onChange: () => void): () => void {
  if (source.kind === "path") {
    let cancelled = false;
    let watchId: number | undefined;
    let unlisten: (() => void) | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;

    Promise.all([import("@tauri-apps/api/core"), import("@tauri-apps/api/event")]).then(
      async ([{ invoke }, { listen }]) => {
        if (cancelled) return;
        const id = await invoke<number>("watch_path", { path: source.path });
        if (cancelled) {
          invoke("unwatch_path", { id });
          return;
        }
        watchId = id;
        // notify fires multiple modify events per save (write + metadata) — debounce to one reload.
        unlisten = await listen(`file-changed:${id}`, () => {
          clearTimeout(debounce);
          debounce = setTimeout(onChange, DEBOUNCE_MS);
        });
      },
    );

    return () => {
      cancelled = true;
      clearTimeout(debounce);
      unlisten?.();
      if (watchId !== undefined) {
        import("@tauri-apps/api/core").then(({ invoke }) => invoke("unwatch_path", { id: watchId }));
      }
    };
  }

  let lastModified: number | null = null;
  const interval = setInterval(async () => {
    try {
      const file = await source.handle.getFile();
      if (lastModified !== null && file.lastModified !== lastModified) onChange();
      lastModified = file.lastModified;
    } catch {
      // handle likely invalidated (file deleted/moved/permission revoked) — just skip this tick
    }
  }, POLL_INTERVAL_MS);
  return () => clearInterval(interval);
}
