import type { NextConfig } from "next";

// Static export for GitHub Pages. The site is served from a project subpath
// (chenicus.github.io/dancefest), so every asset and route is prefixed with
// basePath. `images.unoptimized` is required because the default image
// optimizer needs a running server, which Pages does not provide.
const basePath = process.env.NODE_ENV === "production" ? "/dancefest" : "";

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
  // Surface the basePath to client components that build root-relative URLs
  // by hand (plain <img src="/dj/…">, which Next does not rewrite).
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
};

export default nextConfig;
