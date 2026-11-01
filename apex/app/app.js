/* =====================================================================
   APEX FLOW OS — Web App
   Single Page App, aucune dépendance serveur.
   Tout est enregistré dans le navigateur (localStorage) + export/import JSON.
   ===================================================================== */
(function () {
'use strict';

/* ======================= 0. OUTILS ======================= */
const $  = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;

const uid  = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
const esc  = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const fmt  = n => Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('fr-FR', { minimumFractionDigits:0, maximumFractionDigits:1 });

const ymd = d => {
  const x = d instanceof Date ? d : new Date(d);
  return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0');
};
const today     = () => ymd(new Date());
const addDays   = (s, n) => { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return ymd(d); };
const monthKey  = s => s.slice(0, 7);
const daysInMonth = (y, m) => new Date(y, m, 0).getDate();
const prettyDate = s => new Date(s + 'T12:00:00').toLocaleDateString('fr-FR', { day:'numeric', month:'short' });
const longDate   = d => d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

/* ======================= 1. ICÔNES ======================= */
const I = {
  home:    '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  check:   '<path d="M20 6L9 17l-5-5"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  pencil:  '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  trash:   '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  lock:    '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  wallet:  '<path d="M3 7h18v12H3z"/><path d="M3 11h18"/><circle cx="8" cy="15" r="1.3"/>',
  piggy:   '<path d="M4 8h16v11H4z"/><path d="M8 8V5h8v3"/><path d="M12 12v4"/>',
  dumbbell:'<path d="M4 9v6M20 9v6M7 7v10M17 7v10"/><path d="M7 12h10"/>',
  building:'<path d="M3 20h18"/><path d="M6 20V9l6-5 6 5v11"/><path d="M10 20v-6h4v6"/>',
  play:    '<path d="M5 4h14v16H5z"/><path d="M10 9l5 3-5 3z"/>',
  book:    '<path d="M4 5h7v15H4z"/><path d="M13 5h7v15h-7z"/><path d="M11 5v15"/>',
  chart:   '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  timer:   '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M9 2h6"/>',
  down:    '<path d="M12 3v12M7 11l5 5 5-5M4 21h16"/>',
  up:      '<path d="M12 21V9M7 13l5-5 5 5M4 3h16"/>',
  flame:   '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  bolt:    '<path d="M13 2L4 14h6l-1 8 9-12h-6z"/>',
  x:       '<path d="M6 6l12 12M18 6L6 18"/>',
  shield:  '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>'
};
const svg = (p, cls, stroke) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="${stroke || 'currentColor'}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" class="${cls || ''}" aria-hidden="true">${p}</svg>`;

/* ---------- couleurs vivantes : elles suivent le theme clair / sombre ---------- */
/* Chart.js et <canvas> n'interpretent pas var(--x) : on lit la valeur calculee. */
const TRIP = n => getComputedStyle(document.documentElement).getPropertyValue('--c-' + n).trim();

/** tc('em') -> 'rgb(16,185,129)' · tc('em', .4) -> 'rgba(16,185,129,0.4)' */
function tc(n, a){
  const v = TRIP(n).split(/[\s,]+/);
  if (v.length < 3) return '#10B981';
  return a == null ? 'rgb(' + v[0] + ',' + v[1] + ',' + v[2] + ')'
                   : 'rgba(' + v[0] + ',' + v[1] + ',' + v[2] + ',' + a + ')';
}
/** couleur d'un pilier */
const pcol = p => tc(p.tok);

/* ======================= 2. CONSTANTES ======================= */
const PILLARS = [
  { id:'sante',      name:'Santé',      tok:'em' },
  { id:'finances',   name:'Finances',   tok:'am' },
  { id:'business',   name:'Business',   tok:'in' },
  { id:'creativite', name:'Créativité', tok:'in-soft' },
  { id:'mental',     name:'Mental',     tok:'em-soft' },
  { id:'discipline', name:'Discipline', tok:'am-soft' }
];
const pillarOf = id => PILLARS.find(p => p.id === id) || PILLARS[5];

const MODULES = [
  { id:'cashflow', name:'Cashflow & Crypto',   short:'Cashflow',  icon:I.wallet,   code:'APEX-CASH',   pillar:'finances',
    desc:'Entrées, sorties et portefeuille crypto, mois par mois.' },
  { id:'epargne',  name:'Défi Épargne 52 sem.', short:'Épargne',  icon:I.piggy,    code:'APEX-52',     pillar:'finances',
    desc:'Les 52 semaines de l’année et la courbe cumulée.' },
  { id:'athlete',  name:'Athlète · Masse & Sèche', short:'Athlète', icon:I.dumbbell, code:'APEX-FIT',  pillar:'sante',
    desc:'Poids, séances et objectifs caloriques.' },
  { id:'hustle',   name:'Architecte de Side-Hustle', short:'Side-Hustle', icon:I.building, code:'APEX-HUSTLE', pillar:'business',
    desc:'Projets, jalons et revenus par activité.' },
  { id:'viral',    name:'Créateur Viral',      short:'Créateur',  icon:I.play,     code:'APEX-VIRAL',  pillar:'creativite',
    desc:'Idées, calendrier de publication et performances.' },
  { id:'cerveau',  name:'Second Cerveau',      short:'Second Cerveau', icon:I.book, code:'APEX-BRAIN', pillar:'mental',
    desc:'Lectures en cours et heures de pratique délibérée.' }
];
const moduleOf = id => MODULES.find(m => m.id === id);

/* XP : coût du niveau L -> L+1 = 25 + (L-1)*15 */
const cumXp = L => 25 * (L - 1) + 15 * (L - 1) * (L - 2) / 2;
const MAX_LEVEL = 50;
function levelFromXp(xp){
  let L = 1;
  while (L < MAX_LEVEL && xp >= cumXp(L + 1)) L++;
  return L;
}
const RANKS = [
  [1,'Novice'], [5,'Apprenti'], [10,'Exécutant'], [15,'Stratège'], [21,'Architecte'],
  [27,'Maître'], [34,'Virtuose'], [41,'Titan'], [47,'Oracle'], [50,'Légende']
];
function rankFor(level){ let r = 'Novice'; RANKS.forEach(([l, n]) => { if (level >= l) r = n; }); return r; }

const XP = { habit:10, task:12, taskHigh:18, perfectDay:25, pomodoro:15, module:6 };

/* ======================= 3. STOCKAGE ======================= */
const KEY = 'apexflow.v1';

function blankDb(){
  return {
    v: 1,
    profile: { xp:0, freezes:[], createdAt: today(), lastSeen: today() },
    habits: [],
    tasks: [],
    pomodoro: { mode:'25/5', sessions:0, byDay:{} },
    modules: {
      cashflow: { unlocked:false, tx:[], crypto:[] },
      epargne:  { unlocked:false, plan:'progressif', base:500, weeks:{} },
      athlete:  { unlocked:false, goal:'masse', target:0, kcal:2600, prot:140, weights:[], sessions:[] },
      hustle:   { unlocked:false, projects:[], revenues:[] },
      viral:    { unlocked:false, ideas:[] },
      cerveau:  { unlocked:false, books:[], skills:[] }
    },
    settings: { simulation:false, devise:'FCFA' },
    log: []           // { d:'YYYY-MM-DD', xp:n }
  };
}

function seed(db){
  const d0 = today();
  db.habits = [
    { id:uid(), name:'Sport · 30 min',        pillar:'sante',      xp:10, created:d0, log:{} },
    { id:uid(), name:'Deep Work · 90 min',    pillar:'discipline', xp:20, created:d0, log:{} },
    { id:uid(), name:'Lecture · 20 pages',    pillar:'mental',     xp:15, created:d0, log:{} },
    { id:uid(), name:'Pas de dépense inutile',pillar:'finances',   xp:10, created:d0, log:{} }
  ];
  db.tasks = [
    { id:uid(), title:'Définir mes 3 objectifs du mois', pillar:'business', prio:'haute', due:d0, done:false, created:d0 },
    { id:uid(), title:'Ranger l’espace de travail',  pillar:'discipline', prio:'normale', due:d0, done:false, created:d0 },
    { id:uid(), title:'Préparer 5 idées de contenu',      pillar:'creativite', prio:'basse', due:addDays(d0,2), done:false, created:d0 }
  ];
  return db;
}

let DB;
function load(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return seed(blankDb());
    const parsed = JSON.parse(raw);
    const base = blankDb();
    const db = Object.assign(base, parsed);
    db.profile = Object.assign(base.profile, parsed.profile || {});
    db.pomodoro = Object.assign(base.pomodoro, parsed.pomodoro || {});
    db.settings = Object.assign(base.settings, parsed.settings || {});
    db.modules = Object.assign({}, base.modules, parsed.modules || {});
    Object.keys(base.modules).forEach(k => { db.modules[k] = Object.assign({}, base.modules[k], parsed.modules && parsed.modules[k] || {}); });
    if (!Array.isArray(db.habits)) db.habits = [];
    if (!Array.isArray(db.tasks))  db.tasks  = [];
    if (!Array.isArray(db.log))    db.log    = [];
    return db;
  } catch (e) {
    console.warn('Sauvegarde illisible, repart à zéro.', e);
    return seed(blankDb());
  }
}

let saveTimer = null;
function save(){
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(DB)); }
    catch (e) { toast('Sauvegarde impossible (espace plein ?)', 'rose'); }
  }, 180);
}

/* ======================= 4. MOTEUR XP / SÉRIES ======================= */
function logXp(amount, d){
  const day = d || today();
  DB.profile.xp = Math.max(0, DB.profile.xp + amount);
  const row = DB.log.find(r => r.d === day);
  if (row) row.xp = Math.max(0, row.xp + amount);
  else DB.log.push({ d:day, xp:Math.max(0, amount) });
  if (DB.log.length > 400) DB.log = DB.log.slice(-400);
}

function grantXp(amount, label){
  const before = levelFromXp(DB.profile.xp);
  logXp(amount);
  const after = levelFromXp(DB.profile.xp);
  save(); paintTop();
  if (after > before){
    toast(`Niveau ${after} — ${rankFor(after)} !`, 'am');
    confetti(130);
  } else if (label){
    toast(label + ' · +' + amount + ' XP');
  }
}

/* jours où il s'est passé quelque chose */
function activeDays(){
  const set = new Set();
  DB.habits.forEach(h => Object.keys(h.log || {}).forEach(d => { if (h.log[d]) set.add(d); }));
  DB.tasks.forEach(t => { if (t.done && t.doneAt) set.add(t.doneAt); });
  Object.keys(DB.pomodoro.byDay || {}).forEach(d => { if (DB.pomodoro.byDay[d] > 0) set.add(d); });
  return set;
}

function streak(){
  const act = activeDays();
  const fr  = new Set(DB.profile.freezes || []);
  let cur = today(), n = 0;
  if (!act.has(cur)) cur = addDays(cur, -1);   // la journée en cours ne casse rien
  for (let i = 0; i < 400; i++){
    if (act.has(cur) || fr.has(cur)) { n++; cur = addDays(cur, -1); }
    else break;
  }
  return n;
}

function freezeLeft(){
  const m = monthKey(today());
  const used = (DB.profile.freezes || []).filter(d => monthKey(d) === m).length;
  return Math.max(0, 1 - used);
}

function useFreeze(){
  if (freezeLeft() === 0) { toast('Joker déjà utilisé ce mois-ci', 'rose'); return; }
  const y = addDays(today(), -1);
  if (activeDays().has(y)) { toast('Hier est déjà validé — joker inutile', 'am'); return; }
  if ((DB.profile.freezes || []).includes(y)) { toast('Hier est déjà gelé', 'am'); return; }
  DB.profile.freezes = (DB.profile.freezes || []).concat(y);
  save(); paintTop(); render();
  toast('Joker de Gel appliqué à hier — série sauvée', 'em');
  confetti(60);
}

/* un jour "parfait" = toutes les habitudes cochées */
function checkPerfectDay(){
  if (!DB.habits.length) return;
  const d = today();
  const all = DB.habits.every(h => h.log && h.log[d]);
  const already = DB.profile.perfect && DB.profile.perfect[d];
  if (all && !already){
    DB.profile.perfect = DB.profile.perfect || {};
    DB.profile.perfect[d] = true;
    logXp(XP.perfectDay);
    toast('Journée parfaite · +' + XP.perfectDay + ' XP bonus', 'am');
    confetti(150);
  } else if (!all && already){
    delete DB.profile.perfect[d];
    logXp(-XP.perfectDay);
  }
}

/* ======================= 5. RADAR / SCORES ======================= */
function pillarScores(){
  const out = {}; PILLARS.forEach(p => out[p.id] = 0);
  const last30 = []; for (let i = 0; i < 30; i++) last30.push(addDays(today(), -i));

  PILLARS.forEach(p => {
    const hs = DB.habits.filter(h => h.pillar === p.id);
    let habitScore = null;
    if (hs.length){
      let hit = 0, poss = 0;
      hs.forEach(h => {
        const since = h.created || DB.profile.createdAt;
        last30.forEach(d => { if (d >= since) { poss++; if (h.log && h.log[d]) hit++; } });
      });
      habitScore = poss ? (hit / poss) * 100 : 0;
    }
    const tdone = DB.tasks.filter(t => t.pillar === p.id && t.done && t.doneAt && last30.includes(t.doneAt)).length;
    const taskScore = DB.tasks.some(t => t.pillar === p.id) ? clamp(tdone / 8, 0, 1) * 100 : null;

    let s;
    if (habitScore != null && taskScore != null) s = habitScore * 0.6 + taskScore * 0.4;
    else if (habitScore != null) s = habitScore;
    else if (taskScore != null) s = taskScore;
    else s = 0;

    out[p.id] = s;
  });

  /* bonus des modules actifs (jusqu'à +15 par pilier) */
  const M = DB.modules;
  const bonus = (pid, v) => { out[pid] = clamp(out[pid] + clamp(v, 0, 15), 0, 100); };
  if (M.cashflow.unlocked) bonus('finances', Math.min(M.cashflow.tx.length, 15));
  if (M.epargne.unlocked)  bonus('finances', Object.values(M.epargne.weeks).filter(Boolean).length / 2);
  if (M.athlete.unlocked)  bonus('sante',    M.athlete.sessions.length);
  if (M.hustle.unlocked)   bonus('business', M.hustle.revenues.length * 2);
  if (M.viral.unlocked)    bonus('creativite', M.viral.ideas.filter(i => i.status === 'publie').length * 3);
  if (M.cerveau.unlocked)  bonus('mental',   M.cerveau.skills.reduce((a, s) => a + s.hours, 0) / 4);
  const pomo30 = last30.reduce((a, d) => a + (DB.pomodoro.byDay[d] || 0), 0);
  bonus('discipline', pomo30);

  PILLARS.forEach(p => out[p.id] = Math.round(clamp(out[p.id], 0, 100)));
  return out;
}

/* ======================= 6. TOAST / CONFETTI / MODAL ======================= */
let toastT = null;
function toast(msg, tone){
  const el = $('#toast');
  $('#toast-msg').textContent = msg;
  const tk = tone === 'rose' ? 'rose' : tone === 'am' ? 'am' : 'em';
  const color = tc(tk);
  el.style.borderColor = tc(tk, .4);
  $('#toast-ic').innerHTML = svg(tone === 'rose' ? I.x : I.check, '', color);
  $('#toast-ic').style.background = tc(tk, .16);
  el.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => el.classList.remove('on'), 2800);
}

const cvs = $('#confetti'), ctx = cvs.getContext('2d');
let parts = [], raf = null;
function sizeCvs(){ const d = Math.min(devicePixelRatio || 1, 2); cvs.width = innerWidth * d; cvs.height = innerHeight * d; ctx.setTransform(d,0,0,d,0,0); }
sizeCvs(); addEventListener('resize', sizeCvs);
let CCN = [];
function confetti(n, ox, oy){
  if (REDUCE) return;
  const x = ox != null ? ox : innerWidth / 2, y = oy != null ? oy : innerHeight / 3;
  for (let i = 0; i < n; i++){
    const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
    parts.push({ x, y, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp - 4, g:.18+Math.random()*.12, s:3+Math.random()*5,
                 rot:Math.random()*6.3, vr:(Math.random()-.5)*.35, c:CCN[(Math.random()*CCN.length)|0], life:1 });
  }
  if (parts.length > 480) parts = parts.slice(-480);
  if (!raf) raf = requestAnimationFrame(tick);
}
function tick(){
  ctx.clearRect(0,0,innerWidth,innerHeight);
  parts = parts.filter(p => p.life > 0 && p.y < innerHeight + 60);
  parts.forEach(p => {
    p.vy += p.g; p.vx *= .992; p.x += p.vx; p.y += p.vy; p.rot += p.vr; p.life -= .0065;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
    ctx.globalAlpha = clamp(p.life, 0, 1); ctx.fillStyle = p.c;
    ctx.fillRect(-p.s/2, -p.s/2, p.s, p.s*1.6); ctx.restore();
  });
  if (parts.length) raf = requestAnimationFrame(tick);
  else { raf = null; ctx.clearRect(0,0,innerWidth,innerHeight); }
}

/* ---- modal ---- */
let modalLast = null;
function openModal(title, bodyHtml, footHtml){
  modalLast = document.activeElement;
  $('#modal-title').textContent = title;
  $('#modal-body').innerHTML = bodyHtml;
  $('#modal-foot').innerHTML = footHtml || '';
  $('#modal-wrap').hidden = false;
  document.body.classList.add('locked');
  setTimeout(() => { const f = $('#modal-body input,#modal-body select,#modal-body textarea'); if (f) f.focus(); }, 60);
}
function closeModal(){
  $('#modal-wrap').hidden = true;
  document.body.classList.remove('locked');
  if (modalLast && modalLast.focus) modalLast.focus();
}
document.addEventListener('click', e => { if (e.target.closest('[data-modal-close]')) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && !$('#modal-wrap').hidden) closeModal();
});

/* formulaire générique dans la modale */
function formModal(title, fields, onOk, okLabel){
  const body = `<form id="mform" class="form-grid c2" novalidate>${fields.map(f => {
    const id = 'f_' + f.name;
    let input;
    if (f.type === 'select')
      input = `<select id="${id}" name="${f.name}">${f.options.map(o => `<option value="${esc(o.v)}"${String(o.v) === String(f.value) ? ' selected' : ''}>${esc(o.t)}</option>`).join('')}</select>`;
    else if (f.type === 'textarea')
      input = `<textarea id="${id}" name="${f.name}" placeholder="${esc(f.placeholder || '')}">${esc(f.value || '')}</textarea>`;
    else
      input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(f.value == null ? '' : f.value)}" placeholder="${esc(f.placeholder || '')}"${f.step ? ` step="${f.step}"` : ''}${f.min != null ? ` min="${f.min}"` : ''}${f.required ? ' required' : ''}${f.type === 'number' ? ' inputmode="decimal"' : ''}>`;
    return `<div class="field"${f.wide ? ' style="grid-column:1/-1"' : ''}><label for="${id}">${esc(f.label)}</label>${input}${f.help ? `<p class="help">${esc(f.help)}</p>` : ''}</div>`;
  }).join('')}</form>`;

  openModal(title, body,
    `<button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
     <button type="button" class="btn btn-em" id="mok">${esc(okLabel || 'Enregistrer')}</button>`);

  const submit = () => {
    const f = $('#mform');
    const data = {};
    fields.forEach(x => { const el = f.elements[x.name]; data[x.name] = el ? el.value.trim() : ''; });
    const missing = fields.find(x => x.required && !data[x.name]);
    if (missing){ toast('« ' + missing.label +' » est obligatoire', 'rose'); const el = f.elements[missing.name]; if (el) el.focus(); return; }
    closeModal(); onOk(data);
  };
  $('#mok').addEventListener('click', submit);
  $('#mform').addEventListener('submit', e => { e.preventDefault(); submit(); });
}

function confirmModal(title, text, onOk, okLabel){
  openModal(title, `<p style="color:var(--muted);line-height:1.7">${esc(text)}</p>`,
    `<button type="button" class="btn btn-ghost" data-modal-close>Annuler</button>
     <button type="button" class="btn btn-danger" id="mok">${esc(okLabel || 'Supprimer')}</button>`);
  $('#mok').addEventListener('click', () => { closeModal(); onOk(); });
}

/* ======================= 7. EN-TÊTE ======================= */
function paintTop(){
  const xp = DB.profile.xp;
  const L  = levelFromXp(xp);
  const cur = cumXp(L), next = L >= MAX_LEVEL ? cur : cumXp(L + 1);
  const pct = L >= MAX_LEVEL ? 100 : ((xp - cur) / (next - cur)) * 100;
  $('#lvl-num').textContent  = L;
  $('#lvl-rank').textContent = rankFor(L);
  $('#lvl-sub').textContent  = L >= MAX_LEVEL ? fmt(xp) + ' XP · niveau max' : fmt(xp - cur) + ' / ' + fmt(next - cur) + ' XP';
  $('#lvl-bar').style.width  = clamp(pct, 0, 100) + '%';
  $('#top-streak').textContent = streak();
  $('#top-xp').textContent = fmt(xp);
  $('#freeze-badge').textContent = freezeLeft();
  $('#freeze-btn').style.opacity = freezeLeft() ? '1' : '.45';
}

/* ======================= 8. GRAPHIQUES ======================= */
const charts = {};
function killCharts(){ Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch(e){} delete charts[k]; }); }
function BO(){
 const GRID = tc('muted', .14), TICK = tc('dim');
 return {
  responsive:true, maintainAspectRatio:false,
  animation: REDUCE ? false : { duration:600, easing:'easeOutQuart' },
  plugins:{ legend:{ display:false }, tooltip:{
    backgroundColor:tc('panel'), borderColor:tc('muted', .25), borderWidth:1,
    titleColor:tc('ink'), bodyColor:tc('muted'), padding:10, displayColors:false,
    titleFont:{ family:'Plus Jakarta Sans', weight:'700' }, bodyFont:{ family:'JetBrains Mono' } } },
  scales:{
    x:{ grid:{ color:GRID, drawTicks:false }, border:{ display:false }, ticks:{ color:TICK, font:{ family:'JetBrains Mono', size:10 } } },
    y:{ grid:{ color:GRID, drawTicks:false }, border:{ display:false }, ticks:{ color:TICK, font:{ family:'JetBrains Mono', size:10 } }, beginAtZero:true }
  }
 };
}
const noScales = o => Object.assign({}, BO(), { scales:undefined }, o || {});

function makeChart(id, cfg){
  const el = document.getElementById(id);
  if (!el || typeof Chart === 'undefined') return null;
  if (charts[id]) { try { charts[id].destroy(); } catch(e){} }
  charts[id] = new Chart(el.getContext('2d'), cfg);
  return charts[id];
}

function gaugeSvg(value, color){
  const r = 32, c = 2 * Math.PI * r, off = c * (1 - clamp(value, 0, 100) / 100);
  return `<svg viewBox="0 0 80 80" role="img" aria-label="${value} sur 100">
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="${tc('muted', .14)}" stroke-width="7"/>
    <circle cx="40" cy="40" r="${r}" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 40 40)"/>
    <text x="40" y="45" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="17" font-weight="700" fill="${tc('ink')}">${value}</text>
  </svg>`;
}

/* ======================= 9. NAVIGATION ======================= */
let TAB = localStorage.getItem('apexflow.tab') || 'qg';

function isUnlocked(id){
  if (id === 'qg' || id === 'reglages') return true;
  return DB.settings.simulation || !!(DB.modules[id] && DB.modules[id].unlocked);
}

function buildRail(){
  const items = [
    `<li><button type="button" class="rail-item" data-tab="qg" role="tab" aria-selected="${TAB==='qg'}">
       <span class="ri">${svg(I.home)}</span><span class="rt">QG Principal</span></button></li>`,
    `<li class="rail-sep">Modules</li>`
  ].concat(MODULES.map(m => {
    const open = isUnlocked(m.id);
    return `<li><button type="button" class="rail-item" data-tab="${m.id}" role="tab" aria-selected="${TAB===m.id}">
      <span class="ri">${svg(m.icon)}</span><span class="rt">${esc(m.short)}</span>
      ${open ? '' : `<span class="lock">${svg(I.lock)}</span>`}</button></li>`;
  }));
  $('#rail-list').innerHTML = items.join('');
  $$('.rail-item').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === TAB)));
}

function go(tab){
  TAB = tab;
  localStorage.setItem('apexflow.tab', tab);
  buildRail();
  render();
  closeRail();
  $('#view').scrollIntoView({ block:'start' });
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-tab]');
  if (b) { go(b.dataset.tab); }
});

function openRail(){ $('.rail').classList.add('open'); $('#scrim').hidden = false; $('#menu-btn').setAttribute('aria-expanded','true'); }
function closeRail(){ $('.rail').classList.remove('open'); $('#scrim').hidden = true; $('#menu-btn').setAttribute('aria-expanded','false'); }
$('#menu-btn').addEventListener('click', () => $('.rail').classList.contains('open') ? closeRail() : openRail());
$('#scrim').addEventListener('click', closeRail);
$('#freeze-btn').addEventListener('click', useFreeze);

/* ======================= 10. RENDU ======================= */
function render(){
  killCharts();
  const v = $('#view');
  if (TAB === 'qg')            v.innerHTML = viewQG();
  else if (TAB === 'reglages') v.innerHTML = viewSettings();
  else if (!isUnlocked(TAB))   v.innerHTML = viewLock(moduleOf(TAB));
  else                         v.innerHTML = VIEWS[TAB]();
  paintTop();
  if (TAB === 'qg') afterQG();
  else if (isUnlocked(TAB) && AFTER[TAB]) AFTER[TAB]();
}

/* -------------------- QG PRINCIPAL -------------------- */
function viewQG(){
  const d = today();
  const hdone = DB.habits.filter(h => h.log && h.log[d]).length;
  const tdue  = DB.tasks.filter(t => !t.done);
  const tdone = DB.tasks.filter(t => t.done && t.doneAt === d).length;
  const rate  = DB.habits.length ? Math.round(hdone / DB.habits.length * 100) : 0;
  const scores = pillarScores();
  const eq = Math.round(PILLARS.reduce((a, p) => a + scores[p.id], 0) / PILLARS.length);
  const pomoToday = DB.pomodoro.byDay[d] || 0;

  return `
  <div class="page-head">
    <div>
      <h1>QG Principal</h1>
      <p class="sub">${esc(longDate(new Date()))}</p>
    </div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      <button type="button" class="btn btn-ghost sm" data-act="add-habit">${svg(I.plus)} Habitude</button>
      <button type="button" class="btn btn-em sm" data-act="add-task">${svg(I.plus)} Tâche</button>
    </div>
  </div>

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Habitudes du jour</p><p class="v v-em">${hdone}<span style="font-size:1rem;color:var(--dim)">/${DB.habits.length}</span></p><p class="d">${rate}% validé</p></div>
    <div class="stat"><p class="k">Tâches ouvertes</p><p class="v">${tdue.length}</p><p class="d">${tdone} terminée${tdone > 1 ? 's' : ''} aujourd'hui</p></div>
    <div class="stat"><p class="k">Équilibre de vie</p><p class="v v-in">${eq}<span style="font-size:1rem;color:var(--dim)">/100</span></p><p class="d">moyenne des 6 piliers</p></div>
    <div class="stat"><p class="k">Deep Work</p><p class="v v-am">${pomoToday}</p><p class="d">session${pomoToday > 1 ? 's' : ''} aujourd'hui</p></div>
  </div>

  <section class="card" style="margin-bottom:1rem">
    <div class="card-head"><h2>Habitudes · ${esc(new Date().toLocaleDateString('fr-FR',{month:'long'}))}</h2>
      <span class="hint">clique une case</span></div>
    ${DB.habits.length ? habitGrid() : emptyBlock('Aucune habitude', 'Ajoute ta première habitude pour lancer le moteur d’XP.', 'add-habit', 'Ajouter une habitude')}
  </section>

  <div class="grid g-2-1" style="margin-bottom:1rem">
    <section class="card">
      <div class="card-head"><h2>Les 6 piliers</h2><span class="hint">score /100</span></div>
      <div class="gauges">
        ${PILLARS.map(p => `<div class="gauge">${gaugeSvg(scores[p.id], pcol(p))}<p class="gk">${esc(p.name)}</p></div>`).join('')}
      </div>
      <p class="help" style="margin-top:1rem">Calculé sur 30 jours : habitudes du pilier (60 %), tâches terminées (40 %), plus un bonus si le module lié est actif.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2>Radar d'Équilibre de Vie</h2></div>
      <div class="chartbox h-md"><canvas id="c-radar"></canvas></div>
    </section>
  </div>

  <div class="grid g-2-1" style="margin-bottom:1rem">
    <section class="card">
      <div class="card-head">
        <h2>Tâches</h2>
        <div class="seg" role="group" aria-label="Filtre">
          <button type="button" data-filter="open"  aria-pressed="true">À faire</button>
          <button type="button" data-filter="done"  aria-pressed="false">Terminées</button>
          <button type="button" data-filter="all"   aria-pressed="false">Tout</button>
        </div>
      </div>
      <div class="pomo" style="margin-bottom:.9rem">
        <div class="pomo-ring">
          <svg viewBox="0 0 58 58" width="58" height="58">
            <circle cx="29" cy="29" r="25" fill="none" stroke="${tc('muted', .16)}" stroke-width="6"/>
            <circle id="pomo-arc" cx="29" cy="29" r="25" fill="none" stroke="${tc('in-soft')}" stroke-width="6" stroke-linecap="round"
                    stroke-dasharray="157" stroke-dashoffset="157"/>
          </svg>
        </div>
        <div style="flex:1;min-width:120px">
          <p class="pomo-time" id="pomo-time">25:00</p>
          <p class="pomo-state" id="pomo-state">Deep Work · prêt</p>
        </div>
        <div class="seg" role="group" aria-label="Durée">
          <button type="button" data-pomo-mode="25/5" aria-pressed="${DB.pomodoro.mode === '25/5'}">25/5</button>
          <button type="button" data-pomo-mode="50/10" aria-pressed="${DB.pomodoro.mode === '50/10'}">50/10</button>
        </div>
        <div style="display:flex;gap:.4rem">
          <button type="button" class="btn btn-em sm" id="pomo-go">Démarrer</button>
          <button type="button" class="btn btn-ghost sm" id="pomo-reset">Reset</button>
        </div>
      </div>
      <div id="task-list">${taskList('open')}</div>
    </section>

    <section class="card">
      <div class="card-head"><h2>XP · 14 derniers jours</h2></div>
      <div class="chartbox h-sm"><canvas id="c-xp"></canvas></div>
      <div class="card-head" style="margin:1.1rem 0 .6rem"><h2>Régularité du mois</h2></div>
      <div class="chartbox h-sm"><canvas id="c-month"></canvas></div>
    </section>
  </div>

  <section class="card">
    <div class="card-head"><h2>Mes habitudes</h2><span class="hint">${DB.habits.length} active${DB.habits.length > 1 ? 's' : ''}</span></div>
    <div id="habit-list">${habitList()}</div>
  </section>`;
}

function emptyBlock(title, text, act, label){
  return `<div class="empty">${svg(I.chart, '', tc('dim'))}<p style="font-weight:700;color:var(--muted)">${esc(title)}</p><p>${esc(text)}</p>
    ${act ? `<button type="button" class="btn btn-ghost sm" data-act="${act}" style="margin-top:.9rem">${esc(label)}</button>` : ''}</div>`;
}

function habitGrid(){
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1;
  const n = daysInMonth(y, m), td = today();
  let head = '<tr><th class="hname">Habitude</th>';
  for (let i = 1; i <= n; i++) head += `<th>${i}</th>`;
  head += '</tr>';
  const rows = DB.habits.map(h => {
    let tds = `<td class="hname" title="${esc(h.name)}"><span style="color:${pcol(pillarOf(h.pillar))}">●</span> ${esc(h.name)}</td>`;
    for (let i = 1; i <= n; i++){
      const d = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
      const on = h.log && h.log[d];
      const future = d > td;
      tds += `<td><button type="button" class="dot${on ? ' on' : ''}${d === td ? ' today' : ''}${future ? ' future' : ''}"
        data-habit="${h.id}" data-day="${d}" ${future ? 'disabled' : ''}
        aria-label="${esc(h.name)} le ${i}" aria-pressed="${!!on}"></button></td>`;
    }
    return `<tr>${tds}</tr>`;
  }).join('');
  return `<div class="hgrid-wrap"><table class="hgrid"><thead>${head}</thead><tbody>${rows}</tbody></table></div>`;
}

function habitList(){
  if (!DB.habits.length) return emptyBlock('Aucune habitude', 'Les habitudes sont le moteur de ta série.', 'add-habit', 'Ajouter');
  const d = today();
  return DB.habits.map(h => {
    const on = h.log && h.log[d];
    const done30 = Object.keys(h.log || {}).filter(k => h.log[k] && k > addDays(d, -30)).length;
    const p = pillarOf(h.pillar);
    return `<div class="row${on ? ' done' : ''}">
      <button type="button" class="check" data-habit="${h.id}" data-day="${d}" aria-pressed="${!!on}" aria-label="Valider ${esc(h.name)}">${svg(I.check,'','currentColor')}</button>
      <div class="grow">
        <p class="ttl">${esc(h.name)}</p>
        <p class="meta"><span class="chip" style="border-color:${tc(p.tok, .45)};color:${pcol(p)}">${esc(p.name)}</span>
          <span class="num">+${h.xp} XP</span><span class="num">${done30}/30 j</span></p>
      </div>
      <button type="button" class="mini" data-act="edit-habit" data-id="${h.id}" aria-label="Modifier">${svg(I.pencil)}</button>
      <button type="button" class="mini danger" data-act="del-habit" data-id="${h.id}" aria-label="Supprimer">${svg(I.trash)}</button>
    </div>`;
  }).join('');
}

const PRIO = { haute:['Haute','rose'], normale:['Normale','in'], basse:['Basse',''] };
function taskList(filter){
  let ts = DB.tasks.slice();
  if (filter === 'open') ts = ts.filter(t => !t.done);
  if (filter === 'done') ts = ts.filter(t => t.done);
  ts.sort((a, b) => (a.done - b.done) || ({haute:0,normale:1,basse:2}[a.prio] - {haute:0,normale:1,basse:2}[b.prio]) || String(a.due).localeCompare(String(b.due)));
  if (!ts.length) return emptyBlock('Rien ici', filter === 'done' ? 'Aucune tâche terminée pour l’instant.' : 'Tout est fait. Ajoute la prochaine.', 'add-task', 'Nouvelle tâche');
  const td = today();
  return ts.map(t => {
    const p = pillarOf(t.pillar), pr = PRIO[t.prio] || PRIO.normale;
    const late = !t.done && t.due && t.due < td;
    return `<div class="row${t.done ? ' done' : ''}">
      <button type="button" class="check" data-task="${t.id}" aria-pressed="${!!t.done}" aria-label="Terminer ${esc(t.title)}">${svg(I.check,'','currentColor')}</button>
      <div class="grow">
        <p class="ttl">${esc(t.title)}</p>
        <p class="meta">
          <span class="chip" style="border-color:${tc(p.tok, .45)};color:${pcol(p)}">${esc(p.name)}</span>
          <span class="chip ${pr[1]}">${pr[0]}</span>
          ${t.due ? `<span class="num"${late ? ' style="color:#FDA4AF"' : ''}>${late ? 'en retard · ' : ''}${esc(prettyDate(t.due))}</span>` : ''}
        </p>
      </div>
      <button type="button" class="mini" data-act="edit-task" data-id="${t.id}" aria-label="Modifier">${svg(I.pencil)}</button>
      <button type="button" class="mini danger" data-act="del-task" data-id="${t.id}" aria-label="Supprimer">${svg(I.trash)}</button>
    </div>`;
  }).join('');
}

function afterQG(){
  /* radar */
  const sc = pillarScores();
  makeChart('c-radar', {
    type:'radar',
    data:{ labels:PILLARS.map(p => p.name), datasets:[{
      data:PILLARS.map(p => sc[p.id]),
      backgroundColor:tc('in', .22), borderColor:tc('in-soft'), borderWidth:2,
      pointBackgroundColor:PILLARS.map(pcol), pointBorderColor:tc('panel'), pointBorderWidth:1.5, pointRadius:4 }] },
    options: noScales({ scales:{ r:{
      min:0, max:100, grid:{ color:tc('muted', .14) }, angleLines:{ color:tc('muted', .14) },
      ticks:{ display:false, stepSize:25 },
      pointLabels:{ color:tc('muted'), font:{ family:'Plus Jakarta Sans', size:11, weight:'600' } } } } })
  });

  /* xp 14 jours */
  const days = []; for (let i = 13; i >= 0; i--) days.push(addDays(today(), -i));
  const vals = days.map(d => { const r = DB.log.find(x => x.d === d); return r ? r.xp : 0; });
  makeChart('c-xp', {
    type:'bar',
    data:{ labels:days.map(d => d.slice(8)), datasets:[{ data:vals, borderRadius:5, borderSkipped:false,
      backgroundColor:days.map(d => d === today() ? tc('em') : tc('in', .5)) }] },
    options: BO()
  });

  /* régularité du mois */
  const now = new Date(), y = now.getFullYear(), m = now.getMonth() + 1, n = daysInMonth(y, m);
  const labels = [], pcts = [];
  for (let i = 1; i <= n; i++){
    const d = `${y}-${String(m).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
    labels.push(i);
    pcts.push(DB.habits.length ? Math.round(DB.habits.filter(h => h.log && h.log[d]).length / DB.habits.length * 100) : 0);
  }
  makeChart('c-month', {
    type:'line',
    data:{ labels, datasets:[{ data:pcts, borderColor:tc('em'), borderWidth:2, tension:.35, pointRadius:0,
      fill:true, backgroundColor:tc('em', .12) }] },
    options: Object.assign({}, BO(), { scales: Object.assign({}, BO().scales, { y:Object.assign({}, BO().scales.y, { max:100, ticks:{ color:tc('dim'), font:{family:'JetBrains Mono',size:10}, callback:v => v + '%' } }) }) })
  });

  paintPomo();
}

