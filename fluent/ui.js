// FLUENT 90 — screens and exercises
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ic = (name, cls = '') => `<i class="ph-duotone ${name} ${cls}"></i>`;
function toast(msg, kind = '') {
    const t = document.createElement('div');
    t.className = 'toast ' + kind; t.innerHTML = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3000);
}
const fmtTime = s => `${Math.floor(s / 60)}:${pad2(Math.floor(s % 60))}`;
const isAndroid = /Android/i.test(navigator.userAgent);

// ================= NAVIGATION =================
const VIEWS = ['today', 'practice', 'cards', 'progress', 'coach'];
let currentView = 'today';
function show(view) {
    if (!VIEWS.includes(view)) view = 'today';
    currentView = view;
    VIEWS.forEach(v => { const el = $('#view-' + v); if (el) el.hidden = v !== view; });
    $$('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    if (location.hash !== '#' + view) history.replaceState(null, '', '#' + view);
    renderView();
    window.scrollTo(0, 0);
}
function renderView() {
    renderTop();
    ({ today: renderToday, practice: renderPractice, cards: renderCards, progress: renderProgress, coach: renderCoach })[currentView]();
}
document.addEventListener('click', e => {
    const nav = e.target.closest('[data-view]');
    if (nav) { e.preventDefault(); show(nav.dataset.view); }
});

// ================= INSTALL (download the app) =================
const Install = {
    evt: null,
    standalone() { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } },
    platform() { const ua = navigator.userAgent; return /iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'desktop'; },
    async run() {
        if (this.evt) {
            const e = this.evt; this.evt = null;
            e.prompt();
            const c = await e.userChoice.catch(() => null);
            if (c && c.outcome === 'accepted') toast(`${ic('ph-check')} Installing Fluent 90…`, 'good');
            renderView();
            return;
        }
        showInstallHelp();
    }
};
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); Install.evt = e; renderTop(); });
window.addEventListener('appinstalled', () => { Install.evt = null; toast(`${ic('ph-check')} Fluent 90 is installed. Open it from your home screen.`, 'good'); renderView(); });
function showInstallHelp() {
    const p = Install.platform(), body = $('#sheetBody');
    const steps = {
        android: ['Open this page in <b>Chrome</b>.', 'Tap the menu <b>⋮</b> (top right).', 'Tap <b>Install app</b> (or <b>Add to Home screen</b>).', 'Open Fluent 90 from your home screen.'],
        ios: ['Open this page in <b>Safari</b>.', 'Tap the <b>Share</b> button (square with an arrow).', 'Tap <b>Add to Home Screen</b>, then <b>Add</b>.', 'Open Fluent 90 from your home screen (needed for reminders on iPhone).'],
        desktop: ['Open this page in <b>Chrome</b> or <b>Edge</b>.', 'Click the install icon at the right of the address bar (a screen with an arrow), or menu <b>⋮</b> → <b>Install Fluent 90</b>.', 'The app opens in its own window and gets a desktop shortcut.']
    }[p];
    body.innerHTML = `<div class="sheet-head"><h2>${ic('ph-download-simple')} Install Fluent 90</h2><button class="icon-btn" data-x>${ic('ph-x')}</button></div>
        <p class="muted">Free, no store needed. It opens like a normal app, full screen, and starts faster.</p>
        <ol class="install-steps">${steps.map(x => `<li>${x}</li>`).join('')}</ol>
        <p class="muted small mt">Link to open on your other device: <b>bambie-237-iq.vercel.app/fluent/</b></p>`;
    $('#sheet').hidden = false;
    $('[data-x]', body).addEventListener('click', () => { $('#sheet').hidden = true; });
}

// ================= TOP BAR =================
function renderTop() {
    $('#installBtn').hidden = Install.standalone();
    const st = streak(), c = cefr();
    $('#streakChip').innerHTML = `${ic('ph-fire', st ? 'hot' : '')}<b>${st}</b>`;
    $('#streakChip').title = `Streak: ${st} day${st === 1 ? '' : 's'} in a row`;
    $('#levelChip').innerHTML = `<b>${c.label}</b><span>${c.pct}%</span>`;
    const map = { local: ['ph-cloud-slash', 'Not signed in: progress saved on this device only'], syncing: ['ph-cloud-arrow-up', 'Syncing…'], synced: ['ph-cloud-check', 'Synced'], denied: ['ph-warning', 'Cloud blocked: database rules missing'], error: ['ph-cloud-warning', 'Sync error'] };
    const [icon, title] = map[Sync.status] || map.local;
    const b = $('#syncBtn');
    b.innerHTML = Sync.user && Sync.user.photoURL && Sync.status === 'synced' ? `<img src="${esc(Sync.user.photoURL)}" alt="" referrerpolicy="no-referrer">` : ic(icon);
    b.title = title; b.className = 'icon-btn sync ' + Sync.status;
}

// ================= TODAY =================
function renderToday() {
    const el = $('#view-today');
    if (!S.startDate) { el.innerHTML = onboardingHTML(); bindOnboarding(el); return; }
    const t = today(), n = dayNum(), p = plan(n), ph = PHASES[p.phase];
    const done = p.tasks.filter(x => taskDone(t, x.id)).length, total = p.tasks.length;
    const st = streak(), complete = isComplete(t), c = cefr();
    const over = n > PROGRAM_DAYS;
    const left = total - done;
    const hoursLeft = 24 - new Date().getHours();
    const ring = (pct) => { const r = 34, L = 2 * Math.PI * r; return `<svg viewBox="0 0 80 80" class="ring"><circle cx="40" cy="40" r="${r}" class="ring-bg"/><circle cx="40" cy="40" r="${r}" class="ring-fg" stroke-dasharray="${L}" stroke-dashoffset="${L * (1 - pct)}"/></svg>`; };
    el.innerHTML = `
    <section class="hero card glow">
        <div class="hero-main">
            <div class="eyebrow">${over ? 'Bonus days' : `Phase ${p.phase} · ${esc(ph.name)}`} · ${esc(niceDate(t))}</div>
            <h1>Day ${n}<small> / ${PROGRAM_DAYS}</small></h1>
            <p class="muted">${over ? 'Your 90 days are done. Keep the habit: the program continues with phase 3 sessions.' : esc(ph.sub)}</p>
            <div class="hero-chips">
                <span class="pill ${st ? 'hot' : ''}">${ic('ph-fire')} ${st}-day streak</span>
                <span class="pill">${ic('ph-chart-line-up')} ${c.label} · ${c.pct}% to ${c.next}</span>
                <span class="pill">${ic('ph-clock')} ${Math.round((dayRec(t).minutes || 0))} min today</span>
            </div>
        </div>
        <div class="hero-ring">${ring(done / total)}<div class="ring-txt"><b>${done}/${total}</b><span>tasks</span></div></div>
    </section>
    <div class="strict ${complete ? 'ok' : ''}">
        ${complete ? `${ic('ph-seal-check')} <span><b>Day ${n} complete.</b> Streak safe. See you tomorrow at 07:00.</span>`
                   : `${ic('ph-warning-octagon')} <span><b>${left} task${left > 1 ? 's' : ''} left</b> · about ${hoursLeft} h before midnight. Ultra strict: miss today and your streak goes back to 0.</span>`}
    </div>
    <div class="drops">${p.drops.map(d => dropHTML(d, t)).join('')}</div>
    <div class="grid-2">
        <section class="card">
            <div class="card-head"><h3>${ic('ph-book-open-text')} Episode ${p.phase === 1 ? themeIndex(n) + 1 : ''} · ${esc(p.phase === 1 ? p.theme.s.t : (S.aiDays[n] && S.aiDays[n].story ? S.aiDays[n].story.t : p.theme.t))}</h3><span class="tag">${esc(p.theme.t)}</span></div>
            <p class="muted small">${p.phase === 1 ? "Sam's Big Pitch: a founder from Douala takes his app to London. One episode a day." : 'Season 2: Sam grows his company abroad. New episode written for you every day.'}</p>
            <div class="chunk-preview">${newCardIdsFor(n).slice(0, 6).map(id => { const cc = cardContent(id); return cc ? `<span>${esc(cc.en)}</span>` : ''; }).join('') || '<span class="muted">Your phrases appear when you open the cards.</span>'}</div>
        </section>
        <section class="card">
            <div class="card-head"><h3>${ic('ph-calendar-check')} Last 7 days</h3><button class="link" data-view="progress">All 90 days →</button></div>
            <div class="week">${weekStripHTML()}</div>
            <p class="muted small">Best streak: <b>${bestStreak()}</b> · Missed days: <b>${missedDays()}</b></p>
        </section>
    </div>
    ${coachCardHTML()}
    ${!Install.standalone() ? `<section class="card note">${ic('ph-download-simple')} <div><b>Install Fluent 90 on your phone.</b> One tap from your home screen, full screen, faster. <button class="btn small primary" data-act="install">Install</button></div></section>` : ''}
    ${!AI.hasKey() ? `<section class="card note">${ic('ph-sparkle')} <div><b>Unlock your AI partner.</b> Add your free Gemini key: role-plays, corrections and a new episode every day from day 31. <button class="btn small" data-act="settings">Add key</button></div></section>` : ''}
    ${!Sync.user ? `<section class="card note">${ic('ph-device-mobile')} <div><b>Phone + PC?</b> Sign in with Google to sync your progress and get reminders at 07:00 · 13:00 · 20:00. <button class="btn small" data-act="signin">Sign in</button></div></section>` : ''}`;
    $$('[data-task]', el).forEach(b => b.addEventListener('click', () => { const task = p.tasks.find(x => x.id === b.dataset.task); openTask(task, { daily: true }); }));
    bindCoachCard(el);
}
// ----- weekly coach brief (the AI studies your data once a week and sets your focus) -----
function coachCardHTML() {
    if (!AI.hasKey() || !S.startDate) return '';
    const r = S.coach.report, wk = weekKey(), old = S.coach.week !== wk;
    const wkLabel = /^w\d+$/.test(wk) ? 'week ' + wk.slice(1) : 'this week';
    if (!r) return `<section class="card coach-card"><div class="card-head"><h3>${ic('ph-brain')} Coach brief</h3><span class="tag">${wkLabel}</span></div>
        <p class="muted small">${weeklyPending ? `${ic('ph-hourglass')} Your coach is studying your data…` : 'Once a week, your coach studies everything you did (level, speed, mistakes, missed days) and sets ONE focus for the next 7 days.'}</p>
        <div class="row"><button class="btn small primary" data-coach ${weeklyPending ? 'disabled' : ''}>${ic('ph-sparkle')} Get my diagnosis</button></div></section>`;
    return `<section class="card coach-card glow"><div class="card-head"><h3>${ic('ph-brain')} Coach brief</h3><span class="tag ${old ? '' : 'ok'}">${old ? 'last week' : wkLabel}</span></div>
        <p class="small">${esc(r.diagnosis)}</p>
        <div class="focus">${ic('ph-crosshair')}<div><small class="muted">Focus this week</small><br><b>${esc(r.focus)}</b><br><span class="muted small">${esc(r.focus_why || '')}</span></div></div>
        <ol class="prios">${(r.priorities || []).map(x => `<li><b>${esc(x.what)}</b><small>${esc(x.action)}</small><small>${ic('ph-chart-bar')} ${esc(x.evidence)}</small></li>`).join('')}</ol>
        <div class="row">${(r.drill || []).length ? `<button class="btn small primary" data-fixit>${ic('ph-wrench')} Drill my focus (5 min)</button>` : ''}<button class="btn small" data-coach ${weeklyPending ? 'disabled' : ''}>${ic('ph-arrows-clockwise')} ${old ? 'New diagnosis' : 'Refresh'}</button></div></section>`;
}
function bindCoachCard(el) {
    const b = $('[data-coach]', el);
    if (b) b.addEventListener('click', () => {
        b.disabled = true; b.innerHTML = `${ic('ph-hourglass')} Studying your data…`;
        ensureWeekly(true).then(() => { toast(`${ic('ph-brain')} New coach brief ready`, 'good'); renderView(); })
            .catch(e => { toast(esc(e.message), 'bad'); renderView(); });
    });
    const f = $('[data-fixit]', el);
    if (f) f.addEventListener('click', () => openTask(Object.assign({ id: 'free-fixit', type: 'fixit' }, TASKS.fixit), { daily: false }));
}
function dropHTML(d, t) {
    const all = dropDone(t, d), nd = d.tasks.filter(x => taskDone(t, x.id)).length;
    return `<section class="drop card ${all ? 'done' : ''}">
        <div class="drop-head">
            <div class="drop-ic">${ic(d.icon)}</div>
            <div><h3>${esc(d.title)} <small>${esc(d.time)}</small></h3><span class="muted small">${esc(d.mode)} · ~${d.tasks.reduce((a, x) => a + x.mins, 0)} min</span></div>
            <span class="drop-count">${all ? ic('ph-check-circle') : `${nd}/${d.tasks.length}`}</span>
        </div>
        <div class="tasks">${d.tasks.map(x => {
            const ok = taskDone(t, x.id);
            return `<button class="task ${ok ? 'ok' : ''}" data-task="${x.id}">
                <span class="task-ic">${ic(ok ? 'ph-check' : x.icon)}</span>
                <span class="task-txt"><b>${esc(x.title)}</b><small>${x.mins} min · +${x.xp} XP</small></span>
                <span class="task-go">${ok ? 'Redo' : ic('ph-caret-right')}</span>
            </button>`;
        }).join('')}</div>
    </section>`;
}
function weekStripHTML() {
    const out = [];
    for (let i = 6; i >= 0; i--) {
        const d = addDays(today(), -i), n = dayNum(d);
        let cls = 'pre';
        if (n >= 1) cls = isComplete(d) ? 'ok' : d === today() ? 'now' : 'miss';
        out.push(`<div class="wd ${cls}"><span>${parseYmd(d).toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 2)}</span><b>${n >= 1 ? n : '·'}</b></div>`);
    }
    return out.join('');
}

