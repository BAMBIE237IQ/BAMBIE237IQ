// ==================== CHARLITO STREAMS ====================
// Gestion des abonnements streaming : services, comptes, clients, échéances et CA mensuel.
// Données enregistrées sur l'appareil (localStorage) + export / import JSON.
'use strict';

const STORE_KEY = 'charlito-streams-v1';
const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

// Catalogue de départ : un compte vide par service, aucun client, aucun profil.
const DEFAULT_SERVICES = [
    ['netflix', 'Netflix', '#E50914', 'N'],
    ['crunchyroll', 'Crunchyroll', '#F47521', 'CR'],
    ['primevideo', 'Prime Video', '#00A8E1', 'PV'],
    ['applemusic', 'Apple Music', '#FA2D48', 'AM'],
    ['spotify', 'Spotify', '#1DB954', 'S'],
    ['claudepro', 'Claude Pro', '#D97757', 'C'],
    ['chatgptgo', 'ChatGPT Go', '#10A37F', 'GPT'],
    ['snapplus', 'Snapchat+', '#F5E50A', 'S+'],
    ['capcutpro', 'CapCut Pro', '#25D1DA', 'CC'],
    ['superduolingo', 'Super Duolingo', '#58CC02', 'D'],
    ['disneyplus', 'Disney+', '#113CCF', 'D+']
];

function freshData() {
    const services = {};
    for (const [id, name, color, short] of DEFAULT_SERVICES) services[id] = { name, color, short, accounts: [{ id: uid(), name: 'Compte 1' }] };
    return {
        version: 1,
        settings: { business: 'Charlito Streams', name: '', currency: 'FCFA', alertDays: 5 },
        order: DEFAULT_SERVICES.map(s => s[0]),
        services,
        clients: []
    };
}

let D = load();
let currentSvc = D.order[0];
let caY = new Date().getFullYear(), caM = new Date().getMonth();
let editingId = null;
let homeChart = null;

// ==================== OUTILS ====================
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function fmt(n) { return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' '); }
function money(n) { return `${fmt(n)} ${esc(D.settings.currency || 'FCFA')}`; }
function dateStr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function parseDate(s) { const [y, m, d] = String(s || '').split('-').map(Number); return y && m && d ? new Date(y, m - 1, d) : null; }
function shortDate(s) { const d = parseDate(s); return d ? `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}` : '—'; }
function today0() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function daysLeft(end) { const d = parseDate(end); return d ? Math.round((d - today0()) / 86400000) : null; }
function amountOf(c) { const n = parseInt(String(c.amount || '').replace(/[^\d]/g, ''), 10); return n > 0 ? n : 0; }
function addMonths(s, n) {
    const d = parseDate(s); if (!d) return '';
    const last = new Date(d.getFullYear(), d.getMonth() + n + 1, 0).getDate();
    return dateStr(new Date(d.getFullYear(), d.getMonth() + n, Math.min(d.getDate(), last)));
}
function toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = msg;
    document.getElementById('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2600);
}
function svc(id) { return D.services[id]; }
function accountName(svcId, accId) { const a = (svc(svcId)?.accounts || []).find(x => x.id === accId); return a ? a.name : 'Compte supprimé'; }
function svcBadge(id, size) {
    const s = svc(id) || { color: '#3b7bff', short: '?' };
    const dark = /^#F5E50A|#25D1DA|#58CC02/i.test(s.color);
    return `<span class="svc-dot" style="background:${esc(s.color)};color:${dark ? '#06102e' : '#fff'}${size ? `;width:${size}px;height:${size}px` : ''}">${esc(s.short)}</span>`;
}

// ==================== STOCKAGE ====================
function load() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) {
            const d = JSON.parse(raw);
            if (d && d.services && d.order) return Object.assign(freshData(), d);
        }
    } catch (e) { console.warn('Lecture impossible', e); }
    return freshData();
}
function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(D)); }
    catch (e) { toast('⚠ Enregistrement impossible sur cet appareil'); }
}

