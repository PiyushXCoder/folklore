import logo from "../assets/accordion.svg";
import { isDesktop } from "../lib/platform";

interface EmptyStateProps {
  onPickFile: () => void;
  error: string | null;
}

export function EmptyState({ onPickFile, error }: EmptyStateProps) {
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
    </div>
  );
}
