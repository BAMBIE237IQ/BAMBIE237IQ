// Service worker : réseau d'abord (toujours la dernière version en ligne),
// copie en cache pour pouvoir ouvrir l'app sans réseau. Firebase n'est jamais mis en cache.
const CACHE = 'handy-tracker-v6';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (/firebaseio\.com|googleapis\.com\/identitytoolkit|\/api\//.test(url.href)) return;
    e.respondWith(
        fetch(req).then(res => {
            if (res.ok && (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com|unpkg\.com|jsdelivr\.net|gstatic\.com\/firebasejs/.test(url.href))) {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
        }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/') : undefined)))
    );
});

// Notification push envoyée par le serveur (api/cron.js)
self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Handy Tracker', body: e.data ? e.data.text() : '' }; }
    e.waitUntil(self.registration.showNotification(d.title || 'Handy Tracker', {
        body: d.body || '',
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
        tag: d.tag || 'handy-subs',
        renotify: true,
        data: { url: d.url || '/#abonnements', view: 'subscriptions' }
    }));
});

// Clic sur une notification : ouvre (ou ramène) l'app sur l'onglet Abonnements
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const data = e.notification.data || {};
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) { c.postMessage({ view: data.view || 'subscriptions' }); return c.focus(); }
        return self.clients.openWindow(data.url || '/#abonnements');
    }));
});