// ----- onboarding -----
function onboardingHTML() {
    const pl = S.placement;
    return `
    <section class="hero card glow onboard">
        <div class="hero-main">
            <div class="eyebrow">FLUENT 90</div>
            <h1>Speak English in 90 days.</h1>
            <p class="muted">Three short sessions a day. Real phrases, real conversations, your own AI partner. No grammar lessons.</p>
        </div>
    </section>
    <div class="grid-3">
        <section class="card step">${ic('ph-sun-horizon')}<h3>Morning · 10 min</h3><p class="muted small">Silent. Phrase cards + one episode of Sam's story with headphones.</p></section>
        <section class="card step">${ic('ph-sun')}<h3>Midday · 10 min</h3><p class="muted small">Silent. Answer situations fast, no translation. Write a few lines.</p></section>
        <section class="card step">${ic('ph-moon-stars')}<h3>Evening · 20 min</h3><p class="muted small">At home, out loud. Shadowing, speaking rounds, role-plays with AI.</p></section>
    </div>
    <section class="card rules">
        <h3>${ic('ph-gavel')} The rules</h3>
        <ul>
            <li><b>Ultra strict.</b> A day counts only when all its tasks are done. Miss one day: your streak goes back to 0.</li>
            <li><b>No translation.</b> Think in simple English. Broken English is fine. Silence is not.</li>
            <li><b>Every day, you speak.</b> From day 1. Nobody hears you, so there is nothing to be afraid of.</li>
            <li><b>Your level is measured,</b> not guessed: listening, speaking speed, pauses and phrases you really know.</li>
        </ul>
    </section>
    <section class="card start">
        <div class="start-step ${pl ? 'ok' : ''}">
            <span class="num">${pl ? ic('ph-check') : '1'}</span>
            <div><b>Placement test · 4 min</b><p class="muted small">${pl ? `Your starting level: <b>${cefrLabel(S.startLevel)}</b> (${S.startLevel.toFixed(1)}). Retake it if you want.` : '8 audio questions + 6 natural phrases. Headphones on.'}</p></div>
            <button class="btn ${pl ? '' : 'primary'}" data-act="placement">${pl ? 'Retake' : 'Start test'}</button>
        </div>
        <div class="start-step">
            <span class="num">2</span>
            <div><b>Start my 90 days</b><p class="muted small">Day 1 is today (${esc(niceDate(today()))}). Day 90 is ${esc(niceDate(addDays(today(), 89)))}.</p></div>
            <button class="btn primary" data-act="start" ${pl ? '' : 'disabled'}>Start now</button>
        </div>
    </section>`;
}
function bindOnboarding(el) {
    $('[data-act="placement"]', el).addEventListener('click', () => openTask({ id: 'placement', type: 'placement', title: 'Placement test', icon: 'ph-target', mins: 4, xp: 0 }, { daily: false }));
    $('[data-act="start"]', el).addEventListener('click', () => {
        if (!confirm('Start your 90 days today? From now on, every missed day resets your streak.')) return;
        S.startDate = today(); save();
        toast(`${ic('ph-rocket-launch')} Day 1 starts now. Let's go!`, 'good');
        show('today');
    });
}

// ================= PLAYER (full-screen exercise) =================
const Player = {
    task: null, ctx: null, active: 0, timer: null, cleanups: [],
    open(task, opts) {
        this.close(true);
        const n = Math.max(1, dayNum() || 1);
        this.task = task; this.active = 0;
        this.cleanups = [];
        const ctx = this.ctx = {
            task, n, phase: phaseOf(n), daily: !!opts.daily, opts,
            finished: false,
            cleanup: fn => this.cleanups.push(fn),
            finish: (summary) => this.finish(summary)
        };
        $('#playerTitle').textContent = task.title;
        $('#playerSub').textContent = opts.daily ? `Day ${n} · ${task.mins} min · +${task.xp} XP` : 'Free practice · counts for your minutes and level';
        $('#player').hidden = false;
        document.body.classList.add('noscroll');
        this.timer = setInterval(() => { if (document.visibilityState === 'visible') this.active++; $('#playerTimer').textContent = fmtTime(this.active); }, 1000);
        $('#playerTimer').textContent = '0:00';
        const body = $('#playerBody');
        body.innerHTML = '';
        body.scrollTop = 0;
        try { RUNNERS[task.type](body, ctx); }
        catch (e) { console.error(e); body.innerHTML = `<div class="empty">${ic('ph-bug')}<p>Something went wrong: ${esc(e.message)}</p></div>`; }
    },
    finish(summary = {}) {
        const ctx = this.ctx; if (!ctx || ctx.finished) return;
        ctx.finished = true;
        this.flushMinutes();
        let dayComplete = false;
        if (ctx.daily) dayComplete = completeTask(ctx.task.id, ctx.task.xp);
        else if (ctx.task.xp) { S.xp += Math.round(ctx.task.xp / 2); save(); }
        else save();
        const body = $('#playerBody');
        const n = dayNum(), p = n >= 1 ? plan(n) : null;
        const next = ctx.daily && p ? p.tasks.find(x => !taskDone(today(), x.id)) : null;
        const box = document.createElement('div');
        box.className = 'done-box' + (dayComplete ? ' big' : '');
        box.innerHTML = `
            ${dayComplete ? `<div class="fire">${ic('ph-fire')}</div><h2>Day ${n} complete!</h2><p>Streak: <b>${streak()} day${streak() > 1 ? 's' : ''}</b>. +50 bonus XP. Tomorrow, 07:00.</p>`
                          : `<div class="check">${ic('ph-check-circle')}</div><h2>${esc(summary.title || 'Done!')}</h2>`}
            ${summary.html ? `<div class="done-sum">${summary.html}</div>` : ''}
            <p class="xp">+${ctx.daily ? ctx.task.xp : Math.round((ctx.task.xp || 0) / 2)} XP</p>
            <div class="row center">
                ${next ? `<button class="btn primary" data-next>${ic(next.icon)} Next: ${esc(next.title)}</button>` : ''}
                <button class="btn" data-close>${ctx.daily ? 'Back to today' : 'Close'}</button>
            </div>`;
        body.appendChild(box);
        box.scrollIntoView({ behavior: 'smooth', block: 'end' });
        $('[data-close]', box).addEventListener('click', () => this.close());
        const nb = $('[data-next]', box);
        if (nb) nb.addEventListener('click', () => openTask(next, { daily: true }));
    },
    flushMinutes() {
        if (!this.ctx || !this.task) return;
        const cap = (this.task.mins || 5) * 2.5;
        const min = Math.min(this.active / 60, cap);
        addMinutes(min, this.ctx.daily && dayNum() >= 1);
        this.active = 0;
    },
    close(silent) {
        TTS.stop();
        this.cleanups.forEach(fn => { try { fn(); } catch (e) {} });
        this.cleanups = [];
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
        if (this.ctx && !this.ctx.finished) { this.flushMinutes(); save({ silent: !!silent }); }
        this.ctx = null; this.task = null;
        if (!silent) { $('#player').hidden = true; document.body.classList.remove('noscroll'); renderView(); }
    }
};
function openTask(task, opts = {}) { Player.open(task, opts); }

// Small UI pieces used by the exercises
function audioBar(text, opts = {}) {
    const wrap = document.createElement('div');
    wrap.className = 'audio-bar';
    wrap.innerHTML = `<button class="btn primary" data-r="1">${ic('ph-play')} Play</button><button class="btn" data-r="0.8">0.8×</button><button class="btn" data-r="0.65">Slow</button><button class="icon-btn" data-stop title="Stop">${ic('ph-stop')}</button>`;
    $$('[data-r]', wrap).forEach(b => b.addEventListener('click', () => TTS.speak(typeof text === 'function' ? text() : text, Object.assign({}, opts, { rate: parseFloat(b.dataset.r) }))));
    $('[data-stop]', wrap).addEventListener('click', () => TTS.stop());
    return wrap;
}
function micButton(label = 'Speak') { return `<button class="btn mic" data-mic>${ic('ph-microphone')} <span>${label}</span></button>`; }
function noMicNote() { return `<p class="warn small">${ic('ph-info')} Speech recognition is not available in this browser. Use Chrome on Android or PC for scores. You can still practise out loud.</p>`; }

// Speaking round with live transcript, used by 4/3/2, teach, retell, benchmark
function speakingRound(box, { seconds, onDone, label = 'Start speaking' }) {
    box.innerHTML = `<div class="round">
        <div class="big-timer">${fmtTime(seconds)}</div>
        <div class="live" data-live><span class="muted">Your words will appear here…</span></div>
        <div class="row center"><button class="btn primary mic" data-go>${ic('ph-microphone')} ${esc(label)}</button></div>
        ${Mic.ok ? '' : noMicNote()}
    </div>`;
    const timerEl = $('.big-timer', box), live = $('[data-live]', box), go = $('[data-go]', box);
    let left = seconds, iv = null, ctrl = null, running = false;
    const stop = () => {
        if (!running) return;
        running = false; clearInterval(iv);
        go.disabled = true; go.innerHTML = `${ic('ph-hourglass')} Processing…`;
        if (ctrl) ctrl.stop(); else onDone({ text: '', sec: seconds - left, pauses: 0, error: 'unsupported' });
    };
    go.addEventListener('click', () => {
        if (running) { stop(); return; }
        running = true; left = seconds;
        go.classList.add('rec'); go.innerHTML = `${ic('ph-stop')} Stop`;
        iv = setInterval(() => { left--; timerEl.textContent = fmtTime(Math.max(0, left)); timerEl.classList.toggle('low', left <= 10); if (left <= 0) stop(); }, 1000);
        if (Mic.ok) {
            ctrl = Mic.listen({ long: true, onText: t => { live.textContent = t; live.scrollTop = live.scrollHeight; }, onEnd: r => {
                if (r.error && /not-allowed|audio-capture/.test(r.error)) toast('Microphone blocked. Allow it in the browser settings.', 'bad');
                onDone(Object.assign(r, { sec: Math.min(r.sec, seconds + 1) }));
            } });
        }
    });
    return { stop, cleanup: () => { clearInterval(iv); if (ctrl) ctrl.stop(); } };
}
function metricsHTML(m) {
    return `<div class="metrics"><div><b>${m.words}</b><span>words</span></div><div><b>${m.wpm}</b><span>words/min</span></div><div><b>${m.pauses}</b><span>long pauses</span></div><div><b>${m.distinct}</b><span>different words</span></div></div>`;
}
async function aiFeedbackBlock(container, { kind, text, extra = '' }) {
    if (!AI.hasKey() || countWords(text) < 8) return;
    const box = document.createElement('div');
    box.className = 'ai-box';
    box.innerHTML = `<div class="ai-load">${ic('ph-sparkle')} Your coach is reading what you said…</div>`;
    container.appendChild(box);
    try {
        const j = await Brain.run('speak', { kind, text, extra });
        logMistakes(j.fixes, kind); save({ silent: true });
        box.innerHTML = `<div class="ai-head">${ic('ph-sparkle')} Coach</div>
            ${scoresHTML(j.scores)}
            ${j.win ? `<p class="good">${ic('ph-thumbs-up')} ${esc(j.win)}</p>` : ''}
            ${fixesHTML(j.fixes)}
            ${j.missed ? `<p class="muted small">${ic('ph-magnifying-glass')} You forgot: ${esc(j.missed)}</p>` : ''}
            ${j.better ? `<div class="better"><small>Say it like this</small><p>${esc(j.better)}</p><button class="btn small" data-say>${ic('ph-speaker-high')} Listen</button></div>` : ''}
            ${j.tip ? `<p class="tip">${ic('ph-lightbulb')} ${esc(j.tip)}</p>` : ''}`;
        const say = $('[data-say]', box); if (say) say.addEventListener('click', () => TTS.speak(j.better));
    } catch (e) { box.innerHTML = `<p class="muted small">${ic('ph-cloud-warning')} Coach unavailable: ${esc(e.message === 'nokey' ? 'no key' : e.message)}</p>`; }
}
function scoresHTML(sc) {
    if (!sc) return '';
    return `<div class="scores">${Object.entries(sc).map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>`;
}
function fixesHTML(list) {
    return (list || []).map(f => `<div class="fix"><s>${esc(f.wrong)}</s> → <b>${esc(f.right)}</b><small>${f.recurring || /^again/i.test(f.why || '') ? '<span class="tag hot">recurring</span> ' : ''}${esc(f.why || '')}</small></div>`).join('');
}
function mcq(container, q, seed, onAnswer) {
    const opts = shuffled(q.slice(1, 4).map((o, i) => ({ o, ok: i === 0 })), seed);
    const wrap = document.createElement('div');
    wrap.className = 'mcq';
    wrap.innerHTML = `<p class="q">${esc(q[0])}</p>${opts.map((x, i) => `<button class="opt" data-i="${i}">${esc(x.o)}</button>`).join('')}`;
    let tries = 0;
    $$('.opt', wrap).forEach(b => b.addEventListener('click', () => {
        if (wrap.classList.contains('solved')) return;
        const x = opts[+b.dataset.i];
        tries++;
        if (x.ok) { b.classList.add('right'); wrap.classList.add('solved'); onAnswer(tries === 1, true); }
        else { b.classList.add('wrong'); b.disabled = true; onAnswer(false, false); }
    }));
    container.appendChild(wrap);
    return wrap;
}

