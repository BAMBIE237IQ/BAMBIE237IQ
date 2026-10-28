// ==================== NOTIFICATIONS ABONNEMENTS ====================
// Même règle que le rappel Telegram (api/cron.js) : alerte à J-5 et le jour même,
// la cloche liste aussi tout ce qui expire sous 5 jours et les expirés depuis moins de 7 jours.
const SUB_INACTIVE = /annul|stop|inactif|termin|fini|rembours/i;

function subDaysLeft(end) {
    const [y, m, d] = String(end).split('-').map(Number);
    if (!y || !m || !d) return null;
    const t = new Date();
    return Math.round((new Date(y, m - 1, d) - new Date(t.getFullYear(), t.getMonth(), t.getDate())) / 86400000);
}

function getSubAlerts() {
    const out = [];
    for (const c of S.subscriptions || []) {
        if (!c || !c.end || c.suspended) continue;
        if (c.duration && /life|vie/i.test(c.duration)) continue;
        if (c.status && SUB_INACTIVE.test(c.status)) continue;
        const diff = subDaysLeft(c.end);
        if (diff === null || diff > 5 || diff < -7) continue;
        out.push({ c, diff });
    }
    // Jour J et les plus proches d'abord, les expirés à la fin
    const rank = d => d < 0 ? 100 - d : d;
    return out.sort((a, b) => rank(a.diff) - rank(b.diff));
}

function subEndShort(end) { const [y, m, d] = String(end).split('-'); return d && m ? `${+d}/${+m}` : end; }

function subAlertLabel(diff) {
    if (diff === 0) return 'Aujourd’hui';
    if (diff > 0) return `J-${diff}`;
    return `Expiré (${-diff} j)`;
}

function subAlertTitle(c) {
    // Nom personnalisé du compte s'il existe (ex. « Spotify Famille »), sinon « Spotify · Compte 1 »
    const acc = c.account ? subAccountLabel(c.service, c.account) : subServiceName(c.service);
    return `${acc}${c.profile ? ' · ' + c.profile : ''}`;
}

function renderNotifications() {
    const alerts = getSubAlerts(), accAlerts = typeof getAccountRenewAlerts === 'function' ? getAccountRenewAlerts() : [];
    const totalAlerts = alerts.length + accAlerts.length;
    document.querySelectorAll('.notif-count').forEach(el => {
        el.textContent = totalAlerts > 9 ? '9+' : String(totalAlerts);
        el.hidden = totalAlerts === 0;
    });
    document.querySelectorAll('.notif-btn').forEach(b => {
        b.classList.toggle('has-alerts', totalAlerts > 0);
        b.setAttribute('aria-label', totalAlerts ? `${totalAlerts} alerte${totalAlerts > 1 ? 's' : ''} abonnements` : 'Aucune alerte');
    });

    const list = document.getElementById('notifList');
    if (list) {
        const accHtml = accAlerts.map(a => `<button class="notif-item ${a.diff < 0 ? 'expired' : a.diff === 0 ? 'today' : 'soon'}" onclick="openAccountFromNotif('${escAttr(a.service)}')">
                <span class="notif-dot"></span>
                <span class="notif-text"><strong>Compte à repayer · ${escHtml(subAccountLabel(a.service, a.acc))}</strong><span>${escHtml(subServiceName(a.service))} · le ${escHtml(subEndShort(a.date))}</span></span>
                <span class="notif-badge">${subAlertLabel(a.diff)}</span>
            </button>`).join('');
        list.innerHTML = accHtml + (alerts.length ? alerts.map(({ c, diff }) => {
            const lvl = diff < 0 ? 'expired' : diff === 0 ? 'today' : 'soon';
            return `<button class="notif-item ${lvl}" onclick="openSubFromNotif('${escAttr(c.id)}')">
                <span class="notif-dot"></span>
                <span class="notif-text"><strong>${escHtml(c.name || 'Client')}</strong><span>${escHtml(subAlertTitle(c))} · fin le ${escHtml(subEndShort(c.end))}</span></span>
                <span class="notif-badge">${subAlertLabel(diff)}</span>
            </button>`;
        }).join('') : (accHtml ? '' : '<div class="notif-empty">Aucun abonnement ne se termine dans les 5 prochains jours.</div>'));
    }
    updateNotifPermissionUI();
    maybeShowDeviceNotifications(alerts);
}

