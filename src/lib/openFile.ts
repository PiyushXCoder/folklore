import { isDesktop } from "./platform";
import { bundleFromBytes, type SuperloreBundle } from "./superloreFile";
import type { WatchSource } from "./watchSource";

export interface OpenedDoc {
  filename: string;
  bundle: SuperloreBundle;
  /** Present when the doc came from a real file (path or handle) that can be watched for live-reload. */
  watch?: WatchSource;
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

/** No filesystem handle behind a plain `File` (e.g. an `<input type=file>` pick on Firefox/Safari) — no live-reload. */
export async function openFromFile(file: File): Promise<OpenedDoc> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { filename: file.name, bundle: bundleFromBytes(file.name, bytes) };
}

/** Web only (Chromium) — a `FileSystemFileHandle` from the File System Access API or a drag-drop item, watchable via polling. */
export async function openFromFileHandle(handle: FileSystemFileHandle): Promise<OpenedDoc> {
  const file = await handle.getFile();
  const bytes = new Uint8Array(await file.arrayBuffer());
  return {
    filename: file.name,
    bundle: bundleFromBytes(file.name, bytes),
    watch: { kind: "handle", handle },
  };
}

/** Web only (Chromium) — native file picker that returns a watchable handle instead of a plain `File`. */
export async function openViaWebFilePicker(): Promise<OpenedDoc | null> {
  const showOpenFilePicker = (window as unknown as { showOpenFilePicker?: (options: unknown) => Promise<FileSystemFileHandle[]> }).showOpenFilePicker;
  if (!showOpenFilePicker) return null;
  try {
    const [handle] = await showOpenFilePicker({
      types: [{ description: "superlore", accept: { "application/octet-stream": [".superlore", ".mdx"] } }],
    });
    return openFromFileHandle(handle);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return null;
    throw e;
  }
}

/** Desktop only — reads a path via the `read_file_bytes` Tauri command (dialog pick, drag-drop, or CLI launch arg). */
export async function openFromPath(path: string): Promise<OpenedDoc> {
  const bytes = await readPathBytes(path);
  const filename = basename(path);
  return { filename, bundle: bundleFromBytes(filename, bytes), watch: { kind: "path", path } };
}

async function readPathBytes(path: string): Promise<Uint8Array> {
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  return new Uint8Array(bytes);
}

/** Native open dialog, desktop only. */
export async function openViaDialog(): Promise<OpenedDoc | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const path = await open({
    multiple: false,
    filters: [{ name: "superlore", extensions: ["superlore", "mdx"] }],
  });
  if (!path || Array.isArray(path)) return null;
  return openFromPath(path);
}

/** The path folklore was launched with (`folklore some.superlore`), consumed once. Desktop only. */
export async function getLaunchPath(): Promise<string | null> {
  if (!isDesktop()) return null;
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<string | null>("get_launch_path");
}

/** Re-reads `source` for live-reload, keeping the same `filename`. */
export async function reloadBundle(source: WatchSource, filename: string): Promise<SuperloreBundle> {
  const bytes =
    source.kind === "path" ? await readPathBytes(source.path) : new Uint8Array(await (await source.handle.getFile()).arrayBuffer());
  return bundleFromBytes(filename, bytes);
}
