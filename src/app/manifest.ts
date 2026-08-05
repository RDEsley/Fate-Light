import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    background_color: "#f3f2ec",
    description: "Clareza financeira. Caminho Certo.",
    display: "standalone",
    icons: [
      { sizes: "192x192", src: "/favicons/favicon-192x192.png", type: "image/png" },
      { sizes: "512x512", src: "/favicons/favicon-512x512.png", type: "image/png" },
    ],
    name: "Fate Light",
    short_name: "Fate Light",
    start_url: "/dashboard",
    theme_color: "#087f73",
  };
}
