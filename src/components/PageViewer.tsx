import { useEffect, useMemo, useRef, useState } from "react";
import { SuperloreDoc } from "superlore/runtime";
import type { OpenedDoc } from "../lib/openFile";
import { rehypeResolveAssets } from "../lib/superloreFile";
import { flavorMode, type Flavor } from "../theme/tokens";
import { SUPERLORE_TOKENS } from "../theme/tokens";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

interface PageViewerProps {
  doc: OpenedDoc;
  flavor: Flavor;
  onOutline: (headings: Heading[]) => void;
}

export function PageViewer({ doc, flavor, onOutline }: PageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  const rehypePlugins = useMemo(
    () => [rehypeResolveAssets(doc.bundle.assets)],
    [doc.bundle.assets],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scan = () => {
      const headings = Array.from(el.querySelectorAll<HTMLHeadingElement>("h1, h2, h3, h4"))
        .filter((h) => h.id)
        .map((h) => ({ depth: Number(h.tagName[1]), text: h.textContent ?? "", id: h.id }));
      onOutline(headings);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(el, { childList: true, subtree: true });
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.bundle.mdx]);

  return (
    <div className="page" ref={containerRef}>
      <SuperloreDoc
        key={doc.filename}
        source={doc.bundle.mdx}
        theme={flavorMode(flavor)}
        tokens={SUPERLORE_TOKENS}
        rehypePlugins={rehypePlugins}
        badge={false}
        onError={setError}
        fallback={<p className="page-status">Rendering…</p>}
      />
      {error && <p className="page-status page-status-error">{error}</p>}
    </div>
  );
}
