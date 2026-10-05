import Link from "next/link";
import { ExternalLink, Globe, Mail, MapPin, MessageCircle, Navigation, Phone } from "lucide-react";
import type { ReactNode } from "react";
import { SmartImage } from "@/components/ui/smart-image";
import { buttonClass } from "@/components/ui/button";
import type { Hours } from "@/lib/jsonld";
import type { PhotoCardData } from "@/lib/api-client";
import { mapsHref, telHref, whatsappHref } from "@/lib/utils";
import { PhotoTile } from "./cards";

export function CoverFigure({ media, priority = true, aspect = "aspect-[16/9]" }: {
  media: { url: string; alt: string; caption?: string | null; credit?: string | null; width?: number | null; height?: number | null } | null;
  priority?: boolean;
  aspect?: string;
}) {
  if (!media) return null;
  return (
    <figure>
      <div className={`relative overflow-hidden rounded-2xl bg-sunken ${aspect}`}>
        <SmartImage src={media.url} alt={media.alt} fill priority={priority} sizes="(min-width: 1024px) 760px, 100vw" className="object-cover" />
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

export function ContactActions({ phone, whatsapp, website, email, address, lat, lng }: {
  phone?: string | null; whatsapp?: string | null; website?: string | null; email?: string | null;
  address?: string | null; lat?: number | null; lng?: number | null;
}) {
  const showMap = Boolean(address || (lat != null && lng != null));
  if (!phone && !whatsapp && !website && !email && !showMap) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {phone && (
        <a href={telHref(phone)} className={buttonClass("primary", "md")}>
          <Phone className="size-4" /> Call
        </a>
      )}
      {whatsapp && (
        <a href={whatsappHref(whatsapp)} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
          <MessageCircle className="size-4" /> WhatsApp
        </a>
      )}
      {showMap && (
        <a href={mapsHref({ lat, lng, query: address })} target="_blank" rel="noopener noreferrer" className={buttonClass("secondary", "md")}>
          <Navigation className="size-4" /> Directions
        </a>
      )}
      {website && (
        <a href={website} target="_blank" rel="noopener noreferrer nofollow" className={buttonClass("secondary", "md")}>
          <Globe className="size-4" /> Website
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className={buttonClass("ghost", "md")}>
          <Mail className="size-4" /> Email
        </a>
      )}
    </div>
  );
}

export function Facts({ items }: { items: { label: string; value: ReactNode }[] }) {
  const shown = items.filter((i) => i.value);
  if (!shown.length) return null;
  return (
    <dl className="card divide-y divide-line text-sm">
      {shown.map((i) => (
        <div key={i.label} className="grid grid-cols-[7.5rem_1fr] gap-3 px-4 py-3">
          <dt className="text-muted">{i.label}</dt>
          <dd className="min-w-0 break-words text-ink-soft">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const DAY_ORDER = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const DAY_NAME: Record<string, string> = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" };

function to12h(t: string) {
  const [h, m] = t.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function HoursList({ hours, note }: { hours: Hours | null; note?: string | null }) {
  if (!hours?.length && !note) return null;
  const everyDay = hours?.length === 1 && hours[0].days.length === 7;
  return (
    <div className="text-sm">
      {everyDay ? (
        <p className="text-ink-soft">
          Every day, {to12h(hours![0].opens)} – {to12h(hours![0].closes)}
        </p>
      ) : (
        <ul className="space-y-1">
          {DAY_ORDER.map((d) => {
            const slot = hours?.find((h) => h.days.includes(d));
            return (
              <li key={d} className="flex justify-between gap-4">
                <span className="text-muted">{DAY_NAME[d]}</span>
                <span className="text-ink-soft">{slot ? `${to12h(slot.opens)} – ${to12h(slot.closes)}` : "Closed"}</span>
              </li>
            );
          })}
        </ul>
      )}
      {note && !everyDay && <p className="mt-1 text-muted">{note}</p>}
    </div>
  );
}

export function PhotoStrip({ photos, title = "Photos", href }: { photos: PhotoCardData[]; title?: string; href?: string }) {
  if (!photos.length) return null;
  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold text-brand-700">
            All photos
          </Link>
        )}
      </div>
      <div className="mt-4 grid auto-rows-[120px] grid-cols-2 gap-2 sm:auto-rows-[160px] sm:grid-cols-3">
        {photos.map((p) => (
          <PhotoTile key={p.id} photo={p} sizes="(min-width: 640px) 33vw, 50vw" />
        ))}
      </div>
    </section>
  );
}

export function SubSection({ title, href, children }: { title: string; href?: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
        {href && (
          <Link href={href} className="text-sm font-semibold text-brand-700">
            See all
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

export function AddressLine({ address }: { address?: string | null }) {
  if (!address) return null;
  return (
    <p className="flex items-start gap-1.5 text-[15px] text-ink-soft">
      <MapPin className="mt-0.5 size-4 shrink-0 text-muted" /> {address}
    </p>
  );
}

export function SourceBox({ name, url }: { name?: string | null; url?: string | null }) {
  if (!name && !url) return null;
  return (
    <div className="mt-10 rounded-lg border border-line bg-surface px-4 py-3 text-sm">
      <span className="font-semibold text-ink">Source: </span>
      {url ? (
        <a href={url} target="_blank" rel="noopener noreferrer nofollow" className="link inline-flex items-center gap-1">
          {name || new URL(url).hostname} <ExternalLink className="size-3.5" />
        </a>
      ) : (
        <span className="text-ink-soft">{name}</span>
      )}
    </div>
  );
}
