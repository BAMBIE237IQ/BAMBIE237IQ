// ==================== ABONNEMENTS : OUTILS AVANCÉS ====================
// Relance à copier, renouvellement en 1 clic, historique des paiements, paiements partiels,
// places libres (Spotify), date de renouvellement des comptes, graphique CA, export Excel, classement.

// ----- Périodes payées (en cours + historique) -----
function subHistory(c) { return Array.isArray(c.history) ? c.history : Object.values(c.history || {}); }
function subPeriods(c) { return [c, ...subHistory(c)]; }

// ----- Paiements partiels : champ « Déjà payé » vide = tout payé -----
function subPaid(p) {
    const total = subAmount(p);
    if (p.paid === undefined || p.paid === null || String(p.paid).trim() === '') return total;
    const n = parseInt(String(p.paid).replace(/[^\d]/g, ''), 10) || 0;
    return Math.min(n, total);
}
function subDue(p) { return Math.max(0, subAmount(p) - subPaid(p)); }
function subDueChip(c) { const d = subDue(c); return d ? `<span class="due-chip" title="Paiement partiel">reste ${formatFCFA(d)}</span>` : ''; }
function subTotalPaid(c) { return subPeriods(c).reduce((s, p) => s + subPaid(p), 0); }
function fmtDateFr(s) { const [y, m, d] = String(s || '').split('-'); return d ? `${d}/${m}/${y}` : '—'; }

// ----- Fiche client : onglets Fiche / Historique + actions -----
function showSubTab(tab) {
    document.getElementById('subTabFiche').hidden = tab !== 'fiche';
    document.getElementById('subTabHist').hidden = tab !== 'hist';
    document.querySelectorAll('.sub-tabs-modal button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
}
function subModalExtras(id) {
    const c = id ? (S.subscriptions || []).find(x => x.id === id) : null;
    document.getElementById('subActions').hidden = !c;
    document.getElementById('subHistTabBtn').hidden = !c;
    document.getElementById('subPaid').value = c && c.paid !== undefined && c.paid !== null ? c.paid : '';
    showSubTab('fiche');
    if (!c) return;
    const hist = subHistory(c);
    document.getElementById('subHistTabBtn').textContent = `Historique (${hist.length + 1})`;
    const periods = [{ p: c, current: true }, ...hist.slice().reverse().map(p => ({ p, current: false }))];
    document.getElementById('subTabHist').innerHTML = `
        <div class="hist-total"><span>Total encaissé</span><strong>${formatFCFA(subTotalPaid(c))} FCFA</strong><small>${hist.length} renouvellement${hist.length > 1 ? 's' : ''}</small></div>
        ${periods.map(({ p, current }) => `<div class="hist-row${current ? ' current' : ''}">
            <div><strong>${fmtDateFr(p.start)} → ${p.end ? fmtDateFr(p.end) : 'à vie'}</strong><span>${escHtml(p.duration || '')}${current ? ' · en cours' : ''}</span></div>
            <div class="hist-amt"><strong>${subAmount(p) ? formatFCFA(subAmount(p)) : '—'}</strong>${subDue(p) ? `<span class="due-chip">reste ${formatFCFA(subDue(p))}</span>` : '<span class="paid-ok">payé</span>'}</div>
        </div>`).join('')}`;
}

// ----- Message de relance prêt à copier -----
function subRelanceText(c) {
    const svc = subServiceName(c.service), d = subDaysLeft(c.end);
    const quand = d === null ? '' : d < 0 ? `a expiré le ${fmtDateFr(c.end)}` : d === 0 ? `se termine aujourd'hui (${fmtDateFr(c.end)})` : `se termine le ${fmtDateFr(c.end)} (dans ${d} jour${d > 1 ? 's' : ''})`;
    const months = parseInt(subDurationValue(c.duration), 10) || 1, due = subDue(c);
    return [
        `Bonjour ${c.name} 👋`,
        `Ton abonnement ${svc}${c.profile ? ` (profil ${c.profile})` : ''} ${quand}.`,
        subAmount(c) ? `Pour le renouveler ${months > 1 ? `${months} mois` : '1 mois'} : ${formatFCFA(subAmount(c))} FCFA.` : `Dis-moi si tu veux le renouveler.`,
        due ? `Il reste aussi ${formatFCFA(due)} FCFA à régler sur la période actuelle.` : '',
        `Réponds-moi pour continuer à en profiter sans coupure 🙏`
    ].filter(Boolean).join('\n');
}
function copyText(text, msg) {
    const done = () => toast(msg || 'Message copié ✓ Colle-le dans WhatsApp');
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text).then(done).catch(() => fallback());
    fallback();
    function fallback() {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) { prompt('Copie ce message :', text); }
        ta.remove();
    }
}
function copySubRelance() {
    const c = (S.subscriptions || []).find(x => x.id === editingSubId);
    if (c) copyText(subRelanceText(c));
}

