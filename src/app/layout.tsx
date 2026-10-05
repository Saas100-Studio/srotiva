import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { loadAppUrl } from "../lib/config/app-url.ts";

import "./globals.css";

const appUrl = new URL(loadAppUrl());
const description = "Turn websites and native feeds into reliable RSS, JSON, and CSV feeds.";
const socialImage = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  type: "image/png",
  alt: "Srotiva — turn websites into reliable feeds",
};

export const viewport: Viewport = {
  themeColor: "#ff4f00",
};

export const metadata: Metadata = {
  metadataBase: appUrl,
  title: {
    default: "Srotiva | Turn websites into reliable feeds",
    template: "%s | Srotiva",
  },
  description,
  applicationName: "Srotiva",
  icons: { icon: "/srotiva-mark.png", shortcut: "/favicon.ico" },
  openGraph: {
    type: "website",
    siteName: "Srotiva",
    locale: "en_US",
    title: "Srotiva | Turn websites into reliable feeds",
    description,
    images: [socialImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Srotiva | Turn websites into reliable feeds",
    description,
    images: [{ url: socialImage.url, alt: socialImage.alt }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
