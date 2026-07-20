/**
 * Prepare a GitHub Pages-shaped serve root for production-subpath e2e:
 *
 *   tests/e2e/RIC-FarmGraph-Sentinel/  ← copy of apps/web/out
 *
 * Serving tests/e2e at :4173 then exposes the site ONLY at
 * /RIC-FarmGraph-Sentinel/ — exactly like a GitHub Pages project site.
 * Nothing exists at the domain root, so root-absolute asset URLs fail loudly.
 */
import { cpSync, existsSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, "../../apps/web/out");
const dest = path.resolve(here, "RIC-FarmGraph-Sentinel");

if (!existsSync(path.join(out, "index.html"))) {
  console.error("apps/web/out missing — build first: npm run build:subpath");
  process.exit(1);
}
rmSync(dest, { recursive: true, force: true });
cpSync(out, dest, { recursive: true });
console.log(`subpath serve root ready: ${dest}`);
