/**
 * Admin content registry — the single definition of every manageable
 * content type. Drives the admin forms (client), the server-side
 * validation/parsing, list pages, and which public paths to revalidate.
 * Pure data: safe to import from client and server.
 */

export type EntityKey = "place" | "business" | "service" | "news" | "blog" | "photo";

export type OptionSource = "category" | "locality" | "place" | "business" | "service" | "author" | "news" | "blog";

export type FieldDef = {
  name: string;
  label: string;
  type:
    | "text" | "textarea" | "slug" | "url" | "tel" | "email" | "number"
    | "rich" | "media" | "select" | "tags" | "list" | "hours" | "checkbox" | "datetime";
  required?: boolean;
  max?: number;
  hint?: string;
  options?: OptionSource | { value: string; label: string }[];
  group: "main" | "details" | "relations" | "seo" | "publishing";
  half?: boolean;
  placeholder?: string;
};

export type EntityDef = {
  key: EntityKey;
  label: string;
  plural: string;
  titleField: "name" | "title";
  model: "place" | "business" | "service" | "newsArticle" | "blogPost" | "photo";
  categoryKind?: "PLACE" | "BUSINESS" | "SERVICE" | "NEWS" | "BLOG" | "PHOTO";
  publicBase: string;
  hasSlug: boolean;
  hasSeo: boolean;
  hasVerify: boolean;
  fields: FieldDef[];
};

const seo: FieldDef[] = [
  { name: "seoTitle", label: "SEO title", type: "text", max: 70, group: "seo", hint: "Defaults to the title. Aim for 50–60 characters." },
  { name: "seoDescription", label: "Meta description", type: "textarea", max: 170, group: "seo", hint: "Defaults to the summary. Aim for 120–160 characters." },
  { name: "canonicalUrl", label: "Canonical URL", type: "url", max: 500, group: "seo", hint: "Only if this content’s original home is elsewhere." },
  { name: "noIndex", label: "Hide from search engines (noindex)", type: "checkbox", group: "seo" },
];

const languages = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi (हिन्दी)" },
  { value: "hi-Latn", label: "Hinglish" },
];

const geo: FieldDef[] = [
  { name: "latitude", label: "Latitude", type: "number", group: "details", half: true, placeholder: "24.98" },
  { name: "longitude", label: "Longitude", type: "number", group: "details", half: true, placeholder: "87.80" },
];