function openNotifPanel() { renderNotifications(); document.getElementById('notifOverlay').classList.add('active'); }
function closeNotifPanel() { document.getElementById('notifOverlay').classList.remove('active'); }

function openSubFromNotif(id) {
    closeNotifPanel();
    const c = (S.subscriptions || []).find(x => String(x.id) === String(id));
    switchView('subscriptions');
    if (c && subServices()[c.service]) { setSubFilter(c.service); openSubModal(c.id); }
}

// ----- Notifications sur l'appareil (quand l'app est ouverte ; Telegram prend le relais app fermée) -----
// ----- Notifications push : arrivent sur le téléphone même app fermée (envoyées par api/cron.js chaque matin) -----
const VAPID_PUBLIC_KEY = 'BADrdDsq0XOHsky2PafVKaweQwMNwbHpOxWHVu-MxeZYy-KxenIVlE35EgW7z6h2zOigZsHzgsefnZbauBR9zdU';
const PUSH_FLAG = 'handy-push-on';

function pushSupported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; }
function urlB64ToUint8Array(b64) {
    const pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, ch => ch.charCodeAt(0));
}
function pushKey(endpoint) { let h = 5381; for (let i = 0; i < endpoint.length; i++) h = ((h << 5) + h + endpoint.charCodeAt(i)) >>> 0; return 'd' + h.toString(36) + endpoint.length.toString(36); }
function isPushOn() { try { return localStorage.getItem(PUSH_FLAG) === '1'; } catch (e) { return false; } }

function updateNotifPermissionUI() {
    const btn = document.getElementById('notifPermBtn'), off = document.getElementById('notifPushOff'), txt = document.getElementById('notifPermText');
    if (!btn || !txt) return;
    if (off) off.hidden = true;
    if (!pushSupported()) { btn.hidden = true; txt.textContent = 'Ce navigateur ne gère pas les notifications. Sur iPhone : ajoute d\x27abord l\x27app à l\x27écran d\x27accueil.'; return; }
    if (Notification.permission === 'denied') { btn.hidden = true; txt.textContent = 'Notifications bloquées : autorise-les dans les réglages du téléphone pour cette app.'; return; }
    if (isPushOn() && Notification.permission === 'granted') {
        btn.hidden = true; if (off) off.hidden = false;
        txt.textContent = 'Rappels activés sur cet appareil : chaque matin à 8 h (même app fermée) et à chaque ouverture de l\x27app.';
        return;
    }
    btn.hidden = false;
    txt.textContent = 'Reçois une notification sur ce téléphone 5 jours avant la fin d\x27un abonnement et le jour même.';
}

async function requestNotifPermission() {
    if (!pushSupported()) return;
    try {
        const p = await Notification.requestPermission();
        if (p !== 'granted') { updateNotifPermissionUI(); return; }
        const reg = await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY) });
        const j = sub.toJSON();
        await firebase.database().ref('pushSubscriptions/' + pushKey(j.endpoint)).set({ endpoint: j.endpoint, keys: j.keys, device: navigator.userAgent.slice(0, 120), createdAt: new Date().toISOString() });
        try { localStorage.setItem(PUSH_FLAG, '1'); } catch (e) {}
        updateNotifPermissionUI();
        toast('Rappels activés sur ce téléphone ✓');
    } catch (e) {
        console.error('Push', e);
        toast('⚠ Impossible d\x27activer les rappels sur cet appareil');
    }
}

async function disablePush() {
    try {
        const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
        if (sub) { await firebase.database().ref('pushSubscriptions/' + pushKey(sub.endpoint)).remove(); await sub.unsubscribe(); }
    } catch (e) { console.error('Push', e); }
    try { localStorage.removeItem(PUSH_FLAG); } catch (e) {}
    updateNotifPermissionUI();
    toast('Rappels désactivés sur ce téléphone');
}

