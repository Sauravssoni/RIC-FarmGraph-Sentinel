/**
 * Base-path helper for static-asset URLs.
 *
 * Next.js applies `basePath` automatically to `next/link`, `useRouter` and
 * `/_next` build assets — but NOT to hand-written URLs (fetch() calls,
 * metadata.manifest/icons, service-worker registration). Every public-asset
 * URL in app code must go through withBase() so the site works both at the
 * domain root (local preview, Render) and under a project subpath
 * (GitHub Pages: https://<user>.github.io/<repo>/).
 *
 * NEXT_PUBLIC_BASE_PATH is inlined at build time (same env var next.config.mjs
 * reads to configure basePath/assetPrefix), so one build stays consistent.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function withBase(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${BASE_PATH}${p}`;
}
