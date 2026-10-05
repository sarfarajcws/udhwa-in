/**
 * Udhwa rich-text format = a strict subset of Tiptap/ProseMirror JSON.
 *
 * Everything that enters the database goes through `sanitizeDoc`, which
 * keeps only allow-listed node types, marks and attributes, validates
 * URLs, and bounds size/depth. Rendering (render.tsx) only understands the
 * same allow-list, so even a tampered row cannot inject markup.
 */

export type RichMark = { type: string; attrs?: Record<string, unknown> };
export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: RichNode[];
  marks?: RichMark[];
  text?: string;
};
export type RichDoc = { type: "doc"; content: RichNode[] };

export const EMPTY_DOC: RichDoc = { type: "doc", content: [{ type: "paragraph" }] };

const BLOCK_NODES = new Set([
  "paragraph",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "image",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "hardBreak",
  "text",
]);

const MARKS = new Set(["bold", "italic", "underline", "strike", "code", "link", "highlight"]);

const MAX_NODES = 20_000;
const MAX_DEPTH = 24;
const MAX_TEXT = 200_000;

export function isSafeHref(href: unknown): href is string {
  if (typeof href !== "string" || href.length > 2048) return false;
  const h = href.trim();
  if (h.startsWith("/") && !h.startsWith("//")) return true;
  if (h.startsWith("#")) return true;
  try {
    const u = new URL(h);
    return ["http:", "https:", "mailto:", "tel:"].includes(u.protocol);
  } catch {
    return false;
  }
}

/** Images may only come from Cloudinary or the app's own /seed assets. */
export function isSafeImageSrc(src: unknown): src is string {
  if (typeof src !== "string" || src.length > 2048) return false;
  if (/^\/(seed|images)\/[\w\-./]+$/.test(src) && !src.includes("..")) return true;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname === "res.cloudinary.com";
  } catch {
    return false;
  }
}

function str(v: unknown, max: number) {
  return typeof v === "string" ? v.slice(0, max) : undefined;
}

function cleanMarks(marks: unknown): RichMark[] | undefined {
  if (!Array.isArray(marks)) return undefined;
  const out: RichMark[] = [];
  for (const m of marks) {
    if (!m || typeof m !== "object") continue;
    const type = (m as RichMark).type;
    if (!MARKS.has(type)) continue;
    if (type === "link") {
      const href = (m as RichMark).attrs?.href;
      if (!isSafeHref(href)) continue;
      const external = /^https?:\/\//.test(href);
      out.push({ type, attrs: { href: href.trim(), external } });
    } else {
      out.push({ type });
    }
  }
  return out.length ? out : undefined;
}

type Budget = { nodes: number; text: number };