// Rappel du jour affiché sur l'écran (PC et téléphone) à l'ouverture de l'app : une fois par jour.
// Même « tag » que la notification envoyée par le serveur : elles se remplacent, jamais en double.
function showLocalNotification(title, body) {
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: 'subs-' + localDateStr(), renotify: true, data: { view: 'subscriptions' } };
    if (navigator.serviceWorker) return navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts)).catch(() => { try { new Notification(title, opts); } catch (e) {} });
    try { new Notification(title, opts); } catch (e) {}
}
function maybeShowDeviceNotifications(alerts) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || isInitialLoad) return;
    const today = alerts.filter(a => a.diff === 0), soon = alerts.filter(a => a.diff > 0), late = alerts.filter(a => a.diff < 0 && a.diff >= -3);
    const acc = typeof getAccountRenewAlerts === 'function' ? getAccountRenewAlerts().filter(a => a.diff >= 0 && a.diff <= 3) : [];
    if (!today.length && !soon.length && !late.length && !acc.length) return;
    const key = 'handy-notif-day:' + localDateStr();
    try { if (localStorage.getItem(key)) return; localStorage.setItem(key, '1'); } catch (e) { return; }
    const who = l => l.slice(0, 4).map(a => a.c.name || 'Client').join(', ') + (l.length > 4 ? `… (+${l.length - 4})` : '');
    const lines = [];
    if (today.length) lines.push(`Se termine aujourd'hui : ${who(today)}`);
    if (soon.length) lines.push(`Bientôt : ${soon.slice(0, 4).map(a => `${a.c.name} (J-${a.diff})`).join(', ')}${soon.length > 4 ? '…' : ''}`);
    if (late.length) lines.push(`Expiré : ${who(late)}`);
    if (acc.length) lines.push(`Compte à repayer : ${acc.map(a => subAccountLabel(a.service, a.acc)).join(', ')}`);
    const n = today.length + soon.length + late.length;
    const title = today.length === 1 ? `Abonnement terminé aujourd'hui : ${today[0].c.name}` : today.length ? `${today.length} abonnements se terminent aujourd'hui` : n ? `${n} abonnement${n > 1 ? 's' : ''} à renouveler` : 'Compte à repayer';
    showLocalNotification(title, lines.join('\n'));
}

// Clé du serveur changée : les téléphones déjà inscrits se réinscrivent tout seuls avec la nouvelle clé
async function refreshPushSubscription() {
    if (!pushSupported() || !isPushOn() || Notification.permission !== 'granted') return;
    try {
        const reg = await navigator.serviceWorker.ready, key = urlB64ToUint8Array(VAPID_PUBLIC_KEY);
        let sub = await reg.pushManager.getSubscription();
        const cur = sub && sub.options && sub.options.applicationServerKey ? new Uint8Array(sub.options.applicationServerKey) : null;
        const same = cur && cur.length === key.length && cur.every((v, i) => v === key[i]);
        if (sub && same) return;
        if (sub) { await firebase.database().ref('pushSubscriptions/' + pushKey(sub.endpoint)).remove().catch(() => {}); await sub.unsubscribe(); }
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
        const j = sub.toJSON();
        await firebase.database().ref('pushSubscriptions/' + pushKey(j.endpoint)).set({ endpoint: j.endpoint, keys: j.keys, device: navigator.userAgent.slice(0, 120), createdAt: new Date().toISOString() });
    } catch (e) { console.warn('Push', e); }
}
setTimeout(refreshPushSubscription, 4000);

// Bouton « Tester » : affiche tout de suite une notification sur cet appareil
async function testNotification() {
    if (!('Notification' in window)) return toast('Ce navigateur ne gère pas les notifications');
    if (Notification.permission !== 'granted') { const p = await Notification.requestPermission(); if (p !== 'granted') return toast('Notifications refusées : autorise-les dans les réglages'); }
    await showLocalNotification('Test Handy Tracker ✓', 'Les notifications s’affichent bien sur cet appareil.');
    toast('Notification de test envoyée');
}

// Ouverture depuis une notification (#abonnements) ou un message du service worker
function openViewFromHash() { if (location.hash === '#abonnements') switchView('subscriptions'); }
window.addEventListener('hashchange', openViewFromHash);
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.view) switchView(e.data.view); });
