import { useEffect, useState } from "react";
import { loadJson, saveJson } from "../lib/storage";
import { type Accent, type Scheme } from "../theme/tokens";

export interface Settings {
  scheme: Scheme;
  accent: Accent;
}

const DEFAULT_SETTINGS: Settings = { scheme: "mocha", accent: "mauve" };

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadJson(DEFAULT_SETTINGS).then((loaded) => {
      setSettings(loaded);
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
