import Link from "next/link";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "./contact-form";
import { buildMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Get in touch with the Udhwa team — questions, partnerships, feedback or anything else.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <div className="container-page grid gap-12 py-10 sm:py-16 lg:grid-cols-[1fr_1.2fr]">
      <div>
        <p className="eyebrow">Contact</p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-ink">Talk to the Udhwa team</h1>
        <p className="mt-4 max-w-md text-lg leading-relaxed text-muted">Questions, feedback, partnerships — we read every message.</p>
        <div className="mt-6 max-w-md rounded-[var(--radius-card)] border border-amber-100 bg-amber-50 p-4 text-sm text-ink-soft">
          Want to add or fix information on Udhwa? Use{" "}
          <Link href="/contribute" className="link font-semibold">Contribute</Link> instead — it goes straight into the team’s review queue and you can
          track its status.
        </div>
        <ul className="mt-8 space-y-4 text-[15px]">
          <li className="flex items-start gap-3">
            <MapPin className="mt-0.5 size-5 text-muted" />
            <span className="text-ink-soft">Udhwa, Sahibganj, Jharkhand 816108</span>
          </li>
          <li className="flex items-start gap-3">
            <Mail className="mt-0.5 size-5 text-muted" />
            <a href={`mailto:${site.contactEmail}`} className="link">
              {site.contactEmail}
            </a>
          </li>
        </ul>
      </div>
      <div className="card p-5 sm:p-8">
        <ContactForm />
      </div>
    </div>
  );
}
