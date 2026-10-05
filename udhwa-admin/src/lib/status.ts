// Mirrors the Prisma enums (kept dependency-free so any client can use it).
export type ContentStatus = "DRAFT" | "IN_REVIEW" | "PUBLISHED" | "ARCHIVED";
export type ContributionStatus = "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "PUBLISHED" | "REJECTED" | "WITHDRAWN";
export type CorrectionStatus = "OPEN" | "IN_REVIEW" | "RESOLVED" | "DISMISSED";

type Tone = "neutral" | "blue" | "amber" | "green" | "red";

export const CONTRIBUTION_STATUS: Record<ContributionStatus, { label: string; tone: Tone; help: string }> = {
  SUBMITTED: { label: "Submitted", tone: "neutral", help: "Waiting for the Udhwa team to pick it up." },
  UNDER_REVIEW: { label: "Under review", tone: "blue", help: "The team is checking the details." },
  CHANGES_REQUESTED: { label: "Changes requested", tone: "amber", help: "The team needs a few changes — see their note, then update and resubmit." },
  APPROVED: { label: "Approved", tone: "green", help: "Approved. The team is preparing it for publishing." },
  PUBLISHED: { label: "Published", tone: "green", help: "Live on Udhwa. Thank you!" },
  REJECTED: { label: "Not accepted", tone: "red", help: "The team decided not to publish this. See their note." },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral", help: "You withdrew this contribution." },
};

export const CORRECTION_STATUS: Record<CorrectionStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Open", tone: "neutral" },
  IN_REVIEW: { label: "In review", tone: "blue" },
  RESOLVED: { label: "Resolved", tone: "green" },
  DISMISSED: { label: "Dismissed", tone: "red" },
};

export const CONTENT_STATUS: Record<ContentStatus, { label: string; tone: Tone }> = {
  DRAFT: { label: "Draft", tone: "neutral" },
  IN_REVIEW: { label: "In review", tone: "amber" },
  PUBLISHED: { label: "Published", tone: "green" },
  ARCHIVED: { label: "Archived", tone: "red" },
};

export const CONTRIBUTION_TYPE_LABEL = { PLACE: "Place", BUSINESS: "Business", SERVICE: "Service", NEWS: "Community update", BLOG: "Blog", PHOTO: "Photo" } as const;
export const CORRECTION_KIND_LABEL = { CORRECTION: "Correction", UPDATE: "Update", OWNERSHIP_CLAIM: "Ownership claim" } as const;
