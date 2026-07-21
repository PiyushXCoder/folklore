import { isDesktop } from "./platform";

const STORE_FILE = "settings.json";
const KEY = "settings";

async function tauriStore() {
  const { load } = await import("@tauri-apps/plugin-store");
  return load(STORE_FILE, { autoSave: true });
}

export async function loadJson<T>(fallback: T): Promise<T> {
  if (isDesktop()) {
    const store = await tauriStore();
    const value = await store.get<T>(KEY);
    return value ?? fallback;
  }
  const raw = localStorage.getItem(KEY);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

export async function saveJson<T>(value: T): Promise<void> {
  if (isDesktop()) {
    const store = await tauriStore();
    await store.set(KEY, value);
    return;
  }
  localStorage.setItem(KEY, JSON.stringify(value));
}
