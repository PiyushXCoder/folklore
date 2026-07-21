import { isDesktop } from "./platform";
import { bundleFromBytes, type SuperloreBundle } from "./superloreFile";

export interface OpenedDoc {
  filename: string;
  bundle: SuperloreBundle;
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

export async function openFromFile(file: File): Promise<OpenedDoc> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return { filename: file.name, bundle: bundleFromBytes(file.name, bytes) };
}

/** Desktop only — reads a path via the `read_file_bytes` Tauri command (dialog pick, drag-drop, or CLI launch arg). */
export async function openFromPath(path: string): Promise<OpenedDoc> {
  const { invoke } = await import("@tauri-apps/api/core");
  const bytes = await invoke<number[]>("read_file_bytes", { path });
  const filename = basename(path);
  return { filename, bundle: bundleFromBytes(filename, new Uint8Array(bytes)) };
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
