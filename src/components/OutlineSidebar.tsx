import type { Heading } from "./PageViewer";

interface OutlineSidebarProps {
  headings: Heading[];
}

export function OutlineSidebar({ headings }: OutlineSidebarProps) {
  if (headings.length === 0) return null;

  return (
    <nav className="outline-sidebar" aria-label="Document outline">
      {headings.map((h) => (
        <button
          key={h.id}
          className="outline-item"
          style={{ paddingLeft: `${8 + (h.depth - 1) * 12}px` }}
          onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
        >
          {h.text}
        </button>
      ))}
    </nav>
  );
}
