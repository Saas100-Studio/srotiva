import type { Metadata } from "next";

type PublicPageMetadata = {
  title: string;
  description: string;
  path: string;
};

const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png" as const,
  alt: "Srotiva — turn websites into reliable feeds",
};

export function createPublicPageMetadata({
  title,
  description,
  path,
}: PublicPageMetadata): Metadata {
  const socialTitle = `${title} | Srotiva`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: "Srotiva",
      locale: "en_US",
      title: socialTitle,
      description,
      url: path,
      images: [socialImage],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: [{ url: socialImage.url, alt: socialImage.alt }],
    },
  };
}
