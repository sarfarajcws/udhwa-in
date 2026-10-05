import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";

/**
 * Image with a caption attribute, rendered as <figure>/<figcaption>.
 * Shared by the admin editor and the legacy-content importer so both
 * produce exactly the node shapes `sanitizeDoc` allows.
 */
export const CaptionedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        parseHTML: (el) => el.closest("figure")?.querySelector("figcaption")?.textContent ?? null,
      },
      width: { default: null },
      height: { default: null },
      /** Media record id — lets the API track where each uploaded image is used. */
      mediaId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-media-id"),
        renderHTML: (attrs) => (attrs.mediaId ? { "data-media-id": attrs.mediaId } : {}),
      },
    };
  },
}).configure({ inline: false, allowBase64: false });

/** The full editing extension set (no UI-only extensions like Placeholder). */
export function richTextExtensions() {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      link: {
        openOnClick: false,
        autolink: true,
        protocols: ["http", "https", "mailto", "tel"],
        HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null },
      },
    }),
    Highlight,
    CaptionedImage,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}
