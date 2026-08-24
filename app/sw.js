// Service worker v4
// The hosting server sends Cache-Control: max-age=31536000 on EVERYTHING, so for the app shell
// (html/js/css/manifest) we always revalidate with the server (cache: "no-cache" -> ETag/304),
// while photos stay cache-first and videos stream directly.
const SHELL = "discloj-shell-v4";
const MEDIA = "discloj-media-v1";
const SHELL_FILES = ["./", "index.html", "css/app.css", "js/app.js", "js/store.js", "js/i18n.js", "js/firebase.js", "js/bible.js", "js/pages-default.js", "js/version.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES.map((f) => new Request(f, { cache: "no-cache" })))).catch(() => {}));
  self.skipWaiting();
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => ![SHELL, MEDIA].includes(k)).map((k) => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.includes("googleapis.com") && !url.hostname.startsWith("fonts")) return; // Firestore / auth
  if (/\.(mp4|webm|mpg)$/i.test(url.pathname) || req.headers.has("range")) return;     // videos stream directly
  const isMedia = /\.(jpe?g|png|webp|gif)$/i.test(url.pathname);
  if (isMedia) {
    // cache-first: photos never change names, and the server's 1-year cache is fine here
    e.respondWith(caches.open(MEDIA).then(async (c) => { const hit = await c.match(req); if (hit) return hit; try { const res = await fetch(req); if (res.ok) c.put(req, res.clone()); return res; } catch { return hit || Response.error(); } }));
    return;
  }
  if (url.origin === location.origin) {
    // app shell: ALWAYS revalidate against the server (bypasses the browser HTTP cache), fall back to cache when offline
    const fresh = req.mode === "navigate"
      ? fetch(url.pathname.endsWith("/") || url.pathname.endsWith(".html") ? new Request(url.href, { cache: "no-cache" }) : new Request(url.href, { cache: "no-cache" }))
      : fetch(new Request(url.href, { cache: "no-cache", credentials: "same-origin" }));
    e.respondWith(fresh.then((res) => { if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone())); return res; })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error()))));
  } else if (url.hostname.startsWith("fonts")) {
    e.respondWith(fetch(req).then((res) => { if (res.ok) caches.open(SHELL).then((c) => c.put(req, res.clone())); return res; }).catch(() => caches.match(req).then((hit) => hit || Response.error())));
  }
});
