/**
 * Where a doc came from, for live-reload purposes. Desktop watches the real filesystem path;
 * the web has no push-based watch API for local files, so it polls a File System Access handle
 * (Chromium only — Firefox/Safari fall back to no live-reload, see `openFile.ts`).
 */
export type WatchSource =
  | { kind: "path"; path: string }
  | { kind: "handle"; handle: FileSystemFileHandle };

const POLL_INTERVAL_MS = 1000;

/** Starts watching `source`, calling `onChange` whenever the underlying file is modified. Returns a cleanup function. */
export function watchSource(source: WatchSource, onChange: () => void): () => void {
  if (source.kind === "path") {
    let unwatch: (() => void) | undefined;
    let cancelled = false;
    import("@tauri-apps/plugin-fs").then(({ watch }) =>
      // Debounced watch — one callback per burst of writes, regardless of event kind.
      watch(source.path, () => onChange(), { delayMs: 300 }).then((fn) => {
        if (cancelled) fn();
        else unwatch = fn;
      }),
    );
    return () => {
      cancelled = true;
      unwatch?.();
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