// ==================== CHIFFRE D'AFFAIRES ====================
// Paiement réparti à parts égales sur chaque mois couvert ; seule la part du mois compte.
function monthsOf(c) {
    if (c.duration === 'life') return 1;
    const n = parseInt(c.duration, 10);
    if (n > 0) return n;
    const s = parseDate(c.start), e = parseDate(c.end);
    if (s && e && e > s) return Math.max(1, Math.round((e - s) / 86400000 / 30.44));
    return 1;
}
function computeCA(y, m) {
    let total = 0; const bySvc = {}, rows = [];
    for (const c of D.clients) {
        if (c.status === 'annule') continue;
        const amount = amountOf(c), start = parseDate(c.start);
        if (!amount || !start) continue;
        const months = monthsOf(c), idx = (y - start.getFullYear()) * 12 + (m - start.getMonth());
        if (idx < 0 || idx >= months) continue;
        const part = amount / months;
        total += part; bySvc[c.service] = (bySvc[c.service] || 0) + part;
        rows.push({ c, amount, months, idx, part });
    }
    rows.sort((a, b) => b.part - a.part);
    return { total, bySvc, rows };
}

// ==================== ÉCHÉANCES ====================
function getAlerts() {
    const lim = Number(D.settings.alertDays) || 5;
    return D.clients
        .filter(c => c.status !== 'annule' && c.duration !== 'life' && c.end)
        .map(c => ({ c, diff: daysLeft(c.end) }))
        .filter(a => a.diff !== null && a.diff <= lim && a.diff >= -7)
        .sort((a, b) => (a.diff < 0 ? 100 - a.diff : a.diff) - (b.diff < 0 ? 100 - b.diff : b.diff));
}
function statusBadge(c) {
    if (c.status === 'annule') return '<span class="badge expired">Annulé</span>';
    if (c.status === 'attente') return '<span class="badge wait">En attente</span>';
    if (c.duration === 'life') return '<span class="badge ok">À vie</span>';
    const d = daysLeft(c.end), lim = Number(D.settings.alertDays) || 5;
    if (d === null) return '<span class="badge">Sans fin</span>';
    if (d < 0) return `<span class="badge expired">Expiré (${-d} j)</span>`;
    if (d === 0) return '<span class="badge today">Aujourd’hui</span>';
    if (d <= lim) return `<span class="badge soon">J-${d}</span>`;
    return `<span class="badge ok">${d} j</span>`;
}
function clientRow(c, extra) {
    return `<button class="row" onclick="openClientModal('${c.id}')">
        ${svcBadge(c.service)}
        <span class="row-main"><strong>${esc(c.name)}</strong><span>${esc(svc(c.service)?.name || '')} · ${esc(accountName(c.service, c.account))}${c.profile ? ' · ' + esc(c.profile) : ''}${extra ? ' · ' + extra : ''}</span></span>
        ${statusBadge(c)}
    </button>`;
}

// ==================== NAVIGATION ====================
function go(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === 'view-' + view));
    document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    document.querySelector('.main').scrollTop = 0; window.scrollTo(0, 0);
    renderAll();
}
function renderAll() {
    renderBrand(); renderBell();
    const v = document.querySelector('.view.active')?.id;
    if (v === 'view-home') renderHome();
    else if (v === 'view-subs') renderSubs();
    else if (v === 'view-ca') renderCA();
    else if (v === 'view-settings') renderSettings();
}
function renderBrand() {
    const words = (D.settings.business || 'Charlito Streams').trim().split(/\s+/);
    document.getElementById('brandTop').textContent = words[0] || '';
    document.getElementById('brandBottom').textContent = words.slice(1).join(' ');
    document.title = D.settings.business || 'Charlito Streams';
}
function renderBell() {
    const n = getAlerts().length, el = document.getElementById('bellCount');
    el.hidden = !n; el.textContent = n > 9 ? '9+' : n;
}