/* -------------------- VERROU MODULE -------------------- */
function viewLock(m){
  return `<div class="lockpane">
    <div class="lk">${svg(I.lock)}</div>
    <h2>${esc(m.name)}</h2>
    <p>${esc(m.desc)}</p>
    <p style="margin-top:.75rem;font-size:13px">Ce module n'est pas encore activé sur ton système.</p>
    <form id="code-form" autocomplete="off">
      <input type="text" id="code-in" placeholder="CODE D'ACCÈS" aria-label="Code d'accès" maxlength="20">
      <button type="submit" class="btn btn-em">Activer</button>
    </form>
    <p class="help" style="margin-top:.9rem">Tu peux aussi tout déverrouiller d'un coup depuis <b>Réglages → Mode simulation</b>.</p>
  </div>`;
}

/* -------------------- MODULE 1 · CASHFLOW -------------------- */
function viewCashflow(){
  const M = DB.modules.cashflow, dev = DB.settings.devise;
  const mk = monthKey(today());
  const inM  = M.tx.filter(t => monthKey(t.date) === mk && t.type === 'in').reduce((a, t) => a + t.amount, 0);
  const outM = M.tx.filter(t => monthKey(t.date) === mk && t.type === 'out').reduce((a, t) => a + t.amount, 0);
  const solde = M.tx.reduce((a, t) => a + (t.type === 'in' ? t.amount : -t.amount), 0);
  const cv = M.crypto.reduce((a, c) => a + c.qty * c.now, 0);
  const cpl = M.crypto.reduce((a, c) => a + c.qty * (c.now - c.buy), 0);

  return `${head('Cashflow & Crypto', 'Chaque mouvement enregistré nourrit ton pilier Finances.', [
    ['add-tx','Mouvement','btn-em'], ['add-crypto','Crypto','btn-ghost']])}

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Entrées du mois</p><p class="v v-em">${fmt(inM)}</p><p class="d">${esc(dev)}</p></div>
    <div class="stat"><p class="k">Sorties du mois</p><p class="v v-rose">${fmt(outM)}</p><p class="d">${esc(dev)}</p></div>
    <div class="stat"><p class="k">Net du mois</p><p class="v ${inM - outM >= 0 ? 'v-em' : 'v-rose'}">${fmt(inM - outM)}</p><p class="d">solde global ${fmt(solde)} ${esc(dev)}</p></div>
    <div class="stat"><p class="k">Portefeuille crypto</p><p class="v v-in">${fmt(cv)}</p><p class="d">${cpl >= 0 ? '+' : ''}${fmt(cpl)} ${esc(dev)} de P/L</p></div>
  </div>

  <div class="grid g-2-1" style="margin-bottom:1rem">
    <section class="card">
      <div class="card-head"><h2>6 derniers mois</h2><span class="hint">entrées vs sorties</span></div>
      <div class="chartbox h-md"><canvas id="c-cash"></canvas></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Répartition des sorties</h2></div>
      <div class="chartbox h-md"><canvas id="c-cat"></canvas></div>
    </section>
  </div>

  <div class="grid g2">
    <section class="card">
      <div class="card-head"><h2>Mouvements</h2><span class="hint">${M.tx.length}</span></div>
      ${M.tx.length ? M.tx.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0, 40).map(t => `
        <div class="row">
          <span class="mini" style="color:${t.type === 'in' ? 'var(--em)' : 'var(--rose-lite)'};border-color:${t.type === 'in' ? tc('em', .4) : tc('rose', .4)}" aria-hidden="true">${svg(t.type === 'in' ? I.up : I.down)}</span>
          <div class="grow"><p class="ttl">${esc(t.label)}</p>
            <p class="meta"><span class="chip">${esc(t.cat)}</span><span class="num">${esc(prettyDate(t.date))}</span></p></div>
          <p class="num" style="font-weight:700;color:${t.type === 'in' ? 'var(--em)' : 'var(--rose-lite)'}">${t.type === 'in' ? '+' : '−'}${fmt(t.amount)}</p>
          <button type="button" class="mini danger" data-act="del-tx" data-id="${t.id}" aria-label="Supprimer">${svg(I.trash)}</button>
        </div>`).join('') : emptyBlock('Aucun mouvement', 'Enregistre ta première entrée ou sortie.', 'add-tx', 'Ajouter')}
    </section>

    <section class="card">
      <div class="card-head"><h2>Portefeuille crypto</h2><span class="hint">${M.crypto.length} ligne${M.crypto.length > 1 ? 's' : ''}</span></div>
      ${M.crypto.length ? M.crypto.map(c => {
        const pl = c.qty * (c.now - c.buy), pct = c.buy ? (c.now - c.buy) / c.buy * 100 : 0;
        return `<div class="row">
          <div class="grow"><p class="ttl">${esc(c.name)}</p>
            <p class="meta"><span class="num">${fmt1(c.qty)} × ${fmt(c.now)}</span><span class="num">PRU ${fmt(c.buy)}</span></p></div>
          <div style="text-align:right">
            <p class="num" style="font-weight:700">${fmt(c.qty * c.now)}</p>
            <p class="num" style="font-size:11.5px;color:${pl >= 0 ? 'var(--em)' : 'var(--rose-lite)'}">${pl >= 0 ? '+' : ''}${fmt1(pct)}%</p>
          </div>
          <button type="button" class="mini" data-act="edit-crypto" data-id="${c.id}" aria-label="Modifier">${svg(I.pencil)}</button>
          <button type="button" class="mini danger" data-act="del-crypto" data-id="${c.id}" aria-label="Supprimer">${svg(I.trash)}</button>
        </div>`;
      }).join('') : emptyBlock('Portefeuille vide', 'Ajoute une ligne pour suivre ta position.', 'add-crypto', 'Ajouter')}
    </section>
  </div>`;
}