// ================= EXERCISES =================
const RUNNERS = {};

// ----- Placement test -----
RUNNERS.placement = (body, ctx) => {
    const items = D.placement.listen.map(x => ({ kind: 'listen', lvl: x[0], audio: x[1], q: [x[2], x[3], x[4], x[5]] }))
        .concat(D.placement.chunks.map(x => ({ kind: 'chunk', lvl: x[0], q: [x[1] + ' What is the most natural?', x[2], x[3], x[4]] })));
    let i = 0, got = 0, max = 0;
    const res = { listen: [0, 0], chunk: [0, 0] };
    const step = () => {
        if (i >= items.length) return end();
        const it = items[i];
        body.innerHTML = `<div class="progress-line"><div style="width:${i * 100 / items.length}%"></div></div>
            <p class="eyebrow">${it.kind === 'listen' ? `Listening · ${i + 1}/8` : `Natural English · ${i - 7}/6`}</p>
            ${it.kind === 'listen' ? '<p class="muted">Listen (you can replay), then answer.</p>' : ''}<div data-a></div><div data-q></div>`;
        if (it.kind === 'listen') { $('[data-a]', body).appendChild(audioBar(it.audio, { lang: 'en-US' })); setTimeout(() => TTS.speak(it.audio, { lang: 'en-US' }), 300); }
        mcq($('[data-q]', body), it.q, 99 + i, (first, ok) => {
            if (!ok) return;
            const w = it.lvl; max += w; res[it.kind][1] += w;
            if (first) { got += w; res[it.kind][0] += w; }
            setTimeout(() => { i++; step(); }, 600);
        });
    };
    const end = () => {
        const lv = r => r[1] ? 1 + (r[0] / r[1]) * 3.4 : 2;
        const level = Math.round(((lv(res.listen) * 0.6) + (lv(res.chunk) * 0.4)) * 10) / 10;
        S.placement = { date: today(), listen: res.listen, chunk: res.chunk, level };
        S.startLevel = Math.max(1.2, Math.min(4.4, level));
        ctx.finish({ title: `Your level: ${cefrLabel(S.startLevel)}`, html: `<p>Starting estimate: <b>${S.startLevel.toFixed(1)}</b> on a 1–5 scale (A1 = 1, A2 = 2, B1 = 3, B2 = 4). The app adjusts it every day from what you really do.</p>` });
    };
    step();
};

// ----- Phrase cards (spaced repetition) -----
RUNNERS.cards = async (body, ctx) => {
    body.innerHTML = `<div class="ai-load">${ic('ph-spinner')} Preparing your cards…</div>`;
    if (ctx.daily && ctx.phase >= 2 && AI.hasKey()) { try { await ensureAIDay(ctx.n); } catch (e) { toast('AI phrases unavailable today: reviews only.', 'bad'); } }
    if (!body.isConnected || !Player.ctx || Player.ctx !== ctx) return;
    const { fresh, due } = cardQueue(ctx.n);
    const queue = (ctx.daily ? fresh.map(id => ({ id, learn: true })) : []).concat(due.map(id => ({ id })));
    const total = queue.length;
    let doneCount = 0, againCount = 0;
    if (!total) {
        body.innerHTML = `<div class="empty">${ic('ph-confetti')}<h3>No cards due right now.</h3><p class="muted">${ctx.phase >= 2 && !AI.hasKey() ? 'Add your Gemini key to get 8 new phrases a day. Meanwhile, add phrases from your notebook (Cards tab).' : 'Come back tomorrow: the app shows each phrase just before you forget it.'}</p></div>`;
        if (ctx.daily) ctx.finish({ title: 'Nothing due today' });
        return;
    }
    const step = () => {
        if (!queue.length) {
            return ctx.finish({ title: 'Cards done', html: `<p>${doneCount} reviews · ${fresh.length && ctx.daily ? fresh.length + ' new phrases · ' : ''}${againCount} to see again soon.</p><p class="muted small">You know ${cardStats().mature} phrases for the long term (seen 7+ days apart).</p>` });
        }
        const item = queue[0], c = cardContent(item.id);
        if (!c) { queue.shift(); return step(); }
        const pct = Math.round((total - queue.length) * 100 / Math.max(total, 1));
        if (item.learn) {
            body.innerHTML = `<div class="progress-line"><div style="width:${pct}%"></div></div>
            <p class="eyebrow">New phrase · ${queue.filter(q => q.learn).length} left</p>
            <div class="flash learn"><p class="en">${esc(c.en)}</p><p class="fr">${esc(c.fr)}</p><div data-a></div></div>
            <p class="muted small center">Read it, listen, say it in your head twice. Then imagine when you will use it.</p>
            <div class="row center"><button class="btn primary" data-ok>Got it ${ic('ph-arrow-right')}</button></div>`;
            $('[data-a]', body).appendChild(audioBar(c.en, { whole: true }));
            TTS.speak(c.en, { whole: true });
            $('[data-ok]', body).addEventListener('click', () => { introduceCard(item.id); save({ silent: true }); queue.shift(); queue.push({ id: item.id }); step(); });
            return;
        }
        body.innerHTML = `<div class="progress-line"><div style="width:${pct}%"></div></div>
        <p class="eyebrow">Review · ${queue.length} left</p>
        <div class="flash"><p class="prompt">How do you say it in English?</p><p class="fr big">${esc(c.fr || '…')}</p><div class="back" hidden><p class="en">${esc(c.en)}</p><div data-a></div></div></div>
        <div class="row center" data-show><button class="btn primary">${ic('ph-eye')} Show</button></div>
        <div class="grades" hidden>
            <button class="g0" data-g="0">Again<small>forgot</small></button><button class="g1" data-g="1">Hard<small>slow</small></button>
            <button class="g2" data-g="2">Good<small>got it</small></button><button class="g3" data-g="3">Easy<small>instant</small></button>
        </div>`;
        $('[data-show] button', body).addEventListener('click', () => {
            $('.back', body).hidden = false; $('[data-show]', body).hidden = true; $('.grades', body).hidden = false;
            $('[data-a]', body).appendChild(audioBar(c.en, { whole: true })); TTS.speak(c.en, { whole: true });
        });
        $$('[data-g]', body).forEach(b => b.addEventListener('click', () => {
            const g = +b.dataset.g, again = gradeCard(item.id, g);
            save({ silent: true });
            queue.shift();
            if (again) { againCount++; queue.push({ id: item.id }); } else doneCount++;
            step();
        }));
    };
    step();
};

// ----- Listening: today's episode + 3 questions -----
RUNNERS.listen = async (body, ctx) => {
    body.innerHTML = `<div class="ai-load">${ic('ph-spinner')} Loading today's episode…</div>`;
    let n = ctx.opts.episodeDay || ctx.n;
    if (ctx.phase >= 2 && !ctx.opts.episodeDay && AI.hasKey()) { try { await ensureAIDay(n); } catch (e) { toast("New episode unavailable: replaying a season 1 episode.", 'bad'); } }
    if (!Player.ctx || Player.ctx !== ctx) return;
    const st = storyFor(n), sents = sentences(st.x);
    const phase = ctx.opts.episodeDay ? 1 : ctx.phase;
    const hideMode = phase === 1 ? 'show' : phase === 2 ? 'hide' : 'lock';
    body.innerHTML = `
        <p class="eyebrow">${st.ai ? 'Season 2' : `Episode ${st.ep}`} · ${esc(st.t)}</p>
        <p class="muted small">${hideMode === 'show' ? 'Listen first without reading. Then read and listen again.' : hideMode === 'hide' ? 'Listen without the text. Show it only if you are really lost.' : 'No subtitles: the text unlocks after the 3 questions.'}</p>
        <div data-a></div>
        <div class="transcript ${hideMode === 'show' ? '' : 'blur'}" data-tr>${sents.map((s, i) => `<span data-s="${i}">${esc(s)} </span>`).join('')}</div>
        ${hideMode === 'hide' ? `<div class="row"><button class="btn small" data-reveal>${ic('ph-eye')} Show text</button></div>` : ''}
        <h3 class="mt">Questions</h3><div data-q></div>`;
    const tr = $('[data-tr]', body);
    $('[data-a]', body).appendChild(audioBar(st.x, { onsentence: i => { $$('[data-s]', tr).forEach(s => s.classList.toggle('cur', +s.dataset.s === i)); } }));
    const rv = $('[data-reveal]', body); if (rv) rv.addEventListener('click', () => { tr.classList.remove('blur'); rv.remove(); });
    let firstOk = 0, solved = 0;
    const qs = st.q.slice(0, 3);
    qs.forEach((q, i) => mcq($('[data-q]', body), q, n * 31 + i, (first, ok) => {
        if (first) firstOk++;
        if (!ok) { toast('Not quite. Listen again 🎧'); return; }
        solved++;
        if (solved === qs.length) {
            tr.classList.remove('blur');
            const acc = firstOk / qs.length;
            if (ctx.daily) { S.metrics.listen.push({ d: today(), acc, lvl: st.lvl }); S.metrics.listen = S.metrics.listen.slice(-60); }
            ctx.finish({ title: 'Episode understood', html: `<p>First-try answers: <b>${firstOk}/${qs.length}</b>. ${acc === 1 ? 'Perfect.' : 'Read the text once more and listen again tonight.'}</p>` });
        }
    }));
    setTimeout(() => { if (Player.ctx === ctx) TTS.speak(st.x, { onsentence: i => { $$('[data-s]', tr).forEach(s => s.classList.toggle('cur', +s.dataset.s === i)); } }); }, 400);
};

