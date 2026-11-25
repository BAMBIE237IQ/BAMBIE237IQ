// ==================== ABONNEMENTS : codes des profils, code à copier, CA par jour, synchro Dashboard ====================
// Chargé après profile-codes.js, ca.js, subs-extra.js et sub-settings.js : remplace certaines fonctions par leur nouvelle version.

// ---------- 1) Codes des profils : service → compte → profils ----------
// Téléphone : un niveau à la fois (flèche retour). PC : les trois colonnes côte à côte.
// Les codes sont toujours visibles (plus de masquage).
let pcNav = { svc: null, acc: null };
const pcWide = () => window.matchMedia('(min-width: 900px)').matches;
const pcNorm = s => String(s || '').trim().toLowerCase();
function pcClientsOf(service, acc, name) {
    return (S.subscriptions || []).filter(c => !c.suspended && c.service === service && Number(c.account) === Number(acc) && name && pcNorm(c.profile) === pcNorm(name));
}
function pcLogo(id) {
    const key = typeof brandOf === 'function' ? brandOf(`${id} ${subServiceName(id)}`) : null, b = key && typeof BRANDS !== 'undefined' && BRANDS[key];
    return b ? `<span class="pc-logo" style="background:${b.bg}">${brandSvg(key)}</span>` : `<span class="pc-logo pc-logo-txt">${escHtml(subServiceName(id).slice(0, 1).toUpperCase())}</span>`;
}
function pcGo(svc, acc) { pcNav = { svc: svc ?? null, acc: acc ?? null }; renderProfileCodes(); const b = document.getElementById('pcBody'); if (b && !pcWide()) b.scrollTop = 0; }
function pcBack() { if (pcNav.acc != null) pcGo(pcNav.svc, null); else pcGo(null, null); }
function openProfileCodes() {
    if (!pcWide()) pcNav = { svc: null, acc: null };
    renderProfileCodes();
    document.getElementById('pcOverlay').classList.add('active');
}
function pcCopyCode(service, acc, i) {
    const p = pcList(service, acc)[i];
    if (!p || !p.code) return toast('Ce profil n’a pas encore de code');
    copyText(p.code, `Code ${p.code} copié ✓`);
}
function renderProfileCodes() {
    const body = document.getElementById('pcBody'); if (!body) return;
    const svcs = subServices(), ids = subServiceIds();
    if (pcNav.svc && !svcs[pcNav.svc]) pcNav = { svc: null, acc: null };
    if (pcWide()) {
        if (!pcNav.svc) pcNav.svc = ids.find(id => pcCount(id)) || ids.find(id => svcs[id].hasProfiles) || ids[0] || null;
        const accs = pcNav.svc ? (svcs[pcNav.svc].accounts || []) : [];
        if (pcNav.acc == null || !accs.map(Number).includes(Number(pcNav.acc))) pcNav.acc = accs[0] ?? null;
    }
    const level = pcNav.svc == null ? 0 : pcNav.acc == null ? 1 : 2;
    let total = 0; ids.forEach(id => total += pcCount(id));

    // Colonne 1 : services (ceux avec profils d'abord)
    const ordered = ids.slice().sort((a, b) => (svcs[b].hasProfiles ? 1 : 0) - (svcs[a].hasProfiles ? 1 : 0));
    const col1 = `<div class="pc-col pc-col-svc">
        <div class="pc-col-title">Services</div>
        ${ordered.map(id => { const n = pcCount(id), na = (svcs[id].accounts || []).length; return `
        <button class="pc-item${pcNav.svc === id ? ' on' : ''}" onclick="pcGo('${escAttr(id)}')">
            ${pcLogo(id)}
            <span class="pc-item-main"><strong>${escHtml(svcs[id].name)}</strong><small>${na} compte${na > 1 ? 's' : ''} · ${n} profil${n > 1 ? 's' : ''}</small></span>
            <span class="material-icons-outlined pc-chev">chevron_right</span>
        </button>`; }).join('')}
    </div>`;

    // Colonne 2 : comptes du service choisi
    let col2 = '<div class="pc-col pc-col-acc"></div>';
    if (pcNav.svc) {
        const conf = svcs[pcNav.svc];
        col2 = `<div class="pc-col pc-col-acc">
            <button class="pc-back" onclick="pcGo(null)"><span class="material-icons-outlined">arrow_back</span>${escHtml(conf.name)}</button>
            <div class="pc-col-title">Comptes ${escHtml(conf.name)}</div>
            ${(conf.accounts || []).map(acc => { const n = pcList(pcNav.svc, acc).length, cl = (S.subscriptions || []).filter(c => !c.suspended && c.service === pcNav.svc && Number(c.account) === Number(acc)).length; return `
            <button class="pc-item${Number(pcNav.acc) === Number(acc) ? ' on' : ''}" onclick="pcGo('${escAttr(pcNav.svc)}', ${Number(acc)})">
                <span class="pc-acc-num">${Number(acc)}</span>
                <span class="pc-item-main"><strong>${escHtml(subAccountLabel(pcNav.svc, acc))}</strong><small>${n} profil${n > 1 ? 's' : ''} · ${cl} client${cl > 1 ? 's' : ''}</small></span>
                <span class="material-icons-outlined pc-chev">chevron_right</span>
            </button>`; }).join('') || '<div class="pc-empty">Aucun compte.</div>'}
        </div>`;
    }

    // Colonne 3 : profils du compte choisi, codes visibles
    let col3 = '<div class="pc-col pc-col-prof"></div>';
    if (pcNav.svc && pcNav.acc != null) {
        const id = pcNav.svc, acc = Number(pcNav.acc), list = pcList(id, acc);
        const sugg = pcClientProfiles(id, acc), dl = `pcdl_${id}_${acc}`;
        col3 = `<div class="pc-col pc-col-prof">
            <button class="pc-back" onclick="pcBack()"><span class="material-icons-outlined">arrow_back</span>${escHtml(subServiceName(id))}</button>
            <div class="pc-col-title">${escHtml(subAccountLabel(id, acc))} <small>${list.length} profil${list.length > 1 ? 's' : ''}</small></div>
            <div class="pc-cards">
            ${list.map((p, i) => { const cl = pcClientsOf(id, acc, p.name); return `
                <div class="pc-card">
                    <div class="pc-card-top">
                        <input class="pc-name" value="${escAttr(p.name || '')}" placeholder="Nom du profil" list="${dl}" onchange="pcEdit('${escAttr(id)}', ${acc}, ${i}, 'name', this.value)" aria-label="Nom du profil">
                        <button class="pc-del" onclick="pcRemove('${escAttr(id)}', ${acc}, ${i})" aria-label="Supprimer ce profil"><span class="material-icons-outlined">delete</span></button>
                    </div>
                    <div class="pc-code-line">
                        <input class="pc-code" value="${escAttr(p.code || '')}" placeholder="Code" type="text" inputmode="numeric" autocomplete="off" onchange="pcEdit('${escAttr(id)}', ${acc}, ${i}, 'code', this.value)" aria-label="Code du profil ${escAttr(p.name || '')}">
                        <button class="pc-copy" onclick="pcCopyCode('${escAttr(id)}', ${acc}, ${i})" aria-label="Copier le code"><span class="material-icons-outlined">content_copy</span></button>
                    </div>
                    <span class="pc-date">${p.codeChangedAt ? `Code modifié le ${pcDate(p.codeChangedAt)}` : 'Code pas encore daté'}</span>
                    ${cl.length ? `<span class="pc-who"><span class="material-icons-outlined">person</span>${cl.map(c => escHtml(c.name)).join(', ')}</span>` : ''}
                </div>`; }).join('')}
            </div>
            ${list.length ? '' : '<div class="pc-empty">Aucun profil enregistré.</div>'}
            <datalist id="${dl}">${sugg.map(s => `<option value="${escAttr(s)}"></option>`).join('')}</datalist>
            <button class="pc-add" onclick="pcAdd('${escAttr(id)}', ${acc})"><span class="material-icons-outlined">add</span> Ajouter un profil</button>
        </div>`;
    }
    body.className = `pc-body pc-lvl-${level}`;
    body.innerHTML = col1 + col2 + col3;
    document.getElementById('pcSummary').textContent = `${total} profil${total > 1 ? 's' : ''} enregistré${total > 1 ? 's' : ''}`;
    const sb = document.getElementById('pcShowBtn'); if (sb) sb.hidden = true;
}
// Sur PC, la ligne ajoutée prend le focus ; sur mobile aussi (même logique que l'ancienne version)
function pcAdd(service, acc) {
    const list = pcList(service, acc).slice(); list.push({ name: '', code: '' });
    if (!S.subProfileCodes) S.subProfileCodes = {};
    S.subProfileCodes[`${service}_${acc}`] = list;
    renderProfileCodes();
    const names = document.querySelectorAll('#pcBody .pc-name'); if (names.length) names[names.length - 1].focus();
}
window.addEventListener('resize', () => { const o = document.getElementById('pcOverlay'); if (o && o.classList.contains('active')) renderProfileCodes(); });

