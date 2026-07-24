import { useCallback, useEffect, useState } from "react";
import { loadJson, saveJson } from "../lib/storage";

const KEY = "recentDocs";
const MAX_RECENTS = 10;

export interface RecentDoc {
  path: string;
  filename: string;
}

export function useRecentDocs() {
  const [recents, setRecents] = useState<RecentDoc[]>([]);

  useEffect(() => {
    loadJson<RecentDoc[]>([], KEY).then(setRecents);
  }, []);

  const record = useCallback((entry: RecentDoc) => {
    setRecents((prev) => {
      const next = [entry, ...prev.filter((r) => r.path !== entry.path)].slice(0, MAX_RECENTS);
      saveJson(next, KEY);
      return next;
    });
  }, []);

  return { recents, record };
}