// ==================== ACCUEIL ====================
function renderHome() {
    const t = new Date(), y = t.getFullYear(), m = t.getMonth();
    document.getElementById('homeDate').textContent = `${DAYS[t.getDay()]} ${t.getDate()} ${MONTHS[m].toLowerCase()} ${y}`;
    document.getElementById('homeName').textContent = D.settings.name ? D.settings.name : '';
    const cur = computeCA(y, m), pd = new Date(y, m - 1, 1), prev = computeCA(pd.getFullYear(), pd.getMonth());
    const nd = new Date(y, m + 1, 1), next = computeCA(nd.getFullYear(), nd.getMonth());
    const active = D.clients.filter(c => c.status !== 'annule' && (c.duration === 'life' || (daysLeft(c.end) ?? 1) >= 0)).length;
    const alerts = getAlerts(), soon = alerts.filter(a => a.diff >= 0).length, expired = alerts.filter(a => a.diff < 0).length;
    const diff = cur.total - prev.total;
    document.getElementById('homeSummary').textContent = D.clients.length
        ? `${active} client${active > 1 ? 's' : ''} actif${active > 1 ? 's' : ''}${soon ? ` · ${soon} abonnement${soon > 1 ? 's' : ''} à renouveler bientôt` : ''}.`
        : 'Commence par ajouter ton premier client : son CA et ses échéances se calculent tout seuls.';

    const kpi = (icon, color, grad, label, value, sub) => `<div class="kpi" style="--kpi-color:${color};--kpi-grad:${grad}">
        <span class="kpi-label"><i class="ph-duotone ph-${icon}"></i>${label}</span><span class="kpi-value">${value}</span><span class="kpi-sub">${sub}</span></div>`;
    document.getElementById('homeKpis').innerHTML =
        kpi('coins', 'var(--cyan)', 'var(--grad-blue)', `CA de ${MONTHS[m].toLowerCase()}`, `${fmt(cur.total)}<small>${esc(D.settings.currency)}</small>`,
            prev.total || cur.total ? `<span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))}</span> vs ${MONTHS[pd.getMonth()].toLowerCase()}` : 'Aucun paiement ce mois') +
        kpi('users-three', 'var(--blue)', 'linear-gradient(90deg,#6a5cff,#3b7bff)', 'Clients actifs', active, `${D.clients.length} au total`) +
        kpi('bell-ringing', 'var(--orange)', 'var(--grad-warm)', 'À renouveler', soon, `sous ${D.settings.alertDays || 5} jours${expired ? ` · ${expired} expiré${expired > 1 ? 's' : ''}` : ''}`) +
        kpi('calendar-plus', 'var(--green)', 'linear-gradient(90deg,#34d399,#38c8ff)', `Déjà acquis en ${MONTHS[nd.getMonth()].toLowerCase()}`, `${fmt(next.total)}<small>${esc(D.settings.currency)}</small>`, 'parts des paiements déjà reçus');

    renderHomeChart();

    document.getElementById('homeRenew').innerHTML = alerts.length
        ? alerts.slice(0, 5).map(a => clientRow(a.c, `fin le ${shortDate(a.c.end)}`)).join('')
        : '<div class="empty">Aucune échéance dans les prochains jours.</div>';

    document.getElementById('homeSvcMonth').textContent = MONTHS[m];
    document.getElementById('homeServices').innerHTML = serviceBars(cur.bySvc) || '<div class="empty">Le CA par service apparaîtra ici dès le premier paiement.</div>';

    const recent = [...D.clients].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 5);
    document.getElementById('homeRecent').innerHTML = recent.length ? recent.map(c => clientRow(c)).join('')
        : '<div class="empty">Aucun client pour l’instant.<br><button class="btn-grad" style="margin-top:12px" onclick="openClientModal()"><i class="ph-duotone ph-plus"></i> Ajouter un client</button></div>';
}

function serviceBars(bySvc) {
    const ids = Object.keys(bySvc).sort((a, b) => bySvc[b] - bySvc[a]);
    if (!ids.length) return '';
    const max = Math.max(...ids.map(i => bySvc[i]));
    return ids.map(id => `<div>
        <div class="bar-head"><span>${svcBadge(id, 24)}${esc(svc(id)?.name || id)}</span><strong>${money(bySvc[id])}</strong></div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(bySvc[id] / max * 100)}%;background:linear-gradient(90deg, ${esc(svc(id)?.color || '#3b7bff')}, #38c8ff)"></div></div>
    </div>`).join('');
}

function renderHomeChart() {
    const t = new Date(), labels = [], values = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
        labels.push(MONTHS_SHORT[d.getMonth()]);
        values.push(Math.round(computeCA(d.getFullYear(), d.getMonth()).total));
    }
    document.getElementById('chartTotal').textContent = `Total : ${money(values.reduce((a, b) => a + b, 0))}`;
    const canvas = document.getElementById('homeChart');
    if (typeof Chart === 'undefined' || !canvas) return;
    const ctx = canvas.getContext('2d');
    const h = canvas.parentElement.clientHeight || 280;
    const blue = ctx.createLinearGradient(0, 0, 0, h); blue.addColorStop(0, '#38c8ff'); blue.addColorStop(1, 'rgba(47,107,255,.35)');
    const warm = ctx.createLinearGradient(0, 0, 0, h); warm.addColorStop(0, '#ff9a4a'); warm.addColorStop(1, 'rgba(255,77,94,.45)');
    const colors = values.map((_, i) => i === values.length - 1 ? warm : blue);
    if (homeChart) homeChart.destroy();
    homeChart = new Chart(ctx, {
        type: 'bar',
        data: { labels, datasets: [{ data: values, backgroundColor: colors, borderRadius: 10, borderSkipped: false, maxBarThickness: 42 }] },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0f1c4b', borderColor: '#2d4189', borderWidth: 1, padding: 12, callbacks: { label: c => ' ' + fmt(c.parsed.y) + ' ' + (D.settings.currency || 'FCFA') } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#9fabd4', font: { family: 'Montserrat', weight: 600 } } },
                y: { beginAtZero: true, grid: { color: 'rgba(45,65,137,.35)' }, border: { display: false }, ticks: { color: '#6b78a8', font: { family: 'Montserrat' }, callback: v => v >= 1000 ? (v / 1000) + 'k' : v } }
            }
        }
    });
}

