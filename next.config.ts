import type { NextConfig } from "next";

// Static export, servable from either host:
// - GitHub Pages serves from a project subpath (chenicus.github.io/dancefest),
//   so that build needs every asset/route prefixed with basePath. Set only by
//   the Pages workflow (see .github/workflows) via GITHUB_PAGES=true.
// - Vercel (hellodancefest.vercel.app) serves from the domain root, so it
//   must NOT get a basePath — it just builds with NODE_ENV=production like
//   any other Vercel deploy, with GITHUB_PAGES unset.
// `images.unoptimized` is required either way because the default image
// optimizer needs a running server, which a static export does not have.
const basePath = process.env.GITHUB_PAGES === "true" ? "/dancefest" : "";

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
