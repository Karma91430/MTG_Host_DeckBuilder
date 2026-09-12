import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(import.meta.dirname),
  serverExternalPackages: ["better-sqlite3"],
  images: {
    // Les visuels de cartes restent servis par le CDN de Scryfall : on ne
    // recopie pas leurs fichiers, on s'y refere.
    remotePatterns: [{ protocol: "https", hostname: "cards.scryfall.io" },
                     { protocol: "https", hostname: "svgs.scryfall.io" }],
  },
};
export default nextConfig;
