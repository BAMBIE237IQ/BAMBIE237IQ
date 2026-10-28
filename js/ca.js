// ==================== CA DES ABONNEMENTS ====================
// Le montant payé est réparti au prorata des jours couverts dans chaque mois :
// 1 500 FCFA du 26 sept. au 26 oct. (30 jours) -> 250 en septembre (5 j) + 1 250 en octobre (25 j).
// Sans date de fin (à vie) ou sans dates exploitables : réparti à parts égales par mois, à partir du mois de début.
let caYear = null, caMonth = null;

// Montant : champ "Montant payé / Code" (ex. "5 000", "1500 FCFA")
function subAmount(c) {
    const n = parseInt(String(c.code || '').replace(/[^\d]/g, ''), 10);
    return n > 0 ? n : 0;
}

// Nombre de mois couverts : d'après les dates de début et de fin, sinon d'après la durée ("02Mois")
function subMonths(c) {
    if (c.start && c.end) {
        const [y1, m1, d1] = c.start.split('-').map(Number), [y2, m2, d2] = c.end.split('-').map(Number);
        if (y1 && y2) {
            const days = (new Date(y2, m2 - 1, d2) - new Date(y1, m1 - 1, d1)) / 86400000;
            if (days > 0) return Math.max(1, Math.round(days / 30.44));
        }
    }
    const fromDuration = parseInt(String(c.duration || '').replace(/[^\d]/g, ''), 10);
    return fromDuration > 0 ? fromDuration : 1;
}

// Mois de départ de la répartition : mois du début (ou, à défaut, mois de fin moins la durée)
function subFirstMonth(c, months) {
    if (c.start) { const [y, m] = c.start.split('-').map(Number); if (y && m) return { y, m: m - 1 }; }
    if (c.end) { const [y, m] = c.end.split('-').map(Number); if (y && m) { const d = new Date(y, m - 1 - months, 1); return { y: d.getFullYear(), m: d.getMonth() }; } }
    return null;
}

// Période en jours [début, fin[ si les deux dates sont valides
function subDaySpan(p) {
    if (!p.start || !p.end) return null;
    const [y1, m1, d1] = p.start.split('-').map(Number), [y2, m2, d2] = p.end.split('-').map(Number);
    if (!y1 || !y2) return null;
    const start = new Date(y1, m1 - 1, d1), end = new Date(y2, m2 - 1, d2), days = Math.round((end - start) / 86400000);
    return days > 0 ? { start, end, days } : null;
}

function computeSubCA(y, m) {
    const rows = [], byService = {};
    let total = 0;
    for (const c of S.subscriptions || []) {
        if (c.status && /rembours/i.test(c.status)) continue;
        // Période en cours + périodes déjà renouvelées (historique)
        for (const p of subPeriods(c)) {
            const amount = subAmount(p);
            if (!amount) continue;
            const span = subDaySpan(p);
            if (span) {
                // jours de la période [début, fin[ qui tombent dans le mois demandé
                const m0 = new Date(y, m, 1), m1 = new Date(y, m + 1, 1);
                const days = Math.round((Math.min(span.end, m1) - Math.max(span.start, m0)) / 86400000);
                if (days <= 0) continue;
                const part = amount * days / span.days;
                total += part;
                byService[c.service] = (byService[c.service] || 0) + part;
                rows.push({ c, p, amount, days, totalDays: span.days, part });
                continue;
            }
            const months = subMonths(p), first = subFirstMonth(p, months);
            if (!first) continue;
            const idx = (y - first.y) * 12 + (m - first.m); // position du mois demandé dans la période payée
            if (idx < 0 || idx >= months) continue;
            const part = amount / months;
            total += part;
            byService[c.service] = (byService[c.service] || 0) + part;
            rows.push({ c, p, amount, months, idx, part });
        }
    }
    rows.sort((a, b) => b.part - a.part);
    // Coûts d'achat des comptes, comptés à partir du mois où ils ont été saisis
    let cost = 0; const costByService = {};
    const mk = monthKey(y, m), svcs = subServices();
    for (const id in svcs) for (const acc of svcs[id].accounts) {
        const c = subAccountCost(id, acc);
        if (!c || (c.since && c.since > mk)) continue;
        cost += c.amount; costByService[id] = (costByService[id] || 0) + c.amount;
    }
    return { total, cost, profit: total - cost, costByService, byService, rows };
}

function openCAPanel() {
    const t = new Date();
    if (caYear === null) { caYear = t.getFullYear(); caMonth = t.getMonth(); }
    // Afficher d'abord : le graphique a besoin d'une fenêtre visible pour prendre sa taille
    document.getElementById('caOverlay').classList.add('active');
    renderCAPanel();
}
function closeCAPanel() { document.getElementById('caOverlay').classList.remove('active'); }
function changeCAMonth(dir) {
    caMonth += dir;
    if (caMonth > 11) { caMonth = 0; caYear++; }
    if (caMonth < 0) { caMonth = 11; caYear--; }
    renderCAPanel();
}

function renderCAPanel() {
    const cur = computeSubCA(caYear, caMonth);
    const pd = new Date(caYear, caMonth - 1, 1), prev = computeSubCA(pd.getFullYear(), pd.getMonth());
    const diff = cur.total - prev.total;
    const f = n => formatFCFA(Math.round(n));
    document.getElementById('caMonthLabel').textContent = `${MONTHS[caMonth]} ${caYear}`;
    document.getElementById('caTotal').textContent = f(cur.total);
    document.getElementById('caCost').textContent = cur.cost ? `−${f(cur.cost)} FCFA` : '0';
    const pe = document.getElementById('caProfit');
    pe.textContent = `${cur.profit < 0 ? '−' : ''}${f(Math.abs(cur.profit))} FCFA`;
    pe.className = cur.profit < 0 ? 'down' : 'up';
    document.getElementById('caCompare').innerHTML = prev.total || cur.total
        ? `<span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${f(Math.abs(diff))} FCFA</span> vs ${MONTHS[pd.getMonth()].toLowerCase()}`
        : 'Aucun abonnement payé sur ce mois';

    const max = Math.max(1, ...Object.values(cur.byService));
    document.getElementById('caServices').innerHTML = Object.keys(cur.byService).sort((a, b) => cur.byService[b] - cur.byService[a]).map(s => `
        <div class="ca-svc">
            <div class="ca-svc-head"><span>${escHtml(subServiceName(s))}${cur.costByService[s] ? ` <small class="ca-svc-cost">coût ${f(cur.costByService[s])}</small>` : ''}</span><strong>${f(cur.byService[s])} FCFA</strong></div>
            <div class="ca-bar"><div style="width:${Math.round(cur.byService[s] / max * 100)}%"></div></div>
        </div>`).join('');

    document.getElementById('caRows').innerHTML = cur.rows.length ? cur.rows.map(r => `
        <div class="ca-row">
            <div class="ca-row-main">
                <strong>${escHtml(r.c.name || 'Client')}</strong>
                <span>${escHtml(subAlertTitle(r.c))} · ${f(r.amount)} FCFA · ${r.days !== undefined ? (r.days === r.totalDays ? 'période entière' : `${r.days} j sur ${r.totalDays} j ce mois`) : (r.months > 1 ? `÷ ${r.months} mois · mois ${r.idx + 1}/${r.months}` : '(1 mois)')}</span>
            </div>
            <span class="ca-part">${f(r.part)}</span>
        </div>`).join('') : '<div class="notif-empty">Aucun montant pour ce mois. Renseigne le montant payé dans la fiche du client.</div>';
    renderCAChart();
    renderCADue();
}
