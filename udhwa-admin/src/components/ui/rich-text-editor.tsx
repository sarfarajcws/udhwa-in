"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold, Code, Eye, Heading2, Heading3, Highlighter, ImagePlus, Italic, Link2, List, ListOrdered, Loader2, Minus, PenLine,
  Quote, Redo2, SquareCode, Strikethrough, Table as TableIcon, Underline, Undo2, Unlink,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { richTextExtensions } from "@/lib/rich-text/extensions";
import { RichContent } from "./rich-content";
import { EMPTY_DOC, isSafeHref, type RichDoc } from "@/lib/rich-text/schema";
import { UPLOAD_MIME_TYPES, uploadImage } from "./image-upload";
import { cn } from "@/lib/utils";

/**
 * Rich text editor (Tiptap). Emits Udhwa rich-text JSON into a hidden input
 * named `name`; the server re-sanitises it on save, so the editor is a
 * convenience, not a trust boundary.
 */
export function RichTextEditor({
  name,
  initialContent,
  placeholder = "Start writing…",
  variant = "full",
  uploadsEnabled,
  onChange,
}: {
  name: string;
  initialContent?: unknown;
  placeholder?: string;
  variant?: "full" | "basic";
  uploadsEnabled: boolean;
  onChange?: (doc: RichDoc) => void;
}) {
  const [json, setJson] = useState<string>(JSON.stringify(initialContent ?? EMPTY_DOC));
  const [mode, setMode] = useState<"write" | "preview">("write");

  const editor = useEditor({
    extensions: [...richTextExtensions(), Placeholder.configure({ placeholder })],
    content: (initialContent as object) ?? EMPTY_DOC,
    immediatelyRender: false,
    editorProps: {
      attributes: { class: "prose-udhwa tiptap px-4 py-4 sm:px-6", "aria-label": "Content editor" },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON() as RichDoc;
      setJson(JSON.stringify(doc));
      onChange?.(doc);
    },
  });

  return (
    <div className="overflow-hidden rounded-lg border border-line-strong bg-surface focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100">
      <input type="hidden" name={name} value={json} />
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-line bg-canvas/95 px-2 py-1.5 backdrop-blur">
        {editor && mode === "write" ? <Toolbar editor={editor} variant={variant} uploadsEnabled={uploadsEnabled} /> : <span className="px-2 text-sm text-muted">Preview</span>}
        <button
          type="button"
          onClick={() => setMode((m) => (m === "write" ? "preview" : "write"))}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-ink-soft hover:bg-sunken"
        >
          {mode === "write" ? <Eye className="size-4" /> : <PenLine className="size-4" />}
          {mode === "write" ? "Preview" : "Edit"}
        </button>
      </div>
      <div className={mode === "write" ? "block" : "hidden"}>
        <EditorContent editor={editor} />
        {editor && <ImageInspector editor={editor} />}
      </div>
      {mode === "preview" && (
        <div className="px-4 py-6 sm:px-6">
          <RichContent doc={JSON.parse(json)} />
        </div>
      )}
    </div>
  );
}

