import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

function worker() {
  const handlers: Record<string, (event: any) => void> = {};
  const cache = { put: vi.fn(), match: vi.fn().mockResolvedValue(new Response('offline')) };
  const caches = { open: vi.fn().mockResolvedValue(cache), keys: vi.fn().mockResolvedValue(['other-app', 'hox-gateway-offline-old']), delete: vi.fn() };
  const fetch = vi.fn().mockResolvedValue(new Response('online', { headers: { 'Content-Type': 'text/html' } }));
  const self = { location: { origin: 'https://dash.houseofexp.com' }, addEventListener: (name: string, handler: (event: any) => void) => { handlers[name] = handler; }, skipWaiting: vi.fn(), clients: { claim: vi.fn() } };
  runInNewContext(readFileSync('public/sw.js', 'utf8'), { self, fetch, caches, URL, Response });
  return { handlers, cache, caches, fetch };
}

function navigation(path = '/') {
  return { request: { url: `https://dash.houseofexp.com${path}`, mode: 'navigate', method: 'GET' }, respondWith: vi.fn() };
}

describe('gateway PWA', () => {
  it('provides standalone metadata and real PNG icons', () => {
    const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8'));
    expect(manifest).toMatchObject({ id: '/', start_url: '/', scope: '/', display: 'standalone' });
    for (const icon of manifest.icons) {
      const png = readFileSync(`public${icon.src}`);
      expect(png.subarray(1, 4).toString()).toBe('PNG');
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
    expect(readFileSync('index.html', 'utf8')).toContain('crossorigin="use-credentials"');
  });
  it('caches only the offline notice during installation', async () => {
    const w = worker();
    const waitUntil = vi.fn();
    w.handlers.install({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(w.fetch).toHaveBeenCalledWith('/offline.html', { cache: 'reload' });
    expect(w.cache.put).toHaveBeenCalledOnce();
    expect(w.cache.put.mock.calls[0][0]).toBe('/offline.html');
  });
  it('refuses to cache Access redirects during installation', async () => {
    const w = worker();
    w.fetch.mockResolvedValue({ ok: true, redirected: true });
    const waitUntil = vi.fn();
    w.handlers.install({ waitUntil });
    await expect(waitUntil.mock.calls[0][0]).rejects.toThrow('Offline page unavailable');
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it('does not intercept APIs, login paths, other origins, or writes', () => {
    const w = worker();
    const events = [navigation('/api/session'), navigation('/cdn-cgi/access/login'),
      { ...navigation(), request: { url: 'https://crm.houseofexp.com/', mode: 'navigate', method: 'GET' } },
      { ...navigation(), request: { url: 'https://dash.houseofexp.com/api/session/login', mode: 'navigate', method: 'POST' } }];
    for (const event of events) { w.handlers.fetch(event); expect(event.respondWith).not.toHaveBeenCalled(); }
  });
  it('returns fresh navigation responses without caching and preserves auth failures', async () => {
    const w = worker();
    w.fetch.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    const event = navigation();
    w.handlers.fetch(event);
    const response = await event.respondWith.mock.calls[0][0];
    expect(response.status).toBe(401);
    expect(w.cache.put).not.toHaveBeenCalled();
    expect(w.cache.match).not.toHaveBeenCalled();
  });
  it('serves the offline notice only on network failure', async () => {
    const w = worker();
    w.fetch.mockRejectedValue(new TypeError('offline'));
    const event = navigation();
    w.handlers.fetch(event);
    expect(await (await event.respondWith.mock.calls[0][0]).text()).toBe('offline');
    expect(w.cache.put).not.toHaveBeenCalled();
  });
  it('cleans up only this gateway cache namespace', async () => {
    const w = worker();
    const waitUntil = vi.fn();
    w.handlers.activate({ waitUntil });
    await waitUntil.mock.calls[0][0];
    expect(w.caches.delete).toHaveBeenCalledExactlyOnceWith('hox-gateway-offline-old');
  });
});