// ==================== ABONNEMENTS ====================
function renderSubs() {
    if (!svc(currentSvc)) currentSvc = D.order[0];
    const q = (document.getElementById('clientSearch').value || '').trim().toLowerCase();
    document.getElementById('svcTabs').innerHTML = D.order.map(id => {
        const n = D.clients.filter(c => c.service === id).length;
        return `<button class="svc-tab${id === currentSvc && !q ? ' active' : ''}" role="tab" aria-selected="${id === currentSvc}" onclick="currentSvc='${id}';document.getElementById('clientSearch').value='';renderSubs()">${svcBadge(id)}${esc(svc(id).name)}<span class="count">${n}</span></button>`;
    }).join('') + `<button class="svc-tab add" onclick="addService()"><i class="ph-duotone ph-plus"></i> Service</button>`;

    const box = document.getElementById('svcContent');
    if (q) {
        const found = D.clients.filter(c => [c.name, c.contact, c.profile, c.note].some(v => String(v || '').toLowerCase().includes(q)));
        box.innerHTML = `<section class="card"><div class="card-head"><h2>Résultats pour « ${esc(q)} »</h2><span class="muted">${found.length} client${found.length > 1 ? 's' : ''}</span></div>
            <div class="list">${found.length ? found.map(c => clientRow(c, c.end ? 'fin le ' + shortDate(c.end) : '')).join('') : '<div class="empty">Aucun client trouvé.</div>'}</div></section>`;
        return;
    }

    const s = svc(currentSvc), clients = D.clients.filter(c => c.service === currentSvc);
    const t = new Date(), caSvc = computeCA(t.getFullYear(), t.getMonth()).bySvc[currentSvc] || 0;
    let html = `<div class="svc-summary">
        <span class="chip">${svcBadge(currentSvc, 22)}<strong>${esc(s.name)}</strong></span>
        <span class="chip"><i class="ph-duotone ph-users"></i><strong>${clients.length}</strong> client${clients.length > 1 ? 's' : ''}</span>
        <span class="chip"><i class="ph-duotone ph-key"></i><strong>${s.accounts.length}</strong> compte${s.accounts.length > 1 ? 's' : ''}</span>
        <span class="chip"><i class="ph-duotone ph-coins"></i>CA ${MONTHS[t.getMonth()].toLowerCase()} : <strong>${money(caSvc)}</strong></span>
    </div><div class="accounts" id="accountsGrid">`;
    for (const a of s.accounts) {
        const list = clients.filter(c => c.account === a.id).sort((x, y) => (x.end || '9').localeCompare(y.end || '9'));
        html += `<section class="card account" data-acc="${a.id}">
            <div class="account-head">
                <button class="mini-btn drag" data-acc="${a.id}" aria-label="Déplacer le compte ${esc(a.name)} (glisser, ou flèches haut/bas)" title="Glisser pour changer l’ordre"><i class="ph-duotone ph-dots-six-vertical"></i></button>
                <h3>${esc(a.name)}</h3>
                <span class="meta">${list.length} client${list.length > 1 ? 's' : ''}</span>
                <button class="mini-btn" onclick="renameAccount('${a.id}')" aria-label="Renommer le compte" title="Renommer"><i class="ph-duotone ph-pencil-simple"></i></button>
                <button class="mini-btn" onclick="removeAccount('${a.id}')" aria-label="Supprimer le compte" title="Supprimer"><i class="ph-duotone ph-trash"></i></button>
            </div>
            <div class="account-body">
                ${list.length ? list.map(c => `<button class="client" onclick="openClientModal('${c.id}')">
                    <span class="client-main"><strong>${esc(c.name)}</strong><span>${c.profile ? esc(c.profile) + ' · ' : ''}${c.duration === 'life' ? 'À vie' : `${shortDate(c.start)} → ${shortDate(c.end)}`}${c.contact ? ' · ' + esc(c.contact) : ''}</span></span>
                    <span class="client-amount">${amountOf(c) ? money(amountOf(c)) : '—'}</span>
                    ${statusBadge(c)}
                </button>`).join('') : '<div class="account-empty">Aucun client sur ce compte.</div>'}
                <button class="add-client-inline" onclick="openClientModal(null, '${currentSvc}', '${a.id}')"><i class="ph-duotone ph-plus"></i> Ajouter un client ici</button>
            </div>
        </section>`;
    }
    html += `<button class="add-account" onclick="addAccount()"><i class="ph-duotone ph-plus"></i> Ajouter un compte ${esc(s.name)}</button></div>`;
    box.innerHTML = html;
    initDrag();
}

