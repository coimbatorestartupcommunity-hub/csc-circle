"use client";

import { useState } from "react";
import Image from "next/image";

/** A private, consent-checked image endpoint must be requested directly. If it
 * is missing, remove the media region instead of leaving a broken image box. */
export function StartupDirectoryImage({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
  containerClassName = "",
}: {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  containerClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return <div className={containerClassName}>
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  </div>;
}
