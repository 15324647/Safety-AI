// Service worker minimo: rende l'app installabile e veloce da aprire.
// L'analisi AI richiede sempre la connessione.
const CACHE = "safety-ai-v2";
const FILES = [
  "/", "/index.html", "/css/styles.css",
  "/js/app.js", "/js/catalogo.js", "/js/demo.js", "/js/report.js",
  "/vendor/jspdf.umd.min.js", "/manifest.webmanifest",
  "/icons/icon-192.png", "/icons/apple-touch-icon.png",
];
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rete prima, cache come ripiego: così ogni aggiornamento pubblicato su Vercel arriva subito.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.pathname.startsWith("/api/")) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copia = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copia));
      return r;
    }).catch(() => caches.match(e.request).then((m) => m || caches.match("/index.html")))
  );
});
