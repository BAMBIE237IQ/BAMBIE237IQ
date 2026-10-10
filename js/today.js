// ==================== TODAY VIEW ====================
// Accueil: PC = vue d'ensemble (KPIs + grille semaine), mobile = anneau + liste au pouce.
let todaySel = new Date();

function setTodayDate(d) { todaySel = new Date(d.getFullYear(), d.getMonth(), d.getDate()); renderToday(); }
function shiftTodayDate(n) { const d = new Date(todaySel); d.setDate(d.getDate() + n); setTodayDate(d); }

function formatFCFA(n) { return Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' '); }

function isHabitDone(id, d) { return getCellVal(id, d.getFullYear(), d.getMonth(), d.getDate()) === true; }

function toggleTodayHabit(id) {
    // Mobile/PC accueil: simple bascule fait <-> pas fait (le cycle "manqué" reste dans la vue semaine)
    const d = todaySel, y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
    pushUndo();
    setCellVal(id, y, m, day, isHabitDone(id, d) ? null : true);
    save();
    renderAll();
}

function getLatestWeight(upTo) {
    const recs = (S.fitness && S.fitness.records) || {};
    const limit = localDateStr(upTo);
    const keys = Object.keys(recs).filter(k => k <= limit && (parseFloat(recs[k].weightAM) || parseFloat(recs[k].weightPM))).sort();
    if (!keys.length) return null;
    const k = keys[keys.length - 1], r = recs[k];
    return { date: k, am: parseFloat(r.weightAM) || 0, pm: parseFloat(r.weightPM) || 0, value: parseFloat(r.weightAM) || parseFloat(r.weightPM) };
}

function getWeightSeries(endDate, days) {
    const recs = (S.fitness && S.fitness.records) || {};
    const pts = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(endDate); d.setDate(d.getDate() - i);
        const r = recs[localDateStr(d)];
        if (!r) continue;
        const a = parseFloat(r.weightAM) || 0, p = parseFloat(r.weightPM) || 0;
        const w = a && p ? (a + p) / 2 : (a || p);
        if (w) pts.push({ i: days - 1 - i, w });
    }
    return pts;
}