function addAccount() {
    const s = svc(currentSvc);
    const name = prompt(`Nom du nouveau compte ${s.name} :`, `Compte ${s.accounts.length + 1}`);
    if (name === null) return;
    s.accounts.push({ id: uid(), name: name.trim() || `Compte ${s.accounts.length + 1}` });
    save(); renderSubs(); toast('Compte ajouté ✓');
}
function renameAccount(accId) {
    const a = svc(currentSvc).accounts.find(x => x.id === accId);
    const name = prompt('Nouveau nom du compte :', a.name);
    if (name === null || !name.trim()) return;
    a.name = name.trim(); save(); renderSubs(); toast('Compte renommé ✓');
}
function removeAccount(accId) {
    const n = D.clients.filter(c => c.service === currentSvc && c.account === accId).length;
    if (n) return toast(`Impossible : ${n} client${n > 1 ? 's' : ''} sur ce compte. Supprime-les ou déplace-les d'abord.`);
    const s = svc(currentSvc);
    if (!confirm(`Supprimer le compte « ${s.accounts.find(x => x.id === accId).name} » ?`)) return;
    s.accounts = s.accounts.filter(x => x.id !== accId); save(); renderSubs(); toast('Compte supprimé');
}

// Glisser-déposer des comptes (doigt ou souris) + flèches clavier
function moveAccount(accId, delta) {
    const list = svc(currentSvc).accounts, i = list.findIndex(a => a.id === accId), j = i + delta;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    save(); renderSubs();
    document.querySelector(`.drag[data-acc="${accId}"]`)?.focus();
}
function initDrag() {
    const grid = document.getElementById('accountsGrid');
    if (!grid) return;
    grid.querySelectorAll('.drag').forEach(handle => {
        handle.addEventListener('keydown', e => {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); moveAccount(handle.dataset.acc, e.key === 'ArrowUp' ? -1 : 1); }
        });
        handle.addEventListener('pointerdown', e => {
            if (e.button !== undefined && e.button !== 0) return;
            e.preventDefault();
            const card = handle.closest('.account'), scroller = document.querySelector('.main');
            let lastY = e.clientY, raf = 0, moved = false;
            try { handle.setPointerCapture(e.pointerId); } catch (err) {}
            card.classList.add('dragging'); document.body.classList.add('is-dragging');
            const reorder = () => {
                const others = [...grid.querySelectorAll('.account:not(.dragging)')];
                const before = others.find(o => { const r = o.getBoundingClientRect(); return lastY < r.top + r.height / 2; });
                const target = before || grid.querySelector('.add-account');
                if (target && card.nextElementSibling !== target) { grid.insertBefore(card, target); moved = true; }
            };
            const tick = () => {
                const edge = 90, h = window.innerHeight;
                const v = lastY < edge ? -(edge - lastY) / 5 : lastY > h - edge ? (lastY - (h - edge)) / 5 : 0;
                if (v) { if (scroller.scrollHeight > scroller.clientHeight) scroller.scrollTop += v; else window.scrollBy(0, v); reorder(); }
                raf = requestAnimationFrame(tick);
            };
            raf = requestAnimationFrame(tick);
            const onMove = ev => { lastY = ev.clientY; reorder(); };
            const onUp = () => {
                cancelAnimationFrame(raf);
                handle.removeEventListener('pointermove', onMove); handle.removeEventListener('pointerup', onUp); handle.removeEventListener('pointercancel', onUp);
                card.classList.remove('dragging'); document.body.classList.remove('is-dragging');
                if (!moved) return;
                const s = svc(currentSvc), ids = [...grid.querySelectorAll('.account')].map(el => el.dataset.acc);
                s.accounts = ids.map(id => s.accounts.find(a => a.id === id)).filter(Boolean);
                save(); renderSubs(); toast('Ordre des comptes enregistré ✓');
            };
            handle.addEventListener('pointermove', onMove); handle.addEventListener('pointerup', onUp); handle.addEventListener('pointercancel', onUp);
        });
    });
}