// ----- Reflex: answer fast, no translation -----
RUNNERS.reflex = (body, ctx) => {
    const items = pickN(D.reflex, 5, ctx.n * 7 + (ctx.daily ? 0 : Date.now() % 1000));
    const target = ctx.phase === 1 ? 8 : ctx.phase === 2 ? 5 : 3;
    const lat = [];
    let i = 0;
    const step = () => {
        if (i >= items.length) {
            const a = avg(lat) || 0;
            S.metrics.reflex.push({ d: today(), avg: Math.round(a * 10) / 10 }); S.metrics.reflex = S.metrics.reflex.slice(-60);
            return ctx.finish({ title: 'Reflexes trained', html: `<p>Average start time: <b>${a.toFixed(1)} s</b> (goal: under ${target} s). ${a <= target ? 'Fast. No time to translate: good.' : 'Start with a ready-made opener: "Sorry…", "Let me…", "I think…".'}</p>` });
        }
        const [sit, model] = items[i];
        body.innerHTML = `<div class="progress-line"><div style="width:${i * 20}%"></div></div>
        <p class="eyebrow">Situation ${i + 1}/5 · start typing in under ${target} s</p>
        <div class="situation">${esc(sit)}</div>
        <div class="big-timer small" data-t>0.0 s</div>
        <textarea class="input" rows="2" data-in placeholder="Type your answer in English. Simple is perfect."></textarea>
        <div class="starters">${['Sorry, ', 'Excuse me, ', 'Let me ', 'I think ', 'Could you '].map(s => `<button class="chip-btn" data-st="${esc(s)}">${esc(s.trim())}…</button>`).join('')}</div>
        <div class="row"><button class="btn primary" data-go disabled>Check</button></div>
        <div data-res></div>`;
        const t0 = performance.now(), inp = $('[data-in]', body), tEl = $('[data-t]', body), go = $('[data-go]', body);
        let started = null;
        const iv = setInterval(() => { const s = started != null ? started : (performance.now() - t0) / 1000; tEl.textContent = s.toFixed(1) + ' s'; tEl.classList.toggle('low', s > target); }, 100);
        ctx.cleanup(() => clearInterval(iv));
        const mark = () => { if (started == null) { started = (performance.now() - t0) / 1000; clearInterval(iv); tEl.textContent = started.toFixed(1) + ' s'; tEl.classList.add(started <= target ? 'good' : 'low'); } };
        inp.addEventListener('input', () => { mark(); go.disabled = countWords(inp.value) < 3; });
        $$('[data-st]', body).forEach(b => b.addEventListener('click', () => { mark(); inp.value = b.dataset.st; inp.focus(); go.disabled = true; }));
        inp.focus();
        go.addEventListener('click', () => {
            lat.push(started || 0);
            go.disabled = true; inp.disabled = true;
            $('[data-res]', body).innerHTML = `<div class="model"><small>A natural answer</small><p>${esc(model)}</p><div class="row"><button class="btn small" data-say>${ic('ph-speaker-high')} Listen</button><button class="btn primary small" data-next>Next ${ic('ph-arrow-right')}</button></div></div>`;
            $('[data-say]', body).addEventListener('click', () => TTS.speak(model, { whole: true }));
            $('[data-next]', body).addEventListener('click', () => { clearInterval(iv); i++; step(); });
        });
    };
    step();
};

// ----- Fix my mistakes: your own logged mistakes + the weekly drill, corrected from memory -----
function fixItems(seed) {
    const seen = new Set(), out = [];
    const add = (wrong, right, why) => { const k = words(wrong).join(' '); if (!wrong || !right || seen.has(k) || words(right).join(' ') === k) return; seen.add(k); out.push({ wrong, right, why }); };
    const focus = S.coach.focus;
    // 1. the coach's weekly drill, 2. this week's focus type, 3. the most recent mistakes
    ((S.coach.report && S.coach.report.drill) || []).forEach(d => add(d.wrong, d.right, 'Weekly drill' + (focus ? ` · ${focus}` : '')));
    S.mistakes.slice().reverse().filter(m => m.type === focus).forEach(m => add(m.wrong, m.right, m.why));
    shuffled(S.mistakes.slice(-30), seed).forEach(m => add(m.wrong, m.right, m.why));
    return out.slice(0, 6);
}
RUNNERS.fixit = (body, ctx) => {
    const items = fixItems(ctx.n * 13 + (ctx.daily ? 0 : Date.now() % 997));
    if (items.length < 3) {
        body.innerHTML = `<div class="empty">${ic('ph-wrench')}<h3>Not enough mistakes logged yet.</h3><p class="muted">Your coach logs them when it corrects your speaking, writing and role-plays. Come back after a few sessions.</p></div>`;
        if (ctx.daily) ctx.finish({ title: 'Nothing to fix yet' });
        return;
    }
    let i = 0, good = 0;
    const step = () => {
        if (i >= items.length) {
            const pct = Math.round(good * 100 / items.length);
            S.metrics.fixit = (S.metrics.fixit || []).concat({ d: today(), pct }).slice(-60);
            return ctx.finish({ title: 'Mistakes fixed', html: `<p>Fixed at first try: <b>${good}/${items.length}</b>. ${pct >= 80 ? 'These mistakes are leaving you.' : 'Say each correct sentence 3 times out loud tonight.'}</p>` });
        }
        const it = items[i];
        body.innerHTML = `<div class="progress-line"><div style="width:${i * 100 / items.length}%"></div></div>
        <p class="eyebrow">Mistake ${i + 1}/${items.length} · ${esc(it.why || '')}</p>
        <div class="situation"><s>${esc(it.wrong)}</s></div>
        <p class="muted small">Write the correct sentence, or say it with the microphone.</p>
        <div class="chat-input">${Mic.ok ? `<button class="icon-btn mic-btn" data-mic title="Speak">${ic('ph-microphone')}</button>` : ''}<input class="input" data-in placeholder="The correct sentence…" autocomplete="off"><button class="btn primary" data-go>Check</button></div>
        <div data-res></div>`;
        const inp = $('[data-in]', body), go = $('[data-go]', body);
        const check = () => {
            const said = inp.value.trim(); if (!said) return;
            go.disabled = true; inp.disabled = true;
            // Correct = close to the right sentence AND closer to it than to the wrong one
            const toRight = matchScore(it.right, said).pct, toWrong = matchScore(it.wrong, said).pct;
            const ok = toRight === 100 || (toRight >= 85 && toRight > toWrong);
            if (ok) good++;
            $('[data-res]', body).innerHTML = `<div class="model ${ok ? 'ok' : ''}"><small>${ok ? `${ic('ph-check-circle')} Correct` : 'Correct version'}</small><p>${esc(it.right)}</p><div class="row"><button class="btn small" data-say>${ic('ph-speaker-high')} Listen</button><button class="btn primary small" data-next>Next ${ic('ph-arrow-right')}</button></div></div>`;
            $('[data-say]', body).addEventListener('click', () => TTS.speak(it.right, { whole: true }));
            $('[data-next]', body).addEventListener('click', () => { i++; step(); });
        };
        go.addEventListener('click', check);
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') check(); });
        const mic = $('[data-mic]', body);
        if (mic) mic.addEventListener('click', () => {
            if (mic.classList.contains('rec')) return;
            mic.classList.add('rec');
            const c = Mic.listen({ onText: t => { inp.value = t; }, onEnd: r => { mic.classList.remove('rec'); if (r.text) { inp.value = r.text; check(); } } });
            ctx.cleanup(() => c.stop());
        });
        inp.focus();
    };
    step();
};

// ----- Month 3: real-world mission (use English outside the app) -----
function missionFor(n) { return D.missions[Math.floor(Math.max(0, n - 61) / 2) % D.missions.length]; }
RUNNERS.mission = (body, ctx) => {
    const m = ctx.opts.mission || missionFor(ctx.n);
    const key = ctx.daily ? 'd' + ctx.n : 'free-' + today();
    body.innerHTML = `<p class="eyebrow">Real-world mission · use English outside the app</p>
        <h2 class="mission-t">${ic('ph-rocket-launch')} ${esc(m.t)}</h2>
        <div class="situation">${esc(m.do)}</div>
        ${AI.hasKey() ? `<button class="btn" data-prep>${ic('ph-sparkle')} Prepare me (script + key phrases)</button><div data-prepres></div>` : ''}
        <p class="small mt"><b>Done? Prove it.</b> ${esc(m.proof)}</p>
        <textarea class="input" rows="3" data-in placeholder="In English, at least 10 words."></textarea>
        <div class="row between"><span class="muted small" data-wc>0 / 10 words</span><button class="btn primary" data-go disabled>${ic('ph-check')} Mission done</button></div>`;
    const inp = $('[data-in]', body), go = $('[data-go]', body), wc = $('[data-wc]', body);
    inp.addEventListener('input', () => { const c = countWords(inp.value); wc.textContent = `${c} / 10 words`; go.disabled = c < 10; });
    const prep = $('[data-prep]', body);
    if (prep) prep.addEventListener('click', async () => {
        prep.disabled = true;
        const res = $('[data-prepres]', body);
        res.innerHTML = `<div class="ai-load">${ic('ph-sparkle')} Your coach is preparing your mission…</div>`;
        try {
            const j = await Brain.run('mission', { m });
            res.innerHTML = `<div class="ai-box"><div class="ai-head">${ic('ph-sparkle')} Your plan</div>
                <ol class="small">${(j.steps || []).map(x => `<li>${esc(x)}</li>`).join('')}</ol>
                <div class="better"><small>Ready to use (fill the [brackets])</small><p>${esc(j.script)}</p><button class="btn small" data-say>${ic('ph-speaker-high')} Listen</button></div>
                ${(j.phrases || []).map((x, k) => `<div class="chunk-add"><span><b>${esc(x.en)}</b> · ${esc(x.fr || '')}</span><button class="btn small" data-add="${k}">${ic('ph-plus')} Card</button></div>`).join('')}
                ${j.rescue ? `<p class="tip">${ic('ph-lifebuoy')} If you get stuck: ${esc(j.rescue)}</p>` : ''}</div>`;
            $('[data-say]', res).addEventListener('click', () => TTS.speak(j.script));
            $$('[data-add]', res).forEach(b => b.addEventListener('click', () => { const x = j.phrases[+b.dataset.add]; addCustomCard(x.en, x.fr, 'mission'); save({ silent: true }); b.disabled = true; b.textContent = 'Added ✓'; }));
        } catch (e) { res.innerHTML = `<p class="warn small">${ic('ph-cloud-warning')} ${esc(e.message)}</p>`; prep.disabled = false; }
    });
    go.addEventListener('click', () => {
        S.missions[key] = { t: m.t, proof: inp.value.trim().slice(0, 600), date: today() };
        S.notebook.unshift({ id: 'n' + Date.now().toString(36), en: inp.value.trim().slice(0, 300), note: `Mission · ${m.t}`, date: today(), src: 'mission' });
        save({ silent: true });
        ctx.finish({ title: 'Mission accomplished', html: `<p>You used English in the real world today. That is what fluency is.</p>` });
    });
};

