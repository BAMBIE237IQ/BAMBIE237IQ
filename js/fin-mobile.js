// ==================== FINANCE / DASHBOARD : affichage téléphone, recherche, Échap ====================
const FIN_COLLAPSE_KEY = 'fin-summary-collapsed';
function finSummaryCollapsed() {
    try { const v = localStorage.getItem(FIN_COLLAPSE_KEY); if (v !== null) return v === '1'; } catch (e) {}
    return window.matchMedia('(max-width: 768px)').matches;   // sur téléphone : réduit par défaut
}
function applyFinSummary() {
    const c = finSummaryCollapsed(), box = document.getElementById('finSummary');
    if (!box) return;
    box.classList.toggle('collapsed', c);
    const t = document.getElementById('finCollapseTxt'), i = document.querySelector('#finCollapseBtn .material-icons-outlined');
    if (t) t.textContent = c ? 'Afficher le détail des semaines' : 'Réduire le détail des semaines';
    if (i) i.textContent = c ? 'expand_more' : 'expand_less';
}
function toggleFinSummary() {
    try { localStorage.setItem(FIN_COLLAPSE_KEY, finSummaryCollapsed() ? '0' : '1'); } catch (e) {}
    applyFinSummary();
}
// Recherche : texte (jour, libellé, justificatif, montant) ou jour précis (calendrier)
function filterFinList() {
    const q = (document.getElementById('finSearch').value || '').trim().toLowerCase();
    const groups = document.querySelectorAll('#finTransactions .fin-day-group');
    let shown = 0, tx = 0;
    groups.forEach(g => {
        const head = (g.querySelector('.fin-day-date')?.textContent || '').toLowerCase();
        let any = false;
        g.querySelectorAll('.fin-tx-item').forEach(it => {
            const match = !q || head.includes(q) || (it.textContent || '').toLowerCase().includes(q);
            it.hidden = !match; if (match) { any = true; tx++; }
        });
        g.hidden = !any; if (any) shown++;
    });
    document.getElementById('finSearchClear').hidden = !q;
    const info = document.getElementById('finSearchInfo');
    info.hidden = !q;
    if (q) info.textContent = shown ? `${shown} jour${shown > 1 ? 's' : ''} · ${tx} transaction${tx > 1 ? 's' : ''} pour « ${q} »` : `Aucun résultat pour « ${q} » ce mois-ci (change de mois avec les flèches).`;
}
function clearFinSearch() { document.getElementById('finSearch').value = ''; document.getElementById('finSearchDate').value = ''; filterFinList(); }
function finGoToDate(v) {
    if (!v) return;
    const [y, m, d] = v.split('-').map(Number);
    if (typeof S !== 'undefined') { S.finYear = y; S.finMonth = m - 1; }
    if (typeof renderFinance === 'function') renderFinance();
    const dt = new Date(y, m - 1, d), name = DAYS_FULL[dt.getDay()];
    document.getElementById('finSearch').value = `${name} ${d} ${MONTHS[m - 1]}`;
    filterFinList();
    const g = [...document.querySelectorAll('#finTransactions .fin-day-group:not([hidden])')][0];
    if (g) g.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
// Quand la liste est redessinée, on garde le filtre actif
new MutationObserver(() => { if ((document.getElementById('finSearch') || {}).value) filterFinList(); }).observe(document.getElementById('finTransactions') || document.body, { childList: true });
applyFinSummary();
new MutationObserver(applyFinSummary).observe(document.getElementById('finSummary') || document.body, { childList: true });

// Échap (PC) : ferme la fenêtre ouverte, la plus récente d'abord
const ESC_CLOSERS = { modalOverlay: 'closeModal', subModalOverlay: 'closeSubModal', moodModalOverlay: 'closeMoodModal', qaOverlay: 'closeQuickAdd', moreOverlay: 'closeMoreMenu', notifOverlay: 'closeNotifPanel',
    securityOverlay: 'closeSecurity', subSettingsOverlay: 'closeSubSettings', caOverlay: 'closeCAPanel', statsOverlay: 'closeStatsPanel', renewOverlay: 'closeRenew' };
document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    const open = [...document.querySelectorAll('.modal-overlay.active, .qa-overlay.active')].filter(o => ESC_CLOSERS[o.id]);
    if (!open.length) { const f = document.getElementById('finSearch'); if (f && document.activeElement === f && f.value) clearFinSearch(); return; }
    // celle qui est au-dessus : la dernière dans la page
    const top = open[open.length - 1], fn = window[ESC_CLOSERS[top.id]];
    if (typeof fn === 'function') { e.preventDefault(); fn(); } else top.classList.remove('active');
});
