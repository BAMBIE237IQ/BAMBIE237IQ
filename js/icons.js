// ==================== ICONS (Phosphor duotone) ====================
// Le code historique écrit des icônes Material : <span class="material-icons-outlined">home</span>.
// Plutôt que de réécrire chaque gabarit, on convertit à la volée vers Phosphor bicolore,
// y compris les icônes ajoutées ou modifiées plus tard (MutationObserver).
const MI_TO_PH = {
    home: 'house', view_week: 'list-checks', calendar_month: 'calendar-check', donut_large: 'chart-pie-slice',
    subscriptions: 'repeat', account_balance_wallet: 'wallet', query_stats: 'chart-line-up',
    format_list_bulleted: 'notebook', fitness_center: 'heartbeat', task_alt: 'check-circle', menu: 'dots-three-outline',
    chevron_right: 'caret-right', chevron_left: 'caret-left', expand_more: 'caret-down',
    add: 'plus', add_circle: 'plus-circle', add_circle_outline: 'plus-circle', add_card: 'credit-card',
    edit: 'pencil-simple', edit_note: 'note-pencil', close: 'x', delete: 'trash', check: 'check',
    check_circle: 'check-circle', radio_button_unchecked: 'circle', done_all: 'checks', cancel: 'x-circle',
    trending_up: 'trend-up', trending_down: 'trend-down', arrow_upward: 'arrow-up', arrow_downward: 'arrow-down', remove: 'minus',
    today: 'calendar-dot', calendar_today: 'calendar-blank', history: 'clock-counter-clockwise',
    wb_sunny: 'sun', nights_stay: 'moon-stars', emoji_events: 'trophy', local_fire_department: 'fire',
    area_chart: 'chart-line', show_chart: 'chart-line-up', bar_chart: 'chart-bar', pie_chart: 'chart-pie-slice',
    analytics: 'chart-bar-horizontal', speed: 'gauge', compare_arrows: 'arrows-left-right',
    visibility: 'eye', visibility_off: 'eye-slash', save_alt: 'download-simple', save: 'floppy-disk',
    download: 'file-csv', refresh: 'arrow-clockwise', receipt_long: 'receipt', restaurant: 'fork-knife',
    psychology: 'brain', monitor_weight: 'scales', accessibility_new: 'person-simple', backspace: 'backspace',
    account_balance: 'bank', money_off: 'money', favorite: 'heart'
};

function convertIcon(el) {
    const name = el.textContent.trim();
    if (!name) return;
    const ph = MI_TO_PH[name] || 'circle';
    el.classList.forEach(c => { if (c.startsWith('ph-')) el.classList.remove(c); });
    el.classList.add('ph-duotone', 'ph-' + ph);
    el.dataset.mi = name;
    el.setAttribute('aria-hidden', 'true');
    el.textContent = '';
}

function convertIconsIn(root) {
    if (root.nodeType !== 1) return;
    if (root.classList.contains('material-icons-outlined')) convertIcon(root);
    root.querySelectorAll('.material-icons-outlined').forEach(el => { if (el.textContent.trim()) convertIcon(el); });
}

(function initIcons() {
    convertIconsIn(document.body);
    new MutationObserver(muts => {
        for (const m of muts) {
            if (m.type === 'characterData') {
                const el = m.target.parentElement;
                if (el && el.classList.contains('material-icons-outlined')) convertIcon(el);
            } else {
                // textContent = 'visibility' sur une icône déjà convertie -> nouveau nœud texte
                if (m.target.nodeType === 1 && m.target.classList.contains('material-icons-outlined')) convertIcon(m.target);
                m.addedNodes.forEach(convertIconsIn);
            }
        }
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
