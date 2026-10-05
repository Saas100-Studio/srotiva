import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Srotiva",
    short_name: "Srotiva",
    description: "Turn websites and native feeds into reliable RSS, JSON, and CSV feeds.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff4f00",
    icons: [{ src: "/srotiva-mark.png", sizes: "40x40", type: "image/png" }],
  };
}
