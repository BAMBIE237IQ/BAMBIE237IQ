// ==================== NOTIFICATIONS ABONNEMENTS ====================
// Même règle que le rappel Telegram (api/cron.js) : alerte à J-5 et le jour même,
// la cloche liste aussi tout ce qui expire sous 5 jours et les expirés depuis moins de 7 jours.
const SUB_INACTIVE = /annul|stop|inactif|termin|fini|rembours/i;
const SUB_SERVICE_NAMES = { netflix: 'Netflix', spotify: 'Spotify', prime: 'Prime Video', proton: 'ProtonVPN' };

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
    const svc = SUB_SERVICE_NAMES[c.service] || c.service || '';
    return `${svc}${c.account ? ' · compte ' + c.account : ''}${c.profile ? ' · ' + c.profile : ''}`;
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
    if (c && SUB_CONFIG[c.service]) { setSubFilter(c.service); openSubModal(c.id); }
}

// ----- Notifications sur l'appareil (quand l'app est ouverte ; Telegram prend le relais app fermée) -----
function updateNotifPermissionUI() {
    const btn = document.getElementById('notifPermBtn'), txt = document.getElementById('notifPermText');
    if (!btn || !txt) return;
    if (!('Notification' in window)) { btn.hidden = true; txt.textContent = 'Ce navigateur ne gère pas les notifications. Le rappel Telegram de 8 h reste actif.'; return; }
    const p = Notification.permission;
    btn.hidden = p !== 'default';
    txt.textContent = p === 'granted' ? 'Notifications activées sur cet appareil (J-5 et jour J).'
        : p === 'denied' ? 'Notifications bloquées : autorise-les dans les réglages du navigateur.'
        : 'Active les notifications pour être prévenu sur cet appareil.';
}

async function requestNotifPermission() {
    if (!('Notification' in window)) return;
    const p = await Notification.requestPermission();
    updateNotifPermissionUI();
    if (p === 'granted') { toast('Notifications activées ✓'); maybeShowDeviceNotifications(getSubAlerts()); }
}

function maybeShowDeviceNotifications(alerts) {
    if (!('Notification' in window) || Notification.permission !== 'granted' || isInitialLoad) return;
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
