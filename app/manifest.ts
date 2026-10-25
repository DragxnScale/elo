import type { MetadataRoute } from "next";

/** Lets phones "Add to Home Screen" as Kleos with its own icon and colours. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kleos",
    short_name: "Kleos",
    description: "Live ELO leaderboards with share codes and match tracking",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfaf7",
    theme_color: "#fbfaf7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
