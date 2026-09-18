// Service worker mínimo — instalabilidade do PWA. Sem cache offline no ano 1.
// v3: não interceptar GET (passthrough só adicionava um hop).
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
