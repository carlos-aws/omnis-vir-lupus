import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';

const output = resolve('dist');
async function list(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const results = await Promise.all(entries.map(entry => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? list(path) : [path];
  }));
  return results.flat();
}
const files = (await list(output)).filter(path => !path.endsWith('/sw.js')).sort();
const digest = createHash('sha256');
for (const file of files) digest.update(relative(output, file)).update(await readFile(file));
const version = digest.digest('hex').slice(0, 16);
const assets = files.map(file => relative(output, file).replaceAll('\\', '/'));
const source = `/* Generated from every built game asset. Do not edit dist/sw.js. */
const BASE = new URL('./', self.location.href);
const PREFIX = 'omnis-vir-lupus:' + BASE.pathname + ':';
const CACHE = PREFIX + '${version}';
const ASSETS = ${JSON.stringify(assets)};
const URLS = new Set(ASSETS.map(path => new URL(path, BASE).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(
    ASSETS.map(path => new Request(new URL(path, BASE), { cache: 'reload' }))
  )));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith(PREFIX) && name !== CACHE)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE_UPDATE') self.skipWaiting();
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin || !url.pathname.startsWith(BASE.pathname)) return;
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      // The shell and its hashed assets always come from the same release.
      return await cache.match(new URL('index.html', BASE).href) || fetch(request);
    })());
  } else if (URLS.has(url.href)) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(request);
      if (hit) return hit;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })());
  }
});
`;
await writeFile(resolve(output, 'sw.js'), source);
console.log(`Offline cache ${version}: ${assets.length} local assets.`);
