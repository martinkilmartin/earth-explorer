import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const CACHE_NAME = 'earth-explorer-v5';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/game.js',
  './js/countryColors.js',
  './assets/world.geo.json',
  'https://cdn.jsdelivr.net/npm/phaser@3.70.0/dist/phaser.min.js'
];

describe('service worker', () => {
  /** @type {Record<string, Function>} */
  let listeners;
  let originalSelf;
  let originalCaches;
  let originalFetch;

  beforeEach(async () => {
    vi.resetModules();
    listeners = {};
    originalSelf = globalThis.self;
    originalCaches = globalThis.caches;
    originalFetch = globalThis.fetch;

    globalThis.self = {
      addEventListener: (type, handler) => {
        listeners[type] = handler;
      }
    };

    const cacheStore = new Map();

    globalThis.caches = {
      open: vi.fn().mockImplementation(async name => {
        if (!cacheStore.has(name)) {
          cacheStore.set(name, { addAll: vi.fn(async urls => urls) });
        }
        return cacheStore.get(name);
      }),
      keys: vi.fn().mockResolvedValue(['old-cache', CACHE_NAME]),
      delete: vi.fn().mockResolvedValue(true),
      match: vi.fn().mockResolvedValue(undefined)
    };

    globalThis.fetch = vi.fn().mockResolvedValue('network-response');

    await import('../sw.js');
  });

  afterEach(() => {
    if (originalSelf === undefined) {
      delete globalThis.self;
    } else {
      globalThis.self = originalSelf;
    }

    if (originalCaches === undefined) {
      delete globalThis.caches;
    } else {
      globalThis.caches = originalCaches;
    }

    if (originalFetch === undefined) {
      delete globalThis.fetch;
    } else {
      globalThis.fetch = originalFetch;
    }
  });

  it('pre-caches assets during install', async () => {
    const installEventPromises = [];
    const event = {
      waitUntil: promise => installEventPromises.push(Promise.resolve(promise))
    };

    listeners.install(event);

    await Promise.all(installEventPromises);

    expect(globalThis.caches.open).toHaveBeenCalledWith(CACHE_NAME);
    const cacheInstance = await globalThis.caches.open.mock.results[0].value;
    expect(cacheInstance.addAll).toHaveBeenCalledWith(PRECACHE_URLS);
  });

  it('removes outdated caches during activate', async () => {
    const activatePromises = [];
    const event = {
      waitUntil: promise => activatePromises.push(Promise.resolve(promise))
    };

    listeners.activate(event);
    await Promise.all(activatePromises);

    expect(globalThis.caches.keys).toHaveBeenCalled();
    expect(globalThis.caches.delete).toHaveBeenCalledWith('old-cache');
    expect(globalThis.caches.delete).not.toHaveBeenCalledWith(CACHE_NAME);
  });

  it('serves cached responses when available and falls back to network', async () => {
    const respondWith = vi.fn();
    const request = { url: '/foo' };

    // Cached response path
    globalThis.caches.match.mockResolvedValueOnce('cached');
    listeners.fetch({ request, respondWith });
    const cachedPromise = respondWith.mock.calls[0][0];
    await expect(cachedPromise).resolves.toBe('cached');
    expect(globalThis.fetch).not.toHaveBeenCalled();

    // Network fallback path
    const respondWithFallback = vi.fn();
    globalThis.caches.match.mockResolvedValueOnce(undefined);
    listeners.fetch({ request, respondWith: respondWithFallback });
    const fallbackPromise = respondWithFallback.mock.calls[0][0];
    await expect(fallbackPromise).resolves.toBe('network-response');
    expect(globalThis.fetch).toHaveBeenCalledWith(request);
  });
});
