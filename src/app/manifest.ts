import type { MetadataRoute } from "next";

/**
 * PWA manifest — install-to-home-screen / dock as a standalone app.
 * Personal local use only; no service worker on purpose (the app needs
 * its localhost server anyway, so offline caching would only mislead).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nutrition App",
    short_name: "栄養記録",
    description:
      "食品成分表(八訂)と食事摂取基準(2025)に基づく推定値を提示します。診断・助言は行いません。",
    start_url: "/",
    display: "standalone",
    background_color: "#FFFDFC",
    theme_color: "#2F8C7E",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
