// Minimale service worker: enkel aanwezig zodat de browser de app installeerbaar
// vindt (PWA-vereiste). Geen offline-caching van de app-bundle, om te vermijden
// dat een oude versie van de site blijft hangen na een nieuwe deploy.
self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', () => {
  // Bewust geen caching: altijd naar het netwerk, zodat updates meteen zichtbaar zijn.
})
