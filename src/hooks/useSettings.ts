import { useEffect, useState } from "react";
import { loadJson, saveJson } from "../lib/storage";
import { type Accent, type Scheme } from "../theme/tokens";

export interface Settings {
  scheme: Scheme;
  accent: Accent;
  zoom: number;
}

const DEFAULT_SETTINGS: Settings = { scheme: "mocha", accent: "mauve", zoom: 100 };

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Merge over defaults — backfills fields (like `zoom`) missing from settings saved by an older version.
    loadJson(DEFAULT_SETTINGS).then((loaded) => {
      setSettings({ ...DEFAULT_SETTINGS, ...loaded });
      setReady(true);
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.scheme = settings.scheme;
    document.documentElement.dataset.accent = settings.accent;
  }, [settings]);

  useEffect(() => {
    if (ready) saveJson(settings);
  }, [settings, ready]);

  return { settings, setSettings, ready };
}
