import type { NextConfig } from "next";

// Empty by default so local dev and the custom domain both serve from root.
// GitHub Actions sets this to "/wingstour" while the site is on github.io;
// deleting that repo variable is the only change needed once the domain lands.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static export: no Node server at runtime. Supabase is the only backend.
  output: "export",
  basePath,
  // The image optimizer needs a server, which a static export doesn't have.
  images: { unoptimized: true },
  // Emit /rankings/index.html rather than /rankings.html so Pages serves nested
  // routes without redirect surprises.
  trailingSlash: true,
};

export default nextConfig;
