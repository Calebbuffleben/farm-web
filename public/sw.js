// Service worker mínimo — instalabilidade do PWA. Sem cache offline no ano 1:
// o inbox depende de dados frescos e cache de API criaria estado fantasma.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Passthrough — necessário para o prompt de instalação em alguns browsers.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