function afterCashflow(){
  const M = DB.modules.cashflow;
  const months = []; const now = new Date();
  for (let i = 5; i >= 0; i--){ const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0')); }
  const ins  = months.map(m => M.tx.filter(t => monthKey(t.date) === m && t.type === 'in').reduce((a,t) => a + t.amount, 0));
  const outs = months.map(m => M.tx.filter(t => monthKey(t.date) === m && t.type === 'out').reduce((a,t) => a + t.amount, 0));
  makeChart('c-cash', {
    type:'bar',
    data:{ labels:months.map(m => m.slice(5) + '/' + m.slice(2,4)), datasets:[
      { label:'Entrées', data:ins, backgroundColor:tc('em', .75), borderRadius:5, borderSkipped:false },
      { label:'Sorties', data:outs, backgroundColor:tc('rose', .6), borderRadius:5, borderSkipped:false }] },
    options: Object.assign({}, BO(), { plugins:{ legend:{ display:true, labels:{ color:tc('muted'), boxWidth:10, boxHeight:10, font:{ family:'Plus Jakarta Sans', size:11 } } }, tooltip:BO().plugins.tooltip } })
  });

  const cats = {};
  M.tx.filter(t => t.type === 'out').forEach(t => { cats[t.cat] = (cats[t.cat] || 0) + t.amount; });
  const keys = Object.keys(cats);
  makeChart('c-cat', {
    type:'doughnut',
    data:{ labels:keys.length ? keys : ['Aucune sortie'], datasets:[{ data:keys.length ? keys.map(k => cats[k]) : [1],
      backgroundColor:['em','am','in','in-soft','em-soft','am-soft','rose','dim'].map(n => tc(n)),
      borderColor:tc('panel'), borderWidth:2 }] },
    options: noScales({ cutout:'62%', plugins:{ legend:{ display:true, position:'bottom',
      labels:{ color:tc('muted'), boxWidth:9, boxHeight:9, padding:12, font:{ family:'Plus Jakarta Sans', size:11 } } },
      tooltip:BO().plugins.tooltip } })
  });
}

/* -------------------- MODULE 2 · ÉPARGNE 52 -------------------- */
function weekAmount(n){
  const M = DB.modules.epargne;
  if (M.plan === 'fixe') return Math.round(M.base);
  return Math.round(M.base * (0.4 + (n - 1) * 0.0245));
}
function viewEpargne(){
  const M = DB.modules.epargne, dev = DB.settings.devise;
  let total = 0, saved = 0, doneN = 0;
  const cells = [];
  for (let n = 1; n <= 52; n++){
    const amt = weekAmount(n); total += amt;
    const on = !!M.weeks[n];
    if (on){ saved += amt; doneN++; }
    cells.push(`<button type="button" class="dot${on ? ' on' : ''}" style="width:100%;height:34px;border-radius:.5rem;font-size:10px;font-family:'JetBrains Mono',monospace;color:${on ? 'var(--on-em)' : 'var(--dim)'}"
      data-act="week" data-n="${n}" aria-pressed="${on}" aria-label="Semaine ${n}, ${amt} ${dev}">${n}</button>`);
  }
  return `${head('Défi Épargne 52 Semaines', 'Une case par semaine. La courbe fait le reste.', [['epargne-plan','Régler le plan','btn-ghost']])}

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Déjà épargné</p><p class="v v-em">${fmt(saved)}</p><p class="d">${esc(dev)}</p></div>
    <div class="stat"><p class="k">Objectif annuel</p><p class="v">${fmt(total)}</p><p class="d">${esc(dev)} sur 52 semaines</p></div>
    <div class="stat"><p class="k">Semaines validées</p><p class="v v-am">${doneN}<span style="font-size:1rem;color:var(--dim)">/52</span></p><p class="d">${Math.round(doneN / 52 * 100)}%</p></div>
    <div class="stat"><p class="k">Reste à faire</p><p class="v v-in">${fmt(total - saved)}</p><p class="d">${esc(dev)}</p></div>
  </div>

  <section class="card" style="margin-bottom:1rem">
    <div class="card-head"><h2>Les 52 semaines</h2><span class="hint">plan ${M.plan === 'fixe' ? 'fixe' : 'progressif'} · base ${fmt(M.base)} ${esc(dev)}</span></div>
    <div class="track" style="margin-bottom:.9rem"><div class="fill fill-em" style="width:${(saved / total * 100).toFixed(1)}%"></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(42px,1fr));gap:5px">${cells.join('')}</div>
  </section>

  <section class="card">
    <div class="card-head"><h2>Courbe cumulée</h2><span class="hint">prévu vs réel</span></div>
    <div class="chartbox h-md"><canvas id="c-epargne"></canvas></div>
  </section>`;
}
function afterEpargne(){
  const M = DB.modules.epargne;
  const plan = [], reel = []; let p = 0, r = 0;
  for (let n = 1; n <= 52; n++){ const a = weekAmount(n); p += a; if (M.weeks[n]) r += a; plan.push(p); reel.push(r); }
  makeChart('c-epargne', {
    type:'line',
    data:{ labels:Array.from({length:52}, (_, i) => i + 1), datasets:[
      { label:'Prévu', data:plan, borderColor:tc('muted', .45), borderWidth:2, borderDash:[5,4], pointRadius:0, tension:.2 },
      { label:'Réel',  data:reel, borderColor:tc('em'), borderWidth:2.5, pointRadius:0, tension:.2, fill:true, backgroundColor:tc('em', .12) }] },
    options: Object.assign({}, BO(), { plugins:{ legend:{ display:true, labels:{ color:tc('muted'), boxWidth:10, boxHeight:10, font:{family:'Plus Jakarta Sans',size:11} } }, tooltip:BO().plugins.tooltip } })
  });
}

/* -------------------- MODULE 3 · ATHLÈTE -------------------- */
function viewAthlete(){
  const M = DB.modules.athlete;
  const ws = M.weights.slice().sort((a,b) => a.date.localeCompare(b.date));
  const last = ws.length ? ws[ws.length - 1].kg : 0;
  const first = ws.length ? ws[0].kg : 0;
  const delta = last - first;
  const mk = monthKey(today());
  const sessM = M.sessions.filter(s => monthKey(s.date) === mk).length;
  const vol = M.sessions.filter(s => monthKey(s.date) === mk).reduce((a,s) => a + (s.volume || 0), 0);

  return `${head('Athlète · Masse & Sèche', 'Poids, séances et cibles nutritionnelles.', [
    ['add-weight','Pesée','btn-em'], ['add-session','Séance','btn-ghost'], ['athlete-goal','Objectif','btn-ghost']])}

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Poids actuel</p><p class="v v-em">${last ? fmt1(last) : '—'}<span style="font-size:1rem;color:var(--dim)"> kg</span></p><p class="d">${ws.length ? (delta >= 0 ? '+' : '') + fmt1(delta) + ' kg depuis le début' : 'aucune pesée'}</p></div>
    <div class="stat"><p class="k">Objectif</p><p class="v v-am">${M.target ? fmt1(M.target) : '—'}<span style="font-size:1rem;color:var(--dim)"> kg</span></p><p class="d">mode ${M.goal === 'seche' ? 'sèche' : 'prise de masse'}</p></div>
    <div class="stat"><p class="k">Séances ce mois</p><p class="v v-in">${sessM}</p><p class="d">${fmt(vol)} kg de volume</p></div>
    <div class="stat"><p class="k">Cible du jour</p><p class="v">${fmt(M.kcal)}</p><p class="d">kcal · ${fmt(M.prot)} g de protéines</p></div>
  </div>

  <div class="grid g-2-1" style="margin-bottom:1rem">
    <section class="card">
      <div class="card-head"><h2>Évolution du poids</h2></div>
      <div class="chartbox h-md"><canvas id="c-weight"></canvas></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Volume par semaine</h2><span class="hint">8 semaines</span></div>
      <div class="chartbox h-md"><canvas id="c-vol"></canvas></div>
    </section>
  </div>

  <section class="card">
    <div class="card-head"><h2>Séances</h2><span class="hint">${M.sessions.length}</span></div>
    ${M.sessions.length ? M.sessions.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,30).map(s => `
      <div class="row">
        <span class="mini" aria-hidden="true">${svg(I.dumbbell)}</span>
        <div class="grow"><p class="ttl">${esc(s.type)}</p>
          <p class="meta"><span class="num">${esc(prettyDate(s.date))}</span>${s.volume ? `<span class="num">${fmt(s.volume)} kg de volume</span>` : ''}</p></div>
        <button type="button" class="mini danger" data-act="del-session" data-id="${s.id}" aria-label="Supprimer">${svg(I.trash)}</button>
      </div>`).join('') : emptyBlock('Aucune séance', 'Enregistre ta première séance.', 'add-session', 'Ajouter')}
  </section>`;
}
function afterAthlete(){
  const M = DB.modules.athlete;
  const ws = M.weights.slice().sort((a,b) => a.date.localeCompare(b.date));
  makeChart('c-weight', {
    type:'line',
    data:{ labels:ws.map(w => prettyDate(w.date)), datasets:[{ data:ws.map(w => w.kg), borderColor:tc('em'), borderWidth:2.5,
      tension:.3, pointRadius:3, pointBackgroundColor:tc('em'), fill:true, backgroundColor:tc('em', .1) }] },
    options: Object.assign({}, BO(), { scales:Object.assign({}, BO().scales, { y:Object.assign({}, BO().scales.y, { beginAtZero:false }) }) })
  });
  const labels = [], vols = [];
  for (let i = 7; i >= 0; i--){
    const end = addDays(today(), -i * 7), start = addDays(end, -6);
    labels.push('S-' + i);
    vols.push(M.sessions.filter(s => s.date >= start && s.date <= end).reduce((a,s) => a + (s.volume || 0), 0));
  }
  makeChart('c-vol', { type:'bar',
    data:{ labels, datasets:[{ data:vols, backgroundColor:tc('in', .6), borderRadius:5, borderSkipped:false }] },
    options: BO() });
}

/* -------------------- MODULE 4 · SIDE-HUSTLE -------------------- */
const HSTAT = { idee:['Idée',''], lance:['Lancé','in'], rentable:['Rentable','em'], pause:['En pause','am'] };
function viewHustle(){
  const M = DB.modules.hustle, dev = DB.settings.devise;
  const mk = monthKey(today());
  const revM = M.revenues.filter(r => monthKey(r.date) === mk).reduce((a,r) => a + r.amount, 0);
  const revTot = M.revenues.reduce((a,r) => a + r.amount, 0);
  const best = {};
  M.revenues.forEach(r => { best[r.projectId] = (best[r.projectId] || 0) + r.amount; });
  const bestId = Object.keys(best).sort((a,b) => best[b] - best[a])[0];
  const bestP = M.projects.find(p => p.id === bestId);

  return `${head('Architecte de Side-Hustle', 'Du projet à l’argent, sans perdre le fil.', [
    ['add-project','Projet','btn-em'], ['add-revenue','Revenu','btn-ghost']])}

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Revenus du mois</p><p class="v v-em">${fmt(revM)}</p><p class="d">${esc(dev)}</p></div>
    <div class="stat"><p class="k">Revenus cumulés</p><p class="v">${fmt(revTot)}</p><p class="d">${esc(dev)}</p></div>
    <div class="stat"><p class="k">Projets actifs</p><p class="v v-in">${M.projects.filter(p => p.status !== 'pause').length}</p><p class="d">sur ${M.projects.length}</p></div>
    <div class="stat"><p class="k">Meilleur projet</p><p class="v v-am" style="font-size:1.05rem;font-family:'Space Grotesk',sans-serif">${bestP ? esc(bestP.name) : '—'}</p><p class="d">${bestP ? fmt(best[bestId]) + ' ' + esc(dev) : 'aucun revenu'}</p></div>
  </div>

  <div class="grid g-2-1" style="margin-bottom:1rem">
    <section class="card">
      <div class="card-head"><h2>Revenus · 6 mois</h2></div>
      <div class="chartbox h-md"><canvas id="c-rev"></canvas></div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Part de chaque projet</h2></div>
      <div class="chartbox h-md"><canvas id="c-proj"></canvas></div>
    </section>
  </div>

  <div class="grid g2">
    <section class="card">
      <div class="card-head"><h2>Projets</h2><span class="hint">${M.projects.length}</span></div>
      ${M.projects.length ? M.projects.map(p => {
        const got = best[p.id] || 0, pct = p.goal ? clamp(got / p.goal * 100, 0, 100) : 0;
        const st = HSTAT[p.status] || HSTAT.idee;
        return `<div class="row" style="align-items:flex-start;flex-direction:column;gap:.5rem">
          <div style="display:flex;align-items:center;gap:.7rem;width:100%">
            <div class="grow"><p class="ttl">${esc(p.name)}</p>
              <p class="meta"><span class="chip ${st[1]}">${st[0]}</span>
                <span class="num">${fmt(got)}${p.goal ? ' / ' + fmt(p.goal) : ''} ${esc(dev)}</span></p></div>
            <button type="button" class="mini" data-act="edit-project" data-id="${p.id}" aria-label="Modifier">${svg(I.pencil)}</button>
            <button type="button" class="mini danger" data-act="del-project" data-id="${p.id}" aria-label="Supprimer">${svg(I.trash)}</button>
          </div>
          ${p.goal ? `<div class="track thin" style="width:100%"><div class="fill fill-em" style="width:${pct.toFixed(1)}%"></div></div>` : ''}
        </div>`;
      }).join('') : emptyBlock('Aucun projet', 'Crée ton premier side-hustle.', 'add-project', 'Ajouter')}
    </section>

    <section class="card">
      <div class="card-head"><h2>Revenus</h2><span class="hint">${M.revenues.length}</span></div>
      ${M.revenues.length ? M.revenues.slice().sort((a,b) => b.date.localeCompare(a.date)).slice(0,30).map(r => {
        const p = M.projects.find(x => x.id === r.projectId);
        return `<div class="row">
          <div class="grow"><p class="ttl">${esc(r.label || (p ? p.name : 'Revenu'))}</p>
            <p class="meta">${p ? `<span class="chip in">${esc(p.name)}</span>` : ''}<span class="num">${esc(prettyDate(r.date))}</span></p></div>
          <p class="num" style="font-weight:700;color:var(--em)">+${fmt(r.amount)}</p>
          <button type="button" class="mini danger" data-act="del-revenue" data-id="${r.id}" aria-label="Supprimer">${svg(I.trash)}</button>
        </div>`;
      }).join('') : emptyBlock('Aucun revenu', 'Le premier franc compte autant que le millionième.', 'add-revenue', 'Ajouter')}
    </section>
  </div>`;
}
function afterHustle(){
  const M = DB.modules.hustle;
  const months = []; const now = new Date();
  for (let i = 5; i >= 0; i--){ const d = new Date(now.getFullYear(), now.getMonth() - i, 1); months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2,'0')); }
  makeChart('c-rev', { type:'line',
    data:{ labels:months.map(m => m.slice(5) + '/' + m.slice(2,4)), datasets:[{
      data:months.map(m => M.revenues.filter(r => monthKey(r.date) === m).reduce((a,r) => a + r.amount, 0)),
      borderColor:tc('em'), borderWidth:2.5, tension:.33, pointRadius:3, pointBackgroundColor:tc('em'),
      fill:true, backgroundColor:tc('em', .12) }] },
    options: BO() });

  const by = {}; M.revenues.forEach(r => { const p = M.projects.find(x => x.id === r.projectId); const k = p ? p.name : 'Autre'; by[k] = (by[k] || 0) + r.amount; });
  const keys = Object.keys(by);
  makeChart('c-proj', { type:'doughnut',
    data:{ labels:keys.length ? keys : ['Aucun revenu'], datasets:[{ data:keys.length ? keys.map(k => by[k]) : [1],
      backgroundColor:['in','em','am','in-soft','em-soft','am-soft','dim'].map(n => tc(n)), borderColor:tc('panel'), borderWidth:2 }] },
    options: noScales({ cutout:'62%', plugins:{ legend:{ display:true, position:'bottom',
      labels:{ color:tc('muted'), boxWidth:9, boxHeight:9, padding:12, font:{family:'Plus Jakarta Sans',size:11} } }, tooltip:BO().plugins.tooltip } }) });
}

