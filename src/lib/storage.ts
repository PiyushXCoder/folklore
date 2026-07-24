import { isDesktop } from "./platform";

const STORE_FILE = "settings.json";
const DEFAULT_KEY = "settings";

async function tauriStore() {
  const { load } = await import("@tauri-apps/plugin-store");
  return load(STORE_FILE, { autoSave: true });
}

export async function loadJson<T>(fallback: T, key: string = DEFAULT_KEY): Promise<T> {
  if (isDesktop()) {
    const store = await tauriStore();
    const value = await store.get<T>(key);
    return value ?? fallback;
  }
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : fallback;
}

export async function saveJson<T>(value: T, key: string = DEFAULT_KEY): Promise<void> {
  if (isDesktop()) {
    const store = await tauriStore();
    await store.set(key, value);
    return;
  }
  localStorage.setItem(key, JSON.stringify(value));
}
