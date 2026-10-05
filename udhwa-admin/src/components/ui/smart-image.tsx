"use client";

import Image, { type ImageProps } from "next/image";
import { cloudinaryLoader, isCloudinaryUrl } from "@/lib/media-url";

/**
 * next/image with a Cloudinary loader when the source is a Cloudinary URL.
 * (Loaders are functions, so this has to live in a client component.)
 */
export function SmartImage(props: Omit<ImageProps, "loader"> & { src: string }) {
  const { src, alt, ...rest } = props;
  return <Image src={src} alt={alt} loader={isCloudinaryUrl(src) ? cloudinaryLoader : undefined} {...rest} />;
}
