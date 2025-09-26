/**
 * Service Worker for caching and offline functionality
 * Optimized for performance and minimal resource usage
 */

const CACHE_NAME = 'drawing-app-v1.0.0';
const STATIC_CACHE = 'drawing-static-v1.0.0';
const DYNAMIC_CACHE = 'drawing-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/drawing-worker.js',
    '/manifest.json'
];

// Cache strategies
const CACHE_STRATEGIES = {
    // Cache first for static assets
    CACHE_FIRST: 'cache-first',
    // Network first for dynamic content
    NETWORK_FIRST: 'network-first',
    // Stale while revalidate for frequently updated content
    STALE_WHILE_REVALIDATE: 'stale-while-revalidate'
};

// Install event - cache static files
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('Caching static files...');
                return cache.addAll(STATIC_FILES);
            })
            .then(() => {
                console.log('Static files cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static files:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other non-http requests
    if (!url.protocol.startsWith('http')) {
        return;
    }
    
    event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Determine cache strategy based on request type
        if (isStaticAsset(url.pathname)) {
            return await cacheFirst(request);
        } else if (isAPIRequest(url.pathname)) {
            return await networkFirst(request);
        } else {
            return await staleWhileRevalidate(request);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        
        // Return offline fallback if available
        if (request.destination === 'document') {
            return await getOfflineFallback();
        }
        
        throw error;
    }
}

// Cache first strategy for static assets
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('Network request failed:', error);
        throw error;
    }
}

// Network first strategy for API requests
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        throw error;
    }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
    const cachedResponse = await caches.match(request);
    
    const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
            const cache = caches.open(DYNAMIC_CACHE);
            cache.then((c) => c.put(request, networkResponse.clone()));
        }
        return networkResponse;
    }).catch(() => {
        // Network failed, return cached version if available
        return cachedResponse;
    });
    
    return cachedResponse || fetchPromise;
}

// Helper functions
function isStaticAsset(pathname) {
    const staticExtensions = ['.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.woff', '.woff2', '.ttf'];
    return staticExtensions.some(ext => pathname.endsWith(ext));
}

function isAPIRequest(pathname) {
    return pathname.startsWith('/api/') || pathname.includes('api');
}

async function getOfflineFallback() {
    const cache = await caches.open(STATIC_CACHE);
    const fallback = await cache.match('/index.html');
    
    if (fallback) {
        return fallback;
    }
    
    // Return a basic offline page
    return new Response(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Offline - Drawing App</title>
            <style>
                body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                .offline-message { color: #666; }
            </style>
        </head>
        <body>
            <h1>You're Offline</h1>
            <p class="offline-message">The drawing app is not available offline. Please check your internet connection.</p>
        </body>
        </html>
    `, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// Background sync for saving drawings
self.addEventListener('sync', (event) => {
    if (event.tag === 'save-drawing') {
        event.waitUntil(saveDrawingOffline());
    }
});

async function saveDrawingOffline() {
    try {
        // Get pending drawings from IndexedDB
        const pendingDrawings = await getPendingDrawings();
        
        for (const drawing of pendingDrawings) {
            try {
                await saveDrawingToServer(drawing);
                await removePendingDrawing(drawing.id);
            } catch (error) {
                console.error('Failed to sync drawing:', error);
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Message handling for communication with main thread
self.addEventListener('message', (event) => {
    const { type, data } = event.data;
    
    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;
        case 'CACHE_URLS':
            cacheUrls(data.urls);
            break;
        case 'CLEAR_CACHE':
            clearCache(data.cacheName);
            break;
        case 'GET_CACHE_SIZE':
            getCacheSize().then(size => {
                event.ports[0].postMessage({ type: 'CACHE_SIZE', size });
            });
            break;
    }
});

async function cacheUrls(urls) {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        await cache.addAll(urls);
    } catch (error) {
        console.error('Failed to cache URLs:', error);
    }
}

async function clearCache(cacheName) {
    try {
        await caches.delete(cacheName);
    } catch (error) {
        console.error('Failed to clear cache:', error);
    }
}

async function getCacheSize() {
    try {
        const cacheNames = await caches.keys();
        let totalSize = 0;
        
        for (const cacheName of cacheNames) {
            const cache = await caches.open(cacheName);
            const requests = await cache.keys();
            
            for (const request of requests) {
                const response = await cache.match(request);
                if (response) {
                    const blob = await response.blob();
                    totalSize += blob.size;
                }
            }
        }
        
        return totalSize;
    } catch (error) {
        console.error('Failed to calculate cache size:', error);
        return 0;
    }
}

// IndexedDB helpers for offline storage
async function getPendingDrawings() {
    // Implementation would depend on your IndexedDB setup
    return [];
}

async function saveDrawingToServer(drawing) {
    // Implementation would depend on your server API
    console.log('Saving drawing to server:', drawing);
}

async function removePendingDrawing(id) {
    // Implementation would depend on your IndexedDB setup
    console.log('Removing pending drawing:', id);
}

// Push notification handling
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        const options = {
            body: data.body,
            icon: '/icon-192x192.png',
            badge: '/badge-72x72.png',
            vibrate: [100, 50, 100],
            data: {
                dateOfArrival: Date.now(),
                primaryKey: data.primaryKey
            },
            actions: [
                {
                    action: 'explore',
                    title: 'Open App',
                    icon: '/icon-192x192.png'
                },
                {
                    action: 'close',
                    title: 'Close',
                    icon: '/icon-192x192.png'
                }
            ]
        };
        
        event.waitUntil(
            self.registration.showNotification(data.title, options)
        );
    }
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});