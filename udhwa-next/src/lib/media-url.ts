/**
 * Image URL helpers, safe for both server and client bundles.
 *
 * Cloudinary images are delivered straight from Cloudinary's CDN with
 * automatic format (AVIF/WebP) and quality, resized per breakpoint by
 * next/image's srcset. Static seed images go through Next's optimizer.
 */

export function isCloudinaryUrl(src: string) {
  return src.startsWith("https://res.cloudinary.com/");
}

/**
 * Insert a transformation segment right after `/upload/`.
 * We always store Cloudinary's untransformed `secure_url`, so a plain insert is correct.
 */
export function cloudinaryTransform(src: string, transform: string) {
  if (!isCloudinaryUrl(src)) return src;
  return src.replace("/upload/", `/upload/${transform}/`);
}

export function cloudinaryLoader({ src, width, quality }: { src: string; width: number; quality?: number }) {
  const q = quality ? `q_${quality}` : "q_auto";
  return cloudinaryTransform(src, `f_auto,${q},c_limit,w_${width}`);
}

/** A fixed-size social/OG image URL for a media record. */
export function ogImageUrl(src: string) {
  if (isCloudinaryUrl(src)) return cloudinaryTransform(src, "f_jpg,q_auto,c_fill,g_auto,w_1200,h_630");
  return src;
}
