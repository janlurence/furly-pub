const CACHE = 'furly-v2'
const IMAGE_CACHE = 'furly-images-v1'
const APP_SHELL = ['/', '/manifest.webmanifest', '/icons/furly.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => ![CACHE, IMAGE_CACHE].includes(k)).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET') return

  if (e.request.destination === 'image') {
    e.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(e.request).then(
          (cached) =>
            cached ||
            fetch(e.request).then((res) => {
              if (res.ok || res.type === 'opaque') cache.put(e.request, res.clone())
              return res
            })
        )
      )
    )
    return
  }

  if (url.origin !== self.location.origin) return
  // Network-first for navigation, cache-first for static assets
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/', copy))
          return res
        })
        .catch(() => caches.match('/'))
    )
    return
  }
  e.respondWith(
    caches.match(e.request).then(
      (cached) =>
        cached ||
        fetch(e.request).then((res) => {
          if (res.ok && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'))) {
            const copy = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copy))
          }
          return res
        })
    )
  )
})