// ----- Write it (with AI correction) -----
RUNNERS.write = (body, ctx) => {
    const th = themeOf(ctx.n), st = storyFor(ctx.n);
    const retell = ctx.phase >= 2 && ctx.n % 2 === 1;
    const min = ctx.phase === 1 ? 25 : ctx.phase === 2 ? 50 : 80;
    const prompt = retell ? `Retell today's episode ("${st.t}") in your own words: who, what happened, why. Then add one sentence with your opinion.` : th.w;
    body.innerHTML = `<p class="eyebrow">Write · at least ${min} words</p><div class="situation">${esc(prompt)}</div>
        <p class="muted small">Use 2 of your phrases: ${th.c.slice(0, 4).map(c => `<i>${esc(c[0])}</i>`).join(' · ')}</p>
        <textarea class="input" rows="7" data-in placeholder="Write in English. Short sentences are fine. Don't translate from French: think of the phrases you know."></textarea>
        <div class="row between"><span class="muted small" data-wc>0 / ${min} words</span><button class="btn primary" data-go disabled>${AI.hasKey() ? `${ic('ph-sparkle')} Correct me` : 'Done'}</button></div>
        <div data-res></div>`;
    const inp = $('[data-in]', body), go = $('[data-go]', body), wc = $('[data-wc]', body);
    inp.addEventListener('input', () => { const c = countWords(inp.value); wc.textContent = `${c} / ${min} words`; go.disabled = c < min; wc.classList.toggle('ok', c >= min); });
    go.addEventListener('click', async () => {
        const text = inp.value.trim();
        go.disabled = true; inp.readOnly = true;
        const res = $('[data-res]', body);
        if (!AI.hasKey()) {
            res.innerHTML = `<div class="ai-box"><div class="ai-head">${ic('ph-list-checks')} Check it yourself</div><ul class="check"><li>Every sentence has a verb?</li><li>Past actions in the past (went, did, was)?</li><li>Did you use 2 phrases of the day?</li><li>Read it out loud once.</li></ul></div>`;
            return ctx.finish({ title: 'Text written' });
        }
        res.innerHTML = `<div class="ai-load">${ic('ph-sparkle')} Your coach is correcting…</div>`;
        try {
            const j = await Brain.run('write', { task: prompt, text, story: retell ? st.x : '' });
            logMistakes(j.fixes, 'write');
            res.innerHTML = `<div class="ai-box"><div class="ai-head">${ic('ph-sparkle')} Coach · ${esc(j.score)}/10</div>
                ${j.win ? `<p class="good">${ic('ph-thumbs-up')} ${esc(j.win)}</p>` : ''}
                ${fixesHTML(j.fixes)}
                <div class="better"><small>Natural version</small><p>${esc(j.corrected)}</p><button class="btn small" data-say>${ic('ph-speaker-high')} Listen</button></div>
                ${j.tip ? `<p class="tip">${ic('ph-lightbulb')} ${esc(j.tip)}</p>` : ''}
                ${j.chunk && j.chunk.en ? `<div class="chunk-add"><span><b>${esc(j.chunk.en)}</b> · ${esc(j.chunk.fr || '')}</span><button class="btn small" data-add>${ic('ph-plus')} Add to my cards</button></div>` : ''}</div>`;
            $('[data-say]', res).addEventListener('click', () => TTS.speak(j.corrected));
            const add = $('[data-add]', res);
            if (add) add.addEventListener('click', () => { addCustomCard(j.chunk.en, j.chunk.fr, 'write'); save({ silent: true }); add.disabled = true; add.textContent = 'Added ✓'; });
            ctx.finish({ title: 'Text corrected' });
        } catch (e) {
            res.innerHTML = `<p class="warn small">${ic('ph-cloud-warning')} ${esc(e.message)}. Your text still counts.</p>`;
            ctx.finish({ title: 'Text written' });
        }
    });
};

// ----- Weekly checkpoint: dictation -----
RUNNERS.checkpoint = (body, ctx) => {
    const lvl = cefr().value;
    let pool = D.dictation.filter(d => Math.abs(d[0] - lvl) <= 0.8);
    if (pool.length < 6) pool = D.dictation.slice().sort((a, b) => Math.abs(a[0] - lvl) - Math.abs(b[0] - lvl)).slice(0, 8);
    const items = pickN(pool, 6, ctx.n * 13);
    const scores = [];
    let i = 0;
    const before = cefr();
    const step = () => {
        if (i >= items.length) {
            const acc = avg(scores) / 100, lv = avg(items.map(x => x[0]));
            S.metrics.dict.push({ d: today(), acc, lvl: lv });
            const after = cefr();
            return ctx.finish({ title: 'Checkpoint done', html: `<p>Dictation: <b>${Math.round(acc * 100)}%</b> of the words.</p><p>Level estimate: ${before.label} ${before.value.toFixed(2)} → <b>${after.label} ${after.value.toFixed(2)}</b></p>` });
        }
        const [, sent] = items[i];
        let plays = 0;
        body.innerHTML = `<div class="progress-line"><div style="width:${i * 100 / items.length}%"></div></div>
        <p class="eyebrow">Dictation ${i + 1}/${items.length} · native speed · 3 plays max</p>
        <div class="row center"><button class="btn primary" data-play>${ic('ph-play')} Play (<span>3</span>)</button></div>
        <input class="input" data-in placeholder="Type exactly what you hear" autocomplete="off" autocapitalize="off" spellcheck="false">
        <div class="row"><button class="btn primary" data-go>Check</button></div><div data-res></div>`;
        const playBtn = $('[data-play]', body);
        playBtn.addEventListener('click', () => { if (plays >= 3) return; plays++; $('span', playBtn).textContent = 3 - plays; if (plays >= 3) playBtn.disabled = true; TTS.speak(sent, { whole: true }); });
        setTimeout(() => playBtn.click(), 300);
        $('[data-go]', body).addEventListener('click', e => {
            e.target.disabled = true;
            const r = matchScore(sent, $('[data-in]', body).value);
            scores.push(r.pct);
            $('[data-res]', body).innerHTML = `<div class="model"><small>${r.pct}% · the sentence</small><p class="diff">${r.words.map((w, k) => `<span class="${r.hit[k] ? 'hit' : 'miss'}">${esc(w)}</span>`).join(' ')}</p><div class="row"><button class="btn primary small" data-next>Next ${ic('ph-arrow-right')}</button></div></div>`;
            $('[data-next]', body).addEventListener('click', () => { i++; step(); });
        });
    };
    step();
};

// ----- Shadowing -----
RUNNERS.shadow = (body, ctx) => {
    const st = storyFor(ctx.n);
    const k = ctx.phase === 1 ? 4 : ctx.phase === 2 ? 5 : 6, need = ctx.phase === 1 ? 60 : ctx.phase === 2 ? 70 : 75;
    let pool = sentences(st.x).map(s => s.replace(/^["“]|["”]$/g, '')).filter(s => { const w = countWords(s); return w >= 5 && w <= 18; });
    if (pool.length < k) pool = sentences(st.x);
    const items = pickN(pool, k, ctx.n * 17 + (ctx.daily ? 0 : Date.now() % 997));
    const blind = ctx.phase === 3;
    const scores = [];
    let i = 0;
    const step = () => {
        if (i >= items.length) {
            const a = Math.round(avg(scores) || 0);
            return ctx.finish({ title: 'Shadowing done', html: `<p>Average match: <b>${a}%</b>. Copy the music of the sentence, not only the words.</p>` });
        }
        const sent = items[i];
        let tries = 0, best = 0;
        body.innerHTML = `<div class="progress-line"><div style="width:${i * 100 / items.length}%"></div></div>
        <p class="eyebrow">Sentence ${i + 1}/${items.length} · goal ${need}%</p>
        <p class="muted small">Listen. Then say it at the same time as the voice, or right after: same speed, same melody.</p>
        <div class="flash shadow-s ${blind ? 'blur' : ''}" data-txt><p class="en">${esc(sent)}</p></div>
        ${blind ? `<p class="muted small center">Phase 3: no text. Tap the sentence to see it after you try.</p>` : ''}
        <div data-a></div>
        <div class="row center">${Mic.ok ? micButton('Say it') : `<button class="btn" data-self>${ic('ph-check')} I said it 3 times</button>`}</div>
        ${Mic.ok ? '' : noMicNote()}
        <div data-res></div>
        <div class="row center"><button class="btn" data-next hidden>Next ${ic('ph-arrow-right')}</button></div>`;
        $('[data-a]', body).appendChild(audioBar(sent, { whole: true }));
        TTS.speak(sent, { whole: true });
        const txt = $('[data-txt]', body); txt.addEventListener('click', () => txt.classList.remove('blur'));
        const next = $('[data-next]', body);
        next.addEventListener('click', () => { scores.push(best); i++; step(); });
        const self = $('[data-self]', body);
        if (self) self.addEventListener('click', () => { best = need; next.hidden = false; self.disabled = true; });
        const mic = $('[data-mic]', body);
        if (mic) mic.addEventListener('click', () => {
            mic.disabled = true; mic.classList.add('rec'); $('span', mic).textContent = 'Listening…';
            TTS.stop();
            const c = Mic.listen({ onText: t => { $('[data-res]', body).innerHTML = `<p class="live">${esc(t)}</p>`; }, onEnd: r => {
                mic.disabled = false; mic.classList.remove('rec'); $('span', mic).textContent = 'Try again';
                if (r.error && /not-allowed|audio-capture/.test(r.error)) { toast('Microphone blocked. Allow it in the browser settings.', 'bad'); return; }
                tries++;
                const m = matchScore(sent, r.text);
                best = Math.max(best, m.pct);
                txt.classList.remove('blur');
                $('[data-res]', body).innerHTML = `<div class="score ${m.pct >= need ? 'good' : ''}"><b>${m.pct}%</b><p class="diff">${m.words.map((w, k2) => `<span class="${m.hit[k2] ? 'hit' : 'miss'}">${esc(w)}</span>`).join(' ')}</p><small>I heard: “${esc(r.text || '…')}”</small></div>`;
                if (m.pct >= need || tries >= 3) next.hidden = false;
            } });
            ctx.cleanup(() => c.stop());
        });
    };
    step();
};

// ----- 4 / 3 / 2 speaking -----
RUNNERS.speak432 = (body, ctx) => {
    const durs = ctx.phase === 1 ? [120, 90, 60] : ctx.phase === 2 ? [180, 120, 90] : [240, 180, 120];
    const topic = ctx.opts.topic || pickN(D.topics, 1, ctx.n * 3 + (ctx.daily ? 0 : Date.now() % 997))[0];
    const rounds = [];
    let r = 0;
    const intro = () => {
        body.innerHTML = `<p class="eyebrow">4 / 3 / 2 · same topic, 3 rounds, less time each round</p>
        <div class="situation">${esc(topic)}</div>
        <p class="muted small">Round 1: ${fmtTime(durs[0])} · Round 2: ${fmtTime(durs[1])} · Round 3: ${fmtTime(durs[2])}. Say the same things again, faster and smoother. Don't stop: if a word is missing, explain it with other words. Replace "euh" with a short silence.</p>
        <div data-box></div>`;
        round();
    };
    const round = () => {
        const box = $('[data-box]', body);
        const head = document.createElement('p'); head.className = 'eyebrow mt'; head.textContent = `Round ${r + 1} of 3`;
        box.innerHTML = ''; box.appendChild(head);
        const inner = document.createElement('div'); box.appendChild(inner);
        const sr = speakingRound(inner, { seconds: durs[r], label: `Start round ${r + 1}`, onDone: res => {
            const m = speechMetrics(res.text, res.sec || durs[r], res.pauses);
            rounds.push(Object.assign({}, m, { text: res.text }));
            if (r === 0 && m.words >= 15) { S.metrics.speak.push(Object.assign({ d: today(), kind: '432' }, m)); S.metrics.speak = S.metrics.speak.slice(-80); }
            r++;
            if (r < 3) {
                inner.innerHTML = `${Mic.ok ? metricsHTML(m) : ''}<div class="row center"><button class="btn primary" data-n>Round ${r + 1} (${fmtTime(durs[r])}) ${ic('ph-arrow-right')}</button></div>`;
                $('[data-n]', inner).addEventListener('click', round);
            } else end();
        } });
        ctx.cleanup(sr.cleanup);
    };
    const end = () => {
        const box = $('[data-box]', body);
        box.innerHTML = Mic.ok ? `<table class="cmp"><tr><th></th><th>Words</th><th>Words/min</th><th>Pauses</th></tr>${rounds.map((m, k) => `<tr><td>Round ${k + 1}</td><td>${m.words}</td><td>${m.wpm}</td><td>${m.pauses}</td></tr>`).join('')}</table>
            <p class="muted small">${rounds[2] && rounds[0] && rounds[2].wpm > rounds[0].wpm ? `Speed +${rounds[2].wpm - rounds[0].wpm} words/min from round 1 to 3. That's fluency being built.` : 'Next time, push round 3 faster.'}</p>` : '';
        aiFeedbackBlock(box, { kind: '4/3/2 (round 3)', text: (rounds[2] || rounds[0] || {}).text || '' });
        ctx.finish({ title: '3 rounds done' });
    };
    intro();
};

// ----- Teach it -----
RUNNERS.teach = (body, ctx) => {
    const sec = ctx.phase === 1 ? 90 : ctx.phase === 2 ? 120 : 180;
    const topic = pickN(D.teach, 1, ctx.n * 5 + (ctx.daily ? 0 : Date.now() % 997))[0];
    body.innerHTML = `<p class="eyebrow">Teach it · ${fmtTime(sec)}</p><div class="situation">${esc(topic)}</div>
        <p class="muted small">Explain it out loud to a 12-year-old. Use "Basically…", "Think of it like…", "For example…". Simple words only.</p><div data-box></div>`;
    const box = $('[data-box]', body);
    const sr = speakingRound(box, { seconds: sec, onDone: res => {
        const m = speechMetrics(res.text, res.sec || sec, res.pauses);
        if (m.words >= 15) { S.metrics.speak.push(Object.assign({ d: today(), kind: 'teach' }, m)); S.metrics.speak = S.metrics.speak.slice(-80); }
        box.innerHTML = Mic.ok ? metricsHTML(m) : '';
        aiFeedbackBlock(box, { kind: 'teach a concept', text: res.text, extra: `Topic: ${topic}` });
        ctx.finish({ title: 'Lesson given' });
    } });
    ctx.cleanup(sr.cleanup);
};