// ----- Renouveler en 1 clic : même durée, même montant ; l'ancienne période part dans l'historique -----
function renewSub() {
    const c = (S.subscriptions || []).find(x => x.id === editingSubId);
    if (!c) return;
    const dv = subDurationValue(c.duration);
    if (dv === 'life') return toast('Abonnement à vie : rien à renouveler');
    const n = parseInt(dv, 10) || 1, left = subDaysLeft(c.end);
    const start = c.end && left !== null && left >= 0 ? c.end : localDateStr();
    const end = addMonthsToDate(start, n);
    if (!confirm(`Renouveler ${c.name} pour ${n} mois ?\nDu ${fmtDateFr(start)} au ${fmtDateFr(end)}${subAmount(c) ? ` · ${formatFCFA(subAmount(c))} FCFA` : ''}`)) return;
    const hist = subHistory(c).slice();
    hist.push({ start: c.start || '', end: c.end || '', duration: c.duration || '', code: c.code || '', paid: c.paid ?? '', renewedAt: new Date().toISOString() });
    Object.assign(c, { history: hist, start, end, paid: '' });
    save(); closeSubModal(); renderAll();
    toast(`${c.name} renouvelé jusqu'au ${fmtDateFr(end)} ✓`);
}

// ----- Infos par compte : places libres (Spotify) et date de renouvellement chez le fournisseur -----
function subAccountMeta(service, acc) { return (S.subAccountMeta || {})[`${service}_${acc}`] || {}; }
function setSubAccountMeta(service, acc, patch) {
    if (!S.subAccountMeta) S.subAccountMeta = {};
    const k = `${service}_${acc}`, next = { ...subAccountMeta(service, acc), ...patch };
    for (const key of Object.keys(next)) if (next[key] === null || next[key] === '') delete next[key];
    if (Object.keys(next).length) S.subAccountMeta[k] = next; else delete S.subAccountMeta[k];
}
function accountHasSlots(service) { return /spotify/i.test(`${service} ${subServiceName(service)}`); }
function activeClientsOn(service, acc) {
    return (S.subscriptions || []).filter(c => c.service === service && Number(c.account) === Number(acc)
        && !(c.status && SUB_INACTIVE.test(c.status))
        && ((c.duration && /life|vie/i.test(c.duration)) || !c.end || (subDaysLeft(c.end) ?? 0) >= 0)).length;
}
function accountMetaChips(service, acc) {
    let h = '';
    if (accountHasSlots(service)) {
        const cap = subAccountMeta(service, acc).slots || 6, used = activeClientsOn(service, acc), free = Math.max(0, cap - used);
        h += `<button class="acc-chip ${free ? 'ok' : 'full'}" onclick="editAccountSlots('${service}', ${acc})" title="${used} place(s) occupée(s) sur ${cap} — toucher pour changer le nombre de places">${free ? `${free} place${free > 1 ? 's' : ''} libre${free > 1 ? 's' : ''}` : 'Complet'} · ${used}/${cap}</button>`;
    }
    const r = subAccountMeta(service, acc).renew;
    if (r) {
        const d = subDaysLeft(r);
        const cls = d === null ? '' : d < 0 ? ' late' : d <= 3 ? ' soon' : '';
        const label = d === null ? `Renouv. ${fmtDateFr(r)}` : d < 0 ? `À repayer (${-d} j)` : d === 0 ? 'À repayer aujourd’hui' : `Renouv. ${subEndShort(r)}`;
        h += `<button class="acc-chip renew${cls}" onclick="editAccountRenew('${service}', ${acc})" title="Date à laquelle tu dois repayer ce compte chez le fournisseur">${label}</button>`;
    } else {
        h += `<button class="acc-chip renew empty" onclick="editAccountRenew('${service}', ${acc})" title="Date à laquelle tu dois repayer ce compte chez le fournisseur">+ Date de renouv.</button>`;
    }
    return h;
}
function editAccountSlots(service, acc) {
    const cur = subAccountMeta(service, acc).slots || 6;
    const v = prompt(`Nombre total de places sur « ${subAccountLabel(service, acc)} » :`, String(cur));
    if (v === null) return;
    const n = parseInt(v, 10);
    if (!(n > 0 && n < 100)) return toast('⚠ Entre un nombre de places valide');
    setSubAccountMeta(service, acc, { slots: n }); save(); renderSubscriptions();
}
function parseFrDate(v) {
    v = String(v || '').trim();
    let m = v.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? v : null;
}
function editAccountRenew(service, acc) {
    const r = subAccountMeta(service, acc).renew, d = r ? subDaysLeft(r) : null;
    // Échéance proche ou passée : on propose directement le mois suivant (compte repayé)
    const suggestion = r ? (d !== null && d <= 3 ? addMonthsToDate(r, 1) : r) : '';
    const v = prompt(`Date de renouvellement de « ${subAccountLabel(service, acc)} » chez le fournisseur (JJ/MM/AAAA).${r && d !== null && d <= 3 ? '\nCompte repayé ? La date du mois suivant est proposée.' : ''}\nLaisse vide pour retirer.`, suggestion ? fmtDateFr(suggestion) : '');
    if (v === null) return;
    if (!v.trim()) { setSubAccountMeta(service, acc, { renew: null }); save(); renderAll(); return toast('Date retirée'); }
    const iso = parseFrDate(v);
    if (!iso) return toast('⚠ Date invalide (ex : 27/10/2026)');
    setSubAccountMeta(service, acc, { renew: iso }); save(); renderAll();
    toast(`Renouvellement du compte : ${fmtDateFr(iso)} ✓`);
}
// Comptes à repayer dans les 3 jours (ou en retard) : affichés dans la cloche
function getAccountRenewAlerts() {
    const out = [], svcs = subServices();
    for (const id in svcs) for (const acc of svcs[id].accounts) {
        const r = subAccountMeta(id, acc).renew;
        if (!r) continue;
        const diff = subDaysLeft(r);
        if (diff === null || diff > 3 || diff < -30) continue;
        out.push({ service: id, acc, date: r, diff });
    }
    return out.sort((a, b) => a.diff - b.diff);
}
function openAccountFromNotif(service) { closeNotifPanel(); switchView('subscriptions'); setSubFilter(service); }

