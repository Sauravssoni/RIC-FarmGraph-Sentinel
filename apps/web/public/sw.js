/* FarmGraph Rakshak demo service worker (demo-grade; production should use Workbox).
 *
 * Base-path safe: this file is served at <base>/sw.js, so its own URL tells us
 * the site base ("/" locally, "/<repo>/" on GitHub Pages project sites). Every
 * cached route and match prefix is derived from that — no build-time config.
 */
const BASE = new URL("./", self.location.href).pathname; // e.g. "/" or "/RIC-FarmGraph-Sentinel/"
const SHELL = "fgr-shell-v2";
const RUNTIME = "fgr-runtime-v2";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL)
      .then((cache) => cache.addAll([BASE, `${BASE}command-centre/`, `${BASE}manifest.webmanifest`]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => ![SHELL, RUNTIME].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Cache-first for hashed static assets and the ONNX screening bundle
  // (model + wasm runtime + labels — large, immutable, needed offline in-field).
  if (
    url.pathname.startsWith(`${BASE}_next/static`) ||
    url.pathname.startsWith(`${BASE}icons`) ||
    url.pathname.startsWith(`${BASE}models`) ||
    url.pathname.startsWith(`${BASE}ort`)
  ) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        const copy = res.clone();
        caches.open(RUNTIME).then((c) => c.put(request, copy));
        return res;
      })),
    );
    return;
  }

  // Network-first for navigations, falling back to cached app shell.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(RUNTIME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match(`${BASE}command-centre/`))),
    );
  }
});
