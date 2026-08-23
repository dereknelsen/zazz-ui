export const appName = "Zazz Design Framework";

/** Canonical origin for absolute URLs (OG images, sitemaps, etc.). */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const docsRoute = "/docs";
export const docsImageRoute = "/og/docs";
export const docsContentRoute = "/llms.mdx/docs";

// fill this with your actual GitHub info, for example:
export const gitConfig = {
  user: "dereknelsen",
  repo: "zazz-ui",
  branch: "main",
};