// ----- Graphique CA / bénéfice sur 12 mois (panneau CA) -----
let caChartInst = null;
function renderCAChart() {
    const canvas = document.getElementById('caChart');
    if (!canvas || typeof Chart === 'undefined') return;
    const labels = [], ca = [], profit = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(caYear, caMonth - i, 1), r = computeSubCA(d.getFullYear(), d.getMonth());
        labels.push(MONTHS[d.getMonth()].slice(0, 3).toLowerCase());
        ca.push(Math.round(r.total)); profit.push(Math.round(r.profit));
    }
    if (caChartInst) caChartInst.destroy();
    caChartInst = new Chart(canvas.getContext('2d'), {
        data: {
            labels,
            datasets: [
                { type: 'bar', label: 'CA', data: ca, backgroundColor: ca.map((_, i) => i === 11 ? '#ff3d4a' : 'rgba(216,24,34,.55)'), borderRadius: 6, maxBarThickness: 26 },
                { type: 'line', label: 'Bénéfice', data: profit, borderColor: '#3ddc84', backgroundColor: '#3ddc84', borderWidth: 2, pointRadius: 2, tension: .3 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#a8a8a8', boxWidth: 12, font: { family: 'Figtree', weight: 600 } } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label} : ${formatFCFA(c.parsed.y)} FCFA` } } },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#a8a8a8', font: { family: 'Figtree' } } },
                y: { grid: { color: 'rgba(255,255,255,.06)' }, ticks: { color: '#6e6e6e', callback: v => Math.abs(v) >= 1000 ? (v / 1000) + 'k' : v } }
            }
        }
    });
}
// Reste à encaisser (paiements partiels en cours)
function renderCADue() {
    const el = document.getElementById('caDue');
    if (!el) return;
    const list = (S.subscriptions || []).filter(c => subDue(c) > 0);
    const total = list.reduce((s, c) => s + subDue(c), 0);
    el.innerHTML = total ? `Reste à encaisser : <strong>${formatFCFA(total)} FCFA</strong> · ${list.length} client${list.length > 1 ? 's' : ''} (${list.map(c => escHtml(c.name)).slice(0, 4).join(', ')}${list.length > 4 ? '…' : ''})` : '';
    el.hidden = !total;
}