export const ENTITIES: Record<EntityKey, EntityDef> = {
  place: {
    key: "place", label: "Place", plural: "Places", titleField: "name", model: "place", categoryKind: "PLACE", publicBase: "/places",
    hasSlug: true, hasSeo: true, hasVerify: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120, group: "main" },
      { name: "slug", label: "URL slug", type: "slug", max: 90, group: "main", hint: "Changing it creates a redirect from the old URL." },
      { name: "summary", label: "Summary", type: "textarea", required: true, max: 300, group: "main", hint: "One or two sentences. Used in cards and search results." },
      { name: "about", label: "About", type: "rich", group: "main" },
      { name: "history", label: "History", type: "rich", group: "main" },
      { name: "coverId", label: "Cover image", type: "media", group: "details" },
      { name: "address", label: "Address", type: "text", max: 250, group: "details" },
      ...geo,
      { name: "categoryId", label: "Category", type: "select", options: "category", group: "relations", half: true },
      { name: "localityId", label: "Locality", type: "select", options: "locality", group: "relations", half: true },
      { name: "featured", label: "Feature on home page", type: "checkbox", group: "publishing" },
      ...seo,
    ],
  },
  business: {
    key: "business", label: "Business", plural: "Businesses", titleField: "name", model: "business", categoryKind: "BUSINESS", publicBase: "/businesses",
    hasSlug: true, hasSeo: true, hasVerify: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120, group: "main" },
      { name: "slug", label: "URL slug", type: "slug", max: 90, group: "main", hint: "Changing it creates a redirect from the old URL." },
      { name: "summary", label: "Summary", type: "textarea", required: true, max: 300, group: "main" },
      { name: "about", label: "About", type: "rich", group: "main" },
      { name: "offerings", label: "What they offer", type: "list", group: "main", hint: "One per line, e.g. Groceries" },
      { name: "coverId", label: "Cover image", type: "media", group: "details" },
      { name: "address", label: "Address", type: "text", max: 250, group: "details" },
      { name: "phone", label: "Phone", type: "tel", max: 30, group: "details", half: true },
      { name: "whatsapp", label: "WhatsApp", type: "tel", max: 30, group: "details", half: true },
      { name: "email", label: "Email", type: "email", max: 200, group: "details", half: true },
      { name: "website", label: "Website", type: "url", max: 500, group: "details", half: true },
      { name: "openingHours", label: "Opening hours", type: "hours", group: "details" },
      { name: "hoursNote", label: "Hours note", type: "text", max: 120, group: "details", placeholder: "e.g. Closed on public holidays" },
      ...geo,
      { name: "categoryId", label: "Category", type: "select", options: "category", group: "relations", half: true },
      { name: "localityId", label: "Locality", type: "select", options: "locality", group: "relations", half: true },
      { name: "placeId", label: "Located at / near place", type: "select", options: "place", group: "relations" },
      { name: "featured", label: "Feature on home page", type: "checkbox", group: "publishing" },
      ...seo,
    ],
  },
  service: {
    key: "service", label: "Service", plural: "Services", titleField: "name", model: "service", categoryKind: "SERVICE", publicBase: "/services",
    hasSlug: true, hasSeo: true, hasVerify: true,
    fields: [
      { name: "name", label: "Service", type: "text", required: true, max: 120, group: "main" },
      { name: "slug", label: "URL slug", type: "slug", max: 90, group: "main" },
      { name: "summary", label: "Summary", type: "textarea", required: true, max: 300, group: "main" },
      { name: "description", label: "Description", type: "rich", group: "main" },
      { name: "highlights", label: "What’s included", type: "list", group: "main", hint: "One per line" },
      { name: "providerType", label: "Provider type", type: "select", options: [{ value: "INDIVIDUAL", label: "Individual" }, { value: "BUSINESS", label: "Business" }], required: true, group: "details", half: true },
      { name: "providerName", label: "Provider name", type: "text", required: true, max: 120, group: "details", half: true },
      { name: "serviceArea", label: "Area served", type: "text", max: 150, group: "details" },
      { name: "phone", label: "Phone", type: "tel", max: 30, group: "details", half: true },
      { name: "whatsapp", label: "WhatsApp", type: "tel", max: 30, group: "details", half: true },
      { name: "availability", label: "Availability", type: "text", max: 150, group: "details" },
      { name: "coverId", label: "Image", type: "media", group: "details" },
      { name: "businessId", label: "Provided by business", type: "select", options: "business", group: "relations" },
      { name: "categoryId", label: "Category", type: "select", options: "category", group: "relations", half: true },
      { name: "localityId", label: "Locality", type: "select", options: "locality", group: "relations", half: true },
      { name: "placeId", label: "Near place", type: "select", options: "place", group: "relations" },
      { name: "featured", label: "Feature on home page", type: "checkbox", group: "publishing" },
      ...seo,
    ],
  },
  news: {
    key: "news", label: "News article", plural: "News", titleField: "title", model: "newsArticle", categoryKind: "NEWS", publicBase: "/news",
    hasSlug: true, hasSeo: true, hasVerify: false,
    fields: [
      { name: "title", label: "Headline", type: "text", required: true, max: 200, group: "main" },
      { name: "slug", label: "URL slug", type: "slug", max: 90, group: "main" },
      { name: "excerpt", label: "Standfirst / summary", type: "textarea", required: true, max: 400, group: "main" },
      { name: "content", label: "Article", type: "rich", required: true, group: "main" },
      { name: "sourceName", label: "Source", type: "text", max: 200, group: "details", half: true, hint: "Who/what this report is based on." },
      { name: "sourceUrl", label: "Source link", type: "url", max: 500, group: "details", half: true },
      { name: "coverId", label: "Cover image", type: "media", group: "details" },
      { name: "language", label: "Language", type: "select", options: languages, required: true, group: "details", half: true },
      { name: "authorId", label: "Byline", type: "select", options: "author", group: "details", half: true },
      { name: "tags", label: "Tags", type: "tags", group: "details", hint: "Comma separated" },
      { name: "categoryId", label: "Category", type: "select", options: "category", group: "relations", half: true },
      { name: "localityId", label: "Locality", type: "select", options: "locality", group: "relations", half: true },
      { name: "placeId", label: "Related place", type: "select", options: "place", group: "relations", half: true },
      { name: "businessId", label: "Related business", type: "select", options: "business", group: "relations", half: true },
      { name: "publishedAt", label: "Publish date", type: "datetime", group: "publishing", hint: "Leave empty to use the moment you publish. A future date schedules it." },
      { name: "featured", label: "Featured", type: "checkbox", group: "publishing" },
      ...seo,
    ],
  },
  blog: {
    key: "blog", label: "Blog post", plural: "Blogs", titleField: "title", model: "blogPost", categoryKind: "BLOG", publicBase: "/blogs",
    hasSlug: true, hasSeo: true, hasVerify: false,
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200, group: "main" },
      { name: "slug", label: "URL slug", type: "slug", max: 90, group: "main" },
      { name: "excerpt", label: "Summary", type: "textarea", required: true, max: 400, group: "main" },
      { name: "content", label: "Article", type: "rich", required: true, group: "main" },
      { name: "coverId", label: "Cover image", type: "media", group: "details" },
      { name: "language", label: "Language", type: "select", options: languages, required: true, group: "details", half: true },
      { name: "authorId", label: "Author", type: "select", options: "author", group: "details", half: true },
      { name: "tags", label: "Tags", type: "tags", group: "details", hint: "Comma separated" },
      { name: "categoryId", label: "Category", type: "select", options: "category", group: "relations", half: true },
      { name: "localityId", label: "Locality", type: "select", options: "locality", group: "relations", half: true },
      { name: "placeId", label: "Related place", type: "select", options: "place", group: "relations", half: true },
      { name: "businessId", label: "Related business", type: "select", options: "business", group: "relations", half: true },
      { name: "serviceId", label: "Related service", type: "select", options: "service", group: "relations" },
      { name: "publishedAt", label: "Publish date", type: "datetime", group: "publishing", hint: "Leave empty to use the moment you publish." },
      { name: "featured", label: "Featured", type: "checkbox", group: "publishing" },
      ...seo,
    ],
  },
  photo: {
    key: "photo", label: "Photo", plural: "Photos", titleField: "title", model: "photo", categoryKind: "PHOTO", publicBase: "/photos",
    hasSlug: false, hasSeo: false, hasVerify: false,
    fields: [
      { name: "mediaId", label: "Image", type: "media", required: true, group: "main" },
      { name: "title", label: "Title", type: "text", required: true, max: 150, group: "main" },
      { name: "caption", label: "Caption", type: "textarea", max: 500, group: "main" },
      { name: "credit", label: "Credit", type: "text", max: 120, group: "details", half: true },
      { name: "takenAt", label: "Date taken", type: "datetime", group: "details", half: true },
      { name: "tags", label: "Tags", type: "tags", group: "details" },
      { name: "categoryId", label: "Gallery category", type: "select", options: "category", group: "relations", half: true, hint: "Used to filter the public photo gallery." },
      { name: "placeId", label: "Place", type: "select", options: "place", group: "relations", half: true },
      { name: "businessId", label: "Business", type: "select", options: "business", group: "relations", half: true },
      { name: "serviceId", label: "Service", type: "select", options: "service", group: "relations", half: true },
      { name: "newsId", label: "News article", type: "select", options: "news", group: "relations", half: true },
      { name: "blogId", label: "Blog post", type: "select", options: "blog", group: "relations", half: true },
      { name: "featured", label: "Featured in gallery", type: "checkbox", group: "publishing" },
    ],
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

export function isEntityKey(v: string): v is EntityKey {
  return v in ENTITIES;
}

export function publicPath(key: EntityKey, row: { slug?: string | null; id: string }) {
  return key === "photo" ? `/photos/${row.id}` : `${ENTITIES[key].publicBase}/${row.slug}`;
}