// ==================== FICHE CLIENT ====================
function fillServiceSelect() {
    document.getElementById('fService').innerHTML = D.order.map(id => `<option value="${id}">${esc(svc(id).name)}</option>`).join('');
}
function fillAccountSelect(selected) {
    const id = document.getElementById('fService').value, s = svc(id);
    document.getElementById('fAccount').innerHTML = s.accounts.map(a => `<option value="${a.id}">${esc(a.name)}</option>`).join('');
    if (selected) document.getElementById('fAccount').value = selected;
    const used = [...new Set(D.clients.filter(c => c.service === id && c.profile).map(c => c.profile))];
    document.getElementById('profileList').innerHTML = used.map(p => `<option value="${esc(p)}"></option>`).join('');
}
function updateEndDate() {
    const start = document.getElementById('fStart').value, dur = document.getElementById('fDuration').value;
    document.getElementById('fEnd').value = dur === 'life' ? '' : (start ? addMonths(start, parseInt(dur, 10)) : '');
}
function openClientModal(id = null, presetSvc = null, presetAcc = null) {
    editingId = id;
    const c = id ? D.clients.find(x => x.id === id) : null;
    fillServiceSelect();
    const $ = k => document.getElementById(k);
    $('clientTitle').textContent = c ? 'Modifier le client' : 'Nouveau client';
    $('fDelete').hidden = !c;
    $('fService').value = c ? c.service : (presetSvc || currentSvc || D.order[0]);
    fillAccountSelect(c ? c.account : presetAcc);
    $('fName').value = c?.name || '';
    $('fContact').value = c?.contact || '';
    $('fProfile').value = c?.profile || '';
    const dur = c ? String(c.duration || '1') : '1';
    if (![...$('fDuration').options].some(o => o.value === dur)) $('fDuration').insertAdjacentHTML('beforeend', `<option value="${esc(dur)}">${esc(dur)} mois</option>`);
    $('fDuration').value = dur;
    $('fAmount').value = c?.amount || '';
    $('fStart').value = c?.start || dateStr(new Date());
    if (c) $('fEnd').value = c.end || ''; else updateEndDate();
    $('fStatus').value = c?.status || 'actif';
    $('fNote').value = c?.note || '';
    document.getElementById('clientOverlay').classList.add('active');
    setTimeout(() => $('fName').focus(), 60);
}
function closeClientModal() { document.getElementById('clientOverlay').classList.remove('active'); }
function saveClient(e) {
    e.preventDefault();
    const $ = k => document.getElementById(k).value.trim();
    if (!$('fName')) return toast('⚠ Le nom du client est obligatoire');
    if (!$('fAccount')) return toast('⚠ Ajoute d’abord un compte à ce service');
    const data = {
        service: $('fService'), account: $('fAccount'), name: $('fName'), contact: $('fContact'), profile: $('fProfile'),
        duration: $('fDuration'), amount: $('fAmount'), start: $('fStart'), end: $('fDuration') === 'life' ? '' : $('fEnd'),
        status: $('fStatus'), note: $('fNote')
    };
    if (editingId) Object.assign(D.clients.find(x => x.id === editingId), data);
    else D.clients.push({ id: uid(), createdAt: new Date().toISOString(), ...data });
    currentSvc = data.service;
    save(); closeClientModal(); renderAll();
    toast(editingId ? 'Client mis à jour ✓' : 'Client ajouté ✓');
}
function deleteClient() {
    const c = D.clients.find(x => x.id === editingId);
    if (!c || !confirm(`Supprimer ${c.name} ?`)) return;
    D.clients = D.clients.filter(x => x.id !== editingId);
    save(); closeClientModal(); renderAll(); toast('Client supprimé');
}

// ==================== ALERTES ====================
function openAlerts() {
    const list = getAlerts();
    document.getElementById('alertsList').innerHTML = list.length
        ? list.map(a => clientRow(a.c, `fin le ${shortDate(a.c.end)}`)).join('')
        : `<div class="empty">Aucun abonnement ne se termine dans les ${D.settings.alertDays || 5} prochains jours.</div>`;
    document.getElementById('alertsOverlay').classList.add('active');
}
function closeAlerts() { document.getElementById('alertsOverlay').classList.remove('active'); }

