import { LandingPage } from "../components/landing-page.tsx";

import { loadAppUrl } from "../lib/config/app-url.ts";
import { createPublicPageMetadata } from "../lib/seo/metadata.ts";

export const metadata = createPublicPageMetadata({
  title: "Reliable feeds from the web",
  description: "Turn websites and native feeds into reliable RSS, JSON, and CSV feeds.",
  path: "/",
});

export default function Home() {
  const appUrl = loadAppUrl();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Srotiva",
    url: appUrl,
    description: "Turn websites and native feeds into reliable RSS, JSON, and CSV feeds.",
    applicationCategory: "UtilitiesApplication",
    operatingSystem: "Web",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }}
      />
      <LandingPage />
    </>
  );
}