// ---------- 2) Message « code du profil » (Paramètres → Messages) + bouton dans la fiche client ----------
const SUB_CODE_DEFAULT = 'Bonjour {nom} 👋\nVoici le code de ton profil {profil} sur {service} : {code}\nGarde-le pour toi, merci 🙏';
const SUB_CODE_TOKENS = ['{nom}', '{service}', '{compte}', '{profil}', '{code}'];
SUB_MSG_DEFAULTS.code = SUB_CODE_DEFAULT;
function subFindProfileCode(service, acc, profile) {
    return pcList(service, acc).find(p => pcNorm(p.name) === pcNorm(profile)) || null;
}
function subCodeMsgFill(tpl, c, p) {
    return String(tpl)
        .replace(/\{nom\}/gi, c.name || '')
        .replace(/\{service\}/gi, subServiceName(c.service))
        .replace(/\{compte\}/gi, c.account ? subAccountLabel(c.service, c.account) : '')
        .replace(/\{profil\}/gi, c.profile || '')
        .replace(/\{code\}/gi, p && p.code ? p.code : '')
        .replace(/ {2,}/g, ' ');
}
// Exemple pour l'aperçu : le premier client dont le profil a un code, sinon un exemple inventé
function subCodeSample() {
    for (const c of S.subscriptions || []) {
        if (!c.profile || c.suspended) continue;
        const p = subFindProfileCode(c.service, c.account, c.profile);
        if (p && p.code) return { c, p };
    }
    return { c: { name: 'Awa', service: subServiceIds()[0], account: 1, profile: 'Rouge' }, p: { code: '1234' } };
}
const _subMsgPreviewBase = subMsgPreview;
subMsgPreview = function (kind) {
    if (kind !== 'code') return _subMsgPreviewBase(kind);
    const { c, p } = subCodeSample();
    return subCodeMsgFill(subMsgTemplate('code'), c, p);
};
function subCodeMsgCardHtml() {
    const { c } = subCodeSample();
    return `
    <div class="msg-card msg-card-code">
        <div class="msg-head"><strong><span class="material-icons-outlined">password</span> Code du profil</strong><span class="msg-ok" id="subMsgOk_code"></span></div>
        <p class="set-hint">Copié avec le bouton <b>Copier le code</b> dans la fiche d’un client. <code>{code}</code> prend toujours le code actuel de son profil, tel qu’il est dans <b>Codes des profils</b> : change le code là-bas, le message suit tout seul.</p>
        <textarea id="subMsg_code" rows="4" oninput="saveSubMsgDebounced('code', this.value)" aria-label="Message du code du profil">${escHtml(subMsgTemplate('code'))}</textarea>
        <div class="msg-tools">
            ${SUB_CODE_TOKENS.map(t => `<button class="msg-chip" onclick="subMsgInsert('code', '${t}')">+ ${t}</button>`).join('')}
            <span class="grow"></span>
            <button class="msg-link" onclick="subMsgReset('code')">Message par défaut</button>
        </div>
        <div class="msg-prev"><span>Aperçu pour « ${escHtml(c.name)} »</span><p id="subMsgPrev_code">${escHtml(subMsgPreview('code'))}</p></div>
    </div>`;
}
function copySubProfileCode() {
    const c = (S.subscriptions || []).find(x => x.id === editingSubId);
    if (!c) return;
    if (!c.profile) return toast('Ce client n’a pas de profil. Choisis-en un dans sa fiche.');
    const p = subFindProfileCode(c.service, c.account, c.profile);
    if (!p || !p.code) return toast(`Pas de code pour le profil « ${c.profile} » (${subAccountLabel(c.service, c.account)}). Ajoute-le dans Codes des profils.`);
    copyText(subCodeMsgFill(subMsgTemplate('code'), c, p), `Code du profil ${c.profile} copié ✓ Colle-le dans WhatsApp`);
}
// Le bouton n'apparaît que pour les services à profils (Netflix, Prime, Crunchyroll…)
(function hookSubModal() {
    const base = window.openSubModal;
    if (typeof base !== 'function') return;
    window.openSubModal = function (id) {
        const r = base.apply(this, arguments);
        const btn = document.getElementById('subCodeBtn'), c = (S.subscriptions || []).find(x => x.id === id);
        if (btn) btn.hidden = !(c && (subServices()[c.service] || {}).hasProfiles);
        return r;
    };
})();

