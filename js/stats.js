// ==================== STATS DES ABONNEMENTS ====================
// Bouton « Stats » à côté de « CA du mois » : réabonnements par rapport au mois dernier (historique 12 mois),
// clients et ventes du mois, classements des clients (fidèle, paie le plus / le moins, revient), par service.
let stY = null, stM = null;
function openStatsPanel() {
    const t = new Date(); if (stY === null) { stY = t.getFullYear(); stM = t.getMonth(); }
    document.getElementById('statsOverlay').classList.add('active');
    renderStatsPanel();
}
function closeStatsPanel() { document.getElementById('statsOverlay').classList.remove('active'); }
function changeStatsMonth(d) { stM += d; if (stM > 11) { stM = 0; stY++; } if (stM < 0) { stM = 11; stY--; } renderStatsPanel(); }

const ST_SHORT = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
const stMoney = n => `${formatFCFA(Math.round(n))} FCFA`;
const stLife = p => p.duration && /life|vie/i.test(p.duration);
function stCovers(p, y, m) {
    if (!p.start) return false;
    const [sy, sm, sd] = p.start.split('-').map(Number), s = new Date(sy, sm - 1, sd), m0 = new Date(y, m, 1), m1 = new Date(y, m + 1, 1);
    let e;
    if (stLife(p)) e = new Date(9999, 0, 1);
    else if (p.end) { const [ey, em, ed] = p.end.split('-').map(Number); e = new Date(ey, em - 1, ed); }
    else e = new Date(sy, sm, sd);
    return s < m1 && e > m0;
}
function stPeople() {
    const map = {};
    for (const c of S.subscriptions || []) {
        const k = subNormName(c.name); if (!k) continue;
        const w = map[k] || (map[k] = { name: c.name, periods: 0, paid: 0, first: null, services: new Set() });
        w.services.add(c.service);
        for (const p of subPeriods(c)) {
            w.periods++; w.paid += subPaid(p);
            if (p.start && (!w.first || p.start < w.first)) w.first = p.start;
        }
    }
    return Object.values(map);
}
function stMonth(y, m) {
    const key = `${y}-${String(m + 1).padStart(2, '0')}`, firstStart = {};
    for (const c of S.subscriptions || []) for (const p of subPeriods(c)) { const k = subNormName(c.name); if (p.start && (!firstStart[k] || p.start < firstStart[k])) firstStart[k] = p.start; }
    let active = 0, fresh = 0, sales = 0, amt = 0; const durs = {}, svcSales = {}, svcActive = {}, seen = new Set();
    for (const c of S.subscriptions || []) {
        if (c.status && /rembours/i.test(c.status)) continue;
        const ps = subPeriods(c);
        if (!c.suspended && ps.some(p => stCovers(p, y, m))) { active++; svcActive[c.service] = (svcActive[c.service] || 0) + 1; }
        for (const p of ps) if (p.start && p.start.slice(0, 7) === key) {
            sales++; amt += subAmount(p);
            const dl = stLife(p) ? 'À vie' : `${parseInt(String(p.duration || '').replace(/[^\d]/g, ''), 10) || 1} mois`; durs[dl] = (durs[dl] || 0) + 1;
            const s = svcSales[c.service] || (svcSales[c.service] = { n: 0, amt: 0 }); s.n++; s.amt += subAmount(p);
        }
        const k = subNormName(c.name);
        if (!seen.has(k) && firstStart[k] && firstStart[k].slice(0, 7) === key) { fresh++; seen.add(k); }
    }
    const top = Object.entries(durs).sort((a, b) => b[1] - a[1])[0];
    return { active, fresh, sales, amt, avg: sales ? amt / sales : 0, topDur: top ? top[0] : '—', svcSales, svcActive };
}
function stTrend(cur, prev, money) {
    const d = cur - prev; if (!cur && !prev) return '<small>—</small>';
    return `<small class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}">${d === 0 ? '=' : (d > 0 ? '+' : '−') + (money ? formatFCFA(Math.round(Math.abs(d))) : Math.abs(d))} vs mois dernier</small>`;
}
function renderStatsPanel() {
    const box = document.getElementById('statsBody'); if (!box) return;
    document.getElementById('statsMonthLabel').textContent = `${MONTHS[stM]} ${stY}`;
    const pd = new Date(stY, stM - 1, 1), py = pd.getFullYear(), pm = pd.getMonth();
    const r = computeRenewals(stY, stM), rp = computeRenewals(py, pm), s = stMonth(stY, stM), sp = stMonth(py, pm);
    const hist = []; for (let i = 11; i >= 0; i--) { const d = new Date(stY, stM - i, 1); hist.push({ l: ST_SHORT[d.getMonth()], n: computeRenewals(d.getFullYear(), d.getMonth()).volume.length, on: !i }); }
    const hmax = Math.max(1, ...hist.map(h => h.n));
    const kpi = (label, val, sub, icon) => `<div class="st-kpi"><span><span class="material-icons-outlined">${icon}</span>${label}</span><strong>${val}</strong>${sub}</div>`;
    const ppl = stPeople(), pick = (a, f) => a.slice().sort(f)[0];
    const loyal = pick(ppl, (a, b) => b.periods - a.periods || (a.first || '').localeCompare(b.first || ''));
    const payMost = pick(ppl.filter(p => p.paid > 0), (a, b) => b.paid - a.paid);
    const payLeast = pick(ppl.filter(p => p.paid > 0), (a, b) => a.paid - b.paid);
    const oldest = pick(ppl.filter(p => p.first), (a, b) => a.first.localeCompare(b.first));
    const multi = pick(ppl.filter(p => p.services.size > 1), (a, b) => b.services.size - a.services.size);
    const back = ppl.filter(p => p.periods > 1).sort((a, b) => b.periods - a.periods);
    const champ = (icon, title, w, detail) => `<div class="st-champ"><span class="st-champ-ic material-icons-outlined">${icon}</span><div><span class="st-champ-t">${title}</span><strong>${w ? escHtml(w.name) : '—'}</strong><small>${w ? detail(w) : 'pas encore de données'}</small></div></div>`;
    const top = ppl.filter(p => p.paid > 0).sort((a, b) => b.paid - a.paid).slice(0, 5);
    const svcIds = [...new Set([...Object.keys(s.svcSales), ...Object.keys(s.svcActive)])].sort((a, b) => (s.svcActive[b] || 0) - (s.svcActive[a] || 0));
    const names = l => l.map(e => escHtml(e.c.name || 'Client')).join(', ');
    box.innerHTML = `
        <h3 class="st-title">Réabonnements <small>par rapport à ${MONTHS[pm].toLowerCase()}</small></h3>
        <div class="st-kpis">
            ${kpi('Réabonnés ce mois', r.volume.length, stTrend(r.volume.length, rp.volume.length), 'history')}
            ${kpi('Taux de réabonnement', r.rate === null ? '—' : r.rate + ' %', `<small>${r.renewed.length} sur ${r.renewed.length + r.lost.length} échéance${r.renewed.length + r.lost.length > 1 ? 's' : ''}</small>`, 'trending_up')}
            ${kpi('En attente', r.pending.length, '<small>fini depuis moins de 30 j</small>', 'today')}
            ${kpi('Pas renouvelé', r.lost.length, stTrend(r.lost.length, rp.lost.length), 'cancel')}
        </div>
        <div class="st-hist">${hist.map(h => `<div class="st-bar${h.on ? ' on' : ''}"><b>${h.n}</b><span style="height:${Math.round(h.n / hmax * 100)}%"></span><small>${h.l}</small></div>`).join('')}</div>
        ${r.volume.length ? `<p class="renew-line ok"><span class="material-icons-outlined">check_circle</span> Réabonnés : ${names(r.volume)}</p>` : ''}
        ${r.pending.length ? `<p class="renew-line wait"><span class="material-icons-outlined">history</span> En attente : ${names(r.pending)}</p>` : ''}
        ${r.lost.length ? `<p class="renew-line lost"><span class="material-icons-outlined">cancel</span> Pas renouvelé : ${names(r.lost)}</p>` : ''}

        <h3 class="st-title">Clients et ventes <small>${MONTHS[stM].toLowerCase()}</small></h3>
        <div class="st-kpis">
            ${kpi('Clients actifs', s.active, stTrend(s.active, sp.active), 'subscriptions')}
            ${kpi('Nouveaux clients', s.fresh, stTrend(s.fresh, sp.fresh), 'add_circle')}
            ${kpi('Ventes du mois', s.sales, stTrend(s.sales, sp.sales), 'receipt_long')}
            ${kpi('Encaissé (ventes)', stMoney(s.amt), stTrend(s.amt, sp.amt, true), 'account_balance_wallet')}
            ${kpi('Panier moyen', stMoney(s.avg), '<small>par vente</small>', 'analytics')}
            ${kpi('Durée la plus vendue', s.topDur, '<small>ce mois-ci</small>', 'calendar_today')}
        </div>

        <h3 class="st-title">Tes clients <small>depuis le début</small></h3>
        <div class="st-champs">
            ${champ('emoji_events', 'Client le plus fidèle', loyal, w => `${w.periods} abonnement${w.periods > 1 ? 's' : ''} · depuis le ${fmtDateFr(w.first)}`)}
            ${champ('trending_up', 'Celui qui paie le plus', payMost, w => `${stMoney(w.paid)} encaissés`)}
            ${champ('trending_down', 'Celui qui paie le moins', payLeast, w => `${stMoney(w.paid)} encaissés`)}
            ${champ('today', 'Plus ancien client', oldest, w => `depuis le ${fmtDateFr(w.first)}`)}
            ${champ('subscriptions', 'Le plus de services', multi, w => `${w.services.size} services : ${[...w.services].map(id => escHtml(subServiceName(id))).join(', ')}`)}
            ${champ('history', 'Clients qui reviennent', back.length ? { name: `${back.length} client${back.length > 1 ? 's' : ''}` } : null, () => back.slice(0, 5).map(w => `${escHtml(w.name)} (${w.periods}×)`).join(', '))}
        </div>
        ${top.length ? `<div class="st-top"><span class="st-sub">Top 5 · ce qu'ils t'ont payé</span>${top.map((w, i) => `<div class="st-row"><span class="st-pos${i === 0 ? ' gold' : ''}">${i + 1}</span><span class="st-name">${escHtml(w.name)}<small>${w.periods} abonnement${w.periods > 1 ? 's' : ''}</small></span><strong>${stMoney(w.paid)}</strong></div>`).join('')}</div>` : ''}

        <h3 class="st-title">Par service <small>${MONTHS[stM].toLowerCase()}</small></h3>
        <div class="st-top">${svcIds.length ? svcIds.map(id => `<div class="st-row"><span class="st-name">${escHtml(subServiceName(id))}<small>${s.svcActive[id] || 0} actif${(s.svcActive[id] || 0) > 1 ? 's' : ''} · ${s.svcSales[id]?.n || 0} vente${(s.svcSales[id]?.n || 0) > 1 ? 's' : ''}</small></span><strong>${stMoney(s.svcSales[id]?.amt || 0)}</strong></div>`).join('') : '<div class="notif-empty">Aucune donnée ce mois-ci.</div>'}</div>`;
}
