// ==================== CA DES ABONNEMENTS ====================
// Le montant payé par un client est réparti à parts égales sur chaque mois couvert :
// 5 000 FCFA du 12 sept. au 12 nov. (2 mois) -> 2 500 en septembre + 2 500 en octobre.
// 20 000 FCFA pour 12 mois -> 1 667 par mois, de septembre à août.
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

function computeSubCA(y, m) {
    const rows = [], byService = {};
    let total = 0;
    for (const c of S.subscriptions || []) {
        if (c.status && /rembours/i.test(c.status)) continue;
        const amount = subAmount(c);
        if (!amount) continue;
        const months = subMonths(c), first = subFirstMonth(c, months);
        if (!first) continue;
        const idx = (y - first.y) * 12 + (m - first.m); // position du mois demandé dans la période payée
        if (idx < 0 || idx >= months) continue;
        const part = amount / months;
        total += part;
        byService[c.service] = (byService[c.service] || 0) + part;
        rows.push({ c, amount, months, idx, part });
    }
    rows.sort((a, b) => b.part - a.part);
    return { total, byService, rows };
}

function openCAPanel() {
    const t = new Date();
    if (caYear === null) { caYear = t.getFullYear(); caMonth = t.getMonth(); }
    renderCAPanel();
    document.getElementById('caOverlay').classList.add('active');
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
    document.getElementById('caCompare').innerHTML = prev.total || cur.total
        ? `<span class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : '−'}${f(Math.abs(diff))} FCFA</span> vs ${MONTHS[pd.getMonth()].toLowerCase()}`
        : 'Aucun abonnement payé sur ce mois';

    const max = Math.max(1, ...Object.values(cur.byService));
    document.getElementById('caServices').innerHTML = Object.keys(cur.byService).sort((a, b) => cur.byService[b] - cur.byService[a]).map(s => `
        <div class="ca-svc">
            <div class="ca-svc-head"><span>${escHtml(subServiceName(s))}</span><strong>${f(cur.byService[s])} FCFA</strong></div>
            <div class="ca-bar"><div style="width:${Math.round(cur.byService[s] / max * 100)}%"></div></div>
        </div>`).join('');

    document.getElementById('caRows').innerHTML = cur.rows.length ? cur.rows.map(r => `
        <div class="ca-row">
            <div class="ca-row-main">
                <strong>${escHtml(r.c.name || 'Client')}</strong>
                <span>${escHtml(subAlertTitle(r.c))} · ${f(r.amount)} FCFA ${r.months > 1 ? `÷ ${r.months} mois · mois ${r.idx + 1}/${r.months}` : '(1 mois)'}</span>
            </div>
            <span class="ca-part">${f(r.part)}</span>
        </div>`).join('') : '<div class="notif-empty">Aucun montant pour ce mois. Renseigne le montant payé dans la fiche du client.</div>';
}
