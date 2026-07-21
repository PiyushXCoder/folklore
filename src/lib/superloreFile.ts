import { unzipSync } from "fflate";

export interface SuperloreBundle {
  mdx: string;
  meta: Record<string, unknown>;
  comments: unknown[];
  /** relative asset path (as referenced in the mdx, e.g. `assets/foo.png`) -> blob URL */
  assets: Map<string, string>;
}

const decoder = new TextDecoder();

/** `.superlore` is this app's bundle format: a zip of doc.mdx + assets/ + comments.json + meta.json. */
export function parseSuperloreBundle(bytes: Uint8Array): SuperloreBundle {
  const files = unzipSync(bytes);
  const mdxBytes = files["doc.mdx"];
  if (!mdxBytes) throw new Error("Invalid .superlore bundle: missing doc.mdx");

  const meta = files["meta.json"] ? JSON.parse(decoder.decode(files["meta.json"])) : {};
  const comments = files["comments.json"] ? JSON.parse(decoder.decode(files["comments.json"])) : [];

  const assets = new Map<string, string>();
  for (const [name, data] of Object.entries(files)) {
    if (name.startsWith("assets/") && data.length > 0) {
      assets.set(name, URL.createObjectURL(new Blob([data])));
    }
  }

  return { mdx: decoder.decode(mdxBytes), meta, comments, assets };
}

/** Loads a plain `.mdx` file as a bundle with no comments/assets. */
export function bundleFromPlainMdx(filename: string, bytes: Uint8Array): SuperloreBundle {
  return {
    mdx: decoder.decode(bytes),
    meta: { title: filename },
    comments: [],
    assets: new Map(),
  };
}

export function bundleFromBytes(filename: string, bytes: Uint8Array): SuperloreBundle {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext === "superlore" ? parseSuperloreBundle(bytes) : bundleFromPlainMdx(filename, bytes);
}

/** Rewrites `<img src="assets/foo.png">` to the bundle's resolved blob URL. Pass to SuperloreDoc's `rehypePlugins`. */
export function rehypeResolveAssets(assets: Map<string, string>) {
  return () => (tree: HastNode) => {
    walk(tree, (node) => {
      if (node.tagName === "img" && typeof node.properties?.src === "string") {
        const resolved = assets.get(node.properties.src as string);
        if (resolved) node.properties!.src = resolved;
      }
    });
  };
}

interface HastNode {
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

function walk(node: HastNode, visit: (node: HastNode) => void) {
  visit(node);
  node.children?.forEach((child) => walk(child, visit));
}
