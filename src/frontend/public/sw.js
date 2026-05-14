const CACHE_NAME = 'hjtpx-v1.0.0';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json', '/favicon.png'];

const apiCacheName = 'hjtpx-api-v1';
const apiCacheList = ['/api/v1/health'];

self.addEventListener('install', event => {
  console.log('[Service Worker] Installing Service Worker...');
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Caching Static Assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Install Complete');
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', event => {
  console.log('[Service Worker] Activating Service Worker...');
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && cacheName !== apiCacheName) {
              console.log('[Service Worker] Deleting Old Cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation Complete');
        return self.clients.claim();
      })
  );
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      caches.open(apiCacheName).then(cache => {
        return cache.match(request).then(cachedResponse => {
          if (cachedResponse) {
            fetch(request)
              .then(networkResponse => {
                if (networkResponse.ok) {
                  cache.put(request, networkResponse.clone());
                }
              })
              .catch(() => {});
            return cachedResponse;
          }

          return fetch(request)
            .then(networkResponse => {
              if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              return new Response(JSON.stringify({ error: '离线状态，无法获取数据' }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
        });
      })
    );
    return;
  }

  if (url.origin === location.origin) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request)
          .then(networkResponse => {
            if (networkResponse.ok && request.headers.get('Accept')?.includes('text/html')) {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return caches.match('/');
          });
      })
    );
    return;
  }

  if (url.origin !== location.origin) {
    event.respondWith(
      caches.match(request).then(cachedResponse => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(request).then(networkResponse => {
          if (networkResponse.ok) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});

self.addEventListener('sync', event => {
  console.log('[Service Worker] Background Sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  console.log('[Service Worker] Syncing Data...');
}

self.addEventListener('push', event => {
  console.log('[Service Worker] Push Notification');
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || '您有一条新通知',
      icon: '/favicon.png',
      badge: '/favicon.png',
      vibrate: [100, 50, 100],
      data: {
        url: data.url || '/dashboard'
      },
      actions: [
        { action: 'open', title: '查看' },
        { action: 'close', title: '关闭' }
      ]
    };

    event.waitUntil(self.registration.showNotification(data.title || 'HJTPX 系统', options));
  }
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification Click:', event.action);
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
