// FLUENT 90 — engine: state, daily plan, strict streak, spaced repetition, CEFR estimate,
// voice (text-to-speech + speech recognition), Gemini coach and Firebase sync.
const D = window.F90;
const LS_STATE = 'f90-state-v1', LS_KEY = 'f90-gemini-key', LS_MODELS = 'f90-gemini-models';
const PROGRAM_DAYS = 90;

// ---------- dates (local calendar days) ----------
const pad2 = n => String(n).padStart(2, '0');
function ymd(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`; }
function parseYmd(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function addDays(s, n) { const d = parseYmd(s); d.setDate(d.getDate() + n); return ymd(d); }
function diffDays(a, b) { return Math.round((parseYmd(b) - parseYmd(a)) / 86400000); }
function today() { return ymd(); }
function niceDate(s) { return parseYmd(s).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }); }

// ---------- seeded random (same day = same exercises on phone and PC) ----------
function rng(seed) { let a = Math.imul(seed | 0, 2654435761) ^ 0x9E3779B9; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function pickN(arr, n, seed) { const r = rng(seed), a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, n); }
function shuffled(arr, seed) { return pickN(arr, arr.length, seed); }

// ---------- state ----------
function freshState() {
    return { v: 1, updatedAt: 0, startDate: null, startLevel: null, placement: null, xp: 0,
        days: {}, cards: {}, custom: {}, notebook: [], mistakes: [],
        metrics: { listen: [], speak: [], reflex: [], dict: [] },
        bench: {}, aiDays: {}, coach: {}, missions: {}, freeMin: 0, settings: { accent: 'mix', rate: 1 } };
}
let S = loadState();
function loadState() {
    const base = freshState();
    try {
        const raw = localStorage.getItem(LS_STATE);
        if (raw) return normalizeState(JSON.parse(raw));
    } catch (e) { console.warn('state', e); }
    return base;
}
function normalizeState(o) {
    const base = freshState(), s = Object.assign(base, o || {});
    s.metrics = Object.assign(freshState().metrics, s.metrics || {});
    s.settings = Object.assign(freshState().settings, s.settings || {});
    for (const k of ['days', 'cards', 'custom', 'bench', 'aiDays', 'coach', 'missions']) if (!s[k] || typeof s[k] !== 'object') s[k] = {};
    for (const k of ['notebook', 'mistakes']) if (!Array.isArray(s[k])) s[k] = [];
    return s;
}
const listeners = new Set();
function onChange(fn) { listeners.add(fn); }
function emit() { listeners.forEach(fn => { try { fn(); } catch (e) { console.error(e); } }); }
function save(opts = {}) {
    S.updatedAt = Date.now();
    try { localStorage.setItem(LS_STATE, JSON.stringify(S)); } catch (e) { console.warn('save', e); }
    if (!opts.silent) emit();
    Sync.schedule();
}
function dayRec(date = today()) { if (!S.days[date]) S.days[date] = { tasks: {}, minutes: 0, xp: 0 }; return S.days[date]; }

// ---------- program ----------
function dayNum(date = today()) { return S.startDate ? diffDays(S.startDate, date) + 1 : 0; }
function phaseOf(n) { return n <= 30 ? 1 : n <= 60 ? 2 : 3; }
function themeIndex(n) { return (Math.max(1, n) - 1) % 30; }
function themeOf(n) { return D.themes[themeIndex(n)]; }
const PHASES = {
    1: { name: 'Unlock', sub: 'Days 1–30 · Listen a lot, copy the sounds, learn ready-made phrases, start speaking from day one.' },
    2: { name: 'Activate', sub: 'Days 31–60 · No translation. Retell, react fast, real conversations with your AI partner.' },
    3: { name: 'Fluency sprint', sub: 'Days 61–90 · No subtitles. Longer talks, faster answers, real-world missions.' }
};
const TASKS = {
    cards: { title: 'Phrase cards', icon: 'ph-cards', mins: 6, xp: 30 },
    listen: { title: "Today's episode", icon: 'ph-headphones', mins: 6, xp: 30 },
    reflex: { title: 'Reflex: answer fast', icon: 'ph-lightning', mins: 5, xp: 30 },
    write: { title: 'Write it', icon: 'ph-pencil-simple-line', mins: 6, xp: 30 },
    checkpoint: { title: 'Weekly checkpoint', icon: 'ph-flag-checkered', mins: 7, xp: 60 },
    shadow: { title: 'Shadowing', icon: 'ph-waveform', mins: 8, xp: 40 },
    speak432: { title: '4 / 3 / 2 speaking', icon: 'ph-timer', mins: 10, xp: 50 },
    roleplay: { title: 'Role-play with your AI partner', icon: 'ph-chats-circle', mins: 10, xp: 50 },
    teach: { title: 'Teach it', icon: 'ph-chalkboard-teacher', mins: 6, xp: 40 },
    retell: { title: 'Close everything & retell', icon: 'ph-arrows-clockwise', mins: 6, xp: 40 },
    bench: { title: 'Voice benchmark (1 min)', icon: 'ph-record', mins: 2, xp: 60 },
    fixit: { title: 'Fix my mistakes', icon: 'ph-wrench', mins: 5, xp: 35 },
    mission: { title: 'Real-world mission', icon: 'ph-rocket-launch', mins: 10, xp: 70 }
};
// Mistakes logged before a given day (so the plan of a day never changes during that day)
function mistakesBefore(date) { return S.mistakes.filter(m => m.date < date).length; }
function plan(n) {
    const ph = phaseOf(n);
    const mains = ['speak432', 'roleplay', 'teach', 'retell'];
    let main = mains[n % 4];
    if (main === 'roleplay' && !AI.hasKey()) main = 'speak432';
    const mk = (id, type) => Object.assign({ id, type }, TASKS[type]);
    const drops = [
        { id: 'morning', title: 'Morning', time: '07:00', mode: 'Silent · headphones', icon: 'ph-sun-horizon', tasks: [mk('m1', 'cards'), mk('m2', 'listen')] },
        // Adaptive: from day 31, every 3rd day the reflex drill becomes a drill on YOUR logged mistakes;
        // in month 3, every other day the writing task becomes a real-world mission.
        { id: 'midday', title: 'Midday', time: '13:00', mode: 'Silent · type', icon: 'ph-sun', tasks: [
            mk('d1', n % 7 === 0 ? 'checkpoint' : (ph >= 2 && n % 3 === 0 && S.startDate && mistakesBefore(addDays(S.startDate, n - 1)) >= 5) ? 'fixit' : 'reflex'),
            mk('d2', ph === 3 && n % 2 === 0 ? 'mission' : 'write')] },
        { id: 'evening', title: 'Evening', time: '20:00', mode: 'At home · voice', icon: 'ph-moon-stars', tasks: [mk('e1', 'shadow'), mk('e2', main)] }
    ];
    if ([1, 30, 60, 90].includes(n)) drops[2].tasks.push(mk('e3', 'bench'));
    const tasks = drops.flatMap(d => d.tasks);
    return { n, phase: ph, theme: themeOf(n), drops, tasks };
}
function taskDone(date, id) { return !!((S.days[date] || {}).tasks || {})[id]; }
function isComplete(date) {
    const n = dayNum(date);
    if (n < 1) return false;
    return plan(n).tasks.every(t => taskDone(date, t.id));
}
function dropDone(date, drop) { return drop.tasks.every(t => taskDone(date, t.id)); }
// Ultra strict: one missed day and the streak is back to zero.
function streak() {
    if (!S.startDate) return 0;
    let d = today(), c = 0;
    if (!isComplete(d)) d = addDays(d, -1);
    while (d >= S.startDate && isComplete(d)) { c++; d = addDays(d, -1); }
    return c;
}
function bestStreak() {
    if (!S.startDate) return 0;
    let best = 0, run = 0;
    for (let d = S.startDate; d <= today(); d = addDays(d, 1)) { if (isComplete(d)) { run++; best = Math.max(best, run); } else if (d !== today()) run = 0; }
    return best;
}
function missedDays() {
    if (!S.startDate) return 0;
    let m = 0;
    for (let d = S.startDate; d < today(); d = addDays(d, 1)) if (!isComplete(d)) m++;
    return m;
}
function totalMinutes() { return Object.values(S.days).reduce((a, d) => a + (d.minutes || 0), 0) + (S.freeMin || 0); }
function completeTask(id, xp) {
    const rec = dayRec();
    if (rec.tasks[id]) return false;
    rec.tasks[id] = true;
    rec.xp = (rec.xp || 0) + xp; S.xp += xp;
    const done = isComplete(today());
    if (done && !rec.bonus) { rec.bonus = true; S.xp += 50; }
    save();
    return done;
}
function addMinutes(min, daily) {
    if (!(min > 0)) return;
    if (daily) dayRec().minutes = Math.round(((dayRec().minutes || 0) + min) * 10) / 10;
    else S.freeMin = Math.round(((S.freeMin || 0) + min) * 10) / 10;
}

// ---------- phrase cards (spaced repetition) ----------
function cardContent(id) {
    if (id[0] === 't') { const [ti, ci] = id.slice(1).split('-').map(Number); const c = D.themes[ti] && D.themes[ti].c[ci]; return c ? { en: c[0], fr: c[1] } : null; }
    if (id[0] === 'a') { const [n, i] = id.slice(1).split('-').map(Number); const c = S.aiDays[n] && S.aiDays[n].chunks && S.aiDays[n].chunks[i]; return c ? { en: c.en, fr: c.fr } : null; }
    if (id[0] === 'c') { const c = S.custom[id]; return c ? { en: c.en, fr: c.fr || c.note || '' } : null; }
    return null;
}
function newCardIdsFor(n) {
    if (n < 1) return [];
    if (phaseOf(n) === 1) { const ti = themeIndex(n); return D.themes[ti].c.map((_, i) => `t${ti}-${i}`); }
    const ai = S.aiDays[n];
    if (ai && Array.isArray(ai.chunks)) return ai.chunks.map((_, i) => `a${n}-${i}`);
    return [];
}
function cardQueue(n) {
    const t = today();
    const fresh = newCardIdsFor(n).filter(id => !S.cards[id] && cardContent(id));
    const due = Object.keys(S.cards).filter(id => S.cards[id].due <= t && cardContent(id)).sort((a, b) => S.cards[a].due.localeCompare(S.cards[b].due)).slice(0, 80);
    return { fresh, due };
}
function introduceCard(id) { if (!S.cards[id]) S.cards[id] = { due: today(), ivl: 0, ease: 2.5, reps: 0, lapses: 0, added: today() }; }
// g: 0 again · 1 hard · 2 good · 3 easy. Returns true when the card must come back in this session.
function gradeCard(id, g) {
    const c = S.cards[id] || { ivl: 0, ease: 2.5, reps: 0, lapses: 0, added: today() };
    if (g === 0) { c.lapses++; c.reps = 0; c.ivl = 0; c.ease = Math.max(1.3, c.ease - 0.2); c.due = today(); S.cards[id] = c; return true; }
    if (c.reps === 0) c.ivl = g === 3 ? 3 : 1;
    else if (c.reps === 1) c.ivl = g === 1 ? 2 : g === 2 ? 3 : 6;
    else c.ivl = Math.max(c.ivl + 1, Math.round(c.ivl * (g === 1 ? 1.2 : g === 2 ? c.ease : c.ease * 1.35)));
    c.ease = Math.min(3, Math.max(1.3, c.ease + (g === 1 ? -0.15 : g === 3 ? 0.1 : 0)));
    c.reps++; c.due = addDays(today(), c.ivl); S.cards[id] = c;
    return false;
}
function cardStats() {
    const ids = Object.keys(S.cards), t = today();
    return { total: ids.length, mature: ids.filter(id => S.cards[id].ivl >= 7).length, due: ids.filter(id => S.cards[id].due <= t).length };
}
function addCustomCard(en, fr, src) {
    const id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    S.custom[id] = { en, fr: fr || '', src: src || '' };
    introduceCard(id);
    return id;
}

// ---------- listening content ----------
function storyFor(n) {
    const ph = phaseOf(n), th = themeOf(n), ai = S.aiDays[n];
    if (ph >= 2 && ai && ai.story && ai.story.x) return { t: ai.story.t, x: ai.story.x, q: ai.story.q, lvl: ph === 2 ? 3.0 : 3.4, ai: true };
    return { t: th.s.t, x: th.s.x, q: th.s.q, lvl: 2.4, ep: themeIndex(n) + 1 };
}
function sentences(text) { return (text.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) || []).map(s => s.trim()).filter(s => s.length > 1); }

// ---------- CEFR estimate ----------
const CEFR = ['', 'A1', 'A2', 'B1', 'B2', 'C1'];
function cefrLabel(v) { const i = Math.max(1, Math.min(5, Math.floor(v))); return CEFR[i]; }
function interp(x, pts) { if (x <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) { const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; return y0 + (y1 - y0) * (x - x0) / (x1 - x0); } return pts[pts.length - 1][1]; }
function speakLevel(m) {
    const base = interp(m.wpm, [[0, 1], [40, 1.6], [60, 2], [80, 2.5], [100, 3], [120, 3.5], [140, 4], [170, 4.3]]);
    const per100 = m.words ? (m.fillers || 0) * 100 / m.words : 0;
    const pausePen = Math.min(0.4, (m.pauses || 0) * 0.04);
    return base - Math.min(0.4, Math.max(0, (per100 - 4) * 0.05)) - pausePen;
}
const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
function cefr() {
    const prior = S.startLevel || 2;
    const L = avg(S.metrics.listen.slice(-10).map(m => m.lvl - 0.7 + m.acc * 0.9));
    const Dd = avg(S.metrics.dict.slice(-3).map(m => m.lvl - 0.8 + m.acc * 1.0));
    const Sp = avg(S.metrics.speak.filter(m => m.dur >= 30 && m.words >= 15).slice(-8).map(speakLevel));
    const V = prior + Math.min(1.2, cardStats().mature / 350);
    const parts = [['Speaking', Sp, 0.4], ['Listening', L, 0.3], ['Dictation', Dd, 0.15], ['Vocabulary', V, 0.15]];
    const have = parts.filter(p => p[1] != null);
    const wsum = have.reduce((a, p) => a + p[2], 0);
    const data = have.reduce((a, p) => a + p[1] * p[2], 0) / wsum;
    const points = S.metrics.listen.length + S.metrics.speak.length + S.metrics.dict.length * 2;
    const w = Math.min(1, points / 12);
    let v = prior * (1 - w) + data * w;
    const hours = totalMinutes() / 60;
    v = Math.min(v, prior + hours / 120 + 0.25);   // honest cap: about 120 hours of practice per level
    v = Math.max(1, Math.min(5, v));
    return { value: v, label: cefrLabel(v), next: CEFR[Math.min(5, Math.floor(v) + 1)], pct: Math.round((v - Math.floor(v)) * 100), parts, hours, prior };
}

// ---------- text helpers ----------
const NUM = { zero: '0', one: '1', two: '2', three: '3', four: '4', five: '5', six: '6', seven: '7', eight: '8', nine: '9', ten: '10', eleven: '11', twelve: '12', thirteen: '13', fourteen: '14', fifteen: '15', sixteen: '16', seventeen: '17', eighteen: '18', nineteen: '19', twenty: '20', thirty: '30', forty: '40', fifty: '50' };
const CONTR = { "i'm": 'i am', "it's": 'it is', "don't": 'do not', "can't": 'cannot', "won't": 'will not', "i'll": 'i will', "you're": 'you are', "let's": 'let us', "that's": 'that is', "what's": 'what is', "i'd": 'i would', "we're": 'we are', "isn't": 'is not', "didn't": 'did not', "doesn't": 'does not', "i've": 'i have', "we'll": 'we will', "you'll": 'you will', "he's": 'he is', "she's": 'she is', "there's": 'there is', "couldn't": 'could not', "wasn't": 'was not', "aren't": 'are not', "we've": 'we have', "they're": 'they are', "here's": 'here is', "where's": 'where is', "who's": 'who is', "how's": 'how is', "wouldn't": 'would not', "haven't": 'have not', "it'll": 'it will' };
function words(s) {
    const out = [];
    String(s).toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9' ]+/g, ' ').split(/\s+/).filter(Boolean).forEach(w => {
        w = w.replace(/^'+|'+$/g, '');
        if (!w) return;
        const c = CONTR[w]; if (c) { out.push(...c.split(' ')); return; }
        out.push(NUM[w] || w);
    });
    return out;
}
// Word match between a target sentence and what the recognizer heard (longest common subsequence)
function matchScore(target, said) {
    const a = words(target), b = words(said);
    const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const hit = new Array(a.length).fill(false);
    let i = 0, j = 0;
    while (i < a.length && j < b.length) { if (a[i] === b[j]) { hit[i] = true; i++; j++; } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++; }
    return { pct: a.length ? Math.round(dp[0][0] * 100 / a.length) : 0, words: a, hit };
}
function speechMetrics(text, sec, pauses) {
    const w = words(text), fillers = (String(text).match(/\b(um+|uh+|erm|er|ah+|hmm+|like|you know)\b/gi) || []).length;
    return { words: w.length, distinct: new Set(w).size, wpm: sec > 0 ? Math.round(w.length * 60 / sec) : 0, fillers, pauses: pauses || 0, dur: Math.round(sec) };
}
function countWords(s) { return (String(s).trim().match(/[A-Za-z0-9’']+/g) || []).length; }

// ---------- voice: text-to-speech ----------
const TTS = {
    ok: 'speechSynthesis' in window,
    voices: [],
    load() { if (!this.ok) return; const set = () => { this.voices = speechSynthesis.getVoices() || []; }; set(); speechSynthesis.onvoiceschanged = set; },
    accentFor(n) { const a = S.settings.accent; if (a === 'us') return 'en-US'; if (a === 'uk') return 'en-GB'; return (n || dayNum() || 1) % 2 ? 'en-US' : 'en-GB'; },
    // Voice chosen by the learner on this device (voices differ between phone and PC)
    chosen() { try { const id = localStorage.getItem('f90-voice'); return id ? this.voices.find(v => v.voiceURI === id) || null : null; } catch (e) { return null; } },
    choose(id) { try { if (id) localStorage.setItem('f90-voice', id); else localStorage.removeItem('f90-voice'); } catch (e) {} },
    english() {
        const score = v => (/natural|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/online/i.test(v.name) ? 1 : 0);
        return this.voices.filter(v => /^en/i.test(v.lang || '')).sort((a, b) => score(b) - score(a) || a.lang.localeCompare(b.lang));
    },
    pick(lang) {
        const c = this.chosen(); if (c) return c;
        const norm = v => (v.lang || '').replace('_', '-');
        const score = v => (/natural|neural/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (/online/i.test(v.name) ? 1 : 0);
        let list = this.voices.filter(v => norm(v) === lang);
        if (!list.length) list = this.voices.filter(v => norm(v).startsWith('en'));
        return list.sort((a, b) => score(b) - score(a))[0] || null;
    },
    // Speaks sentence by sentence (long texts stop by themselves on some browsers otherwise)
    speak(text, opts = {}) {
        if (GVoice.on() && !opts.device) return GVoice.speak(text, opts);
        if (!this.ok) { opts.onend && opts.onend(); return; }
        speechSynthesis.cancel();
        const parts = opts.whole ? [text] : sentences(text);
        const voice = this.pick(opts.lang || this.accentFor()), rate = (opts.rate || 1) * (S.settings.rate || 1);
        let i = 0, stopped = false;
        this._stop = () => { stopped = true; };
        const next = () => {
            if (stopped) return;
            if (i >= parts.length) { opts.onend && opts.onend(); return; }
            const u = new SpeechSynthesisUtterance(parts[i]);
            if (voice) u.voice = voice;
            u.lang = voice ? voice.lang : (opts.lang || 'en-US');
            u.rate = rate;
            const idx = i;
            u.onstart = () => opts.onsentence && opts.onsentence(idx);
            u.onend = () => { i++; next(); };
            u.onerror = () => { i++; next(); };
            speechSynthesis.speak(u);
        };
        next();
    },
    stop() { GVoice.stop(); if (this._stop) this._stop(); if (this.ok) speechSynthesis.cancel(); }
};
TTS.load();

// ---------- Google AI voices (Gemini text-to-speech, with your own key) ----------
// Phones often ignore the chosen device voice: these voices are real, different and natural.
const GVoice = {
    list: [['Kore', 'Firm, clear (F)'], ['Puck', 'Upbeat (M)'], ['Charon', 'Informative (M)'], ['Aoede', 'Breezy (F)'], ['Fenrir', 'Excitable (M)'], ['Leda', 'Youthful (F)'], ['Orus', 'Firm (M)'], ['Zephyr', 'Bright (F)'], ['Iapetus', 'Clear (M)'], ['Sulafat', 'Warm (F)'], ['Achird', 'Friendly (M)'], ['Gacrux', 'Mature (F)']],
    cache: new Map(), audio: null, token: 0, model: null,
    on() { return !!S.settings.gvoice && AI.hasKey(); },
    async findModel() {
        if (this.model) return this.model;
        try {
            const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': AI.key() } });
            const j = await r.json();
            const l = (j.models || []).map(m => m.name.replace('models/', '')).filter(n => /tts/.test(n) && /flash/.test(n)).sort((a, b) => b.localeCompare(a));
            this.model = l[0] || 'gemini-2.5-flash-preview-tts';
        } catch (e) { this.model = 'gemini-2.5-flash-preview-tts'; }
        return this.model;
    },
    wav(b64) {
        const pcm = Uint8Array.from(atob(b64), c => c.charCodeAt(0)), h = new DataView(new ArrayBuffer(44));
        const w = (o, t) => [...t].forEach((c, i) => h.setUint8(o + i, c.charCodeAt(0)));
        w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true); h.setUint16(22, 1, true);
        h.setUint32(24, 24000, true); h.setUint32(28, 48000, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true); w(36, 'data'); h.setUint32(40, pcm.length, true);
        return URL.createObjectURL(new Blob([h, pcm], { type: 'audio/wav' }));
    },
    get(text, voice) {
        const k = voice + '|' + text;
        if (!this.cache.has(k)) this.cache.set(k, (async () => {
            const model = await this.findModel();
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': AI.key() },
                body: JSON.stringify({ contents: [{ parts: [{ text: 'Say naturally, at a clear conversational pace: ' + text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } })
            });
            if (!r.ok) throw new Error(r.status === 429 ? 'Google voice limit reached for today' : 'Google voice error ' + r.status);
            const j = await r.json();
            const part = ((j.candidates || [])[0] || {}).content.parts.find(p => p.inlineData);
            if (!part) throw new Error('No audio');
            return this.wav(part.inlineData.data);
        })().catch(e => { this.cache.delete(k); throw e; }));
        return this.cache.get(k);
    },
    async speak(text, opts = {}) {
        this.stop();
        const my = ++this.token, voice = S.settings.gvoice;
        const parts = opts.whole ? [text] : sentences(text);
        // Long texts: groups of sentences, fetched one step ahead
        const chunks = [];
        if (opts.onsentence) parts.forEach(p => chunks.push([p])); else { let cur = []; parts.forEach(p => { cur.push(p); if (cur.join(' ').length > 400) { chunks.push(cur); cur = []; } }); if (cur.length) chunks.push(cur); }
        let first = 0;
        for (let i = 0; i < chunks.length; i++) {
            if (my !== this.token) return;
            let url;
            try { url = await this.get(chunks[i].join(' '), voice); if (chunks[i + 1]) this.get(chunks[i + 1].join(' '), voice).catch(() => {}); }
            catch (e) { if (typeof toast === 'function') toast(e.message + ': device voice used.', 'bad'); return TTS.speak(chunks.slice(i).flat().join(' '), Object.assign({}, opts, { device: true, onsentence: opts.onsentence ? k => opts.onsentence(first + k) : null })); }
            if (my !== this.token) return;
            opts.onsentence && opts.onsentence(first);
            await new Promise(res => { const a = this.audio = new Audio(url); a.playbackRate = S.settings.rate || 1; a.onended = a.onerror = res; a.play().catch(res); });
            first += chunks[i].length;
        }
        if (my === this.token) opts.onend && opts.onend();
    },
    stop() { this.token++; if (this.audio) { try { this.audio.pause(); } catch (e) {} this.audio = null; } }
};

// ---------- voice: speech recognition ----------
const SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
const Mic = {
    ok: !!SRClass,
    // long: keeps listening (auto-restart) until stop(). Calls onText(liveText) and onEnd({text, sec, pauses, error}).
    listen({ long = false, onText, onEnd } = {}) {
        if (!SRClass) { onEnd && onEnd({ text: '', sec: 0, pauses: 0, error: 'unsupported' }); return { stop() {} }; }
        let active = true, finals = '', interim = '', last = 0, pauses = 0, error = null, ended = false, rec = null;
        const t0 = Date.now();
        const finish = () => { if (ended) return; ended = true; onEnd && onEnd({ text: (finals + ' ' + interim).trim(), sec: (Date.now() - t0) / 1000, pauses, error }); };
        const start = () => {
            rec = new SRClass();
            rec.lang = 'en-US'; rec.continuous = false; rec.interimResults = true; rec.maxAlternatives = 1;
            rec.onresult = e => {
                const now = Date.now();
                if (last && now - last > 2500) pauses++;
                last = now;
                interim = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    const r = e.results[i];
                    if (r.isFinal) finals = (finals + ' ' + r[0].transcript).trim(); else interim += r[0].transcript;
                }
                onText && onText((finals + ' ' + interim).trim());
            };
            rec.onerror = e => { if (/not-allowed|service-not-allowed|audio-capture/.test(e.error)) { error = e.error; active = false; } };
            rec.onend = () => {
                if (interim) { finals = (finals + ' ' + interim).trim(); interim = ''; }
                if (active && long) { try { start(); } catch (err) { finish(); } } else finish();
            };
            try { rec.start(); } catch (err) { error = 'start'; finish(); }
        };
        start();
        return { stop() { active = false; try { rec && rec.stop(); } catch (e) { finish(); } setTimeout(finish, 1500); } };
    }
};

// ---------- audio recording (voice benchmarks, kept on this device) ----------
const AudioStore = {
    db: null,
    open() {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((res, rej) => {
            const r = indexedDB.open('f90-audio', 1);
            r.onupgradeneeded = () => r.result.createObjectStore('clips');
            r.onsuccess = () => { this.db = r.result; res(this.db); };
            r.onerror = () => rej(r.error);
        });
    },
    async put(key, blob) { const db = await this.open(); return new Promise((res, rej) => { const tx = db.transaction('clips', 'readwrite'); tx.objectStore('clips').put(blob, key); tx.oncomplete = res; tx.onerror = () => rej(tx.error); }); },
    async get(key) { try { const db = await this.open(); return await new Promise(res => { const q = db.transaction('clips').objectStore('clips').get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); } catch (e) { return null; } }
};

// ---------- Gemini (your own free key, stored only on this device) ----------
const AI = {
    hasKey() { try { return !!localStorage.getItem(LS_KEY); } catch (e) { return false; } },
    key() { try { return localStorage.getItem(LS_KEY) || ''; } catch (e) { return ''; } },
    setKey(k) { try { if (k) localStorage.setItem(LS_KEY, k.trim()); else { localStorage.removeItem(LS_KEY); localStorage.removeItem(LS_MODELS); } } catch (e) {} },
    models() { try { return JSON.parse(localStorage.getItem(LS_MODELS) || '[]'); } catch (e) { return []; } },
    // Finds the best "flash" text model this key can use (model names change often)
    async discover() {
        const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': this.key() } });
        if (!r.ok) throw new Error(r.status === 400 || r.status === 403 ? 'This key does not work. Check it on Google AI Studio.' : `Google error ${r.status}`);
        const j = await r.json();
        const ver = n => { const m = n.match(/gemini-(\d+(?:\.\d+)?)/); return m ? parseFloat(m[1]) : 0; };
        const list = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
            .map(m => m.name.replace('models/', ''))
            .filter(n => /^gemini-/.test(n) && /flash/.test(n) && !/image|tts|audio|live|embed|robotics|computer|thinking-exp/.test(n))
            .sort((a, b) => (ver(b) - ver(a)) || ((/lite/.test(a) ? 1 : 0) - (/lite/.test(b) ? 1 : 0)) || ((/preview|exp/.test(a) ? 1 : 0) - (/preview|exp/.test(b) ? 1 : 0)) || (a.length - b.length));
        if (!list.length) throw new Error('No Gemini model found for this key.');
        localStorage.setItem(LS_MODELS, JSON.stringify(list.slice(0, 6)));
        return list[0];
    },
    // How much the model may "think" before answering (only for models that support it)
    thinking(model, level) {
        if (!level) return null;
        if (/gemini-2\.5-flash/.test(model) && !/lite/.test(model)) return { thinkingBudget: { off: 0, low: 1024, high: 4096 }[level] };
        if (/gemini-[3-9]/.test(model)) return { thinkingLevel: level === 'high' ? 'high' : 'low' };
        return null;
    },
    // messages: [{role:'user'|'model', text}] · json: JSON output · schema: forced JSON shape · think: 'off'|'low'|'high'
    async ask({ system, messages, json = false, temp = 0.7, schema = null, think = null }) {
        if (!this.hasKey()) throw new Error('nokey');
        let models = this.models();
        if (!models.length) { await this.discover(); models = this.models(); }
        const base = {
            systemInstruction: system ? { parts: [{ text: system }] } : undefined,
            contents: messages.map(m => ({ role: m.role === 'model' ? 'model' : 'user', parts: [{ text: m.text }] }))
        };
        const call = (model, gen) => fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': this.key() }, body: JSON.stringify(Object.assign({}, base, { generationConfig: gen }))
        });
        let lastErr = null;
        for (const model of models) {
            try {
                const gen = Object.assign({ temperature: temp }, json ? { responseMimeType: 'application/json' } : {});
                if (json && schema) gen.responseSchema = schema;
                const tc = this.thinking(model, think); if (tc) gen.thinkingConfig = tc;
                let r = await call(model, gen);
                if (r.status === 400) {
                    const t = await r.text();
                    if (/API key/i.test(t)) throw new Error('Your Gemini key was refused.');
                    // This model refuses the schema or the thinking setting: retry with plain JSON mode
                    delete gen.responseSchema; delete gen.thinkingConfig;
                    r = await call(model, gen);
                }
                if (r.status === 404 || r.status === 429 || r.status >= 500) { lastErr = new Error(r.status === 429 ? 'Gemini limit reached for now. Try again in a minute.' : `Gemini error ${r.status}`); continue; }
                if (!r.ok) throw new Error(`Gemini error ${r.status}`);
                const j = await r.json();
                const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).filter(p => !p.thought).map(p => p.text || '').join('').trim();
                if (!text) { lastErr = new Error('Empty answer'); continue; }
                if (!json) return text;
                const clean = text.replace(/^```(?:json)?\s*|\s*```$/g, '');
                try { return JSON.parse(clean); }
                catch (e) { const m = clean.match(/\{[\s\S]*\}/); if (m) return JSON.parse(m[0]); throw new Error('Unreadable answer'); }
            } catch (e) { lastErr = e; if (/refused/.test(e.message)) break; }
        }
        throw lastErr || new Error('Gemini error');
    },
    levelText() { const c = cefr(); return `${c.label} (${c.value.toFixed(1)} on a 1–5 scale)`; },
    coachRules: 'Tone: direct but kind, like a good coach. Use simple, natural, everyday English (no rare or fancy words). The learner is a French speaker from Cameroon, into tech, apps and business, practising 90 days to speak fluently with clients, while travelling and with new friends.'
};

// The daily AI episode, the weekly diagnosis and mistake tracking live in brain.js

// ---------- Firebase: Google sign-in + sync (data at fluent90/<uid>) ----------
const FB_CONFIG = {
    apiKey: 'AIzaSyCqZhTn6fA7lHwN5JHwaowDzGWohA9rOQ0', authDomain: 'bambie237iq.firebaseapp.com',
    databaseURL: 'https://bambie237iq-default-rtdb.firebaseio.com', projectId: 'bambie237iq',
    storageBucket: 'bambie237iq.firebasestorage.app', messagingSenderId: '730310282369', appId: '1:730310282369:web:fa4cc5068a718be30c5180'
};
// Merges two copies of the progress (phone + PC): union of everything done, newest wins for single values.
function mergeStates(a, b) {
    const [nw, od] = (a.updatedAt || 0) >= (b.updatedAt || 0) ? [a, b] : [b, a];
    const m = normalizeState(JSON.parse(JSON.stringify(nw)));
    const o = od;
    if (!m.startDate || (o.startDate && o.startDate < m.startDate)) { m.startDate = o.startDate || m.startDate; }
    if (!m.placement && o.placement) { m.placement = o.placement; }
    if (m.startLevel == null && o.startLevel != null) m.startLevel = o.startLevel;
    for (const [d, r] of Object.entries(o.days || {})) {
        const x = m.days[d];
        if (!x) { m.days[d] = r; continue; }
        x.tasks = Object.assign({}, r.tasks || {}, x.tasks || {});
        x.minutes = Math.max(x.minutes || 0, r.minutes || 0); x.xp = Math.max(x.xp || 0, r.xp || 0); x.bonus = x.bonus || r.bonus;
    }
    for (const [id, c] of Object.entries(o.cards || {})) { const x = m.cards[id]; if (!x || (c.reps || 0) + (c.lapses || 0) > (x.reps || 0) + (x.lapses || 0)) m.cards[id] = c; }
    for (const k of ['custom', 'aiDays', 'bench', 'missions']) m[k] = Object.assign({}, o[k] || {}, m[k] || {});
    const uni = (x, y, key) => { const seen = new Set(), out = []; [...(y || []), ...(x || [])].forEach(e => { const k = key(e); if (!seen.has(k)) { seen.add(k); out.push(e); } }); return out; };
    m.mistakes = uni(m.mistakes, o.mistakes, e => e.date + e.wrong).sort((p, q) => (p.date || '').localeCompare(q.date || '')).slice(-300);
    m.notebook = uni(m.notebook, o.notebook, e => e.id || e.en).sort((p, q) => (q.date || '').localeCompare(p.date || ''));
    for (const k of Object.keys(Object.assign({}, o.metrics || {}, m.metrics))) m.metrics[k] = uni(m.metrics[k], (o.metrics || {})[k], e => JSON.stringify(e)).sort((p, q) => (p.d || '').localeCompare(q.d || ''));
    if (!m.coach.report && o.coach && o.coach.report) m.coach = o.coach;
    m.xp = Math.max(m.xp || 0, o.xp || 0); m.freeMin = Math.max(m.freeMin || 0, o.freeMin || 0);
    return m;
}
const Sync = {
    user: null, status: 'local', ref: null, timer: null, ready: false,
    init() {
        if (typeof firebase === 'undefined') return;
        try { firebase.initializeApp(FB_CONFIG); } catch (e) {}
        firebase.auth().getRedirectResult().catch(() => {});
        firebase.auth().onAuthStateChanged(u => {
            if (this.ref) this.ref.child('state').off();
            this.user = u; this.ready = false;
            if (!u) { this.ref = null; this.status = 'local'; emit(); return; }
            this.ref = firebase.database().ref('fluent90/' + u.uid);
            this.status = 'syncing'; emit();
            // Gemini key: saved once in the private account, every signed-in device gets it
            this.ref.child('gemini').once('value').then(s => {
                const k = s.val();
                if (k && !AI.hasKey()) { AI.setKey(k); emit(); }
                else if (!k && AI.hasKey()) this.saveKey(AI.key());
            }).catch(() => {});
            this.ref.child('state').on('value', snap => {
                this.ready = true;
                const raw = snap.val();
                let remote = null;
                try { remote = raw ? JSON.parse(raw) : null; } catch (e) {}
                if (!remote) { this.push(); return; }
                if (remote.updatedAt === S.updatedAt) { this.status = 'synced'; emit(); return; }
                // Merge both devices (nothing done on the phone or the PC is lost), then share the result
                const merged = mergeStates(S, normalizeState(remote));
                const changed = JSON.stringify(merged) !== JSON.stringify(normalizeState(remote));
                S = merged;
                try { localStorage.setItem(LS_STATE, JSON.stringify(S)); } catch (e) {}
                if (changed) { S.updatedAt = Math.max(Date.now(), remote.updatedAt + 1); this.push(); }
                else { S.updatedAt = remote.updatedAt; this.status = 'synced'; }
                emit();
            }, err => { this.status = /permission/i.test(err && (err.code || err.message) || '') ? 'denied' : 'error'; emit(); });
        });
    },
    signIn() {
        const p = new firebase.auth.GoogleAuthProvider();
        p.setCustomParameters({ prompt: 'select_account' });
        return firebase.auth().signInWithPopup(p).catch(e => {
            if (/popup-blocked|operation-not-supported/.test(e.code || '')) return firebase.auth().signInWithRedirect(p);
            throw e;
        });
    },
    signOut() { return firebase.auth().signOut(); },
    saveKey(k) { if (!this.ref) return Promise.resolve(false); return (k ? this.ref.child('gemini').set(k) : this.ref.child('gemini').remove()).then(() => true).catch(() => false); },
    schedule() { if (!this.ref || !this.ready) return; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 1200); },
    push() {
        if (!this.ref) return;
        clearTimeout(this.timer);
        const n = dayNum(), p = n >= 1 ? plan(n) : null, t = today();
        const status = p ? { n, morning: dropDone(t, p.drops[0]), midday: dropDone(t, p.drops[1]), evening: dropDone(t, p.drops[2]), complete: isComplete(t), left: p.tasks.filter(x => !taskDone(t, x.id)).length, streak: streak(), at: Date.now() } : { n: 0, at: Date.now() };
        this.status = 'syncing';
        Promise.all([
            this.ref.child('state').set(JSON.stringify(S)),
            this.ref.child('status/' + t).set(status),
            this.ref.child('meta').set({ startDate: S.startDate || null, updatedAt: S.updatedAt })
        ]).then(() => { this.status = 'synced'; emit(); })
          .catch(err => { this.status = /permission/i.test(err && (err.code || err.message) || '') ? 'denied' : 'error'; emit(); });
    }
};

// ---------- push reminders (07:00 · 13:00 · 20:00, sent by the server) ----------
const VAPID_PUBLIC_KEY = 'BADrdDsq0XOHsky2PafVKaweQwMNwbHpOxWHVu-MxeZYy-KxenIVlE35EgW7z6h2zOigZsHzgsefnZbauBR9zdU';
const Push = {
    supported() { return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window; },
    key(endpoint) { let h = 5381; for (let i = 0; i < endpoint.length; i++) h = ((h << 5) + h + endpoint.charCodeAt(i)) >>> 0; return 'd' + h.toString(36) + endpoint.length.toString(36); },
    b64(b64) { const pad = '='.repeat((4 - b64.length % 4) % 4), raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(raw, ch => ch.charCodeAt(0)); },
    async current() { if (!this.supported()) return null; const reg = await navigator.serviceWorker.getRegistration('/fluent/'); return reg ? reg.pushManager.getSubscription() : null; },
    async enable() {
        if (!this.supported()) throw new Error('This browser cannot receive notifications.');
        if (!Sync.ref) throw new Error('Sign in with Google first (your phone needs an account to receive reminders).');
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.');
        const reg = await navigator.serviceWorker.register('/fluent/sw.js', { scope: '/fluent/' });
        await navigator.serviceWorker.ready;
        const sub = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: this.b64(VAPID_PUBLIC_KEY) });
        const j = sub.toJSON();
        await Sync.ref.child('push/' + this.key(j.endpoint)).set({ endpoint: j.endpoint, keys: j.keys, device: navigator.userAgent.slice(0, 120), at: Date.now() });
        return true;
    },
    async disable() {
        const sub = await this.current();
        if (sub) { if (Sync.ref) await Sync.ref.child('push/' + this.key(sub.endpoint)).remove().catch(() => {}); await sub.unsubscribe(); }
    }
};
