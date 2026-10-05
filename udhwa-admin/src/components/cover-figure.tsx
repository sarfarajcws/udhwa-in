import { SmartImage } from "@/components/ui/smart-image";

/** Cover image as the public site shows it (used by the preview page). */
export function CoverFigure({ media }: { media: { url: string; alt: string; caption?: string | null; credit?: string | null } | null }) {
  if (!media) return null;
  return (
    <figure>
      <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-sunken">
        <SmartImage src={media.url} alt={media.alt} fill priority sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
      </div>
      {(media.caption || media.credit) && (
        <figcaption className="mt-2 text-sm text-muted">
          {media.caption}
          {media.credit ? <span className="text-muted/80"> {media.caption ? "· " : ""}Photo: {media.credit}</span> : null}
        </figcaption>
      )}
    </figure>
  );
}
