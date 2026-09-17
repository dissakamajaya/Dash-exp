// Only a public, data-free offline page is cached. Never cache the gateway,
// session responses, Access redirects, API data, or destination applications.
const CACHE = 'hox-gateway-offline-v1';
const OFFLINE = '/offline.html';
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const response = await fetch(OFFLINE, { cache: 'reload' });
    // Access may redirect an expired session to login. Do not cache that page.
    if (!response.ok || response.redirected || !response.headers.get('Content-Type')?.includes('text/html')) {
      throw new Error('Offline page unavailable');
    }
    const cache = await caches.open(CACHE);
    await cache.put(OFFLINE, response);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('hox-gateway-offline-') && key !== CACHE) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || request.mode !== 'navigate' || url.origin !== self.location.origin ||
      url.pathname.startsWith('/api/') || url.pathname.startsWith('/cdn-cgi/')) return;
  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch {
      const cache = await caches.open(CACHE);
      return await cache.match(OFFLINE) ?? Response.error();
    }
  })());
});
