import { useEffect, useState } from "react";
import { loadJson, saveJson } from "../lib/storage";
import { type Accent, type Flavor } from "../theme/tokens";

export interface Settings {
  flavor: Flavor;
  accent: Accent;
}

const DEFAULT_SETTINGS: Settings = { flavor: "mocha", accent: "mauve" };

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
    document.documentElement.dataset.flavor = settings.flavor;
    document.documentElement.dataset.accent = settings.accent;
  }, [settings]);

  useEffect(() => {
    if (ready) saveJson(settings);
  }, [settings, ready]);

  return { settings, setSettings, ready };
}
