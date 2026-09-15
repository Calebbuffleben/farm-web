// Service worker mínimo — instalabilidade do PWA. Sem cache offline no ano 1.
// v2: não interceptar POST nem cross-origin — respondWith(fetch) nisso
// derruba /invites/accept-public quando o API está em outro host.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  let url;
  try {
    url = new URL(event.request.url);
  } catch {
    return;
  }
  if (url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request));
});
