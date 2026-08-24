const CACHE_NAME = 'monte-sinai-app-v2'
const URLS_ESSENCIAIS = ['/admin', '/app', '/manifest.json']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(URLS_ESSENCIAIS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((chaves) =>
      Promise.all(chaves.filter((chave) => chave !== CACHE_NAME).map((chave) => caches.delete(chave)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  event.respondWith(
    fetch(event.request)
      .then((resposta) => {
        const copia = resposta.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia))
        return resposta
      })
      .catch(() => caches.match(event.request))
  )
})
