import { z } from "zod";
import { isDocEmpty, sanitizeDoc } from "./rich-text/schema";

/**
 * Server-side schemas for every user submission. Payloads are validated
 * here before they touch the database; the admin later converts an
 * approved payload into a real (draft) entity.
 */

const optStr = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

const optUrl = z
  .string()
  .trim()
  .max(500)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^https?:\/\/[^\s]+$/i.test(v), "Enter a full link starting with http:// or https://");

const optPhone = z
  .string()
  .trim()
  .max(30)
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => !v || /^[+\d][\d\s-]{6,}$/.test(v), "Enter a valid phone number");

const richDoc = z
  .unknown()
  .transform((v) => sanitizeDoc(v))
  .refine((d) => !isDocEmpty(d), "Please write something")
  .refine((d) => JSON.stringify(d).length < 300_000, "This is too long");

export const placeContribution = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  summary: z.string().trim().min(10, "Add a short description (at least 10 characters)").max(300),
  categorySlug: optStr(60),
  address: optStr(250),
  details: optStr(4000),
  sourceUrl: optUrl,
});

export const businessContribution = z.object({
  name: z.string().trim().min(2, "Name is required").max(120),
  summary: z.string().trim().min(10, "Add a short description (at least 10 characters)").max(300),
  categorySlug: optStr(60),
  address: z.string().trim().min(5, "Address helps people find it").max(250),
  phone: optPhone,
  website: optUrl,
  hours: optStr(200),
  details: optStr(4000),
  isOwner: z.coerce.boolean().optional().default(false),
});

export const serviceContribution = z.object({
  name: z.string().trim().min(2, "What service is this?").max(120),
  summary: z.string().trim().min(10, "Add a short description (at least 10 characters)").max(300),
  categorySlug: optStr(60),
  providerName: z.string().trim().min(2, "Who provides it?").max(120),
  providerType: z.enum(["INDIVIDUAL", "BUSINESS"]).default("INDIVIDUAL"),
  serviceArea: optStr(150),
  phone: optPhone,
  availability: optStr(150),
  details: optStr(4000),
});

export const newsContribution = z.object({
  title: z.string().trim().min(8, "Add a clear headline").max(200),
  summary: z.string().trim().min(20, "Summarise what happened (at least 20 characters)").max(400),
  details: z.string().trim().min(30, "Tell us more — what, where, when").max(8000),
  happenedOn: optStr(20),
  location: optStr(200),
  sourceName: optStr(200),
  sourceUrl: optUrl,
});

export const blogContribution = z.object({
  title: z.string().trim().min(8, "Add a title").max(200),
  excerpt: z.string().trim().min(20, "Add a short summary (at least 20 characters)").max(400),
  content: richDoc,
  language: z.enum(["en", "hi", "hi-Latn"]).default("en"),
});

export const photoContribution = z.object({
  mediaId: z.string().min(1, "Upload a photo first"),
  title: z.string().trim().min(3, "Give the photo a title").max(150),
  caption: optStr(500),
  alt: z.string().trim().min(5, "Describe what’s in the photo (helps people using screen readers)").max(300),
  placeSlug: optStr(120),
  takenOn: optStr(20),
  isOwnPhoto: z.literal(true, { message: "Please confirm you took this photo or have permission to share it" }),
});

export const contributionSchemas = {
  PLACE: placeContribution,
  BUSINESS: businessContribution,
  SERVICE: serviceContribution,
  NEWS: newsContribution,
  BLOG: blogContribution,
  PHOTO: photoContribution,
} as const;

export type ContributionTypeKey = keyof typeof contributionSchemas;

export const CONTRIBUTION_TYPES: { type: ContributionTypeKey; slug: string; title: string; description: string }[] = [
  { type: "PLACE", slug: "place", title: "Suggest a place", description: "A landmark, school, lake, office or any place worth knowing." },
  { type: "BUSINESS", slug: "business", title: "Suggest a business", description: "A shop, restaurant, clinic or organisation — including your own." },
  { type: "SERVICE", slug: "service", title: "Suggest a service", description: "Electricians, tutors, drivers, repairs — who can get things done." },
  { type: "PHOTO", slug: "photo", title: "Share a photo", description: "A real photograph of the place, its people or its businesses." },
  { type: "NEWS", slug: "news", title: "Send a community update", description: "Something happening locally — with a source if you have one." },
  { type: "BLOG", slug: "blog", title: "Write a blog", description: "A guide, a local story, history or anything worth reading." },
];

export function typeFromSlug(slug: string) {
  return CONTRIBUTION_TYPES.find((t) => t.slug === slug);
}

/** A human-readable title for list views. */
export function contributionTitle(type: ContributionTypeKey, payload: Record<string, unknown>) {
  return String(payload.name ?? payload.title ?? "Untitled").slice(0, 200);
}

// ── Corrections ──────────────────────────────────────────────
export const CORRECTION_TARGETS = ["place", "business", "service", "news", "blog", "photo"] as const;
export type CorrectionTargetKey = (typeof CORRECTION_TARGETS)[number];

export const correctionSchema = z
  .object({
    target: z.enum(CORRECTION_TARGETS),
    id: z.string().min(1).max(40),
    kind: z.enum(["CORRECTION", "UPDATE", "OWNERSHIP_CLAIM"]).default("CORRECTION"),
    message: z.string().trim().min(10, "Tell us what’s wrong or what has changed (at least 10 characters)").max(2000),
    suggestedChange: optStr(2000),
    evidenceUrl: optUrl,
    contactPhone: optPhone,
  })
  .refine((v) => v.kind !== "OWNERSHIP_CLAIM" || v.target === "business", { message: "Only businesses can be claimed", path: ["kind"] })
  .refine((v) => v.kind !== "OWNERSHIP_CLAIM" || Boolean(v.contactPhone), { message: "Add a phone number so the team can verify you", path: ["contactPhone"] });

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(80),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .max(30)
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => !v || /^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/.test(v), "3–30 characters: letters, numbers and dashes")
    .refine((v) => !v || !["admin", "udhwa", "team", "support", "api", "account"].includes(v), "That username is reserved"),
  bio: optStr(280),
});
