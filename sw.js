// Service worker : réseau d'abord (toujours la dernière version en ligne),
// copie en cache pour pouvoir ouvrir l'app sans réseau. Firebase n'est jamais mis en cache.
const CACHE = 'handy-tracker-v1';

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
