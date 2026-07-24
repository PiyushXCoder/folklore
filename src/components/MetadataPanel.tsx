import type { OpenedDoc } from "../lib/openFile";

interface MetadataPanelProps {
  doc: OpenedDoc;
  frontmatter: Record<string, unknown>;
  onBack: () => void;
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function KeyValueList({ entries }: { entries: [string, unknown][] }) {
  if (entries.length === 0) return <p className="metadata-empty">None</p>;
  return (
    <dl className="metadata-list">
      {entries.map(([key, value]) => (
        <div className="metadata-row" key={key}>
          <dt>{key}</dt>
          <dd>{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MetadataPanel({ doc, frontmatter, onBack }: MetadataPanelProps) {
  const isBundle = doc.filename.toLowerCase().endsWith(".superlore");

  return (
    <div className="metadata-panel">
      <button className="panel-back-button" onClick={onBack}>
        ← Back
      </button>
      <h1>Metadata</h1>

      <section>
        <h2>File</h2>
        <KeyValueList
          entries={[
            ["Filename", doc.filename],
            ["Type", isBundle ? ".superlore bundle" : "Plain .mdx"],
            ["Assets", doc.bundle.assets.size],
            ["Comments", doc.bundle.comments.length],
          ]}
        />
      </section>

      <section>
        <h2>Frontmatter</h2>
        <KeyValueList entries={Object.entries(frontmatter)} />
      </section>

      {isBundle && (
        <section>
          <h2>Bundle meta.json</h2>
          <KeyValueList entries={Object.entries(doc.bundle.meta)} />
        </section>
      )}
    </div>
  );
}
