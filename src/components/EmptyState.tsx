import logo from "../assets/accordion.svg";
import type { RecentDoc } from "../hooks/useRecentDocs";
import { isDesktop } from "../lib/platform";

interface EmptyStateProps {
  onPickFile: () => void;
  error: string | null;
  recents: RecentDoc[];
  onOpenRecent: (doc: RecentDoc) => void;
}

export function EmptyState({ onPickFile, error, recents, onOpenRecent }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <img src={logo} alt="" className="empty-state-logo" />
      <h1>folklore</h1>
      <p>A viewer for superlore docs.</p>
      <button className="open-button" onClick={onPickFile}>
        Open a .superlore or .mdx file
      </button>
      <p className="empty-hint">
        {isDesktop() ? "Or drag a file onto this window." : "Or drop a file here."}
      </p>
      {error && <p className="page-status page-status-error">{error}</p>}
      {recents.length > 0 && (
        <div className="empty-state-recents">
          <h2>Recent</h2>
          <ul>
            {recents.map((r) => (
              <li key={r.path}>
                <button onClick={() => onOpenRecent(r)} title={r.path}>
                  {r.filename}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