/* -------------------- MODULE 5 · CRÉATEUR VIRAL -------------------- */
const VSTAT = { idee:['Idée',''], prod:['En production','am'], planifie:['Planifié','in'], publie:['Publié','em'] };
function viewViral(){
  const M = DB.modules.viral;
  const pub = M.ideas.filter(i => i.status === 'publie');
  const views = pub.reduce((a,i) => a + (i.views || 0), 0);
  const hook = pub.length ? pub.reduce((a,i) => a + (i.hook || 0), 0) / pub.length : 0;
  const bestV = pub.slice().sort((a,b) => (b.views || 0) - (a.views || 0))[0];

  const col = st => `
    <section class="card tight">
      <div class="card-head" style="margin-bottom:.6rem"><h3>${VSTAT[st][0]}</h3>
        <span class="chip ${VSTAT[st][1]}">${M.ideas.filter(i => i.status === st).length}</span></div>
      ${M.ideas.filter(i => i.status === st).map(i => `
        <div class="row" style="min-height:46px">
          <div class="grow"><p class="ttl" style="font-size:13px">${esc(i.title)}</p>
            <p class="meta"><span class="chip">${esc(i.platform)}</span>${i.date ? `<span class="num">${esc(prettyDate(i.date))}</span>` : ''}${i.views ? `<span class="num">${fmt(i.views)} vues</span>` : ''}</p></div>
          <button type="button" class="mini" data-act="edit-idea" data-id="${i.id}" aria-label="Modifier">${svg(I.pencil)}</button>
          <button type="button" class="mini danger" data-act="del-idea" data-id="${i.id}" aria-label="Supprimer">${svg(I.trash)}</button>
        </div>`).join('') || '<p class="help" style="padding:.6rem .2rem">Rien pour l’instant.</p>'}
    </section>`;

  return `${head('Créateur Viral', 'TikTok, Shorts, Reels : du vide-idées à la publication.', [['add-idea','Nouvelle idée','btn-em']])}

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Publiés</p><p class="v v-em">${pub.length}</p><p class="d">sur ${M.ideas.length} idées</p></div>
    <div class="stat"><p class="k">Vues cumulées</p><p class="v v-in">${fmt(views)}</p><p class="d">tous contenus</p></div>
    <div class="stat"><p class="k">Taux d'accroche moyen</p><p class="v v-am">${fmt1(hook)}<span style="font-size:1rem;color:var(--dim)">%</span></p><p class="d">3 premières secondes</p></div>
    <div class="stat"><p class="k">Meilleur contenu</p><p class="v" style="font-size:1.05rem;font-family:'Space Grotesk',sans-serif">${bestV ? esc(bestV.title.slice(0,22)) : '—'}</p><p class="d">${bestV ? fmt(bestV.views || 0) + ' vues' : 'aucune publication'}</p></div>
  </div>

  <section class="card" style="margin-bottom:1rem">
    <div class="card-head"><h2>Vues des 10 derniers contenus</h2></div>
    <div class="chartbox h-md"><canvas id="c-views"></canvas></div>
  </section>

  <div class="grid g4">${['idee','prod','planifie','publie'].map(col).join('')}</div>`;
}
function afterViral(){
  const M = DB.modules.viral;
  const pub = M.ideas.filter(i => i.status === 'publie').slice(-10);
  makeChart('c-views', { type:'bar',
    data:{ labels:pub.length ? pub.map(i => i.title.slice(0,12)) : ['—'], datasets:[{
      data:pub.length ? pub.map(i => i.views || 0) : [0],
      backgroundColor:tc('in-soft', .65), borderRadius:5, borderSkipped:false }] },
    options: BO() });
}