function cleanNode(node: unknown, depth: number, budget: Budget): RichNode | null {
  if (!node || typeof node !== "object") return null;
  const n = node as RichNode;
  if (!BLOCK_NODES.has(n.type)) {
    // Unknown wrapper: keep its children's text as a paragraph rather than lose content.
    return null;
  }
  if (depth > MAX_DEPTH || ++budget.nodes > MAX_NODES) return null;

  if (n.type === "text") {
    const text = typeof n.text === "string" ? n.text : "";
    if (!text) return null;
    budget.text += text.length;
    if (budget.text > MAX_TEXT) return null;
    const marks = cleanMarks(n.marks);
    return marks ? { type: "text", text, marks } : { type: "text", text };
  }

  const out: RichNode = { type: n.type };
  const a = n.attrs ?? {};

  switch (n.type) {
    case "heading": {
      const level = Number(a.level);
      out.attrs = { level: [2, 3, 4].includes(level) ? level : level <= 1 ? 2 : 4 };
      break;
    }
    case "orderedList": {
      const start = Number(a.start);
      if (Number.isInteger(start) && start > 1 && start < 10_000) out.attrs = { start };
      break;
    }
    case "codeBlock": {
      const language = str(a.language, 30);
      if (language && /^[\w+-]+$/.test(language)) out.attrs = { language };
      break;
    }
    case "image": {
      if (!isSafeImageSrc(a.src)) return null;
      out.attrs = {
        src: a.src,
        // Links the image to its Media record (usage tracking, safe deletion).
        mediaId: typeof a.mediaId === "string" && /^[a-z0-9]{20,40}$/i.test(a.mediaId) ? a.mediaId : null,
        alt: str(a.alt, 300) ?? "",
        caption: str(a.caption, 500) ?? null,
        width: Number.isFinite(Number(a.width)) ? Number(a.width) : null,
        height: Number.isFinite(Number(a.height)) ? Number(a.height) : null,
      };
      return out;
    }
    case "tableCell":
    case "tableHeader": {
      const colspan = Number(a.colspan);
      const rowspan = Number(a.rowspan);
      const attrs: Record<string, number> = {};
      if (Number.isInteger(colspan) && colspan > 1 && colspan <= 20) attrs.colspan = colspan;
      if (Number.isInteger(rowspan) && rowspan > 1 && rowspan <= 50) attrs.rowspan = rowspan;
      if (Object.keys(attrs).length) out.attrs = attrs;
      break;
    }
    case "horizontalRule":
    case "hardBreak":
      return out;
  }

  if (Array.isArray(n.content)) {
    const children = n.content.map((c) => cleanNode(c, depth + 1, budget)).filter(Boolean) as RichNode[];
    if (children.length) out.content = children;
  }

  // Structural minimums so the editor can always re-open the document.
  if ((out.type === "bulletList" || out.type === "orderedList") && !out.content?.length) return null;
  if (out.type === "listItem" && !out.content?.length) out.content = [{ type: "paragraph" }];
  if ((out.type === "tableCell" || out.type === "tableHeader") && !out.content?.length) out.content = [{ type: "paragraph" }];
  if (out.type === "table" && !out.content?.length) return null;
  if (out.type === "tableRow" && !out.content?.length) return null;
  if (out.type === "blockquote" && !out.content?.length) return null;

  return out;
}

export function sanitizeDoc(input: unknown): RichDoc {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return EMPTY_DOC;
    }
  }
  if (!value || typeof value !== "object" || (value as RichDoc).type !== "doc") return EMPTY_DOC;
  const budget: Budget = { nodes: 0, text: 0 };
  const content = ((value as RichDoc).content ?? [])
    .map((c) => cleanNode(c, 1, budget))
    .filter((c): c is RichNode => Boolean(c) && c!.type !== "text" && c!.type !== "listItem" && c!.type !== "tableRow");
  return { type: "doc", content: content.length ? content : [{ type: "paragraph" }] };
}

/** Every image node in a document, in order (for media usage tracking). */
export function docImages(doc: unknown): RichNode[] {
  const out: RichNode[] = [];
  const walk = (n: RichNode) => {
    if (n.type === "image") out.push(n);
    n.content?.forEach(walk);
  };
  if (doc && typeof doc === "object") ((doc as RichDoc).content ?? []).forEach(walk);
  return out;
}

/** Plain text (for search snippets, excerpts and reading time). */
export function docToText(doc: unknown): string {
  const parts: string[] = [];
  const walk = (n: RichNode) => {
    if (n.type === "text" && n.text) parts.push(n.text);
    if (n.type === "image" && n.attrs?.caption) parts.push(String(n.attrs.caption));
    n.content?.forEach(walk);
    if (["paragraph", "heading", "listItem", "blockquote", "codeBlock"].includes(n.type)) parts.push("\n");
  };
  if (doc && typeof doc === "object") ((doc as RichDoc).content ?? []).forEach(walk);
  return parts.join("").replace(/\n{2,}/g, "\n").trim();
}

export function isDocEmpty(doc: unknown) {
  if (!doc || typeof doc !== "object") return true;
  const d = doc as RichDoc;
  if (d.content?.some((n) => n.type === "image" || n.type === "table" || n.type === "horizontalRule")) return false;
  return docToText(doc).length === 0;
}

export function readingMinutes(doc: unknown) {
  const words = docToText(doc).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Headings for an optional table of contents. */
export function docHeadings(doc: unknown) {
  const out: { level: number; text: string; id: string }[] = [];
  const seen = new Map<string, number>();
  if (!doc || typeof doc !== "object") return out;
  for (const n of (doc as RichDoc).content ?? []) {
    if (n.type !== "heading") continue;
    const text = docToText({ type: "doc", content: [n] });
    const base = headingId(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    out.push({ level: Number(n.attrs?.level ?? 2), text, id: count ? `${base}-${count}` : base });
  }
  return out;
}

export function headingId(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "section"
  );
}