// ==================== VUE CA ====================
function changeCaMonth(dir) {
    caM += dir; if (caM > 11) { caM = 0; caY++; } if (caM < 0) { caM = 11; caY--; }
    renderCA();
}
function renderCA() {
    const cur = computeCA(caY, caM), pd = new Date(caY, caM - 1, 1), prev = computeCA(pd.getFullYear(), pd.getMonth()), diff = cur.total - prev.total;
    document.getElementById('caMonthLabel').textContent = `${MONTHS[caM]} ${caY}`;
    document.getElementById('caTotal').textContent = fmt(cur.total);
    document.querySelector('.ca-total .cur').textContent = D.settings.currency || 'FCFA';
    document.getElementById('caCompare').innerHTML = prev.total || cur.total
        ? `<span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${money(Math.abs(diff))}</span> vs ${MONTHS[pd.getMonth()].toLowerCase()}` : 'Aucun paiement sur ce mois';
    document.getElementById('caServices').innerHTML = serviceBars(cur.bySvc) || '<div class="empty">Aucun paiement sur ce mois.</div>';
    document.getElementById('caCount').textContent = `${cur.rows.length} paiement${cur.rows.length > 1 ? 's' : ''}`;
    document.getElementById('caRows').innerHTML = cur.rows.length ? cur.rows.map(r => `<button class="row" onclick="openClientModal('${r.c.id}')">
        ${svcBadge(r.c.service)}
        <span class="row-main"><strong>${esc(r.c.name)}</strong><span>${esc(svc(r.c.service)?.name || '')} · ${esc(accountName(r.c.service, r.c.account))} · ${money(r.amount)}${r.months > 1 ? ` ÷ ${r.months} mois · mois ${r.idx + 1}/${r.months}` : ''}</span></span>
        <span class="ca-part">${fmt(r.part)}</span>
    </button>`).join('') : '<div class="empty">Renseigne le montant payé dans la fiche du client pour le voir apparaître ici.</div>';
}

