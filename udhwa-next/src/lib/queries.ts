import "server-only";
import { cache } from "react";
import { orNull } from "@/lib/api-client";
import type {
  AuthorDetail, BlogDetail, BlogList, BusinessDetail, BusinessList, Category, HomeData, NewsDetail, NewsList, PhotoDetail,
  PhotoList, PlaceDetail, PlaceList, RedirectResult, SearchResult, ServiceDetail, ServiceList, SiteInfo, SitemapData,
} from "@/lib/api-client";
import { freshApi, publicApi } from "./api";

/**
 * Read-side data for public pages — all served by the Udhwa API.
 * Same function names as before the monorepo split, so pages didn't change.
 */

type ListArgs = { category?: string; q?: string; page?: number };
const enc = encodeURIComponent;

export const getPrimaryLocality = cache(async () => (await publicApi.get<SiteInfo>("/v1/site")).locality);
export const getHomeData = () => publicApi.get<HomeData>("/v1/home");
export const getCategories = cache((kind: "PLACE" | "BUSINESS" | "SERVICE" | "NEWS" | "BLOG" | "PHOTO") => publicApi.get<Category[]>(`/v1/categories/${kind.toLowerCase()}`));

export const listPlaces = (a: ListArgs) => publicApi.get<PlaceList>("/v1/places", { query: a });
export const listBusinesses = (a: ListArgs) => publicApi.get<BusinessList>("/v1/businesses", { query: a });
export const listServices = (a: ListArgs) => publicApi.get<ServiceList>("/v1/services", { query: a });
export const listNews = (a: ListArgs) => publicApi.get<NewsList>("/v1/news", { query: a });
export const listBlogs = (a: ListArgs & { tag?: string }) => publicApi.get<BlogList>("/v1/blogs", { query: a });
export const listPhotos = (a: { page?: number; place?: string; service?: string; category?: string }) => publicApi.get<PhotoList>("/v1/photos", { query: a });

export const getPlace = cache((slug: string) => orNull(publicApi.get<PlaceDetail>(`/v1/places/${enc(slug)}`)));
export const getBusiness = cache((slug: string) => orNull(publicApi.get<BusinessDetail>(`/v1/businesses/${enc(slug)}`)));
export const getService = cache((slug: string) => orNull(publicApi.get<ServiceDetail>(`/v1/services/${enc(slug)}`)));
export const getNews = cache((slug: string) => orNull(publicApi.get<NewsDetail>(`/v1/news/${enc(slug)}`)));
export const getBlog = cache((slug: string) => orNull(publicApi.get<BlogDetail>(`/v1/blogs/${enc(slug)}`)));
export const getPhoto = cache((id: string) => orNull(publicApi.get<PhotoDetail>(`/v1/photos/${enc(id)}`)));
export const getAuthor = cache((slug: string) => orNull(publicApi.get<AuthorDetail>(`/v1/authors/${enc(slug)}`)));

export const search = (q: string, type?: string) => freshApi.get<SearchResult>("/v1/search", { query: { q, type } });
export const getSitemapData = () => publicApi.get<SitemapData>("/v1/sitemap", { next: { revalidate: 3600, tags: ["content"] } });

export async function findRedirect(path: string) {
  // Uncached: a cached "no redirect" would hide a redirect an admin has just added.
  return (await freshApi.get<RedirectResult>("/v1/redirects/resolve", { query: { path } })).redirect;
}