/* -------------------- MODULE 6 · SECOND CERVEAU -------------------- */
function viewCerveau(){
  const M = DB.modules.cerveau;
  const pages = M.books.reduce((a,b) => a + (b.read || 0), 0);
  const fin = M.books.filter(b => b.read >= b.pages && b.pages > 0).length;
  const hours = M.skills.reduce((a,s) => a + (s.hours || 0), 0);
  const target = M.skills.reduce((a,s) => a + (s.target || 0), 0);

  return `${head('Second Cerveau', 'Ce que tu lis et ce que tu pratiques vraiment.', [
    ['add-book','Lecture','btn-em'], ['add-skill','Compétence','btn-ghost']])}

  <div class="grid g4" style="margin-bottom:1rem">
    <div class="stat"><p class="k">Pages lues</p><p class="v v-em">${fmt(pages)}</p><p class="d">tous livres confondus</p></div>
    <div class="stat"><p class="k">Livres terminés</p><p class="v">${fin}<span style="font-size:1rem;color:var(--dim)">/${M.books.length}</span></p><p class="d">en cours : ${M.books.length - fin}</p></div>
    <div class="stat"><p class="k">Heures de pratique</p><p class="v v-in">${fmt1(hours)}</p><p class="d">${target ? Math.round(hours / target * 100) + '% de l’objectif' : 'sans objectif'}</p></div>
    <div class="stat"><p class="k">Compétences suivies</p><p class="v v-am">${M.skills.length}</p><p class="d">pratique délibérée</p></div>
  </div>

  <div class="grid g2">
    <section class="card">
      <div class="card-head"><h2>Lectures</h2><span class="hint">${M.books.length}</span></div>
      ${M.books.length ? M.books.map(b => {
        const pct = b.pages ? clamp(b.read / b.pages * 100, 0, 100) : 0;
        return `<div class="row" style="flex-direction:column;align-items:stretch;gap:.5rem">
          <div style="display:flex;align-items:center;gap:.7rem">
            <div class="grow"><p class="ttl">${esc(b.title)}</p>
              <p class="meta"><span class="num">${fmt(b.read)} / ${fmt(b.pages)} pages</span><span class="num">${Math.round(pct)}%</span></p></div>
            <button type="button" class="btn btn-ghost xs" data-act="read-plus" data-id="${b.id}">+10 p.</button>
            <button type="button" class="mini" data-act="edit-book" data-id="${b.id}" aria-label="Modifier">${svg(I.pencil)}</button>
            <button type="button" class="mini danger" data-act="del-book" data-id="${b.id}" aria-label="Supprimer">${svg(I.trash)}</button>
          </div>
          <div class="track thin"><div class="fill fill-em" style="width:${pct.toFixed(1)}%"></div></div>
        </div>`;
      }).join('') : emptyBlock('Aucune lecture', 'Ajoute le livre que tu lis en ce moment.', 'add-book', 'Ajouter')}
    </section>

    <section class="card">
      <div class="card-head"><h2>Compétences</h2><span class="hint">${M.skills.length}</span></div>
      ${M.skills.length ? M.skills.map(s => {
        const pct = s.target ? clamp(s.hours / s.target * 100, 0, 100) : 0;
        return `<div class="row" style="flex-direction:column;align-items:stretch;gap:.5rem">
          <div style="display:flex;align-items:center;gap:.7rem">
            <div class="grow"><p class="ttl">${esc(s.name)}</p>
              <p class="meta"><span class="num">${fmt1(s.hours)} h${s.target ? ' / ' + fmt(s.target) + ' h' : ''}</span></p></div>
            <button type="button" class="btn btn-ghost xs" data-act="hour-plus" data-id="${s.id}">+1 h</button>
            <button type="button" class="mini" data-act="edit-skill" data-id="${s.id}" aria-label="Modifier">${svg(I.pencil)}</button>
            <button type="button" class="mini danger" data-act="del-skill" data-id="${s.id}" aria-label="Supprimer">${svg(I.trash)}</button>
          </div>
          ${s.target ? `<div class="track thin"><div class="fill fill-in" style="width:${pct.toFixed(1)}%"></div></div>` : ''}
        </div>`;
      }).join('') : emptyBlock('Aucune compétence', 'Les 10 000 heures commencent par la première.', 'add-skill', 'Ajouter')}
    </section>
  </div>`;
}