function Btn({ onClick, active, disabled, label, children }: { onClick: () => void; active?: boolean; disabled?: boolean; label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-md text-ink-soft hover:bg-sunken disabled:opacity-40", active && "bg-brand-50 text-brand-700")}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-1 h-5 w-px shrink-0 bg-line" aria-hidden />;

function Toolbar({ editor, variant, uploadsEnabled }: { editor: Editor; variant: "full" | "basic"; uploadsEnabled: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      code: e.isActive("code"), highlight: e.isActive("highlight"), link: e.isActive("link"),
      h2: e.isActive("heading", { level: 2 }), h3: e.isActive("heading", { level: 3 }),
      ul: e.isActive("bulletList"), ol: e.isActive("orderedList"), quote: e.isActive("blockquote"), codeBlock: e.isActive("codeBlock"),
      table: e.isActive("table"), canUndo: e.can().undo(), canRedo: e.can().redo(),
    }),
  });
  const chain = () => editor.chain().focus();

  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL (https://… or /path)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) return chain().extendMarkRange("link").unsetLink().run();
    if (!isSafeHref(url.trim())) return window.alert("Only http(s), mailto:, tel: or site-relative links are allowed.");
    chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  async function onImage(file?: File) {
    if (!file) return;
    const alt = window.prompt("Describe the image (alt text)") ?? "";
    setUploading(true);
    try {
      const m = await uploadImage(file, alt);
      // mediaId links the image to its library record, so the API can track where it's used.
      chain().setImage({ src: m.url, alt: alt || m.alt }).updateAttributes("image", { width: m.width, height: m.height, mediaId: m.id }).run();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex min-w-0 items-center overflow-x-auto" role="toolbar" aria-label="Formatting">
      <Btn label="Heading" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()}><Heading2 className="size-4" /></Btn>
      <Btn label="Subheading" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()}><Heading3 className="size-4" /></Btn>
      <Sep />
      <Btn label="Bold" active={s.bold} onClick={() => chain().toggleBold().run()}><Bold className="size-4" /></Btn>
      <Btn label="Italic" active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic className="size-4" /></Btn>
      <Btn label="Underline" active={s.underline} onClick={() => chain().toggleUnderline().run()}><Underline className="size-4" /></Btn>
      {variant === "full" && <Btn label="Strikethrough" active={s.strike} onClick={() => chain().toggleStrike().run()}><Strikethrough className="size-4" /></Btn>}
      <Btn label="Highlight" active={s.highlight} onClick={() => chain().toggleHighlight().run()}><Highlighter className="size-4" /></Btn>
      <Btn label={s.link ? "Edit link" : "Add link"} active={s.link} onClick={setLink}><Link2 className="size-4" /></Btn>
      {s.link && <Btn label="Remove link" onClick={() => chain().extendMarkRange("link").unsetLink().run()}><Unlink className="size-4" /></Btn>}
      <Sep />
      <Btn label="Bulleted list" active={s.ul} onClick={() => chain().toggleBulletList().run()}><List className="size-4" /></Btn>
      <Btn label="Numbered list" active={s.ol} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className="size-4" /></Btn>
      <Btn label="Quote" active={s.quote} onClick={() => chain().toggleBlockquote().run()}><Quote className="size-4" /></Btn>
      <Btn label="Divider" onClick={() => chain().setHorizontalRule().run()}><Minus className="size-4" /></Btn>
      {variant === "full" && (
        <>
          <Btn label="Inline code" active={s.code} onClick={() => chain().toggleCode().run()}><Code className="size-4" /></Btn>
          <Btn label="Code block" active={s.codeBlock} onClick={() => chain().toggleCodeBlock().run()}><SquareCode className="size-4" /></Btn>
          <Btn label="Insert table" active={s.table} onClick={() => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}><TableIcon className="size-4" /></Btn>
          {s.table && (
            <span className="flex shrink-0 items-center gap-0.5 text-xs">
              <button type="button" className="rounded px-1.5 py-1 hover:bg-sunken" onClick={() => chain().addRowAfter().run()}>+row</button>
              <button type="button" className="rounded px-1.5 py-1 hover:bg-sunken" onClick={() => chain().addColumnAfter().run()}>+col</button>
              <button type="button" className="rounded px-1.5 py-1 hover:bg-sunken" onClick={() => chain().deleteRow().run()}>−row</button>
              <button type="button" className="rounded px-1.5 py-1 hover:bg-sunken" onClick={() => chain().deleteColumn().run()}>−col</button>
              <button type="button" className="rounded px-1.5 py-1 text-red-700 hover:bg-red-50" onClick={() => chain().deleteTable().run()}>delete</button>
            </span>
          )}
        </>
      )}
      <Btn label={uploadsEnabled ? "Insert image" : "Image uploads not configured"} disabled={!uploadsEnabled || uploading} onClick={() => fileRef.current?.click()}>
        {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />}
      </Btn>
      <input ref={fileRef} type="file" accept={UPLOAD_MIME_TYPES.join(",")} className="hidden" onChange={(e) => onImage(e.target.files?.[0])} />
      <Sep />
      <Btn label="Undo" disabled={!s.canUndo} onClick={() => chain().undo().run()}><Undo2 className="size-4" /></Btn>
      <Btn label="Redo" disabled={!s.canRedo} onClick={() => chain().redo().run()}><Redo2 className="size-4" /></Btn>
    </div>
  );
}

/** When an image is selected: edit its alt text and caption. */
function ImageInspector({ editor }: { editor: Editor }) {
  const sel = useEditorState({
    editor,
    selector: ({ editor: e }) => (e.isActive("image") ? { alt: (e.getAttributes("image").alt as string) ?? "", caption: (e.getAttributes("image").caption as string) ?? "" } : null),
  });
  if (!sel) return null;
  return (
    <div className="grid gap-2 border-t border-line bg-canvas px-4 py-3 sm:grid-cols-2">
      <label className="text-xs font-medium text-ink-soft">
        Alt text
        <input className="field mt-1 py-1.5 text-sm" value={sel.alt} onChange={(e) => editor.chain().updateAttributes("image", { alt: e.target.value }).run()} />
      </label>
      <label className="text-xs font-medium text-ink-soft">
        Caption
        <input className="field mt-1 py-1.5 text-sm" value={sel.caption} onChange={(e) => editor.chain().updateAttributes("image", { caption: e.target.value || null }).run()} />
      </label>
    </div>
  );
}
