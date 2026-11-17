// FLUENT 90 service worker: network first (always the latest version), offline copy, push reminders.
const CACHE = 'fluent90-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('fluent90-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (/firebaseio\.com|identitytoolkit|securetoken|generativelanguage|\/api\//.test(url.href)) return;
    e.respondWith(
        fetch(req).then(res => {
            if (res.ok && ((url.origin === location.origin && url.pathname.startsWith('/fluent/')) || /fonts\.(googleapis|gstatic)\.com|unpkg\.com|gstatic\.com\/firebasejs/.test(url.href))) {
                const copy = res.clone();
                caches.open(CACHE).then(c => c.put(req, copy));
            }
            return res;
        }).catch(() => caches.match(req).then(r => r || (req.mode === 'navigate' ? caches.match('/fluent/') : undefined)))
    );
});
self.addEventListener('push', e => {
    let d = {};
    try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Fluent 90', body: e.data ? e.data.text() : '' }; }
    e.waitUntil(self.registration.showNotification(d.title || 'Fluent 90', {
        body: d.body || '', icon: '/fluent/icon-192.png', badge: '/fluent/icon-192.png',
        tag: d.tag || 'fluent90', renotify: true, data: { url: d.url || '/fluent/#today' }
    }));
});
self.addEventListener('notificationclick', e => {
    e.notification.close();
    const url = (e.notification.data && e.notification.data.url) || '/fluent/#today';
    e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
        for (const c of list) if (c.url.includes('/fluent/')) return c.focus();
        return self.clients.openWindow(url);
    }));
});