/* -------------------- RÉGLAGES -------------------- */
function viewSettings(){
  const sim = DB.settings.simulation;
  return `${head('Réglages', 'Tes données, tes modules, tes sauvegardes.', [])}

  <div class="grid g2">
    <section class="card">
      <div class="card-head"><h2>Modules</h2><span class="hint">${MODULES.filter(m => DB.modules[m.id].unlocked).length}/6 activés</span></div>
      <div class="row" style="border-color:${tc('am', .35)};background:${tc('am', .07)}">
        <div class="grow"><p class="ttl">Mode simulation</p>
          <p class="meta">Déverrouille les 6 modules pour tester, sans saisir de code.</p></div>
        <button type="button" class="btn ${sim ? 'btn-am' : 'btn-ghost'} sm" data-act="toggle-sim">${sim ? 'Activé' : 'Désactivé'}</button>
      </div>
      ${MODULES.map(m => {
        const on = DB.modules[m.id].unlocked;
        return `<div class="row">
          <span class="mini" aria-hidden="true">${svg(m.icon)}</span>
          <div class="grow"><p class="ttl">${esc(m.name)}</p>
            <p class="meta"><span class="num">code ${esc(m.code)}</span></p></div>
          <button type="button" class="btn ${on ? 'btn-ghost' : 'btn-em'} xs" data-act="toggle-mod" data-id="${m.id}">${on ? 'Désactiver' : 'Activer'}</button>
        </div>`;
      }).join('')}
    </section>

    <section class="card">
      <div class="card-head"><h2>Données</h2><span class="hint">100 % local</span></div>
      <p class="help" style="margin-bottom:.9rem">Rien ne quitte cet appareil. Exporte un fichier JSON pour sauvegarder ou passer sur un autre téléphone.</p>
      <div style="display:flex;flex-wrap:wrap;gap:.5rem">
        <button type="button" class="btn btn-em sm" data-act="export">${svg(I.down)} Exporter (JSON)</button>
        <button type="button" class="btn btn-ghost sm" data-act="import">${svg(I.up)} Importer</button>
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>

      <div class="card-head" style="margin:1.4rem 0 .6rem"><h2>Devise</h2></div>
      <div class="field"><label for="devise">Affichée dans les modules financiers</label>
        <select id="devise" data-act="devise">
          ${['FCFA','EUR','USD','MAD','DH','CAD'].map(c => `<option value="${c}"${DB.settings.devise === c ? ' selected' : ''}>${c}</option>`).join('')}
        </select></div>

      <div class="card-head" style="margin:1.4rem 0 .6rem"><h2>Zone rouge</h2></div>
      <button type="button" class="btn btn-danger sm" data-act="reset">${svg(I.trash)} Tout effacer et repartir à zéro</button>
    </section>
  </div>

  <section class="card" style="margin-top:1rem">
    <div class="card-head"><h2>Comment l'XP est calculé</h2></div>
    <div class="grid g3">
      <div class="stat"><p class="k">Habitude validée</p><p class="v v-em">+${XP.habit}<span style="font-size:.9rem;color:var(--dim)"> à +20</span></p><p class="d">selon l'XP que tu lui donnes</p></div>
      <div class="stat"><p class="k">Tâche terminée</p><p class="v v-in">+${XP.task}<span style="font-size:.9rem;color:var(--dim)"> / +${XP.taskHigh}</span></p><p class="d">priorité haute = plus d'XP</p></div>
      <div class="stat"><p class="k">Journée parfaite</p><p class="v v-am">+${XP.perfectDay}</p><p class="d">toutes les habitudes du jour</p></div>
      <div class="stat"><p class="k">Session Deep Work</p><p class="v v-am">+${XP.pomodoro}</p><p class="d">à la fin du minuteur</p></div>
      <div class="stat"><p class="k">Action dans un module</p><p class="v">+${XP.module}</p><p class="d">mouvement, séance, revenu…</p></div>
      <div class="stat"><p class="k">Niveau max</p><p class="v v-em">${MAX_LEVEL}</p><p class="d">Légende · ${fmt(cumXp(MAX_LEVEL))} XP</p></div>
    </div>
  </section>`;
}

function head(title, sub, actions){
  return `<div class="page-head">
    <div><h1>${esc(title)}</h1><p class="sub">${esc(sub)}</p></div>
    <div style="display:flex;gap:.5rem;flex-wrap:wrap">
      ${(actions || []).map(([act, label, cls]) => `<button type="button" class="btn ${cls} sm" data-act="${act}">${svg(I.plus)} ${esc(label)}</button>`).join('')}
    </div>
  </div>`;
}

const VIEWS = { cashflow:viewCashflow, epargne:viewEpargne, athlete:viewAthlete, hustle:viewHustle, viral:viewViral, cerveau:viewCerveau };
const AFTER = { cashflow:afterCashflow, epargne:afterEpargne, athlete:afterAthlete, hustle:afterHustle, viral:afterViral };

