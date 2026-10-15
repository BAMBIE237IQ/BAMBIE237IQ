// ==================== HANDY — ANIMATIONS ====================
// Repris de Screamify : fenêtres qui se ferment en douceur, page qui recule derrière,
// apparition des cartes à l'ouverture d'un onglet et chiffres qui défilent.
'use strict';

const REDUCE_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)');
const OVERLAYS = '.modal-overlay, .qa-overlay';
const SHEETS = '.modal, .qa-sheet';

// ----- Fenêtres : ouverture / fermeture -----
function syncSheetOpen() {
    const open = !!document.querySelector(`.modal-overlay.active, .qa-overlay.active`);
    if (open && !document.body.classList.contains('sheet-open')) {
        // la page recule autour du centre de ce qui est visible à l'écran
        const main = document.querySelector('.main-content');
        if (main) {
            const r = main.getBoundingClientRect();
            main.style.setProperty('--recede-origin', `50% ${Math.round(innerHeight / 2 - r.top)}px`);
        }
    }
    document.body.classList.toggle('sheet-open', open);
}

function watchOverlay(ov) {
    new MutationObserver(muts => {
        for (const m of muts) {
            const was = (m.oldValue || '').split(/\s+/).includes('active'), is = ov.classList.contains('active');
            if (was && !is && !REDUCE_MOTION.matches) {
                ov.classList.add('closing');
                const sheet = ov.querySelector(SHEETS);
                const done = () => { if (ov.classList.contains('closing')) ov.classList.remove('closing'); syncSheetOpen(); };
                (sheet || ov).addEventListener('animationend', done, { once: true });
                setTimeout(done, 450);   // filet de sécurité
            } else if (is && ov.classList.contains('closing')) ov.classList.remove('closing');   // (retirer une classe absente relancerait l'observateur)
        }
        syncSheetOpen();
    }).observe(ov, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
}

// ----- Apparition des cartes quand un onglet s'ouvre -----
const RISE_SELECTOR = '.today-head, .today-summary > *, .stats-row > *, .period-selector, .section-header, .card, .chart-card, .sub-tabs, .fitness-header';
function enterView(view) {
    if (REDUCE_MOTION.matches || !view) return;
    let i = 0;
    view.querySelectorAll(RISE_SELECTOR).forEach(el => {
        if (i > 14 || el.closest('.rise')) return;   // seulement les premiers éléments, sans doublon
        el.classList.add('rise'); el.style.setProperty('--i', i++);
    });
    view.classList.add('entering');
    clearTimeout(view._enterT);
    view._enterT = setTimeout(() => {
        view.classList.remove('entering');
        view.querySelectorAll('.rise').forEach(el => el.classList.remove('rise'));
    }, 1300);
}
function watchViews() {
    document.querySelectorAll('.view').forEach(v => new MutationObserver(muts => {
        if (muts.some(m => !(m.oldValue || '').includes('active')) && v.classList.contains('active')) {
            requestAnimationFrame(() => enterView(v));
        }
    }).observe(v, { attributes: true, attributeFilter: ['class'], attributeOldValue: true }));
    enterView(document.querySelector('.view.active'));
}

// ----- Chiffres qui défilent (montants, totaux…) -----
const COUNT_SELECTOR = '.stat-value, .kpi-value, .sum-value';
const lastCounts = new WeakMap();
function animateCount(el) {
    const node = [...el.childNodes].find(n => n.nodeType === 3 && /\d/.test(n.textContent));
    if (!node) return;
    const text = node.textContent, m = text.match(/-?\d[\d\s  .]*/);
    if (!m || /\d[.,]\d{1,2}(?!\d)/.test(m[0])) return;   // pas de décimales (heures, pourcentages fins…)
    const target = parseInt(m[0].replace(/[^\d-]/g, ''), 10);
    if (isNaN(target) || target === 0) return;
    const start = lastCounts.has(el) ? lastCounts.get(el) : 0;
    lastCounts.set(el, target);
    if (start === target || REDUCE_MOTION.matches) return;
    const sep = (m[0].match(/\d([\s  .])\d/) || [, ' '])[1];
    const format = v => String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    const before = text.slice(0, m.index), after = text.slice(m.index + m[0].length);
    const t0 = performance.now(), dur = Math.min(1100, 450 + Math.log10(Math.abs(target - start) + 1) * 150);
    const step = now => {
        const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        if (!node.isConnected) return;
        node.textContent = before + format(start + (target - start) * e) + after;
        if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}
function watchCounts() {
    let queued = false;
    const scan = () => { queued = false; document.querySelectorAll(`${COUNT_SELECTOR}:not([data-counted])`).forEach(el => { el.dataset.counted = '1'; animateCount(el); }); };
    new MutationObserver(() => { if (!queued) { queued = true; requestAnimationFrame(scan); } })
        .observe(document.body, { childList: true, subtree: true });
    scan();
}

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll(OVERLAYS).forEach(watchOverlay);
    watchViews();
    watchCounts();
});
