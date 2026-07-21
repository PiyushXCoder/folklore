import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SuperloreDoc } from "superlore/runtime";
import type { OpenedDoc } from "../lib/openFile";
import { rehypeResolveAssets } from "../lib/superloreFile";
import { schemeMode, type Scheme } from "../theme/tokens";
import { SUPERLORE_TOKENS } from "../theme/tokens";

export interface Heading {
  depth: number;
  text: string;
  id: string;
}

interface PageViewerProps {
  doc: OpenedDoc;
  scheme: Scheme;
  onOutline: (headings: Heading[]) => void;
  onFrontmatter: (frontmatter: Record<string, unknown>) => void;
}

export function PageViewer({ doc, scheme, onOutline, onFrontmatter }: PageViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [hero, setHero] = useState<{ title?: string; summary?: string }>({});

  const rehypePlugins = useMemo(
    () => [rehypeResolveAssets(doc.bundle.assets)],
    [doc.bundle.assets],
  );

  // Reset before the new doc's first compile, so the previous doc's title/summary never flashes.
  useEffect(() => setHero({}), [doc.filename]);

  const handleFrontmatter = useCallback(
    (frontmatter: Record<string, unknown>) => {
      setHero({
        title: typeof frontmatter.title === "string" ? frontmatter.title : undefined,
        summary: typeof frontmatter.summary === "string" ? frontmatter.summary : undefined,
      });
      onFrontmatter(frontmatter);
    },
    [onFrontmatter],
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
    <div className="page-container">
      {(hero.title || hero.summary) && (
        <header className="page-hero">
          {hero.title && <h1>{hero.title}</h1>}
          {hero.summary && <p className="page-hero-summary">{hero.summary}</p>}
        </header>
      )}
      <div className="page" ref={containerRef}>
        <SuperloreDoc
          key={doc.filename}
          source={doc.bundle.mdx}
          theme={schemeMode(scheme)}
          tokens={SUPERLORE_TOKENS}
          rehypePlugins={rehypePlugins}
          badge={false}
          onError={setError}
          onFrontmatter={handleFrontmatter}
          fallback={<p className="page-status">Rendering…</p>}
        />
        {error && <p className="page-status page-status-error">{error}</p>}
      </div>
    </div>
  );
}
