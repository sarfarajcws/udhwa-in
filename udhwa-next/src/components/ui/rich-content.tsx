import Link from "next/link";
import type { ReactNode } from "react";
import { SmartImage } from "./smart-image";
import { headingId, isSafeHref, isSafeImageSrc, sanitizeDoc, docToText, type RichMark, type RichNode } from "@/lib/rich-text/schema";

/**
 * Server-side renderer for Udhwa rich text. Produces React elements (so all
 * text is escaped by React) from the allow-listed node set. No
 * dangerouslySetInnerHTML anywhere.
 */
export function RichContent({ doc, className }: { doc: unknown; className?: string }) {
  const clean = sanitizeDoc(doc);
  const ids = new Map<string, number>();
  const ctx: Ctx = { ids, imageIndex: 0 };
  return <div className={className ?? "prose-udhwa"}>{clean.content.map((n, i) => renderNode(n, i, ctx))}</div>;
}

type Ctx = { ids: Map<string, number>; imageIndex: number };

function renderMarks(text: ReactNode, marks: RichMark[] | undefined, key: number): ReactNode {
  if (!marks?.length) return text;
  return marks.reduce<ReactNode>((acc, m, i) => {
    const k = `${key}-${i}`;
    switch (m.type) {
      case "bold":
        return <strong key={k}>{acc}</strong>;
      case "italic":
        return <em key={k}>{acc}</em>;
      case "underline":
        return <u key={k}>{acc}</u>;
      case "strike":
        return <s key={k}>{acc}</s>;
      case "code":
        return <code key={k}>{acc}</code>;
      case "highlight":
        return <mark key={k}>{acc}</mark>;
      case "link": {
        const href = m.attrs?.href;
        if (!isSafeHref(href)) return acc;
        if (href.startsWith("/")) return <Link key={k} href={href}>{acc}</Link>;
        return (
          <a key={k} href={href} rel="noopener noreferrer nofollow ugc" target="_blank">
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, text);
}

function children(n: RichNode, ctx: Ctx) {
  return n.content?.map((c, i) => renderNode(c, i, ctx));
}

function renderNode(n: RichNode, key: number, ctx: Ctx): ReactNode {
  switch (n.type) {
    case "text":
      return <span key={key}>{renderMarks(n.text, n.marks, key)}</span>;
    case "paragraph":
      return <p key={key}>{children(n, ctx)}</p>;
    case "heading": {
      const level = Number(n.attrs?.level ?? 2);
      const text = docToText({ type: "doc", content: [n] });
      const base = headingId(text);
      const count = ctx.ids.get(base) ?? 0;
      ctx.ids.set(base, count + 1);
      const id = count ? `${base}-${count}` : base;
      if (level === 3) return <h3 key={key} id={id}>{children(n, ctx)}</h3>;
      if (level === 4) return <h4 key={key} id={id}>{children(n, ctx)}</h4>;
      return <h2 key={key} id={id}>{children(n, ctx)}</h2>;
    }
    case "bulletList":
      return <ul key={key}>{children(n, ctx)}</ul>;
    case "orderedList":
      return (
        <ol key={key} start={typeof n.attrs?.start === "number" ? n.attrs.start : undefined}>
          {children(n, ctx)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{children(n, ctx)}</li>;
    case "blockquote":
      return <blockquote key={key}>{children(n, ctx)}</blockquote>;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{n.content?.map((c) => c.text ?? "").join("")}</code>
        </pre>
      );
    case "horizontalRule":
      return <hr key={key} />;
    case "hardBreak":
      return <br key={key} />;
    case "image": {
      const src = n.attrs?.src;
      if (!isSafeImageSrc(src)) return null;
      const alt = String(n.attrs?.alt ?? "");
      const caption = n.attrs?.caption ? String(n.attrs.caption) : null;
      const width = Number(n.attrs?.width) || 1200;
      const height = Number(n.attrs?.height) || 800;
      const first = ctx.imageIndex++ === 0;
      return (
        <figure key={key}>
          <SmartImage
            src={src}
            alt={alt}
            width={width}
            height={height}
            sizes="(min-width: 768px) 720px, 100vw"
            loading={first ? undefined : "lazy"}
          />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    case "table":
      return (
        <div key={key} className="table-wrap">
          <table>
            <tbody>{children(n, ctx)}</tbody>
          </table>
        </div>
      );
    case "tableRow":
      return <tr key={key}>{children(n, ctx)}</tr>;
    case "tableHeader":
      return (
        <th key={key} colSpan={n.attrs?.colspan as number | undefined} rowSpan={n.attrs?.rowspan as number | undefined}>
          {children(n, ctx)}
        </th>
      );
    case "tableCell":
      return (
        <td key={key} colSpan={n.attrs?.colspan as number | undefined} rowSpan={n.attrs?.rowspan as number | undefined}>
          {children(n, ctx)}
        </td>
      );
    default:
      return null;
  }
}