// ---------- 3) Diagramme du CA : 12 mois ⇄ jours du mois ----------
// Vue « jours » : simple visualisation. Entrées = montant de chaque abonnement le jour où il commence ;
// dépenses (barres négatives) = coût de chaque compte à son jour de paiement (1er du mois s'il n'est pas renseigné).
let caChartView = 'year', caLastClick = { i: -1, t: 0 };
function subDayFlows(y, m) {
    const n = daysIn(y, m), key = `${y}-${String(m + 1).padStart(2, '0')}`;
    const income = Array(n).fill(0), cost = Array(n).fill(0), who = Array.from({ length: n }, () => []), what = Array.from({ length: n }, () => []);
    let noPayDay = 0;
    for (const c of S.subscriptions || []) {
        if (c.status && /rembours/i.test(c.status)) continue;
        for (const p of subPeriods(c)) {
            if (!p.start || p.start.slice(0, 7) !== key) continue;
            const amt = subAmount(p); if (!amt) continue;
            const d = Number(p.start.slice(8, 10)) - 1; if (d < 0 || d >= n) continue;
            income[d] += amt; who[d].push(`${c.name || 'Client'} (${subServiceName(c.service)}) ${formatFCFA(amt)}`);
        }
    }
    const svcs = subServices(), mk = monthKey(y, m);
    for (const id in svcs) for (const acc of svcs[id].accounts || []) {
        const amt = subCostAt(id, acc, mk); if (!amt) continue;
        const meta = (S.subAccountCosts || {})[`${id}_${acc}`] || {};
        if (!meta.payDay) noPayDay++;
        const d = Math.min(n, Number(meta.payDay) || 1) - 1;
        cost[d] += amt; what[d].push(`${subAccountLabel(id, acc)} ${formatFCFA(amt)}`);
    }
    return { n, income, cost, who, what, noPayDay };
}
function setCAChartView(v) { caChartView = v === 'days' ? 'days' : 'year'; renderCAChart(); }
function renderCAChartHead(extra) {
    const head = document.getElementById('caChartHead'); if (!head) return;
    const mName = `${MONTHS[caMonth].toLowerCase()} ${caYear}`;
    head.innerHTML = caChartView === 'year'
        ? `<span class="ca-ch-title">12 derniers mois<small>Double-clique un mois pour voir ses jours</small></span>
           <button class="ca-ch-btn" onclick="setCAChartView('days')">Jours de ${escHtml(mName)}<span class="material-icons-outlined">chevron_right</span></button>`
        : `<button class="ca-ch-btn back" onclick="setCAChartView('year')"><span class="material-icons-outlined">chevron_left</span>12 mois</button>
           <span class="ca-ch-title right">Jour par jour · ${escHtml(mName)}<small>${extra || ''}</small></span>`;
}
const caAxis = v => Math.abs(v) >= 1000 ? (v / 1000) + 'k' : v;
renderCAChart = function () {
    const canvas = document.getElementById('caChart');
    if (!canvas || typeof Chart === 'undefined') return;
    if (caChartInst) { caChartInst.destroy(); caChartInst = null; }
    const font = { family: 'Figtree', weight: 600 };
    if (caChartView === 'days') {
        const f = subDayFlows(caYear, caMonth);
        const tin = f.income.reduce((a, b) => a + b, 0), tout = f.cost.reduce((a, b) => a + b, 0);
        renderCAChartHead(`Entrées ${formatFCFA(tin)} · Dépenses −${formatFCFA(tout)}${f.noPayDay ? ` · ${f.noPayDay} compte${f.noPayDay > 1 ? 's' : ''} sans jour de paiement (mis au 1er)` : ''}`);
        caChartInst = new Chart(canvas.getContext('2d'), {
            type: 'bar',
            data: {
                labels: Array.from({ length: f.n }, (_, i) => String(i + 1)),
                datasets: [
                    { label: 'Entrées', data: f.income, backgroundColor: '#3ddc84', borderRadius: 4, maxBarThickness: 18, stack: 's' },
                    { label: 'Dépenses', data: f.cost.map(v => -v), backgroundColor: '#ff3d4a', borderRadius: 4, maxBarThickness: 18, stack: 's' }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { labels: { color: '#a8a8a8', boxWidth: 12, font } },
                    tooltip: {
                        filter: it => it.parsed.y !== 0,
                        callbacks: {
                            title: it => `${it[0].label} ${MONTHS[caMonth].toLowerCase()}`,
                            label: c => ` ${c.dataset.label} : ${c.parsed.y < 0 ? '−' : ''}${formatFCFA(Math.abs(c.parsed.y))} FCFA`,
                            afterBody: it => { const d = it[0].dataIndex; return [...f.who[d], ...f.what[d].map(x => '− ' + x)]; }
                        }
                    }
                },
                scales: {
                    x: { stacked: true, grid: { display: false }, ticks: { color: '#a8a8a8', font: { family: 'Figtree' }, autoSkip: true, maxRotation: 0 } },
                    y: { stacked: true, grid: { color: c => c.tick.value === 0 ? 'rgba(255,255,255,.25)' : 'rgba(255,255,255,.06)' }, ticks: { color: '#6e6e6e', callback: caAxis } }
                }
            }
        });
        return;
    }
    renderCAChartHead();
    const labels = [], ca = [], profit = [], keys = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(caYear, caMonth - i, 1), r = computeSubCA(d.getFullYear(), d.getMonth());
        labels.push(MONTHS[d.getMonth()].slice(0, 3).toLowerCase());
        keys.push({ y: d.getFullYear(), m: d.getMonth() });
        ca.push(Math.round(r.total)); profit.push(Math.round(r.profit));
    }
    caChartInst = new Chart(canvas.getContext('2d'), {
        data: {
            labels,
            datasets: [
                { type: 'bar', label: 'CA', data: ca, backgroundColor: ca.map((_, i) => i === 11 ? '#ff3d4a' : 'rgba(216,24,34,.55)'), borderRadius: 6, maxBarThickness: 26 },
                { type: 'line', label: 'Bénéfice', data: profit, borderColor: '#3ddc84', backgroundColor: '#3ddc84', borderWidth: 2, pointRadius: 2, tension: .3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            // Double-clic (ou double-tap) sur un mois : on ouvre ses jours
            onClick: (evt, els, chart) => {
                const pts = chart.getElementsAtEventForMode(evt, 'index', { intersect: false }, true);
                if (!pts.length) return;
                const i = pts[0].index, now = Date.now();
                if (caLastClick.i === i && now - caLastClick.t < 450) {
                    caLastClick = { i: -1, t: 0 };
                    caYear = keys[i].y; caMonth = keys[i].m; caChartView = 'days';
                    renderCAPanel();
                } else caLastClick = { i, t: now };
            },
            plugins: { legend: { labels: { color: '#a8a8a8', boxWidth: 12, font } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label} : ${formatFCFA(c.parsed.y)} FCFA` } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#a8a8a8', font: { family: 'Figtree' } } },
                y: { grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: '#6e6e6e', callback: caAxis } }
            }
        }
    });
    // Double-clic de la souris (le double-tap passe par onClick ci-dessus)
    canvas.ondblclick = e => {
        if (caChartView !== 'year' || !caChartInst) return;
        const pts = caChartInst.getElementsAtEventForMode(e, 'index', { intersect: false }, true);
        if (!pts.length) return;
        const k = keys[pts[0].index];
        caYear = k.y; caMonth = k.m; caChartView = 'days'; caLastClick = { i: -1, t: 0 };
        renderCAPanel();
    };
};

// ---------- 4) Entrées et sorties des abonnements → Dashboard (automatique, à partir de novembre 2026) ----------
// Entrée = montant d'un abonnement le jour où il commence. Sortie = coût d'un compte à son jour de paiement (1er sinon).
// Seulement les dates passées ou d'aujourd'hui. Recalculé à chaque affichage : modifier une fiche client met à jour le Dashboard, sans doublon.
const SUB_FIN_FROM = '2026-11';
function subFinanceWanted() {
    const out = [], today = localDateStr(), from = SUB_FIN_FROM + '-01';
    for (const c of S.subscriptions || []) {
        if (c.status && /rembours/i.test(c.status)) continue;
        for (const p of subPeriods(c)) {
            if (!p.start || p.start < from || p.start > today) continue;
            const amt = subAmount(p); if (!amt) continue;
            out.push({ id: `sub_${c.id}_${p.start}`, type: 'income', amount: amt, label: `Abonnement ${subServiceName(c.service)} · ${c.name || 'Client'}`, justification: 'Automatique (Abonnements)', day: Number(p.start.slice(8, 10)), date: p.start, auto: 'sub' });
        }
    }
    const svcs = subServices(), t = new Date();
    let [y, m] = SUB_FIN_FROM.split('-').map(Number); m--;
    while (y < t.getFullYear() || (y === t.getFullYear() && m <= t.getMonth())) {
        const mk = monthKey(y, m), n = daysIn(y, m);
        for (const id in svcs) for (const acc of svcs[id].accounts || []) {
            const amt = subCostAt(id, acc, mk); if (!amt) continue;
            const meta = (S.subAccountCosts || {})[`${id}_${acc}`] || {};
            const day = Math.min(n, Number(meta.payDay) || 1), date = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (date > today) continue;
            out.push({ id: `subcost_${id}_${acc}_${mk}`, type: 'expense', amount: amt, label: `Compte ${subAccountLabel(id, acc)}`, justification: 'Automatique (coût du compte, Abonnements)', day, date, auto: 'sub' });
        }
        if (++m > 11) { m = 0; y++; }
    }
    return out;
}
function syncSubsToDashboard() {
    if (!S.transactions) S.transactions = {};
    const tx = S.transactions;   // S brut = le Dashboard (Finance utilise finance2Transactions)
    const wanted = subFinanceWanted();
    const have = [];
    for (const mk in tx) for (const t of tx[mk] || []) if (t && t.auto === 'sub') have.push(t);
    const sig = l => l.map(t => `${t.id}|${t.amount}|${t.date}|${t.label}`).sort().join('\n');
    if (sig(have) === sig(wanted)) return false;
    for (const mk of Object.keys(tx)) {
        const kept = (tx[mk] || []).filter(t => !(t && t.auto === 'sub'));
        if (kept.length) tx[mk] = kept; else delete tx[mk];
    }
    for (const t of wanted) {
        const mk = monthKey(Number(t.date.slice(0, 4)), Number(t.date.slice(5, 7)) - 1);
        (tx[mk] = tx[mk] || []).push(t);
    }
    return true;
}
(function hookRenderAll() {
    const orig = window.renderAll;
    if (typeof orig !== 'function') return;
    window.renderAll = function () {
        try { if (syncSubsToDashboard()) save(); } catch (e) { console.warn('Synchro abonnements → Dashboard', e); }
        return orig.apply(this, arguments);
    };
})();
// Ces lignes se modifient dans la fiche client (ou le coût du compte), pas dans le Dashboard
function subAutoTx(mk, id) { return S.activeLedger !== 'finance2' && ((S.transactions || {})[mk] || []).find(t => t.id === id && t.auto === 'sub'); }
(function guardAutoTx() {
    const ed = window.editTransaction, del = window.deleteTransaction;
    const msg = 'Ligne automatique des Abonnements : modifie la fiche du client (ou le coût du compte) dans Abonnements.';
    if (typeof ed === 'function') window.editTransaction = function (mk, id) { if (subAutoTx(mk, id)) return toast(msg); return ed.apply(this, arguments); };
    if (typeof del === 'function') window.deleteTransaction = function (mk, id) { if (subAutoTx(mk, id)) return toast(msg); return del.apply(this, arguments); };
})();
