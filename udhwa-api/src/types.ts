/**
 * Response types of the Udhwa API, for TypeScript clients (web, admin,
 * a future React Native app). Import with `import type` only.
 *
 * On the wire dates are ISO-8601 strings; the clients' api-client revives
 * them into Date objects, which is what these types describe.
 *
 * `npm run contract` expands everything exported here into src/contract.ts,
 * a dependency-free copy that the front-ends keep as src/lib/api-contract.ts.
 */
import type * as pub from "./services/public";
import type * as community from "./services/community";
import type * as content from "./services/admin/content";
import type * as manage from "./services/admin/manage";
import type * as review from "./services/admin/review";
import type * as seo from "./services/admin/seo";
import type { SearchHit } from "./services/search";
import type { CurrentUser } from "./lib/auth";

type R<F extends (...args: never[]) => unknown> = Awaited<ReturnType<F>>;

export type { CurrentUser, SearchHit };
export type { EntityKey, OptionSource } from "./lib/entities";
export type { SearchKind } from "./lib/search-query";
export type { Area } from "./services/public";
export type { Option, OptionMap, LibraryItem } from "./services/admin/options";
export type {
  PlaceCardData, BusinessCardData, ServiceCardData, NewsCardData, BlogCardData, PhotoCardData,
} from "./services/public";

// Public
export type SiteInfo = { locality: R<typeof pub.getPrimaryLocality> };
export type HomeData = R<typeof pub.getHomeData> & SiteInfo;
export type Category = R<typeof pub.getCategories>[number];
export type PlaceList = R<typeof pub.listPlaces>;
export type BusinessList = R<typeof pub.listBusinesses>;
export type ServiceList = R<typeof pub.listServices>;
export type NewsList = R<typeof pub.listNews>;
export type BlogList = R<typeof pub.listBlogs>;
export type PhotoList = R<typeof pub.listPhotos>;
export type PlaceDetail = NonNullable<R<typeof pub.getPlace>>;
export type BusinessDetail = NonNullable<R<typeof pub.getBusiness>>;
export type ServiceDetail = NonNullable<R<typeof pub.getService>>;
export type NewsDetail = NonNullable<R<typeof pub.getNews>>;
export type BlogDetail = NonNullable<R<typeof pub.getBlog>>;
export type PhotoDetail = NonNullable<R<typeof pub.getPhoto>>;
export type AuthorDetail = NonNullable<R<typeof pub.getAuthor>>;
export type SearchResult = { q: string; kind: string | null; hits: SearchHit[] };
export type SitemapData = R<typeof pub.getSitemapData>;
export type RedirectResult = { redirect: { toPath: string; permanent: boolean } | null };

// Auth & member
export type MeResponse = { user: CurrentUser | null };
export type Providers = { google: boolean; uploads: boolean; uploadLimits: { maxBytes: number; mimeTypes: readonly string[] } };
export type AccountData = R<typeof community.getAccount>;
export type MyContribution = R<typeof community.getMyContribution>;
export type ContributionOptions = R<typeof community.contributionFormOptions>;
export type CorrectionTarget = NonNullable<R<typeof community.correctionTarget>>;
export type UploadedMedia = { id: string; url: string; width: number | null; height: number | null; alt: string };

// Admin
export type AdminCounts = R<typeof review.adminCounts>;
export type AdminDashboard = R<typeof review.dashboard>;
export type AdminContributionList = R<typeof review.listContributions>;
export type AdminContribution = R<typeof review.getContribution>;
export type AdminCorrectionList = R<typeof review.listCorrections>;
export type AdminEntityList = R<typeof content.listEntities>;
export type AdminEntityMeta = R<typeof content.newEntityMeta>;
export type AdminEntity = R<typeof content.getEntity>;
export type AdminPreview = R<typeof content.previewEntity>;
export type AdminSaveResult = R<typeof content.saveEntity>;
export type AdminCategories = R<typeof manage.listCategories>;
export type AdminTags = R<typeof manage.listTags>;
export type AdminAuthors = R<typeof manage.listAuthors>;
export type AdminLocalities = R<typeof manage.listLocalities>;
export type AdminMediaList = R<typeof manage.listMedia>;
export type AdminUserList = R<typeof manage.listUsers>;
export type AdminMessages = R<typeof manage.listMessages>;
export type AdminRedirects = R<typeof manage.listRedirects>;
export type AdminActivity = R<typeof manage.listActivity>;
export type AdminSeoReport = R<typeof seo.seoReport>;
export type { SeoIssue } from "./services/admin/seo";
export type AdminMediaUsage = R<typeof manage.mediaUsage>;
export type ModerationResult = { ok: true; draft: { href: string; entity: string; id: string } | null };