/* ======================= 11. POMODORO ======================= */
const POMO = { running:false, phase:'work', left:25 * 60, t:null };
function pomoDur(phase){
  const [w, b] = DB.pomodoro.mode.split('/').map(Number);
  return (phase === 'work' ? w : b) * 60;
}
function paintPomo(){
  const t = $('#pomo-time'); if (!t) return;
  const m = Math.floor(POMO.left / 60), s = POMO.left % 60;
  t.textContent = String(m).padStart(2,'0') + ':' + String(s).padStart(2,'0');
  $('#pomo-state').textContent = POMO.phase === 'work'
    ? (POMO.running ? 'Deep Work · en cours' : 'Deep Work · prêt')
    : (POMO.running ? 'Pause · en cours' : 'Pause · prête');
  const total = pomoDur(POMO.phase);
  const arc = $('#pomo-arc');
  if (arc){
    const CIRC = 157;
    arc.style.strokeDashoffset = (CIRC * (POMO.left / total)).toFixed(1);
    arc.setAttribute('stroke', POMO.phase === 'work' ? tc('in-soft') : tc('em'));
  }
  const go = $('#pomo-go'); if (go) go.textContent = POMO.running ? 'Pause' : 'Démarrer';
}
function pomoTick(){
  POMO.left--;
  if (POMO.left <= 0){
    clearInterval(POMO.t); POMO.t = null; POMO.running = false;
    if (POMO.phase === 'work'){
      const d = today();
      DB.pomodoro.sessions++;
      DB.pomodoro.byDay[d] = (DB.pomodoro.byDay[d] || 0) + 1;
      grantXp(XP.pomodoro, 'Session Deep Work terminée');
      confetti(90);
      POMO.phase = 'break';
    } else POMO.phase = 'work';
    POMO.left = pomoDur(POMO.phase);
    save();
    if (TAB === 'qg') render();
    return;
  }
  paintPomo();
}
function pomoToggle(){
  if (POMO.running){ clearInterval(POMO.t); POMO.t = null; POMO.running = false; }
  else { POMO.running = true; POMO.t = setInterval(pomoTick, 1000); }
  paintPomo();
}
function pomoReset(){
  clearInterval(POMO.t); POMO.t = null; POMO.running = false;
  POMO.phase = 'work'; POMO.left = pomoDur('work'); paintPomo();
}

/* ======================= 12. ACTIONS ======================= */
const dev = () => DB.settings.devise;
const pillarOptions = () => PILLARS.map(p => ({ v:p.id, t:p.name }));

function toggleHabit(id, day){
  const h = DB.habits.find(x => x.id === id); if (!h) return;
  h.log = h.log || {};
  const on = !!h.log[day];
  const before = levelFromXp(DB.profile.xp);
  if (on){ delete h.log[day]; logXp(-h.xp, day); }
  else { h.log[day] = true; logXp(h.xp, day); }
  if (day === today()) checkPerfectDay();
  save(); paintTop(); render();
  const after = levelFromXp(DB.profile.xp);
  if (!on && after > before){ toast('Niveau ' + after + ' — ' + rankFor(after) + ' !', 'am'); confetti(130); }
}

function toggleTask(id){
  const t = DB.tasks.find(x => x.id === id); if (!t) return;
  const gain = t.prio === 'haute' ? XP.taskHigh : XP.task;
  if (t.done){ t.done = false; logXp(-gain, t.doneAt || today()); t.doneAt = null; save(); paintTop(); render(); }
  else { t.done = true; t.doneAt = today(); grantXp(gain, 'Tâche terminée'); render(); }
}

function askHabit(h){
  formModal(h ? 'Modifier l’habitude' : 'Nouvelle habitude', [
    { name:'name', label:'Nom', value:h ? h.name : '', required:true, wide:true, placeholder:'Ex. Sport · 30 min' },
    { name:'pillar', label:'Pilier', type:'select', options:pillarOptions(), value:h ? h.pillar : 'discipline' },
    { name:'xp', label:'XP par validation', type:'number', min:1, value:h ? h.xp : 10 }
  ], d => {
    const xp = clamp(parseInt(d.xp, 10) || 10, 1, 50);
    if (h){ h.name = d.name; h.pillar = d.pillar; h.xp = xp; toast('Habitude modifiée'); }
    else { DB.habits.push({ id:uid(), name:d.name, pillar:d.pillar, xp, created:today(), log:{} }); toast('Habitude ajoutée'); }
    save(); render();
  });
}

function askTask(t){
  formModal(t ? 'Modifier la tâche' : 'Nouvelle tâche', [
    { name:'title', label:'Intitulé', value:t ? t.title : '', required:true, wide:true, placeholder:'Ex. Appeler le fournisseur' },
    { name:'pillar', label:'Pilier', type:'select', options:pillarOptions(), value:t ? t.pillar : 'business' },
    { name:'prio', label:'Priorité', type:'select', options:[{v:'haute',t:'Haute'},{v:'normale',t:'Normale'},{v:'basse',t:'Basse'}], value:t ? t.prio : 'normale' },
    { name:'due', label:'Échéance', type:'date', value:t ? t.due : today(), wide:true }
  ], d => {
    if (t){ Object.assign(t, { title:d.title, pillar:d.pillar, prio:d.prio, due:d.due }); toast('Tâche modifiée'); }
    else { DB.tasks.push({ id:uid(), title:d.title, pillar:d.pillar, prio:d.prio, due:d.due, done:false, created:today() }); toast('Tâche ajoutée'); }
    save(); render();
  });
}

function moduleAction(label){ grantXp(XP.module, label); }