function sparklineSVG(pts, days, color) {
    if (pts.length < 2) return '<div class="t-empty">Pas encore assez de relevés.</div>';
    const ws = pts.map(p => p.w), min = Math.min(...ws), max = Math.max(...ws), span = (max - min) || 1;
    const W = 300, H = 80, pad = 6;
    const xy = pts.map(p => [(p.i / (days - 1)) * W, pad + (1 - (p.w - min) / span) * (H - pad * 2)]);
    const last = xy[xy.length - 1];
    return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img" aria-label="Courbe du poids sur ${days} jours, de ${min.toFixed(1)} à ${max.toFixed(1)} kg">
        <polyline fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke" points="${xy.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}"/>
        <circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${color}"/>
    </svg>`;
}

function renderToday() {
    const view = document.getElementById('todayView');
    if (!view) return;
    const d = todaySel, now = new Date();
    const isTodaySel = localDateStr(d) === localDateStr(now);
    const dateStr = localDateStr(d);
    const habits = S.habits;
    const done = habits.filter(h => isHabitDone(h.id, d));
    const pct = habits.length ? Math.round(done.length / habits.length * 100) : 0;

    document.getElementById('todayDateLabel').textContent = `${DAYS_FULL[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`;
    document.getElementById('todayHabitsTitle').textContent = isTodaySel ? 'Habitudes du jour' : `Habitudes du ${d.getDate()}/${d.getMonth() + 1}`;

    // --- KPIs (PC) ---
    const mk = monthKey(now.getFullYear(), now.getMonth());
    const txs = S.transactions[mk] || [];
    const inc = sumTx(txs, 'income'), exp = sumTx(txs, 'expense'), bal = inc - exp;
    const wt = getLatestWeight(d);
    const h = (S.fitness && S.fitness.height) || 1.81, target = (S.fitness && S.fitness.targetWeight) || 82;
    const bmi = wt ? (wt.value / (h * h)).toFixed(1).replace('.', ',') : '—';
    const best = getBestStreakAll();
    document.getElementById('todayKpis').innerHTML = `
        <div class="kpi"><span class="kpi-label">Habitudes du jour</span>
            <div class="kpi-value">${done.length}<small>/ ${habits.length}</small></div>
            <div class="kpi-bar"><div style="width:${pct}%"></div></div></div>
        <div class="kpi"><span class="kpi-label">Meilleure série</span>
            <div class="kpi-value">${best}<small>jour${best > 1 ? 's' : ''}</small></div>
            <span class="kpi-sub">Toutes habitudes confondues</span></div>
        <div class="kpi blurable"><span class="kpi-label">Solde de ${MONTHS[now.getMonth()].toLowerCase()}</span>
            <div class="kpi-value ${bal < 0 ? 'neg' : 'pos'}">${bal < 0 ? '−' : '+'}${formatFCFA(Math.abs(bal))}<small>FCFA</small></div>
            <span class="kpi-sub">Entrées ${formatFCFA(inc)} · Sorties ${formatFCFA(exp)}</span></div>
        <div class="kpi"><span class="kpi-label">Dernier poids</span>
            <div class="kpi-value">${wt ? String(wt.value).replace('.', ',') : '—'}<small>kg</small></div>
            <span class="kpi-sub">Objectif ${target} kg · IMC ${bmi}</span></div>`;

    // --- Ring (mobile) ---
    const C = 2 * Math.PI * 34, left = habits.length - done.length;
    document.getElementById('todayRing').innerHTML = `
        <svg width="84" height="84" viewBox="0 0 84 84" role="img" aria-label="${done.length} habitudes sur ${habits.length} faites">
            <circle cx="42" cy="42" r="34" fill="none" stroke="var(--border)" stroke-width="9"/>
            <circle cx="42" cy="42" r="34" fill="none" stroke="var(--accent-teal)" stroke-width="9" stroke-linecap="round" stroke-dasharray="${(C * pct / 100).toFixed(1)} ${C.toFixed(1)}" transform="rotate(-90 42 42)" style="transition:stroke-dasharray .5s ease"/>
            <text x="42" y="48" text-anchor="middle" fill="var(--text-primary)" font-size="19" font-weight="800">${done.length}/${habits.length}</text>
        </svg>
        <div class="ring-text"><strong>${left === 0 && habits.length ? 'Tout est fait !' : `Encore ${left} habitude${left > 1 ? 's' : ''}`}</strong>
        <span>Meilleure série : ${best} jour${best > 1 ? 's' : ''}</span></div>`;

    // --- Day strip (mobile): 5 jours avant -> demain, pour planifier ---
    let strip = '';
    for (let i = -5; i <= 1; i++) {
        const x = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        const sel = localDateStr(x) === dateStr;
        strip += `<button class="strip-day${sel ? ' sel' : ''}${i === 0 ? ' is-today' : ''}" onclick="setTodayDate(new Date(${x.getFullYear()},${x.getMonth()},${x.getDate()}))" aria-pressed="${sel}">
            <span>${DAYS_SHORT[x.getDay()].charAt(0)}</span><strong>${x.getDate()}</strong></button>`;
    }
    document.getElementById('todayStrip').innerHTML = strip;

    // --- Habits PC: ligne + 7 derniers jours ---
    const week = [];
    for (let i = 6; i >= 0; i--) { const x = new Date(d); x.setDate(x.getDate() - i); week.push(x); }
    document.getElementById('todayWeekHead').innerHTML = week.map(x => `<span>${DAYS_SHORT[x.getDay()].charAt(0)}</span>`).join('');
    const isFuture = d > now && !isTodaySel;
    if (!habits.length) {
        document.getElementById('todayHabitsDesk').innerHTML = document.getElementById('todayHabitsMob').innerHTML =
            '<div class="t-empty">Aucune habitude. Ajoute-en depuis l’onglet Habitudes.</div>';
    } else {
        document.getElementById('todayHabitsDesk').innerHTML = habits.map(hb => {
            const ok = isHabitDone(hb.id, d);
            const pctM = getHabitPct(hb.id, d.getFullYear(), d.getMonth());
            return `<div class="t-habit">
                <button class="t-check${ok ? ' on' : ''}" ${isFuture ? 'disabled' : ''} onclick="toggleTodayHabit('${hb.id}')" aria-pressed="${ok}" aria-label="${escAttr(hb.name)}"><span class="material-icons-outlined">check</span></button>
                <span class="t-habit-name">${escHtml(hb.name)}</span>
                <div class="t-week">${week.map((x, i) => `<span class="${isHabitDone(hb.id, x) ? 'on' : ''}${i === 6 ? ' cur' : ''}"></span>`).join('')}</div>
                <span class="t-pct">${pctM}%</span>
            </div>`;
        }).join('');

        const todo = habits.filter(hb => !isHabitDone(hb.id, d));
        const row = (hb, ok) => `<button class="m-habit${ok ? ' done' : ''}" ${isFuture ? 'disabled' : ''} onclick="toggleTodayHabit('${hb.id}')" aria-pressed="${ok}">
            <span class="m-check"><span class="material-icons-outlined">check</span></span><span class="m-name">${escHtml(hb.name)}</span></button>`;
        document.getElementById('todayHabitsMob').innerHTML =
            (todo.length ? `<h3 class="m-group">À faire</h3>${todo.map(hb => row(hb, false)).join('')}` : '') +
            (done.length ? `<h3 class="m-group">Fait</h3>${done.map(hb => row(hb, true)).join('')}` : '');
    }

    // --- Journal ---
    const tasks = (S.journal && S.journal[dateStr]) || [];
    document.getElementById('todayTasks').innerHTML = tasks.length ? tasks.map((t, i) => `
        <div class="t-task${t.done ? ' done' : ''}">
            <button class="t-task-check" onclick="toggleTodayTask(${i})" aria-pressed="${!!t.done}" aria-label="Terminer : ${escAttr(t.text)}"><span class="material-icons-outlined">${t.done ? 'check_circle' : 'radio_button_unchecked'}</span></button>
            <span class="t-task-text">${escHtml(t.text)}</span>
            <button class="t-task-del" onclick="deleteTodayTask(${i})" aria-label="Supprimer la tâche"><span class="material-icons-outlined">close</span></button>
        </div>`).join('') : `<div class="t-empty">Aucune tâche ${isTodaySel ? 'aujourd’hui' : 'ce jour-là'}.</div>`;

    // --- Poids ---
    const series = getWeightSeries(d, 30);
    let delta = '';
    if (series.length >= 2) {
        const peak = Math.max(...series.map(p => p.w)), lastW = series[series.length - 1].w, diff = lastW - peak;
        delta = diff < 0 ? `−${Math.abs(diff).toFixed(1).replace('.', ',')} kg depuis le pic` : 'Au plus haut du mois';
    }
    const toGo = wt ? Math.max(0, wt.value - target) : null;
    document.getElementById('todayWeightCard').innerHTML = `
        <div class="t-card-head"><h2>Poids · 30 jours</h2><span class="t-muted">${delta}</span></div>
        ${sparklineSVG(series, 30, 'var(--accent-pink)')}
        <div class="t-weight-foot"><span>${wt ? `${String(wt.value).replace('.', ',')} kg` : 'Aucun relevé'}</span>
        <span>${toGo !== null ? `${toGo.toFixed(1).replace('.', ',')} kg avant ${target} kg` : ''}</span></div>
        <button class="btn t-weight-btn" onclick="switchView('fitness')">Saisir mon poids</button>`;
}

function addTodayTask(e) {
    e.preventDefault();
    const input = document.getElementById('todayTaskInput');
    const text = input.value.trim();
    if (!text) return;
    const k = localDateStr(todaySel);
    if (!S.journal) S.journal = {};
    if (!S.journal[k]) S.journal[k] = [];
    S.journal[k].push({ text, done: false });
    input.value = '';
    save(); renderAll();
}
function toggleTodayTask(i) {
    const list = S.journal && S.journal[localDateStr(todaySel)];
    if (!list || !list[i]) return;
    list[i].done = !list[i].done;
    save(); renderAll();
}
function deleteTodayTask(i) {
    const list = S.journal && S.journal[localDateStr(todaySel)];
    if (!list || !list[i]) return;
    if (!confirm('Supprimer cette tâche ?')) return;
    list.splice(i, 1);
    save(); renderAll();
}

// ==================== SYNC STATUS ====================
function initSyncIndicator() {
    const apply = (online) => {
        document.querySelectorAll('.sync-status, .online-chip').forEach(el => el.classList.toggle('offline', !online));
        const l = document.getElementById('syncLabel'), s = document.getElementById('syncSub'), c = document.getElementById('onlineChipLabel');
        if (l) l.textContent = online ? 'Synchronisé' : 'Hors ligne';
        if (s) s.textContent = online ? 'PC et mobile à jour' : 'Données locales affichées';
        if (c) c.textContent = online ? 'En ligne' : 'Hors ligne';
    };
    try { firebase.database().ref('.info/connected').on('value', snap => apply(snap.val() === true)); }
    catch (e) { apply(false); }
}

// ==================== QUICK ADD (FAB) ====================
let qaState = { type: 'expense', amount: '', label: '' };
const QA_DEFAULT_LABELS = { expense: ['Alimentation', 'Transport', 'Recharge', 'Maison', 'Santé', 'Autres'], income: ['Salaire', 'Vente', 'Cadeau', 'Remboursement', 'Autres'] };

function getQaLabels(type) {
    // Les libellés les plus utilisés d'abord (les camemberts regroupent par libellé)
    const count = {};
    for (const k in S.transactions) for (const t of S.transactions[k] || []) if (t.type === type && t.label) count[t.label] = (count[t.label] || 0) + 1;
    const top = Object.keys(count).sort((a, b) => count[b] - count[a]).slice(0, 6);
    for (const l of QA_DEFAULT_LABELS[type]) if (top.length < 6 && !top.includes(l)) top.push(l);
    return top;
}

function openQuickAdd() {
    qaState = { type: 'expense', amount: '', label: '' };
    document.getElementById('qaLabel').value = '';
    const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'];
    document.getElementById('qaKeys').innerHTML = keys.map(k => k === 'back'
        ? `<button onclick="qaKey('back')" aria-label="Effacer"><span class="material-icons-outlined">backspace</span></button>`
        : `<button onclick="qaKey('${k}')">${k}</button>`).join('');
    const t = new Date();
    document.getElementById('qaDateLabel').textContent = `Aujourd’hui · ${DAYS_FULL[t.getDay()].toLowerCase()} ${t.getDate()} ${MONTHS[t.getMonth()].toLowerCase()}`;
    setQaType('expense');
    document.getElementById('qaOverlay').classList.add('active');
}
function closeQuickAdd() { document.getElementById('qaOverlay').classList.remove('active'); }

function setQaType(type) {
    qaState.type = type;
    qaState.label = '';
    document.getElementById('qaType-expense').classList.toggle('active', type === 'expense');
    document.getElementById('qaType-income').classList.toggle('active', type === 'income');
    document.getElementById('qaOverlay').classList.toggle('is-income', type === 'income');
    document.getElementById('qaSave').textContent = type === 'income' ? 'Enregistrer l’entrée' : 'Enregistrer la dépense';
    renderQaChips();
}
function renderQaChips() {
    document.getElementById('qaChips').innerHTML = getQaLabels(qaState.type).map(l =>
        `<button class="${qaState.label === l ? 'on' : ''}" aria-pressed="${qaState.label === l}" onclick="pickQaLabel(this.dataset.l)" data-l="${escAttr(l)}">${escHtml(l)}</button>`).join('');
}
function pickQaLabel(l) { qaState.label = l; document.getElementById('qaLabel').value = l; renderQaChips(); }

function qaKey(k) {
    if (k === 'back') qaState.amount = qaState.amount.slice(0, -1);
    else if (qaState.amount.length < 9 && !(qaState.amount === '' && k.startsWith('0'))) qaState.amount += k;
    document.getElementById('qaAmount').textContent = qaState.amount ? formatFCFA(parseInt(qaState.amount, 10)) : '0';
}

function saveQuickAdd() {
    const amount = parseInt(qaState.amount, 10);
    const label = document.getElementById('qaLabel').value.trim();
    if (!amount) { toast('⚠ Entre un montant'); return; }
    if (!label) { toast('⚠ Choisis ou écris un libellé'); return; }
    const d = new Date(), mk = monthKey(d.getFullYear(), d.getMonth());
    pushUndo();
    // Toujours dans le Journal financier (ledger "dashboard"), quelle que soit la vue active
    if (!S.transactions[mk]) S.transactions[mk] = [];
    S.transactions[mk].push({
        id: 't' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 4),
        type: qaState.type, amount, label, justification: '', day: d.getDate(), date: localDateStr(d)
    });
    save();
    closeQuickAdd();
    renderAll();
    toast(qaState.type === 'income' ? 'Entrée ajoutée ✓' : 'Dépense ajoutée ✓');
}