// ==================== RÉGLAGES ====================
function renderSettings() {
    const $ = k => document.getElementById(k);
    $('setBusiness').value = D.settings.business || '';
    $('setName').value = D.settings.name || '';
    $('setCurrency').value = D.settings.currency || 'FCFA';
    $('setAlertDays').value = D.settings.alertDays || 5;
    $('setServices').innerHTML = D.order.map((id, i) => {
        const n = D.clients.filter(c => c.service === id).length;
        return `<div class="svc-row">${svcBadge(id)}<strong>${esc(svc(id).name)}</strong><span class="muted">${n} client${n > 1 ? 's' : ''}</span>
            <button class="mini-btn" onclick="moveService('${id}',-1)" ${i === 0 ? 'disabled' : ''} aria-label="Monter"><i class="ph-duotone ph-caret-up"></i></button>
            <button class="mini-btn" onclick="moveService('${id}',1)" ${i === D.order.length - 1 ? 'disabled' : ''} aria-label="Descendre"><i class="ph-duotone ph-caret-down"></i></button>
            <button class="mini-btn" onclick="renameService('${id}')" aria-label="Renommer"><i class="ph-duotone ph-pencil-simple"></i></button>
            <button class="mini-btn" onclick="removeService('${id}')" aria-label="Supprimer"><i class="ph-duotone ph-trash"></i></button></div>`;
    }).join('');
}
function saveSettings() {
    const $ = k => document.getElementById(k).value.trim();
    D.settings.business = $('setBusiness') || 'Charlito Streams';
    D.settings.name = $('setName');
    D.settings.currency = $('setCurrency') || 'FCFA';
    D.settings.alertDays = Math.min(30, Math.max(1, parseInt($('setAlertDays'), 10) || 5));
    save(); renderAll(); toast('Réglages enregistrés ✓');
}
function addService() {
    const name = (prompt('Nom du nouveau service (ex : YouTube Premium) :') || '').trim();
    if (!name) return;
    if (D.order.some(id => svc(id).name.toLowerCase() === name.toLowerCase())) return toast('Ce service existe déjà');
    let id = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '') || 'service';
    const base = id; let i = 2; while (svc(id)) id = base + i++;
    const short = name.split(/\s+/).map(w => w[0]).join('').slice(0, 3).toUpperCase();
    const palette = ['#6a5cff', '#ff9a4a', '#38c8ff', '#ff4d5e', '#34d399'];
    D.services[id] = { name, color: palette[D.order.length % palette.length], short, accounts: [{ id: uid(), name: 'Compte 1' }] };
    D.order.push(id); currentSvc = id;
    save(); renderAll(); toast(`Service ${name} ajouté ✓`);
}
function renameService(id) {
    const name = prompt('Nouveau nom du service :', svc(id).name);
    if (!name || !name.trim()) return;
    svc(id).name = name.trim(); save(); renderAll();
}
function moveService(id, d) {
    const i = D.order.indexOf(id), j = i + d;
    if (j < 0 || j >= D.order.length) return;
    [D.order[i], D.order[j]] = [D.order[j], D.order[i]]; save(); renderSettings();
}
function removeService(id) {
    const n = D.clients.filter(c => c.service === id).length;
    if (n) return toast(`Impossible : ${n} client${n > 1 ? 's' : ''} dans ce service.`);
    if (D.order.length <= 1) return toast('Garde au moins un service');
    if (!confirm(`Supprimer le service ${svc(id).name} ?`)) return;
    delete D.services[id]; D.order = D.order.filter(x => x !== id);
    save(); renderAll(); toast('Service supprimé');
}
function exportData() {
    const blob = new Blob([JSON.stringify(D, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `sauvegarde-${(D.settings.business || 'streams').toLowerCase().replace(/\s+/g, '-')}-${dateStr(new Date())}.json`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Sauvegarde exportée ✓');
}
function importData(e) {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
        try {
            const d = JSON.parse(r.result);
            if (!d.services || !d.order || !Array.isArray(d.clients)) throw new Error('format');
            if (!confirm(`Remplacer les données actuelles par cette sauvegarde (${d.clients.length} clients) ?`)) return;
            D = Object.assign(freshData(), d); currentSvc = D.order[0];
            save(); renderAll(); toast('Sauvegarde importée ✓');
        } catch (err) { toast('⚠ Fichier de sauvegarde invalide'); }
    };
    r.readAsText(file); e.target.value = '';
}
// Données de démonstration (pour présenter l'app) : clients fictifs sur 12 mois. « Tout effacer » remet l'app à zéro.
function loadDemo() {
    if (D.clients.length && !confirm('Remplacer les données actuelles par la démo ?')) return;
    D = freshData();
    const t = new Date(), plans = [['netflix', 3500, 1], ['spotify', 2000, 1], ['primevideo', 2500, 1], ['disneyplus', 3000, 1], ['crunchyroll', 2000, 1], ['chatgptgo', 6000, 1], ['claudepro', 12000, 1], ['applemusic', 2000, 1], ['capcutpro', 4000, 1], ['superduolingo', 15000, 12], ['snapplus', 2500, 1], ['netflix', 10000, 3], ['spotify', 5500, 3]];
    let k = 1;
    for (let back = 11; back >= 0; back--) {
        const perMonth = 4 + Math.round((11 - back) * 0.9);
        for (let i = 0; i < perMonth; i++) {
            const [sid, amount, months] = plans[(i + back) % plans.length];
            const s = D.services[sid];
            if (s.accounts.length < 3 && k % 9 === 0) s.accounts.push({ id: uid(), name: `Compte ${s.accounts.length + 1}` });
            const start = dateStr(new Date(t.getFullYear(), t.getMonth() - back, 1 + ((i * 3 + back) % 26)));
            D.clients.push({ id: uid(), createdAt: new Date(Date.now() - back * 2592e6 + i * 6e4).toISOString(), service: sid, account: s.accounts[i % s.accounts.length].id,
                name: `Client démo ${k++}`, contact: '', profile: '', duration: String(months), amount: String(amount), start, end: addMonths(start, months), status: 'actif', note: 'Donnée de démonstration' });
        }
    }
    currentSvc = D.order[0]; save(); go('home'); toast('Démo chargée ✓ (Réglages → Tout effacer pour repartir de zéro)');
}

function resetAll() {
    if (!confirm('Effacer TOUTES les données (clients, comptes, réglages) ? Pense à exporter une sauvegarde avant.')) return;
    if (!confirm('Dernière confirmation : tout effacer ?')) return;
    D = freshData(); currentSvc = D.order[0]; save(); renderAll(); toast('Données effacées');
}

// ==================== DÉMARRAGE ====================
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeClientModal(); closeAlerts(); } });
renderAll();
