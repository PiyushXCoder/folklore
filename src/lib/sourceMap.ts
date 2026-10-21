/**
 * Maps a DOM selection in the rendered page back to coordinates in the MDX source.
 *
 * The page is compiled output, so the DOM carries no source information on its own. It can get
 * some: `mdast-util-to-hast` copies every node's `position` onto the hast tree, and superlore
 * appends host `rehypePlugins` after its own, so {@link rehypeSourcePositions} can stamp those
 * coordinates onto the elements it renders. A selection then resolves to the nearest stamped
 * ancestor, and the exact columns are recovered by locating the selected text inside that block's
 * slice of the source.
 *
 * All line/column numbers are **1-based**, matching remark/unist (and editors).
 */

/** 1-based, as in unist positions. */
export interface SourcePoint {
  line: number;
  column: number;
}

export interface SourceRange {
  start: SourcePoint;
  end: SourcePoint;
  /** The selected text, as rendered. */
  text: string;
  /** False when only the enclosing block could be located, so the columns are the block's, not the selection's. */
  exact: boolean;
}

const POS_ATTR = "data-sl-pos";

interface HastNode {
  type?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
  position?: { start: SourcePoint; end: SourcePoint };
}

/**
 * Stamps `data-sl-pos="startLine:startCol-endLine:endCol"` on every element that knows where it
 * came from. Pass to `SuperloreDoc`'s `rehypePlugins` — same shape as `rehypeResolveAssets`.
 *
 * Not everything gets stamped: Shiki rewrites code block subtrees, and MDX JSX elements (Canvas and
 * friends) are `mdxJsxFlowElement` nodes at this stage, not `element`. Selections inside those
 * resolve to whichever ancestor *is* stamped, which is what `exact: false` reports.
 */
export function rehypeSourcePositions() {
  return () => (tree: HastNode) => {
    walk(tree, (node) => {
      if (node.type !== "element" || !node.position) return;
      const { start, end } = node.position;
      node.properties ??= {};
      node.properties[POS_ATTR] = `${start.line}:${start.column}-${end.line}:${end.column}`;
    });
  };
}

function walk(node: HastNode, visit: (node: HastNode) => void) {
  visit(node);
  node.children?.forEach((child) => walk(child, visit));
}

/** Resolves the current selection against `mdx`, or null if it can't be placed in the source at all. */
export function resolveSelectionRange(selection: Selection | null, mdx: string): SourceRange | null {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const text = selection.toString();
  if (!text.trim()) return null;

  const range = selection.getRangeAt(0);
  const starts = lineStarts(mdx);
  const startBlock = nearestStamped(range.startContainer);
  const endBlock = nearestStamped(range.endContainer);
  const startSpan = startBlock && parseSpan(startBlock);
  const endSpan = endBlock && parseSpan(endBlock);
  if (!startBlock || !endBlock || !startSpan || !endSpan) return locateInWholeSource(mdx, starts, text);

  const lines = text.split("\n");
  const firstSegment = lines[0];
  const lastSegment = lines[lines.length - 1];

  // Where the selection begins, measured in rendered characters from the block's start. Source
  // offsets run ahead of rendered ones (markup is stripped on the way out), so this is a lower
  // bound used to pick between repeated occurrences of the same text within one block.
  const startHint = renderedOffset(startBlock, range.startContainer, range.startOffset);
  const endHint = renderedOffset(endBlock, range.endContainer, range.endOffset) - lastSegment.length;

  const startOffset = locateInBlock(mdx, starts, startSpan, firstSegment, startHint);
  const endOffset = locateInBlock(mdx, starts, endSpan, lastSegment, Math.max(endHint, 0));

  if (startOffset !== null && endOffset !== null) {
    return {
      start: offsetToPoint(starts, startOffset),
      end: offsetToPoint(starts, endOffset + lastSegment.length),
      text,
      exact: true,
    };
  }
  return { start: startSpan.start, end: endSpan.end, text, exact: false };
}

/** Last resort for selections with no stamped ancestor (inside a Canvas, say): a unique match wins. */
function locateInWholeSource(mdx: string, starts: number[], text: string): SourceRange | null {
  const lines = text.split("\n");
  const first = lines[0];
  const last = lines[lines.length - 1];
  if (!first.trim()) return null;

  const index = mdx.indexOf(first);
  if (index === -1 || mdx.indexOf(first, index + 1) !== -1) return null; // absent, or ambiguous

  const lastIndex = lines.length === 1 ? index : mdx.indexOf(last, index + first.length);
  const endOffset = lastIndex === -1 ? index + first.length : lastIndex + last.length;
  return { start: offsetToPoint(starts, index), end: offsetToPoint(starts, endOffset), text, exact: true };
}

/** Finds `needle` in the source slice the block spans, preferring the occurrence nearest `hint`. */
function locateInBlock(
  mdx: string,
  starts: number[],
  span: { start: SourcePoint; end: SourcePoint },
  needle: string,
  hint: number,
): number | null {
  if (!needle) return null;
  const from = pointToOffset(starts, mdx, span.start);
  const to = pointToOffset(starts, mdx, span.end);
  const slice = mdx.slice(from, to);

  let best: number | null = null;
  for (let i = slice.indexOf(needle); i !== -1; i = slice.indexOf(needle, i + 1)) {
    if (best === null || Math.abs(i - hint) < Math.abs(best - hint)) best = i;
  }
  return best === null ? null : from + best;
}

function nearestStamped(node: Node | null): HTMLElement | null {
  const element = node instanceof Element ? node : (node?.parentElement ?? null);
  return element?.closest<HTMLElement>(`[${POS_ATTR}]`) ?? null;
}

function parseSpan(element: HTMLElement): { start: SourcePoint; end: SourcePoint } | null {
  const match = element.getAttribute(POS_ATTR)?.match(/^(\d+):(\d+)-(\d+):(\d+)$/);
  if (!match) return null;
  return {
    start: { line: Number(match[1]), column: Number(match[2]) },
    end: { line: Number(match[3]), column: Number(match[4]) },
  };
}

/** Rendered characters between the block's start and (container, offset). */
function renderedOffset(block: HTMLElement, container: Node, offset: number): number {
  const probe = document.createRange();
  probe.selectNodeContents(block);
  try {
    probe.setEnd(container, offset);
  } catch {
    return 0; // container isn't inside block (shouldn't happen, but a bad probe shouldn't throw)
  }
  return probe.toString().length;
}

function lineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === "\n") starts.push(i + 1);
  }
  return starts;
}

function pointToOffset(starts: number[], source: string, point: SourcePoint): number {
  const line = Math.min(Math.max(point.line - 1, 0), starts.length - 1);
  return Math.min(starts[line] + point.column - 1, source.length);
}

function offsetToPoint(starts: number[], offset: number): SourcePoint {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const mid = (low + high + 1) >> 1;
    if (starts[mid] <= offset) low = mid;
    else high = mid - 1;
  }
  return { line: low + 1, column: offset - starts[low] + 1 };
}