const ACTS = {
  /* --- QG --- */
  'add-habit':  () => askHabit(null),
  'edit-habit': id => askHabit(DB.habits.find(h => h.id === id)),
  'del-habit':  id => { const h = DB.habits.find(x => x.id === id); if (!h) return;
    confirmModal('Supprimer l’habitude', `« ${h.name} » et son historique seront effacés. L'XP déjà gagné reste acquis.`, () => {
      DB.habits = DB.habits.filter(x => x.id !== id); save(); render(); toast('Habitude supprimée', 'rose'); }); },
  'add-task':   () => askTask(null),
  'edit-task':  id => askTask(DB.tasks.find(t => t.id === id)),
  'del-task':   id => { DB.tasks = DB.tasks.filter(x => x.id !== id); save(); render(); toast('Tâche supprimée', 'rose'); },

  /* --- cashflow --- */
  'add-tx': () => formModal('Nouveau mouvement', [
      { name:'label', label:'Libellé', required:true, wide:true, placeholder:'Ex. Vente abonnement' },
      { name:'type', label:'Type', type:'select', options:[{v:'in',t:'Entrée'},{v:'out',t:'Sortie'}], value:'in' },
      { name:'amount', label:'Montant (' + dev() + ')', type:'number', min:0, required:true, value:'' },
      { name:'cat', label:'Catégorie', value:'Général' },
      { name:'date', label:'Date', type:'date', value:today() }
    ], d => { DB.modules.cashflow.tx.push({ id:uid(), label:d.label, type:d.type, amount:Math.abs(parseFloat(d.amount) || 0), cat:d.cat || 'Général', date:d.date || today() });
      save(); render(); moduleAction('Mouvement enregistré'); }),
  'del-tx': id => { DB.modules.cashflow.tx = DB.modules.cashflow.tx.filter(t => t.id !== id); save(); render(); toast('Mouvement supprimé', 'rose'); },
  'add-crypto': () => formModal('Ligne crypto', [
      { name:'name', label:'Actif', required:true, placeholder:'BTC, ETH, SOL…' },
      { name:'qty', label:'Quantité', type:'number', step:'any', min:0, required:true },
      { name:'buy', label:'Prix d’achat (' + dev() + ')', type:'number', step:'any', min:0, required:true },
      { name:'now', label:'Prix actuel (' + dev() + ')', type:'number', step:'any', min:0, required:true }
    ], d => { DB.modules.cashflow.crypto.push({ id:uid(), name:d.name.toUpperCase(), qty:parseFloat(d.qty)||0, buy:parseFloat(d.buy)||0, now:parseFloat(d.now)||0 });
      save(); render(); moduleAction('Ligne crypto ajoutée'); }),
  'edit-crypto': id => { const c = DB.modules.cashflow.crypto.find(x => x.id === id); if (!c) return;
      formModal('Modifier ' + c.name, [
        { name:'name', label:'Actif', value:c.name, required:true },
        { name:'qty', label:'Quantité', type:'number', step:'any', value:c.qty },
        { name:'buy', label:'Prix d’achat', type:'number', step:'any', value:c.buy },
        { name:'now', label:'Prix actuel', type:'number', step:'any', value:c.now }
      ], d => { Object.assign(c, { name:d.name.toUpperCase(), qty:parseFloat(d.qty)||0, buy:parseFloat(d.buy)||0, now:parseFloat(d.now)||0 }); save(); render(); toast('Ligne mise à jour'); }); },
  'del-crypto': id => { DB.modules.cashflow.crypto = DB.modules.cashflow.crypto.filter(c => c.id !== id); save(); render(); toast('Ligne supprimée', 'rose'); },

  /* --- épargne --- */
  'week': n => { const M = DB.modules.epargne, k = String(n);
      if (M.weeks[k]) { delete M.weeks[k]; save(); render(); }
      else { M.weeks[k] = true; save(); render(); moduleAction('Semaine ' + n + ' épargnée'); } },
  'epargne-plan': () => { const M = DB.modules.epargne;
      formModal('Plan d’épargne', [
        { name:'plan', label:'Type', type:'select', options:[{v:'progressif',t:'Progressif (monte semaine après semaine)'},{v:'fixe',t:'Fixe (même montant chaque semaine)'}], value:M.plan, wide:true },
        { name:'base', label:'Montant de référence (' + dev() + ')', type:'number', min:0, value:M.base, wide:true, help:'En progressif, les semaines vont d’environ 40 % à 165 % de ce montant.' }
      ], d => { M.plan = d.plan; M.base = Math.max(0, parseFloat(d.base) || 0); save(); render(); toast('Plan mis à jour'); }); },

  /* --- athlète --- */
  'add-weight': () => formModal('Nouvelle pesée', [
      { name:'kg', label:'Poids (kg)', type:'number', step:'any', min:0, required:true },
      { name:'date', label:'Date', type:'date', value:today() }
    ], d => { DB.modules.athlete.weights.push({ id:uid(), kg:parseFloat(d.kg)||0, date:d.date || today() }); save(); render(); moduleAction('Pesée enregistrée'); }),
  'add-session': () => formModal('Nouvelle séance', [
      { name:'type', label:'Type de séance', required:true, wide:true, placeholder:'Push, Pull, Jambes, Cardio…' },
      { name:'volume', label:'Volume total (kg)', type:'number', min:0, value:'' },
      { name:'date', label:'Date', type:'date', value:today() }
    ], d => { DB.modules.athlete.sessions.push({ id:uid(), type:d.type, volume:parseFloat(d.volume)||0, date:d.date || today() }); save(); render(); moduleAction('Séance enregistrée'); }),
  'del-session': id => { DB.modules.athlete.sessions = DB.modules.athlete.sessions.filter(s => s.id !== id); save(); render(); toast('Séance supprimée', 'rose'); },
  'athlete-goal': () => { const M = DB.modules.athlete;
      formModal('Objectif', [
        { name:'goal', label:'Mode', type:'select', options:[{v:'masse',t:'Prise de masse'},{v:'seche',t:'Sèche'}], value:M.goal, wide:true },
        { name:'target', label:'Poids cible (kg)', type:'number', step:'any', value:M.target || '' },
        { name:'kcal', label:'Calories / jour', type:'number', value:M.kcal },
        { name:'prot', label:'Protéines / jour (g)', type:'number', value:M.prot }
      ], d => { Object.assign(M, { goal:d.goal, target:parseFloat(d.target)||0, kcal:parseInt(d.kcal,10)||0, prot:parseInt(d.prot,10)||0 }); save(); render(); toast('Objectif mis à jour'); }); },

  /* --- side-hustle --- */
  'add-project': () => formModal('Nouveau projet', [
      { name:'name', label:'Nom du projet', required:true, wide:true, placeholder:'Ex. Boutique print-on-demand' },
      { name:'status', label:'Statut', type:'select', options:Object.keys(HSTAT).map(k => ({ v:k, t:HSTAT[k][0] })), value:'idee' },
      { name:'goal', label:'Objectif de revenu (' + dev() + ')', type:'number', min:0, value:'' }
    ], d => { DB.modules.hustle.projects.push({ id:uid(), name:d.name, status:d.status, goal:parseFloat(d.goal)||0 }); save(); render(); moduleAction('Projet créé'); }),
  'edit-project': id => { const p = DB.modules.hustle.projects.find(x => x.id === id); if (!p) return;
      formModal('Modifier le projet', [
        { name:'name', label:'Nom', value:p.name, required:true, wide:true },
        { name:'status', label:'Statut', type:'select', options:Object.keys(HSTAT).map(k => ({ v:k, t:HSTAT[k][0] })), value:p.status },
        { name:'goal', label:'Objectif de revenu', type:'number', value:p.goal || '' }
      ], d => { Object.assign(p, { name:d.name, status:d.status, goal:parseFloat(d.goal)||0 }); save(); render(); toast('Projet mis à jour'); }); },
  'del-project': id => { const H = DB.modules.hustle;
      H.projects = H.projects.filter(p => p.id !== id);
      H.revenues = H.revenues.filter(r => r.projectId !== id);
      save(); render(); toast('Projet supprimé', 'rose'); },
  'add-revenue': () => { const ps = DB.modules.hustle.projects;
      if (!ps.length) { toast('Crée d’abord un projet', 'am'); return; }
      formModal('Nouveau revenu', [
        { name:'projectId', label:'Projet', type:'select', options:ps.map(p => ({ v:p.id, t:p.name })), value:ps[0].id, wide:true },
        { name:'amount', label:'Montant (' + dev() + ')', type:'number', min:0, required:true },
        { name:'date', label:'Date', type:'date', value:today() },
        { name:'label', label:'Libellé', wide:true, placeholder:'Ex. Commande #42' }
      ], d => { DB.modules.hustle.revenues.push({ id:uid(), projectId:d.projectId, amount:parseFloat(d.amount)||0, date:d.date||today(), label:d.label });
        save(); render(); moduleAction('Revenu enregistré'); }); },
  'del-revenue': id => { DB.modules.hustle.revenues = DB.modules.hustle.revenues.filter(r => r.id !== id); save(); render(); toast('Revenu supprimé', 'rose'); },

  /* --- créateur viral --- */
  'add-idea': () => formModal('Nouveau contenu', [
      { name:'title', label:'Titre / accroche', required:true, wide:true, placeholder:'Ex. 3 erreurs qui tuent ta discipline' },
      { name:'platform', label:'Plateforme', type:'select', options:[{v:'TikTok',t:'TikTok'},{v:'Shorts',t:'YouTube Shorts'},{v:'Reels',t:'Instagram Reels'},{v:'Autre',t:'Autre'}], value:'TikTok' },
      { name:'status', label:'Statut', type:'select', options:Object.keys(VSTAT).map(k => ({ v:k, t:VSTAT[k][0] })), value:'idee' },
      { name:'date', label:'Date de publication', type:'date', value:'' },
      { name:'views', label:'Vues', type:'number', min:0, value:'' },
      { name:'hook', label:'Taux d’accroche (%)', type:'number', min:0, value:'' }
    ], d => { DB.modules.viral.ideas.push({ id:uid(), title:d.title, platform:d.platform, status:d.status, date:d.date, views:parseInt(d.views,10)||0, hook:parseFloat(d.hook)||0 });
      save(); render(); moduleAction('Contenu ajouté'); }),
  'edit-idea': id => { const i = DB.modules.viral.ideas.find(x => x.id === id); if (!i) return;
      formModal('Modifier le contenu', [
        { name:'title', label:'Titre', value:i.title, required:true, wide:true },
        { name:'platform', label:'Plateforme', type:'select', options:[{v:'TikTok',t:'TikTok'},{v:'Shorts',t:'YouTube Shorts'},{v:'Reels',t:'Instagram Reels'},{v:'Autre',t:'Autre'}], value:i.platform },
        { name:'status', label:'Statut', type:'select', options:Object.keys(VSTAT).map(k => ({ v:k, t:VSTAT[k][0] })), value:i.status },
        { name:'date', label:'Date', type:'date', value:i.date || '' },
        { name:'views', label:'Vues', type:'number', value:i.views || '' },
        { name:'hook', label:'Taux d’accroche (%)', type:'number', value:i.hook || '' }
      ], d => { const wasPub = i.status === 'publie';
        Object.assign(i, { title:d.title, platform:d.platform, status:d.status, date:d.date, views:parseInt(d.views,10)||0, hook:parseFloat(d.hook)||0 });
        save(); render();
        if (!wasPub && i.status === 'publie') moduleAction('Contenu publié'); else toast('Contenu mis à jour'); }); },
  'del-idea': id => { DB.modules.viral.ideas = DB.modules.viral.ideas.filter(i => i.id !== id); save(); render(); toast('Contenu supprimé', 'rose'); },

  /* --- second cerveau --- */
  'add-book': () => formModal('Nouvelle lecture', [
      { name:'title', label:'Titre', required:true, wide:true, placeholder:'Ex. Atomic Habits' },
      { name:'pages', label:'Pages au total', type:'number', min:1, required:true },
      { name:'read', label:'Pages déjà lues', type:'number', min:0, value:0 }
    ], d => { DB.modules.cerveau.books.push({ id:uid(), title:d.title, pages:parseInt(d.pages,10)||1, read:parseInt(d.read,10)||0 });
      save(); render(); moduleAction('Lecture ajoutée'); }),
  'edit-book': id => { const b = DB.modules.cerveau.books.find(x => x.id === id); if (!b) return;
      formModal('Modifier la lecture', [
        { name:'title', label:'Titre', value:b.title, required:true, wide:true },
        { name:'pages', label:'Pages au total', type:'number', value:b.pages },
        { name:'read', label:'Pages lues', type:'number', value:b.read }
      ], d => { Object.assign(b, { title:d.title, pages:parseInt(d.pages,10)||1, read:parseInt(d.read,10)||0 }); save(); render(); toast('Lecture mise à jour'); }); },
  'read-plus': id => { const b = DB.modules.cerveau.books.find(x => x.id === id); if (!b) return;
      const was = b.read >= b.pages;
      b.read = Math.min(b.pages, b.read + 10); save(); render();
      if (!was && b.read >= b.pages) { toast('Livre terminé — bravo', 'am'); confetti(100); grantXp(XP.module * 3, null); }
      else moduleAction('+10 pages'); },
  'add-skill': () => formModal('Nouvelle compétence', [
      { name:'name', label:'Compétence', required:true, wide:true, placeholder:'Ex. Montage vidéo' },
      { name:'hours', label:'Heures déjà faites', type:'number', step:'any', min:0, value:0 },
      { name:'target', label:'Objectif (heures)', type:'number', min:0, value:100 }
    ], d => { DB.modules.cerveau.skills.push({ id:uid(), name:d.name, hours:parseFloat(d.hours)||0, target:parseFloat(d.target)||0 });
      save(); render(); moduleAction('Compétence ajoutée'); }),
  'edit-skill': id => { const s = DB.modules.cerveau.skills.find(x => x.id === id); if (!s) return;
      formModal('Modifier la compétence', [
        { name:'name', label:'Nom', value:s.name, required:true, wide:true },
        { name:'hours', label:'Heures faites', type:'number', step:'any', value:s.hours },
        { name:'target', label:'Objectif (heures)', type:'number', value:s.target }
      ], d => { Object.assign(s, { name:d.name, hours:parseFloat(d.hours)||0, target:parseFloat(d.target)||0 }); save(); render(); toast('Compétence mise à jour'); }); },
  'hour-plus': id => { const s = DB.modules.cerveau.skills.find(x => x.id === id); if (!s) return;
      s.hours += 1; save(); render(); moduleAction('+1 h de pratique'); },
  'del-book': id => { DB.modules.cerveau.books = DB.modules.cerveau.books.filter(b => b.id !== id); save(); render(); toast('Lecture supprimée', 'rose'); },
  'del-skill': id => { DB.modules.cerveau.skills = DB.modules.cerveau.skills.filter(s => s.id !== id); save(); render(); toast('Compétence supprimée', 'rose'); },

  /* --- réglages --- */
  'toggle-sim': () => { DB.settings.simulation = !DB.settings.simulation; save(); buildRail(); render();
      toast(DB.settings.simulation ? 'Mode simulation activé — les 6 modules sont ouverts' : 'Mode simulation désactivé', 'am'); },
  'toggle-mod': id => { const m = DB.modules[id]; m.unlocked = !m.unlocked; save(); buildRail(); render();
      toast(m.unlocked ? moduleOf(id).name + ' activé' : moduleOf(id).name + ' désactivé', m.unlocked ? 'em' : 'rose');
      if (m.unlocked) confetti(70); },
  'export': () => {
      const blob = new Blob([JSON.stringify(DB, null, 2)], { type:'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'apex-flow-' + today() + '.json';
      document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      toast('Sauvegarde téléchargée'); },
  'import': () => $('#import-file').click(),
  'reset': () => confirmModal('Tout effacer', 'Toutes tes habitudes, tâches, modules et ton XP seront définitivement perdus. Pense à exporter avant.', () => {
      localStorage.removeItem(KEY); DB = seed(blankDb()); save(); buildRail(); render(); toast('Système remis à zéro', 'rose'); }, 'Tout effacer')
};

/* ======================= 13. ÉVÉNEMENTS ======================= */
$('#view').addEventListener('click', e => {
  const dot = e.target.closest('[data-habit]');
  if (dot && !dot.disabled){ toggleHabit(dot.dataset.habit, dot.dataset.day); return; }

  const tk = e.target.closest('[data-task]');
  if (tk){ toggleTask(tk.dataset.task); return; }

  const f = e.target.closest('[data-filter]');
  if (f){
    $$('[data-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === f)));
    $('#task-list').innerHTML = taskList(f.dataset.filter);
    return;
  }

  const pm = e.target.closest('[data-pomo-mode]');
  if (pm){
    DB.pomodoro.mode = pm.dataset.pomoMode; save();
    $$('[data-pomo-mode]').forEach(b => b.setAttribute('aria-pressed', String(b === pm)));
    pomoReset(); return;
  }
  if (e.target.closest('#pomo-go'))    { pomoToggle(); return; }
  if (e.target.closest('#pomo-reset')) { pomoReset(); return; }

  const a = e.target.closest('[data-act]');
  if (a){
    const act = a.dataset.act;
    if (act === 'devise') return;
    if (act === 'week')   { ACTS.week(a.dataset.n); return; }
    if (ACTS[act]) ACTS[act](a.dataset.id);
  }
});

$('#view').addEventListener('change', e => {
  if (e.target.id === 'devise'){ DB.settings.devise = e.target.value; save(); render(); toast('Devise : ' + e.target.value); }
});

$('#view').addEventListener('submit', e => {
  if (e.target.id !== 'code-form') return;
  e.preventDefault();
  const val = $('#code-in').value.trim().toUpperCase();
  const m = moduleOf(TAB);
  if (val === m.code){
    DB.modules[m.id].unlocked = true; save(); buildRail(); render();
    toast(m.name + ' activé !', 'em'); confetti(110);
  } else {
    toast('Code incorrect', 'rose');
    $('#code-in').value = ''; $('#code-in').focus();
  }
});

document.addEventListener('change', e => {
  if (e.target.id !== 'import-file') return;
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const data = JSON.parse(r.result);
      if (!data || typeof data !== 'object' || !data.profile) throw new Error('format');
      confirmModal('Importer cette sauvegarde', 'Tes données actuelles seront remplacées par celles du fichier. Cette action est définitive.', () => {
        localStorage.setItem(KEY, JSON.stringify(data));
        DB = load(); buildRail(); render(); toast('Sauvegarde importée', 'em'); confetti(80);
      }, 'Importer');
    } catch (err) { toast('Fichier illisible ou invalide', 'rose'); }
    e.target.value = '';
  };
  r.readAsText(file);
});

/* raccourcis clavier */
document.addEventListener('keydown', e => {
  if (e.target.matches('input,textarea,select')) return;
  if (!$('#modal-wrap').hidden) return;
  if (e.key === 'n' && TAB === 'qg') { e.preventDefault(); askTask(null); }
  if (e.key === 'h' && TAB === 'qg') { e.preventDefault(); askHabit(null); }
  if (e.key === ' ' && TAB === 'qg' && $('#pomo-go')) { e.preventDefault(); pomoToggle(); }
});

/* ======================= 14. DÉMARRAGE ======================= */
DB = load();
if (DB.profile.lastSeen !== today()){ DB.profile.lastSeen = today(); save(); }
POMO.left = pomoDur('work');
CCN = ['em', 'em-soft', 'am', 'am-soft', 'in', 'in-deep'].map(n => tc(n));
buildRail();
render();

/* thème clair / sombre : on redessine, les graphiques reprennent les bonnes couleurs */
document.addEventListener('apex:theme', () => {
  CCN = ['em', 'em-soft', 'am', 'am-soft', 'in', 'in-deep'].map(n => tc(n));
  render();
});

if ('serviceWorker' in navigator && location.protocol === 'https:'){
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

console.log('%cAPEX FLOW OS', 'color:#10B981;font:700 16px Space Grotesk', '— données locales, aucune connexion requise.');
})();