// ----- Close everything & retell -----
RUNNERS.retell = (body, ctx) => {
    const st = storyFor(ctx.n), sec = ctx.phase === 1 ? 60 : ctx.phase === 2 ? 90 : 120;
    body.innerHTML = `<p class="eyebrow">Retell · ${esc(st.t)}</p>
        <p class="muted small">1. Listen to today's episode again (no text). 2. Close everything. 3. Tell it to a friend in your own words for ${fmtTime(sec)}.</p>
        <div data-a></div><div class="row center"><button class="btn primary" data-close>${ic('ph-eye-slash')} I'm ready: close everything</button></div><div data-box></div>`;
    $('[data-a]', body).appendChild(audioBar(st.x));
    $('[data-close]', body).addEventListener('click', e => {
        TTS.stop(); e.target.closest('.row').remove(); $('[data-a]', body).remove();
        const box = $('[data-box]', body);
        const sr = speakingRound(box, { seconds: sec, label: 'Start retelling', onDone: res => {
            const m = speechMetrics(res.text, res.sec || sec, res.pauses);
            if (m.words >= 15) { S.metrics.speak.push(Object.assign({ d: today(), kind: 'retell' }, m)); S.metrics.speak = S.metrics.speak.slice(-80); }
            box.innerHTML = Mic.ok ? metricsHTML(m) : '';
            aiFeedbackBlock(box, { kind: 'retell', text: res.text, extra: `The story: """${st.x}"""` });
            ctx.finish({ title: 'Story retold' });
        } });
        ctx.cleanup(sr.cleanup);
    });
};

// ----- Role-play with the AI partner -----
RUNNERS.roleplay = (body, ctx) => {
    if (!AI.hasKey()) { body.innerHTML = keyNeededHTML(); bindKeyForm(body, () => RUNNERS.roleplay(body, ctx)); return; }
    const avail = D.roleplays.filter(x => x.p <= ctx.phase);
    const sc = ctx.opts.scenario || pickN(avail, 1, ctx.n * 11)[0];
    const turns = ctx.phase === 1 ? 5 : ctx.phase === 2 ? 8 : 12;
    const hist = [{ role: 'model', text: sc.open }];
    let userTurns = 0, busy = false, voiceOn = true;
    body.innerHTML = `<div class="rp-head"><div><p class="eyebrow">${esc(sc.t)}</p><p class="small"><b>Your goal:</b> ${esc(sc.goal)}</p></div><button class="icon-btn" data-voice title="AI voice on/off">${ic('ph-speaker-high')}</button></div>
        <div class="chat" data-chat></div>
        <div class="rescue">${["Sorry, could you say that again?", "What I mean is ", "I don't know the word, but it's like ", "Let me think… "].map(s => `<button class="chip-btn" data-rs="${esc(s)}">${esc(s.trim())}</button>`).join('')}</div>
        <div class="chat-input">${Mic.ok ? `<button class="icon-btn mic-btn" data-mic title="Speak">${ic('ph-microphone')}</button>` : ''}<input class="input" data-in placeholder="Answer in English…" autocomplete="off"><button class="btn primary" data-send>${ic('ph-paper-plane-right')}</button></div>
        <div class="row between"><span class="muted small" data-count>0 / ${turns} answers</span><button class="btn small" data-end disabled>Finish & get feedback</button></div>`;
    const chat = $('[data-chat]', body), inp = $('[data-in]', body), send = $('[data-send]', body), endBtn = $('[data-end]', body);
    const add = (who, text, fix) => {
        const b = document.createElement('div');
        b.className = 'bubble ' + who;
        b.innerHTML = `<p>${esc(text)}</p>${fix ? `<div class="fix in"><s>${esc(fix.wrong)}</s> → <b>${esc(fix.right)}</b>${fix.why ? `<small>${esc(fix.why)}</small>` : ''}</div>` : ''}${who === 'ai' ? `<button class="say" title="Listen">${ic('ph-speaker-simple-high')}</button>` : ''}`;
        const say = $('.say', b); if (say) say.addEventListener('click', () => TTS.speak(text));
        chat.appendChild(b); chat.scrollTop = chat.scrollHeight;
    };
    add('ai', sc.open); if (voiceOn) TTS.speak(sc.open);
    $('[data-voice]', body).addEventListener('click', e => { voiceOn = !voiceOn; e.currentTarget.innerHTML = ic(voiceOn ? 'ph-speaker-high' : 'ph-speaker-slash'); if (!voiceOn) TTS.stop(); });
    $$('[data-rs]', body).forEach(b => b.addEventListener('click', () => { inp.value = (inp.value ? inp.value + ' ' : '') + b.dataset.rs; inp.focus(); }));
    const doSend = async () => {
        const text = inp.value.trim();
        if (!text || busy) return;
        busy = true; send.disabled = true; inp.value = '';
        add('me', text); hist.push({ role: 'user', text });
        userTurns++;
        $('[data-count]', body).textContent = `${userTurns} / ${turns} answers`;
        const typing = document.createElement('div'); typing.className = 'bubble ai typing'; typing.innerHTML = '<p>…</p>'; chat.appendChild(typing); chat.scrollTop = chat.scrollHeight;
        try {
            const j = await Brain.run('rpTurn', { sc, turn: userTurns, turns, lastUser: text }, [{ role: 'user', text: '(Start the role-play now.)' }].concat(hist));
            typing.remove();
            const reply = String(j.reply || '…');
            hist.push({ role: 'model', text: reply });
            if (j.fix && j.fix.wrong) logMistakes([j.fix], 'roleplay');
            add('ai', reply, j.fix && j.fix.wrong ? j.fix : null);
            if (voiceOn) TTS.speak(reply);
        } catch (e) {
            typing.remove(); hist.pop(); userTurns--;
            $('[data-count]', body).textContent = `${userTurns} / ${turns} answers`;
            add('sys', `Connection problem: ${e.message}. Send your answer again.`);
            inp.value = text;
        }
        busy = false; send.disabled = false;
        if (userTurns >= turns) { endBtn.disabled = false; endBtn.classList.add('primary'); }
    };
    send.addEventListener('click', doSend);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') doSend(); });
    const mic = $('[data-mic]', body);
    if (mic) mic.addEventListener('click', () => {
        if (mic.classList.contains('rec')) return;
        TTS.stop(); mic.classList.add('rec');
        const c = Mic.listen({ onText: t => { inp.value = t; }, onEnd: r => {
            mic.classList.remove('rec');
            if (r.error && /not-allowed|audio-capture/.test(r.error)) return toast('Microphone blocked. Allow it in the browser settings.', 'bad');
            if (r.text) { inp.value = r.text; doSend(); }
        } });
        ctx.cleanup(() => c.stop());
    });
    endBtn.addEventListener('click', async () => {
        endBtn.disabled = true;
        $('.chat-input', body).remove(); $('.rescue', body).remove();
        const box = document.createElement('div'); box.className = 'ai-box'; box.innerHTML = `<div class="ai-load">${ic('ph-sparkle')} Talk · Notice · Improve: preparing your feedback…</div>`;
        body.appendChild(box);
        const transcript = hist.map(m => (m.role === 'model' ? 'PARTNER: ' : 'LEARNER: ') + m.text).join('\n');
        try {
            const learnerText = hist.filter(m => m.role === 'user').map(m => m.text).join(' / ');
            const j = await Brain.run('rpSummary', { sc, transcript, learnerText });
            logMistakes(j.mistakes, 'roleplay-summary');
            box.innerHTML = `<div class="ai-head">${ic('ph-sparkle')} Talk · Notice · Improve</div>
                <p class="small">${j.goal_reached ? `${ic('ph-seal-check')} <b>Goal reached.</b>` : `${ic('ph-target')} <b>Goal not reached yet.</b>`} ${esc(sc.goal)}</p>
                ${scoresHTML(j.scores)}
                ${(j.wins || []).map(w => `<p class="good">${ic('ph-thumbs-up')} ${esc(w)}</p>`).join('')}
                ${fixesHTML(j.mistakes)}
                <p class="small mt"><b>3 phrases for your notebook:</b></p>
                ${(j.notes || []).map((x, k) => `<div class="chunk-add"><span><b>${esc(x.en)}</b> · ${esc(x.fr || '')}</span><button class="btn small" data-add="${k}">${ic('ph-plus')} Card</button></div>`).join('')}
                ${j.next ? `<p class="tip">${ic('ph-target')} ${esc(j.next)}</p>` : ''}`;
            (j.notes || []).forEach(x => { if (x && x.en) S.notebook.unshift({ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), en: x.en, note: x.fr || '', date: today(), src: sc.t }); });
            $$('[data-add]', box).forEach(b => b.addEventListener('click', () => { const x = j.notes[+b.dataset.add]; addCustomCard(x.en, x.fr, 'roleplay'); save({ silent: true }); b.disabled = true; b.textContent = 'Added ✓'; }));
        } catch (e) { box.innerHTML = `<p class="warn small">${ic('ph-cloud-warning')} Feedback unavailable: ${esc(e.message)}</p>`; }
        ctx.finish({ title: 'Conversation done' });
    });
};

// ----- Voice benchmark (days 1, 30, 60, 90) -----
RUNNERS.bench = (body, ctx) => {
    const key = ctx.daily ? 'd' + ctx.n : 'free-' + today();
    body.innerHTML = `<p class="eyebrow">Voice benchmark · saved on this device</p><div class="situation">${esc(D.benchmarkPrompt)}</div>
        <p class="muted small">Same question on day 1, 30, 60 and 90. Later you will listen to day 1 and hear the difference.</p>
        <div class="round"><div class="big-timer">1:00</div><div class="live" data-live></div><div class="row center"><button class="btn primary mic" data-go>${ic('ph-record')} Record</button></div></div><div data-res></div>`;
    const go = $('[data-go]', body), timerEl = $('.big-timer', body), live = $('[data-live]', body);
    let rec = null, chunks = [], stream = null, ctrl = null, iv = null, left = 60, text = '', t0 = 0, pauses = 0;
    const stopAll = () => { clearInterval(iv); try { rec && rec.state !== 'inactive' && rec.stop(); } catch (e) {} if (ctrl) ctrl.stop(); if (stream) stream.getTracks().forEach(t => t.stop()); };
    ctx.cleanup(stopAll);
    go.addEventListener('click', async () => {
        if (rec && rec.state === 'recording') { stopAll(); return; }
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
        catch (e) { toast('Microphone blocked. Allow it in the browser settings.', 'bad'); return; }
        chunks = []; t0 = Date.now();
        rec = new MediaRecorder(stream);
        rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
        rec.onstop = async () => {
            const sec = Math.min(60, (Date.now() - t0) / 1000);
            const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
            try { await AudioStore.put(key, blob); } catch (e) {}
            const m = speechMetrics(text, sec, pauses);
            S.bench[key] = Object.assign({ date: today(), day: ctx.daily ? ctx.n : null, sec: Math.round(sec), text: text.slice(0, 2000) }, Mic.ok && !isAndroid ? m : {});
            if (Mic.ok && !isAndroid && m.words >= 15) { S.metrics.speak.push(Object.assign({ d: today(), kind: 'bench' }, m)); S.metrics.speak = S.metrics.speak.slice(-80); }
            const url = URL.createObjectURL(blob);
            $('[data-res]', body).innerHTML = `<audio controls src="${url}"></audio>${Mic.ok && !isAndroid && text ? metricsHTML(m) : ''}`;
            go.remove();
            ctx.finish({ title: 'Voice saved', html: '<p>Compare your recordings in Progress → Voice benchmarks.</p>' });
        };
        rec.start();
        go.classList.add('rec'); go.innerHTML = `${ic('ph-stop')} Stop`;
        left = 60;
        iv = setInterval(() => { left--; timerEl.textContent = fmtTime(Math.max(0, left)); if (left <= 0) stopAll(); }, 1000);
        // On Android the microphone can't be shared: recording only. On PC we also transcribe.
        if (Mic.ok && !isAndroid) ctrl = Mic.listen({ long: true, onText: t => { text = t; live.textContent = t; }, onEnd: r => { text = r.text || text; pauses = r.pauses; } });
        else live.innerHTML = '<span class="muted">Recording… speak naturally.</span>';
    });
};

