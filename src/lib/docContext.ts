import type { OpenedDoc } from "./openFile";
import type { SourceRange } from "./sourceMap";

/**
 * Builds the clipboard payload for "Copy Context" — an editor-style reference to the selection's
 * place in the source, followed by the selection itself as a quote, ready to paste into Claude.
 */
export function formatDocContext(label: string, range: SourceRange): string {
  const reference = range.exact
    ? `${label}:${range.start.line}:${range.start.column}-${range.end.line}:${range.end.column}`
    : // Columns would be the enclosing block's, not the selection's — saying nothing beats saying
      // something false, so report lines only and mark the range as what it is.
      `${label}:${range.start.line}-${range.end.line} (approx)`;

  const quoted = range.text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => `> ${line}`.trimEnd())
    .join("\n");

  return `${reference}\n\n${quoted}\n`;
}

/**
 * What to call the file in that reference: the absolute path when the doc came from one (desktop),
 * otherwise just the filename (the web build never has a path). A `.superlore` is a zip and the
 * line numbers belong to the `doc.mdx` inside it, so say so rather than pointing at the bundle.
 */
export function docSourceLabel(doc: OpenedDoc): string {
  const base = doc.watch?.kind === "path" ? doc.watch.path : doc.filename;
  return doc.filename.toLowerCase().endsWith(".superlore") ? `${base}#doc.mdx` : base;
}

/**
 * Copies `text`, falling back to a hidden textarea where the async clipboard API isn't available
 * (WebKitGTK under Tauri's protocol may not count as a secure context). The fallback steals focus
 * and clears the selection, so it puts the user's selection back — losing the highlight at the
 * moment you copy it would be a nasty surprise.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through
  }

  const selection = window.getSelection();
  const saved = selection ? Array.from({ length: selection.rangeCount }, (_, i) => selection.getRangeAt(i).cloneRange()) : [];

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.cssText = "position:fixed;top:0;left:-9999px;opacity:0";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch {
    copied = false;
  }
  textarea.remove();

  if (selection && saved.length > 0) {
    selection.removeAllRanges();
    for (const range of saved) selection.addRange(range);
  }
  return copied;
}