// ----- Export Excel (CSV lisible directement par Excel) -----
function exportSubsExcel() {
    const head = ['Service', 'Compte', 'Profil', 'Client', 'Statut', 'Durée', 'Début', 'Fin', 'Jours restants', 'Montant', 'Payé', 'Reste', 'Renouvellements', 'Total encaissé'];
    const rows = (S.subscriptions || []).map(c => [
        subServiceName(c.service), c.account ? subAccountLabel(c.service, c.account) : '', c.profile || '', c.name || '', c.status || '', c.duration || '',
        fmtDateFr(c.start), c.end ? fmtDateFr(c.end) : '', c.end ? (subDaysLeft(c.end) ?? '') : '',
        subAmount(c), subPaid(c), subDue(c), subHistory(c).length, subTotalPaid(c)
    ]);
    const cell = v => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = '﻿' + [head, ...rows].map(r => r.map(cell).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `abonnements-${localDateStr()}.csv`;
    a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('Export Excel téléchargé ✓');
}

// ----- Paramètres : classement des clients -----
function openSubSettings() {
    const all = (S.subscriptions || []).map(c => ({ c, total: subTotalPaid(c), renew: subHistory(c).length }));
    const top = all.filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
    const lost = all.filter(x => x.c.end && !(x.c.duration && /life|vie/i.test(x.c.duration)) && (subDaysLeft(x.c.end) ?? 0) < -7 && !(x.c.status && SUB_INACTIVE.test(x.c.status)))
        .sort((a, b) => (a.c.end || '').localeCompare(b.c.end || ''));
    const row = (x, i, extra) => `<button class="rank-row" onclick="closeSubSettings(); setSubFilter('${escAttr(x.c.service)}'); openSubModal('${escAttr(x.c.id)}')">
        <span class="rank-pos${i === 0 ? ' gold' : ''}">${i + 1}</span>
        <span class="rank-main"><strong>${escHtml(x.c.name)}</strong><span>${escHtml(subAlertTitle(x.c))}${extra ? ' · ' + extra : ''}</span></span>
        <span class="rank-val">${formatFCFA(x.total)}</span>
    </button>`;
    document.getElementById('subSettingsBody').innerHTML = `
        <h3 class="set-title">Meilleurs clients</h3>
        <p class="set-hint">Classés par total encaissé, renouvellements compris.</p>
        <div class="rank-list">${top.length ? top.map((x, i) => row(x, i, `${x.renew} renouvellement${x.renew > 1 ? 's' : ''}`)).join('') : '<div class="notif-empty">Aucun paiement enregistré pour l’instant.</div>'}</div>
        <h3 class="set-title">À reconquérir</h3>
        <p class="set-hint">Expirés depuis plus de 7 jours sans renouvellement.</p>
        <div class="rank-list">${lost.length ? lost.slice(0, 10).map((x, i) => row(x, i, `expiré le ${fmtDateFr(x.c.end)}`)).join('') : '<div class="notif-empty">Aucun client perdu 👍</div>'}</div>
        <button class="btn ca-btn set-export" onclick="exportSubsExcel()"><span class="material-icons-outlined">download</span> Exporter tous les abonnements (Excel)</button>`;
    document.getElementById('subSettingsOverlay').classList.add('active');
}
function closeSubSettings() { document.getElementById('subSettingsOverlay').classList.remove('active'); }