// ================= PRACTICE =================
function renderPractice() {
    const el = $('#view-practice');
    const n = Math.max(1, dayNum() || 1), ph = phaseOf(n);
    const tiles = [
        ['cards', 'Review due cards', 'Spaced repetition'], ['listen', 'Replay an episode', 'Any episode so far'], ['reflex', 'Reflex drill', '5 new situations'],
        ['write', 'Write & get corrected', "Today's prompt"], ['shadow', 'Shadowing', 'Copy the music'], ['speak432', '4 / 3 / 2', 'Random topic'],
        ['teach', 'Teach it', 'Explain simply'], ['retell', 'Retell', "Today's episode"], ['checkpoint', 'Dictation test', 'Measure your ear'], ['bench', 'Record your voice', '1-minute benchmark'],
        ['fixit', 'Fix my mistakes', 'Your own errors'], ['mission', 'Real-world mission', ph >= 3 ? 'Use English outside' : 'Preview · month 3']
    ];
    const maxEp = S.startDate ? Math.min(30, n) : 1;
    el.innerHTML = `<div class="page-head"><h2>Practice</h2><p class="muted">Extra rounds anytime. They add minutes and improve your level estimate, but your daily tasks are on the Today page.</p></div>
    <div class="tiles">${tiles.map(([type, t, s]) => `<button class="tile" data-type="${type}">${ic(TASKS[type].icon)}<b>${esc(t)}</b><small>${esc(s)}</small></button>`).join('')}</div>
    <section class="card mt"><div class="card-head"><h3>${ic('ph-books')} Episodes</h3><span class="muted small">${maxEp} unlocked</span></div>
        <div class="eps">${D.themes.slice(0, maxEp).map((t, i) => `<button class="ep" data-ep="${i + 1}"><span>${i + 1}</span>${esc(t.s.t)}</button>`).join('')}</div></section>
    <section class="card mt"><div class="card-head"><h3>${ic('ph-globe-hemisphere-west')} Real-world listening</h3><span class="tag">bonus</span></div>
        <p class="muted small">Real English from real people. 10–15 minutes, then write one line about it to log your minutes.</p>
        <div class="links">${D.resources[ph].map(([t, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${ic('ph-arrow-square-out')} ${esc(t)}</a>`).join('')}</div>
        <div class="log-row"><input class="input" data-min type="number" min="5" max="120" placeholder="Minutes"><input class="input" data-sum placeholder="In one sentence (in English): what was it about?"><button class="btn primary" data-log>Log</button></div>
    </section>`;
    $$('[data-type]', el).forEach(b => b.addEventListener('click', () => { const type = b.dataset.type; openTask(Object.assign({ id: 'free-' + type, type }, TASKS[type]), { daily: false }); }));
    $$('[data-ep]', el).forEach(b => b.addEventListener('click', () => openTask(Object.assign({ id: 'free-listen', type: 'listen' }, TASKS.listen, { title: 'Episode ' + b.dataset.ep }), { daily: false, episodeDay: +b.dataset.ep })));
    $('[data-log]', el).addEventListener('click', () => {
        const m = parseInt($('[data-min]', el).value, 10), s = $('[data-sum]', el).value.trim();
        if (!(m >= 5) || countWords(s) < 5) return toast('Minutes (5+) and one sentence of at least 5 words, in English.', 'bad');
        addMinutes(Math.min(m, 120), false); S.xp += Math.min(40, m * 2);
        S.notebook.unshift({ id: 'n' + Date.now().toString(36), en: s, note: `Listening log · ${m} min`, date: today(), src: 'listening' });
        save(); toast(`${ic('ph-check')} ${m} minutes logged`, 'good');
    });
}

// ================= CARDS & NOTEBOOK =================
function renderCards() {
    const el = $('#view-cards'), cs = cardStats();
    const top = topMistakeTypes();
    el.innerHTML = `<div class="page-head"><h2>Cards & notebook</h2><p class="muted">Talk · Notice · Improve. Every gap you notice becomes a card you will never forget.</p></div>
    <div class="stats-row">
        <div class="stat card"><b>${cs.due}</b><span>due now</span></div>
        <div class="stat card"><b>${cs.total}</b><span>phrases started</span></div>
        <div class="stat card"><b>${cs.mature}</b><span>known long-term</span></div>
    </div>
    <div class="row"><button class="btn primary" data-review ${cs.due ? '' : 'disabled'}>${ic('ph-cards')} Review ${cs.due} due card${cs.due === 1 ? '' : 's'}</button></div>
    <div class="grid-2 mt">
        <section class="card"><div class="card-head"><h3>${ic('ph-notebook')} Notebook</h3><span class="muted small">${S.notebook.length}</span></div>
            <div class="add-note"><input class="input" data-en placeholder="English phrase you needed"><input class="input" data-fr placeholder="Meaning / note (French ok)"><button class="btn primary" data-addn>${ic('ph-plus')}</button></div>
            <div class="notes">${S.notebook.slice(0, 60).map(x => `<div class="note-row" data-id="${esc(x.id)}"><div><b>${esc(x.en)}</b><small>${esc(x.note || '')}${x.src ? ' · ' + esc(x.src) : ''}</small></div>
                <button class="icon-btn" data-say title="Listen">${ic('ph-speaker-high')}</button>${x.card ? `<span class="tag ok">card</span>` : `<button class="btn small" data-card>${ic('ph-plus')} Card</button>`}<button class="icon-btn" data-del title="Delete">${ic('ph-trash')}</button></div>`).join('') || '<p class="muted small">Empty. After each conversation, write here the phrases you were missing.</p>'}</div>
        </section>
        <section class="card"><div class="card-head"><h3>${ic('ph-target')} Mistake focus</h3></div>
            ${top.length ? `<p class="small">Most frequent in the last 14 days: ${top.slice(0, 3).map(([t, c]) => `<span class="tag">${esc(t)} ×${c}</span>`).join(' ')}</p><p class="muted small">Work on one at a time: notice it every time you speak this week.</p>` : '<p class="muted small">Your coach logs your mistakes here (needs a Gemini key).</p>'}
            <div class="notes">${S.mistakes.slice(-12).reverse().map(m => `<div class="fix"><s>${esc(m.wrong)}</s> → <b>${esc(m.right)}</b><small>${esc(m.why || m.type)}</small></div>`).join('')}</div>
        </section>
    </div>`;
    $('[data-review]', el).addEventListener('click', () => openTask(Object.assign({ id: 'free-cards', type: 'cards' }, TASKS.cards), { daily: false }));
    $('[data-addn]', el).addEventListener('click', () => {
        const en = $('[data-en]', el).value.trim(), fr = $('[data-fr]', el).value.trim();
        if (!en) return;
        S.notebook.unshift({ id: 'n' + Date.now().toString(36), en, note: fr, date: today(), src: 'me' });
        save();
    });
    $$('.note-row', el).forEach(row => {
        const x = S.notebook.find(e => e.id === row.dataset.id); if (!x) return;
        $('[data-say]', row).addEventListener('click', () => TTS.speak(x.en, { whole: true }));
        const c = $('[data-card]', row); if (c) c.addEventListener('click', () => { addCustomCard(x.en, x.note, 'notebook'); x.card = true; save(); toast('Added to your cards', 'good'); });
        $('[data-del]', row).addEventListener('click', () => { S.notebook = S.notebook.filter(e => e !== x); save(); });
    });
}

// ================= PROGRESS =================
function spark(values, max, min = 0) {
    if (values.length < 2) return '<p class="muted small">Not enough data yet.</p>';
    const w = 300, h = 70, step = w / (values.length - 1);
    const y = v => h - 6 - ((v - min) / Math.max(1e-6, max - min)) * (h - 12);
    const pts = values.map((v, i) => `${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" class="spark" preserveAspectRatio="none"><polyline points="${pts}"/>${values.map((v, i) => `<circle cx="${(i * step).toFixed(1)}" cy="${y(v).toFixed(1)}" r="3"/>`).join('')}</svg>`;
}
function renderProgress() {
    const el = $('#view-progress'), c = cefr(), cs = cardStats(), n = dayNum();
    const pos = v => Math.max(0, Math.min(100, (v - 1) / 4 * 100));
    const sp = S.metrics.speak.filter(m => m.words >= 15).slice(-20);
    const ls = S.metrics.listen.slice(-20);
    let cells = '';
    if (S.startDate) for (let i = 1; i <= PROGRAM_DAYS; i++) {
        const d = addDays(S.startDate, i - 1);
        let cls = 'fut';
        if (d < today()) cls = isComplete(d) ? 'ok' : 'miss';
        else if (d === today()) cls = isComplete(d) ? 'ok now' : 'now';
        cells += `<span class="hm ${cls}" title="Day ${i} · ${d}">${i}</span>`;
    }
    const benches = Object.entries(S.bench).sort((a, b) => a[1].date.localeCompare(b[1].date));
    el.innerHTML = `<div class="page-head"><h2>Progress</h2><p class="muted">Measured from what you really do. No magic numbers.</p></div>
    <section class="card glow">
        <div class="lvl-top"><div><span class="eyebrow">Estimated level</span><div class="lvl-big">${c.label}<small>${c.value.toFixed(2)}</small></div><p class="muted small">${c.pct}% of the way to ${c.next} · started at ${cefrLabel(c.prior)} (${c.prior.toFixed(1)})</p></div>
        <div class="lvl-side"><b>${c.hours.toFixed(1)} h</b><span>of practice</span></div></div>
        <div class="scale"><div class="scale-bar">${['A1', 'A2', 'B1', 'B2', 'C1'].map(l => `<span>${l}</span>`).join('')}</div><div class="marker start" style="left:${pos(c.prior)}%"></div><div class="marker" style="left:${pos(c.value)}%"></div></div>
        <div class="parts">${c.parts.map(([name, v, w]) => `<div class="part"><span>${name}</span><div class="bar"><div style="width:${v == null ? 0 : pos(v)}%"></div></div><b>${v == null ? '—' : cefrLabel(v) + ' ' + v.toFixed(1)}</b></div>`).join('')}</div>
        <p class="muted small">Honest rule: research says about 200 guided hours per level, so the estimate can't jump faster than your practice hours allow. It's an estimate, not an official exam.</p>
    </section>
    <div class="stats-row mt">
        <div class="stat card"><b>${streak()}</b><span>day streak</span></div><div class="stat card"><b>${bestStreak()}</b><span>best streak</span></div>
        <div class="stat card"><b>${missedDays()}</b><span>missed days</span></div><div class="stat card"><b>${cs.mature}</b><span>phrases known</span></div><div class="stat card"><b>${S.xp}</b><span>XP</span></div>
    </div>
    ${S.startDate ? `<section class="card mt"><div class="card-head"><h3>${ic('ph-calendar')} 90 days</h3><span class="muted small">Day ${Math.min(n, 90)} · ${Object.keys(S.days).filter(isComplete).length} complete</span></div><div class="heat">${cells}</div>
        <div class="legend"><span><i class="hm ok"></i> complete</span><span><i class="hm miss"></i> missed</span><span><i class="hm now"></i> today</span></div></section>` : ''}
    <div class="grid-2 mt">
        <section class="card"><div class="card-head"><h3>${ic('ph-microphone')} Speaking speed</h3><span class="muted small">words/min, first rounds</span></div>${spark(sp.map(m => m.wpm), Math.max(140, ...sp.map(m => m.wpm)))}
            <p class="muted small">Last: <b>${sp.length ? sp[sp.length - 1].wpm : '—'}</b> words/min · ${sp.length ? sp[sp.length - 1].pauses : '—'} long pauses. B1 speakers often reach 90–110.</p></section>
        <section class="card"><div class="card-head"><h3>${ic('ph-headphones')} Listening</h3><span class="muted small">first-try answers</span></div>${spark(ls.map(m => m.acc * 100), 100)}
            <p class="muted small">Last 10 episodes: <b>${ls.length ? Math.round(avg(ls.slice(-10).map(m => m.acc)) * 100) : '—'}%</b> right at first try.</p></section>
    </div>
    <section class="card mt"><details class="brain"><summary>${ic('ph-brain')} What your coach knows about you</summary>
        <p class="muted small">Every AI answer is built from this file, made from your real data. The AI must follow strict rules, answer in a fixed format, and pass a quality check (exact quotes, right length, right level). If it fails, it is sent back to fix its answer.</p>
        <div class="dossier">${esc(dossier())}</div>
        ${Brain.log.length ? `<div class="qlog">${Brain.log.slice(0, 8).map(l => `<span>${esc(l.at)} · ${esc(l.task)} · ${l.issues ? `${l.issues} problem${l.issues > 1 ? 's' : ''} left` : 'passed the check'}${l.repaired ? ' (after repair)' : ''}</span>`).join('')}</div>` : ''}
    </details></section>
    <section class="card mt"><div class="card-head"><h3>${ic('ph-record')} Voice benchmarks</h3><span class="muted small">day 1 · 30 · 60 · 90</span></div>
        ${benches.length ? `<div class="benches">${benches.map(([k, b]) => `<div class="bench"><div><b>${b.day ? 'Day ' + b.day : 'Free'}</b><small>${esc(b.date)}${b.wpm ? ` · ${b.wpm} words/min` : ''}</small></div><button class="btn small" data-play="${esc(k)}">${ic('ph-play')} Play</button></div>`).join('')}</div>` : '<p class="muted small">Your first recording happens on day 1, in the evening session.</p>'}
        <audio data-player controls hidden></audio>
    </section>`;
    $$('[data-play]', el).forEach(b => b.addEventListener('click', async () => {
        const blob = await AudioStore.get(b.dataset.play), a = $('[data-player]', el);
        if (!blob) return toast('This recording is on your other device.', 'bad');
        a.src = URL.createObjectURL(blob); a.hidden = false; a.play();
    }));
}

