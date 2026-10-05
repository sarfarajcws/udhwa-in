/**
 * Contribution kinds offered on the website. Validation itself happens in
 * udhwa-api — this file only describes the forms (labels, URL slugs).
 */
export type ContributionTypeKey = "PLACE" | "BUSINESS" | "SERVICE" | "NEWS" | "BLOG" | "PHOTO";

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

export const CORRECTION_TARGETS = ["place", "business", "service", "news", "blog", "photo"] as const;
export type CorrectionTargetKey = (typeof CORRECTION_TARGETS)[number];
