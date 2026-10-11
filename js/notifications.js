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
        if (!c || !c.end) continue;
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
    const alerts = getSubAlerts();
    document.querySelectorAll('.notif-count').forEach(el => {
        el.textContent = alerts.length > 9 ? '9+' : String(alerts.length);
        el.hidden = alerts.length === 0;
    });
    document.querySelectorAll('.notif-btn').forEach(b => {
        b.classList.toggle('has-alerts', alerts.length > 0);
        b.setAttribute('aria-label', alerts.length ? `${alerts.length} alerte${alerts.length > 1 ? 's' : ''} abonnements` : 'Aucune alerte');
    });

    const list = document.getElementById('notifList');
    if (list) {
        list.innerHTML = alerts.length ? alerts.map(({ c, diff }) => {
            const lvl = diff < 0 ? 'expired' : diff === 0 ? 'today' : 'soon';
            return `<button class="notif-item ${lvl}" onclick="openSubFromNotif('${escAttr(c.id)}')">
                <span class="notif-dot"></span>
                <span class="notif-text"><strong>${escHtml(c.name || 'Client')}</strong><span>${escHtml(subAlertTitle(c))} · fin le ${escHtml(subEndShort(c.end))}</span></span>
                <span class="notif-badge">${subAlertLabel(diff)}</span>
            </button>`;
        }).join('') : '<div class="notif-empty">Aucun abonnement ne se termine dans les 5 prochains jours.</div>';
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
const VAPID_PUBLIC_KEY = 'BGg0hVJMDZO57ph2XW7OQc1WSpkFFQtUeBkynJTwkVKXLMfsWOqUJyXEO6iBcObi0DbTW3Z3EU7CpF6DAeA-G_k';
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
        txt.textContent = 'Rappels activés sur cet appareil : chaque matin à 8 h, à J-5 et le jour de fin, même app fermée.';
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

function maybeShowDeviceNotifications(alerts) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || isInitialLoad || isPushOn()) return;
    for (const { c, diff } of alerts) {
        if (diff !== 5 && diff !== 0) continue;
        const key = `handy-notif:${c.id}:${c.end}:${diff}`;
        try { if (localStorage.getItem(key)) continue; localStorage.setItem(key, '1'); } catch (e) { continue; }
        const title = diff === 0 ? `Abonnement terminé aujourd’hui : ${c.name}` : `Abonnement de ${c.name} : fin dans 5 jours`;
        const opts = { body: `${subAlertTitle(c)} · fin le ${subEndShort(c.end)}`, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag: key, data: { view: 'subscriptions' } };
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(reg => reg.showNotification(title, opts)).catch(() => {});
        } else {
            try { new Notification(title, opts); } catch (e) {}
        }
    }
}

// Ouverture depuis une notification (#abonnements) ou un message du service worker
function openViewFromHash() { if (location.hash === '#abonnements') switchView('subscriptions'); }
window.addEventListener('hashchange', openViewFromHash);
if (navigator.serviceWorker) navigator.serviceWorker.addEventListener('message', e => { if (e.data && e.data.view) switchView(e.data.view); });