// ================= COACH =================
function keyNeededHTML() {
    return `<section class="card key-card">${ic('ph-sparkle')}<h3>Connect your AI partner (free)</h3>
        <ol class="small"><li>Open <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">Google AI Studio → API keys</a> and sign in with Google.</li><li>Click <b>Create API key</b> and copy it.</li><li>Paste it here. If you are signed in, it is saved in your private account so your phone and PC both get it.</li></ol>
        <div class="log-row"><input class="input" data-key type="password" placeholder="Paste your Gemini API key" autocomplete="off"><button class="btn primary" data-savekey>Connect</button></div><p class="small" data-keymsg></p></section>`;
}
function bindKeyForm(el, onOk) {
    const b = $('[data-savekey]', el); if (!b) return;
    b.addEventListener('click', async () => {
        const k = $('[data-key]', el).value.trim(), msg = $('[data-keymsg]', el);
        if (k.length < 20) { msg.textContent = 'This does not look like a key.'; return; }
        b.disabled = true; msg.textContent = 'Checking your key…';
        AI.setKey(k);
        try { const m = await AI.discover(); const synced = await Sync.saveKey(k); msg.innerHTML = `${ic('ph-check-circle')} Connected (${esc(m)}).${synced ? ' Saved in your account for your other devices.' : ''}`; toast('AI partner connected', 'good'); setTimeout(() => { onOk ? onOk() : renderView(); }, 600); }
        catch (e) { AI.setKey(''); msg.textContent = e.message; b.disabled = false; }
    });
}
function renderCoach() {
    const el = $('#view-coach');
    if (!AI.hasKey()) { el.innerHTML = `<div class="page-head"><h2>AI partner</h2><p class="muted">Your conversation partner, 24/7, never judges you.</p></div>${keyNeededHTML()}`; bindKeyForm(el); return; }
    const n = Math.max(1, dayNum() || 1), ph = phaseOf(n);
    el.innerHTML = `<div class="page-head"><h2>AI partner</h2><p class="muted">Pick a situation. Talk by voice or text. Your partner corrects one thing at a time.</p></div>
    <div class="tiles">${D.roleplays.map(r => `<button class="tile ${r.p > ph ? 'later' : ''}" data-rp="${r.id}">${ic('ph-chats-circle')}<b>${esc(r.t)}</b><small>${esc(r.goal)}</small>${r.p > ph ? `<span class="tag">phase ${r.p}</span>` : ''}</button>`).join('')}</div>`;
    $$('[data-rp]', el).forEach(b => b.addEventListener('click', () => {
        const sc = D.roleplays.find(r => r.id === b.dataset.rp);
        openTask(Object.assign({ id: 'free-roleplay', type: 'roleplay' }, TASKS.roleplay, { title: sc.t }), { daily: false, scenario: sc });
    }));
}

// ================= SETTINGS =================
async function openSettings() {
    const sheet = $('#sheet'), body = $('#sheetBody');
    const sub = await Push.current().catch(() => null);
    const u = Sync.user;
    body.innerHTML = `<div class="sheet-head"><h2>Settings</h2><button class="icon-btn" data-x>${ic('ph-x')}</button></div>
    <section class="set"><h3>${ic('ph-user-circle')} Account & sync</h3>
        ${u ? `<div class="me">${u.photoURL ? `<img src="${esc(u.photoURL)}" alt="" referrerpolicy="no-referrer">` : ''}<div><b>${esc(u.displayName || 'Signed in')}</b><small>${esc(u.email || '')}</small></div><button class="btn small" data-out>Sign out</button></div>
             <p class="small">Status: <b>${esc(Sync.status)}</b></p>
             ${Sync.status === 'denied' ? `<p class="warn small">${ic('ph-warning')} The database refuses to save. The Firebase rules need the new "fluent90" section (see the message from Claude). Your progress is still saved on this device.</p>` : ''}`
           : `<p class="muted small">Sign in to use the same progress on your phone and your PC, and to receive reminders.</p><button class="btn primary" data-in>${ic('ph-google-logo')} Sign in with Google</button>`}
    </section>
    <section class="set"><h3>${ic('ph-bell-ringing')} Reminders · 07:00 · 13:00 · 20:00</h3>
        <p class="muted small">Morning, midday and evening, on this device, even when the app is closed. Only if your session is not done yet.</p>
        ${sub ? `<p class="small ok">${ic('ph-check-circle')} On for this device.</p><button class="btn small" data-poff>Turn off on this device</button>` : `<button class="btn primary" data-pon>${ic('ph-bell')} Turn on for this device</button>`}
        <p class="muted small">iPhone: add the app to your home screen first.</p>
    </section>
    <section class="set"><h3>${ic('ph-sparkle')} AI partner (Gemini)</h3>
        ${AI.hasKey() ? `<p class="small ok">${ic('ph-check-circle')} Connected${AI.models()[0] ? ` · ${esc(AI.models()[0])}` : ''}.</p><p class="muted small">${u ? 'Saved in your private account: your other devices get it automatically when you sign in.' : 'Saved on this device. Sign in with Google to get it on your other devices automatically.'}</p><button class="btn small" data-rmkey>Remove key</button>` : keyNeededHTML()}
    </section>
    <section class="set"><h3>${ic('ph-speaker-high')} Voice</h3>
        <div class="seg" data-seg="accent">${[['mix', 'Mix US + UK'], ['us', 'US'], ['uk', 'UK']].map(([v, l]) => `<button data-v="${v}" class="${S.settings.accent === v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <div class="seg mt" data-seg="rate">${[[0.85, 'Slower'], [1, 'Normal'], [1.1, 'Faster']].map(([v, l]) => `<button data-v="${v}" class="${S.settings.rate == v ? 'on' : ''}">${l}</button>`).join('')}</div>
        <p class="small mt"><b>Choose your voice</b> <span class="muted">(on this device)</span></p>
        <select class="input" data-voice><option value="">Automatic (best voice, accent above)</option>${TTS.english().map(v => `<option value="${esc(v.voiceURI)}" ${TTS.chosen() === v ? 'selected' : ''}>${esc(v.name)} · ${esc(v.lang)}${/google|natural|neural|online/i.test(v.name) ? ' ★' : ''}</option>`).join('')}</select>
        <button class="btn small mt" data-test>${ic('ph-play')} Test the voice</button>
        <p class="muted small">Best voices: Chrome on Android (Google) or Edge on PC (Natural voices).</p>
    </section>
    ${Install.standalone() ? '' : `<section class="set"><h3>${ic('ph-download-simple')} Install the app</h3><p class="muted small">Put Fluent 90 on your home screen: full screen, faster, and needed for reminders on iPhone.</p><button class="btn primary" data-install>${ic('ph-download-simple')} Install Fluent 90</button></section>`}
    <section class="set"><h3>${ic('ph-flag')} Program</h3>
        <p class="small">${S.startDate ? `Started on ${esc(niceDate(S.startDate))} · day ${dayNum()}` : 'Not started yet.'}</p>
        <button class="btn small danger" data-reset>Reset everything</button>
    </section>`;
    sheet.hidden = false;
    const close = () => { sheet.hidden = true; renderView(); };
    $('[data-x]', body).addEventListener('click', close);
    const on = (sel, fn) => { const b = $(sel, body); if (b) b.addEventListener('click', fn); };
    on('[data-in]', () => Sync.signIn().then(() => openSettings()).catch(e => toast('Sign-in failed: ' + (e.code || e.message), 'bad')));
    on('[data-out]', () => { if (confirm('Sign out on this device? Your progress stays saved in the cloud.')) Sync.signOut().then(() => openSettings()); });
    on('[data-pon]', () => Push.enable().then(() => { toast('Reminders on', 'good'); openSettings(); }).catch(e => toast(esc(e.message), 'bad')));
    on('[data-poff]', () => Push.disable().then(() => { toast('Reminders off'); openSettings(); }));
    on('[data-rmkey]', async () => {
        if (!confirm(Sync.ref ? 'Remove the Gemini key from all your devices?' : 'Remove the Gemini key from this device?')) return;
        AI.setKey(''); await Sync.saveKey(null); openSettings();
    });
    on('[data-install]', () => { Install.run(); });
    const vs = $('[data-voice]', body); if (vs) vs.addEventListener('change', () => { TTS.choose(vs.value); TTS.speak("Hi! This is my voice. Do you like it?", { whole: true }); });
    on('[data-test]', () => TTS.speak("Hi! I'm your English partner. Let's practise together today.", { whole: true }));
    on('[data-reset]', () => {
        const t = prompt('This deletes your whole progress on all devices. Type RESET to confirm.');
        if (t !== 'RESET') return;
        const settings = S.settings; S = freshState(); S.settings = settings; save(); close(); show('today');
    });
    bindKeyForm(body, () => openSettings());
    $$('[data-seg]', body).forEach(seg => $$('button', seg).forEach(b => b.addEventListener('click', () => {
        const k = seg.dataset.seg; S.settings[k] = k === 'rate' ? parseFloat(b.dataset.v) : b.dataset.v; save({ silent: true });
        $$('button', seg).forEach(x => x.classList.toggle('on', x === b));
    })));
}
document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'settings') openSettings();
    if (a.dataset.act === 'install') Install.run();
    if (a.dataset.act === 'signin') Sync.signIn().catch(err => toast('Sign-in failed: ' + (err.code || err.message), 'bad'));
});

// ================= BOOT =================
function boot() {
    $('#settingsBtn').addEventListener('click', openSettings);
    $('#installBtn').addEventListener('click', () => Install.run());
    $('#syncBtn').addEventListener('click', openSettings);
    $('#streakChip').addEventListener('click', () => show('progress'));
    $('#levelChip').addEventListener('click', () => show('progress'));
    $('#playerClose').addEventListener('click', () => Player.close());
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') { $('#sheet').hidden = true; renderView(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#player').hidden) Player.close(); });
    onChange(() => { if (!Player.ctx) renderView(); else renderTop(); });
    Sync.init();
    show((location.hash || '#today').slice(1));
    // New day while the app stays open: refresh at midnight
    let lastDay = today();
    setInterval(() => { if (today() !== lastDay) { lastDay = today(); if (!Player.ctx) renderView(); } }, 30000);
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('/fluent/sw.js', { scope: '/fluent/' }).catch(() => {});
    // Prepare the AI episode in the background (days 31–90)
    const n = dayNum(); if (n >= 31 && AI.hasKey()) ensureAIDay(n).then(() => { if (!Player.ctx) renderView(); }).catch(() => {});
    // New week: the coach studies your data and sets the focus (from day 3, when there is data)
    if (n >= 3 && AI.hasKey() && S.coach.week !== weekKey()) setTimeout(() => ensureWeekly().then(() => { if (!Player.ctx) renderView(); }).catch(() => {}), 4000);
}
boot();
