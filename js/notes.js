// ==================== NOTES (rubrique complète) ====================
// Carnets, étiquettes, épingles, couleurs, mise en forme, cases à cocher, images, dictée, corbeille.
// Rangées dans un nœud Firebase à part (handyNotes), hors de userData : save() réécrit userData en entier
// et les images rendraient chaque sauvegarde trop lourde. Chaque note est envoyée seule, quand elle change.
// Forme : { notes: { id: { title, html, text, book, tags[], color, pinned, trashed, createdAt, updatedAt } },
//           books: { id: { name, color, order, createdAt, updatedAt } } }
// Une note effacée pour toujours devient { purged: true, updatedAt } pour ne pas revenir depuis un autre appareil.
const NB_KEY = 'handy-notes', NB_DIRTY_KEY = 'handy-notes-dirty';
const NOTE_SECTIONS = {
    today: 'Accueil', weekly: 'Task Tracker', monthly: 'Habit Tracker', finance: 'Dashboard',
    subscriptions: 'Abonnements', finance2: 'Finance', calendar: 'Journal de bord', fitness: 'Santé',
    descriptions: 'Descriptions vidéos'
};
const NB_COLORS = { '': 'Aucune', red: '#ff5a66', amber: '#f5b544', green: '#3ddc84', teal: '#2ec4c4', blue: '#5b9dff', violet: '#a37bff', pink: '#ff7ac6' };
const NB_TRASH_DAYS = 30;

let NB = { notes: {}, books: {} };
let nbDirty = { notes: {}, books: {} };
let nbRef = null, nbStatus = 'local', nbTimer = null;
let nbFilter = { kind: 'all', id: null };     // all | pinned | book | tag | trash | none
let nbSort = 'updated', nbQuery = '', nbOpenId = null, nbSaveTimer = null, nbRange = null, nbRec = null;
let nbBackFromSection = null;                  // rubrique d'où l'on vient (bouton jaune)

try { const c = JSON.parse(localStorage.getItem(NB_KEY)); if (c) NB = { notes: c.notes || {}, books: c.books || {} }; } catch (e) {}
try { const d = JSON.parse(localStorage.getItem(NB_DIRTY_KEY)); if (d) nbDirty = { notes: d.notes || {}, books: d.books || {} }; } catch (e) {}
try { nbSort = localStorage.getItem('handy-notes-sort') || 'updated'; } catch (e) {}

// ---------- stockage & synchro ----------
function nbId(p) { return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function nbPersist() { try { localStorage.setItem(NB_KEY, JSON.stringify(NB)); localStorage.setItem(NB_DIRTY_KEY, JSON.stringify(nbDirty)); } catch (e) { toast('Mémoire du téléphone pleine : retire quelques images'); } }
function nbTouch(kind, id) {
    nbDirty[kind][id] = 1; nbPersist();
    clearTimeout(nbTimer); nbTimer = setTimeout(nbPush, 700);
}
function nbPush() {
    if (!nbRef) return;
    ['notes', 'books'].forEach(kind => Object.keys(nbDirty[kind]).forEach(id => {
        const v = NB[kind][id];
        nbRef.child(kind + '/' + id).set(v === undefined ? null : v)
            .then(() => { delete nbDirty[kind][id]; nbPersist(); if (!Object.keys(nbDirty.notes).length && !Object.keys(nbDirty.books).length) nbSetStatus('synced'); })
            .catch(err => nbSetStatus(/permission/i.test(err && (err.code || err.message) || '') ? 'denied' : 'error'));
    }));
    if (Object.keys(nbDirty.notes).length || Object.keys(nbDirty.books).length) nbSetStatus('syncing');
}
function nbSetStatus(s) { nbStatus = s; const el = document.getElementById('nbSync'); if (el) el.outerHTML = nbSyncHtml(); }
function nbSyncHtml() {
    const m = { local: ['cloud-slash', 'Sur cet appareil'], syncing: ['cloud-arrow-up', 'Synchronisation…'], synced: ['cloud-check', 'Synchronisé'],
        denied: ['warning', 'Synchro bloquée : règles Firebase à mettre à jour'], error: ['warning', 'Synchro en pause (réseau)'] }[nbStatus] || ['cloud', ''];
    return `<span class="nb-sync ${nbStatus}" id="nbSync"><i class="ph-duotone ph-${m[0]}"></i>${m[1]}</span>`;
}
function nbMerge(kind, id, v) {
    if (nbDirty[kind][id]) { const l = NB[kind][id]; if (l && v && (l.updatedAt || 0) > (v.updatedAt || 0)) return false; }
    if (v === null) { if (nbDirty[kind][id]) return false; delete NB[kind][id]; }
    else NB[kind][id] = v;
    delete nbDirty[kind][id];
    return true;
}
function attachNotesSync() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;
    if (!firebase.auth || !firebase.auth().currentUser) { nbSetStatus('local'); return; }   // relancé par auth.js après la connexion
    if (nbRef) { nbRef.child('notes').off(); nbRef.child('books').off(); }
    nbRef = firebase.database().ref('handyNotes');
    nbSetStatus('syncing');
    let refreshT = null;
    const refresh = () => { clearTimeout(refreshT); refreshT = setTimeout(() => { nbPersist(); nbRefresh(); }, 120); };
    const fail = err => nbSetStatus(/permission/i.test(err && (err.code || err.message) || '') ? 'denied' : 'error');
    ['notes', 'books'].forEach(kind => {
        const r = nbRef.child(kind);
        r.on('child_added', s => { if (nbMerge(kind, s.key, s.val())) refresh(); }, fail);
        r.on('child_changed', s => { if (nbMerge(kind, s.key, s.val())) refresh(); }, fail);
        r.on('child_removed', s => { if (nbMerge(kind, s.key, null)) refresh(); }, fail);
    });
    // Une fois tout reçu : on envoie ce qui a été écrit hors ligne
    nbRef.child('books').once('value').then(() => { nbMigrateSectionNotes(); nbPurgeOld(); nbPush(); if (nbStatus === 'syncing' && !Object.keys(nbDirty.notes).length) nbSetStatus('synced'); }).catch(fail);
}
// Si l'éditeur montre une note modifiée ailleurs, on la recharge (sauf si on est en train d'écrire dedans)
function nbRefresh() {
    if (S.currentView === 'notes') renderNotesList();
    if (nbOpenId) {
        const n = NB.notes[nbOpenId];
        if (!n || n.purged) { closeNote(); return; }
        const body = document.getElementById('nbBody');
        if (body && document.activeElement !== body && document.activeElement !== document.getElementById('nbTitle') && body.innerHTML !== (n.html || '')) fillEditor();
    }
    updateNotesBadge();
}

// ---------- reprise des anciennes notes par rubrique (bouton jaune) ----------
function nbMigrateSectionNotes() {
    const old = S.sectionNotes || {};
    let added = 0;
    Object.keys(old).forEach(sec => {
        const list = Array.isArray(old[sec]) ? old[sec] : Object.values(old[sec] || {});
        if (!list.length) return;
        const bid = nbSectionBook(sec, true);
        list.forEach(o => {
            if (!o || !o.id) return;
            const id = 'sec_' + o.id;
            if (NB.notes[id]) return;     // déjà reprise (ou supprimée pour toujours)
            NB.notes[id] = { title: '', html: escHtml(o.text || '').replace(/\n/g, '<br>'), text: o.text || '', book: bid, tags: [], color: '', pinned: !!o.pinned, trashed: 0, createdAt: Date.parse(o.createdAt) || Date.now(), updatedAt: Date.parse(o.updatedAt || o.createdAt) || Date.now() };
            nbTouch('notes', id); added++;
        });
    });
    if (added && S.currentView === 'notes') renderNotesList();
}
// Carnet lié à une rubrique de l'app (ex. « Journal de bord »)
function nbSectionBook(sec, create) {
    const id = 'sec-' + sec;
    if (!NB.books[id] && create) { NB.books[id] = { name: NOTE_SECTIONS[sec] || sec, color: 'amber', order: 100 + Object.keys(NOTE_SECTIONS).indexOf(sec), createdAt: Date.now(), updatedAt: Date.now() }; nbTouch('books', id); }
    return id;
}
function nbPurgeOld() {
    const lim = Date.now() - NB_TRASH_DAYS * 864e5;
    Object.entries(NB.notes).forEach(([id, n]) => { if (n && n.trashed && n.trashed < lim) { NB.notes[id] = { purged: true, updatedAt: Date.now() }; nbTouch('notes', id); } });
}

// ---------- lecture ----------
function nbAll() { return Object.entries(NB.notes).filter(([, n]) => n && !n.purged).map(([id, n]) => ({ id, ...n })); }
function nbBooks() {
    return Object.entries(NB.books).filter(([, b]) => b && !b.deleted).map(([id, b]) => ({ id, ...b }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.name || '').localeCompare(b.name || ''));
}
function nbTags() { const m = {}; nbAll().filter(n => !n.trashed).forEach(n => (n.tags || []).forEach(t => { m[t] = (m[t] || 0) + 1; })); return Object.entries(m).sort((a, b) => a[0].localeCompare(b[0])); }
function nbFiltered() {
    let list = nbAll();
    const f = nbFilter;
    list = f.kind === 'trash' ? list.filter(n => n.trashed) : list.filter(n => !n.trashed);
    if (f.kind === 'pinned') list = list.filter(n => n.pinned);
    if (f.kind === 'book') list = list.filter(n => n.book === f.id);
    if (f.kind === 'none') list = list.filter(n => !n.book || !NB.books[n.book] || NB.books[n.book].deleted);
    if (f.kind === 'tag') list = list.filter(n => (n.tags || []).includes(f.id));
    const q = nbQuery.trim().toLowerCase();
    if (q) {
        const words = q.split(/\s+/);
        list = list.filter(n => { const hay = `${n.title || ''} ${n.text || ''} ${(n.tags || []).map(t => '#' + t).join(' ')} ${(NB.books[n.book] || {}).name || ''}`.toLowerCase(); return words.every(w => hay.includes(w)); });
    }
    const by = { updated: (a, b) => (b.updatedAt || 0) - (a.updatedAt || 0), created: (a, b) => (b.createdAt || 0) - (a.createdAt || 0), title: (a, b) => nbTitleOf(a).localeCompare(nbTitleOf(b), 'fr') }[nbSort] || (() => 0);
    return list.sort((a, b) => (f.kind !== 'trash' ? (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) : 0) || by(a, b));
}
function nbTitleOf(n) { return (n.title || '').trim() || (n.text || '').trim().split('\n')[0].slice(0, 80) || 'Note sans titre'; }
function nbWhen(ts) {
    if (!ts) return '';
    const d = new Date(ts), now = new Date(), p = x => String(x).padStart(2, '0');
    const sameDay = d.toDateString() === now.toDateString();
    const y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay) return `Aujourd'hui ${p(d.getHours())}:${p(d.getMinutes())}`;
    if (d.toDateString() === y.toDateString()) return `Hier ${p(d.getHours())}:${p(d.getMinutes())}`;
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}${d.getFullYear() !== now.getFullYear() ? '/' + d.getFullYear() : ''}`;
}
function nbFull(ts) { const d = new Date(ts), p = x => String(x).padStart(2, '0'); return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}:${p(d.getMinutes())}`; }

// ---------- rendu de la rubrique ----------
function renderNotesApp() {
    const box = document.getElementById('notesContent'); if (!box) return;
    if (!box.dataset.ready) {
        box.dataset.ready = '1';
        box.innerHTML = `
        <div class="nb-wrap" id="nbWrap">
            <aside class="nb-side" id="nbSide"></aside>
            <section class="nb-list-pane">
                <div class="nb-search"><i class="ph-duotone ph-magnifying-glass"></i><input id="nbSearch" type="search" placeholder="Chercher un mot, une #étiquette…" autocomplete="off" aria-label="Chercher dans les notes"><button class="nb-icon" id="nbSortBtn" onclick="nbSortMenu()" aria-label="Trier" title="Trier"><i class="ph-duotone ph-sort-descending"></i></button></div>
                <div class="nb-chips" id="nbChips"></div>
                <div class="nb-list-head"><strong id="nbListTitle"></strong><span id="nbListCount"></span></div>
                <div class="nb-trashbar" id="nbTrashBar" hidden><span>Effacées au bout de ${NB_TRASH_DAYS} jours.</span><button onclick="nbEmptyTrash()">Vider la corbeille</button></div>
                <div class="nb-list" id="nbList"></div>
            </section>
            <section class="nb-editor-pane" id="nbEditorPane"></section>
        </div>`;
        document.getElementById('nbSearch').addEventListener('input', e => { nbQuery = e.target.value; renderNotesList(); });
    }
    renderNotesList();
    if (nbOpenId && NB.notes[nbOpenId]) { if (!document.getElementById('nbBody')) renderEditor(); }
    else renderEditorEmpty();
}
function nbFilterLabel() {
    const f = nbFilter;
    if (f.kind === 'pinned') return 'Épinglées';
    if (f.kind === 'trash') return 'Corbeille';
    if (f.kind === 'none') return 'Sans carnet';
    if (f.kind === 'tag') return '#' + f.id;
    if (f.kind === 'book') return (NB.books[f.id] || {}).name || 'Carnet';
    return 'Toutes les notes';
}
function renderNotesList() {
    const list = document.getElementById('nbList'); if (!list) return;
    const all = nbAll(), live = all.filter(n => !n.trashed);
    const cnt = { all: live.length, pinned: live.filter(n => n.pinned).length, trash: all.filter(n => n.trashed).length, none: live.filter(n => !n.book || !NB.books[n.book]).length };
    const books = nbBooks(), tags = nbTags(), f = nbFilter;
    const is = (k, id) => f.kind === k && (id === undefined || f.id === id);
    const item = (k, id, icon, label, n, color) => `<button class="nb-nav${is(k, id) ? ' active' : ''}" onclick="nbSetFilter('${k}', ${id === undefined ? 'null' : `'${escAttr(id)}'`})">${color ? `<span class="nb-dot" style="background:${NB_COLORS[color] || color}"></span>` : `<i class="ph-duotone ph-${icon}"></i>`}<span class="nb-nav-label">${escHtml(label)}</span>${n ? `<small>${n}</small>` : ''}</button>`;
    // Colonne de gauche (PC)
    document.getElementById('nbSide').innerHTML = `
        <button class="nb-new" onclick="nbNew()"><i class="ph-duotone ph-plus"></i>Nouvelle note</button>
        ${item('all', undefined, 'notebook', 'Toutes les notes', cnt.all)}
        ${item('pinned', undefined, 'push-pin', 'Épinglées', cnt.pinned)}
        <div class="nb-side-title">Carnets<button class="nb-icon sm" onclick="nbNewBook()" aria-label="Nouveau carnet" title="Nouveau carnet"><i class="ph-duotone ph-plus"></i></button></div>
        ${books.map(b => `<div class="nb-book-row">${item('book', b.id, '', b.name, live.filter(n => n.book === b.id).length, b.color || 'amber')}<button class="nb-icon sm nb-book-more" onclick="nbBookMenu('${b.id}')" aria-label="Options du carnet ${escAttr(b.name)}"><i class="ph-duotone ph-dots-three"></i></button></div>`).join('')}
        ${cnt.none && books.length ? item('none', undefined, 'tray', 'Sans carnet', cnt.none) : ''}
        ${books.length ? '' : '<p class="nb-side-hint">Crée un carnet pour ranger tes notes (Idées, Travail, Clients…).</p>'}
        ${tags.length ? `<div class="nb-side-title">Étiquettes</div><div class="nb-tag-cloud">${tags.map(([t, n]) => `<button class="nb-tag${is('tag', t) ? ' active' : ''}" onclick="nbSetFilter('tag', '${escAttr(t)}')">#${escHtml(t)} <small>${n}</small></button>`).join('')}</div>` : ''}
        <div class="nb-side-title"></div>
        ${item('trash', undefined, 'trash', 'Corbeille', cnt.trash)}
        <div class="nb-side-foot">${nbSyncHtml()}</div>`;
    // Puces (téléphone)
    const chip = (k, id, label, n, color) => `<button class="nb-chip${is(k, id) ? ' active' : ''}" onclick="nbSetFilter('${k}', ${id === undefined ? 'null' : `'${escAttr(id)}'`})">${color ? `<span class="nb-dot" style="background:${NB_COLORS[color] || color}"></span>` : ''}${escHtml(label)}${n ? `<small>${n}</small>` : ''}</button>`;
    document.getElementById('nbChips').innerHTML = chip('all', undefined, 'Toutes', cnt.all) + chip('pinned', undefined, 'Épinglées', cnt.pinned)
        + books.map(b => chip('book', b.id, b.name, live.filter(n => n.book === b.id).length, b.color || 'amber')).join('')
        + tags.map(([t, n]) => chip('tag', t, '#' + t, n)).join('')
        + chip('trash', undefined, 'Corbeille', cnt.trash)
        + `<button class="nb-chip add" onclick="nbNewBook()"><i class="ph-duotone ph-plus"></i>Carnet</button>`
        + (f.kind === 'book' ? `<button class="nb-chip add" onclick="nbBookMenu('${f.id}')"><i class="ph-duotone ph-gear-six"></i>Ce carnet</button>` : '');
    const ac = document.querySelector('#nbChips .nb-chip.active'); if (ac) { const c = document.getElementById('nbChips'); c.scrollLeft = ac.offsetLeft - 16; }

    const notes = nbFiltered();
    document.getElementById('nbListTitle').textContent = nbFilterLabel();
    document.getElementById('nbListCount').textContent = `${notes.length} note${notes.length > 1 ? 's' : ''}`;
    document.getElementById('nbTrashBar').hidden = f.kind !== 'trash' || !notes.length;
    if (!notes.length) {
        list.innerHTML = `<div class="nb-empty"><i class="ph-duotone ph-${f.kind === 'trash' ? 'trash' : 'note-pencil'}"></i><p>${nbQuery ? `Aucune note ne contient « ${escHtml(nbQuery)} ».` : f.kind === 'trash' ? 'La corbeille est vide.' : 'Aucune note ici pour l’instant.'}</p>${f.kind !== 'trash' && !nbQuery ? '<button class="nb-btn primary" onclick="nbNew()"><i class="ph-duotone ph-plus"></i>Écrire une note</button>' : ''}</div>`;
        return;
    }
    list.innerHTML = notes.map(n => {
        const title = nbTitleOf(n), body = (n.text || '').replace(/\s+/g, ' ').trim();
        const excerpt = (n.title || '').trim() ? body : body.slice(title.length).trim();
        const checks = (n.html || '').match(/<li[^>]*class="[^"]*nb-task/g) || [], done = (n.html || '').match(/class="[^"]*nb-task[^"]*done/g) || [];
        const img = ((n.html || '').match(/<img[^>]+src="(data:image\/[^"]{20,})"/) || [])[1];
        const book = NB.books[n.book];
        return `<button class="nb-card${n.id === nbOpenId ? ' active' : ''}${n.color ? ' c-' + n.color : ''}" onclick="openNote('${n.id}')">
            ${img ? `<img class="nb-thumb" src="${img}" alt="">` : ''}
            <span class="nb-card-title">${n.pinned ? '<i class="ph-duotone ph-push-pin nb-pin"></i>' : ''}${escHtml(title)}</span>
            ${excerpt ? `<span class="nb-card-text">${escHtml(excerpt.slice(0, 160))}</span>` : ''}
            <span class="nb-card-foot">
                <span>${n.trashed ? 'Supprimée ' + nbWhen(n.trashed) : nbWhen(n.updatedAt)}</span>
                ${checks.length ? `<span class="nb-prog${done.length === checks.length ? ' full' : ''}"><i class="ph-duotone ph-check-square"></i>${done.length}/${checks.length}</span>` : ''}
                ${book && f.kind !== 'book' ? `<span class="nb-card-book"><span class="nb-dot" style="background:${NB_COLORS[book.color] || NB_COLORS.amber}"></span>${escHtml(book.name)}</span>` : ''}
                ${(n.tags || []).slice(0, 3).map(t => `<span class="nb-card-tag">#${escHtml(t)}</span>`).join('')}
            </span>
        </button>`;
    }).join('');
}
function nbSetFilter(kind, id) { nbFilter = { kind, id }; renderNotesList(); const l = document.getElementById('nbList'); if (l) l.scrollTop = 0; }
function nbSortMenu() {
    const opts = [['updated', 'Modifiées récemment'], ['created', 'Créées récemment'], ['title', 'Titre (A → Z)']];
    nbSheet('Trier les notes', opts.map(([k, l]) => `<button class="nb-opt${k === nbSort ? ' active' : ''}" onclick="nbSort='${k}';try{localStorage.setItem('handy-notes-sort','${k}')}catch(e){};nbCloseSheet();renderNotesList()"><i class="ph-duotone ph-${k === nbSort ? 'check-circle' : 'circle'}"></i>${l}</button>`).join(''));
}

// ---------- notes : créer, ouvrir, fermer ----------
function nbNew(bookId) {
    const id = nbId('n'), now = Date.now();
    const book = bookId || (nbFilter.kind === 'book' ? nbFilter.id : '');
    const tags = nbFilter.kind === 'tag' ? [nbFilter.id] : [];
    NB.notes[id] = { title: '', html: '', text: '', book: book || '', tags, color: '', pinned: nbFilter.kind === 'pinned', trashed: 0, createdAt: now, updatedAt: now };
    if (nbFilter.kind === 'trash') nbFilter = { kind: 'all', id: null };
    nbTouch('notes', id);
    if (S.currentView !== 'notes') switchView('notes');
    openNote(id, true);
}
function openNote(id, isNew) {
    if (!NB.notes[id]) return;
    nbFlushSave();
    nbOpenId = id;
    renderEditor();
    renderNotesList();
    document.getElementById('nbWrap').classList.add('editing');
    nbPlaceEditor();
    requestAnimationFrame(() => { const t = document.getElementById('nbTitle'); if (t) nbGrow(t); });
    document.body.classList.add('nb-editing');
    if (window.innerWidth <= 900) { try { history.pushState({ nbNote: id }, ''); } catch (e) {} }
    setTimeout(() => { const t = document.getElementById(isNew ? 'nbTitle' : 'nbBody'); if (isNew && t) t.focus(); }, 80);
}
function closeNote(fromPop) {
    nbFlushSave(); nbStopMic();
    const id = nbOpenId, n = NB.notes[id];
    // Note vide : on la retire sans passer par la corbeille
    if (n && !n.trashed && !(n.title || '').trim() && !(n.text || '').trim() && !/<img/.test(n.html || '')) { NB.notes[id] = { purged: true, updatedAt: Date.now() }; nbTouch('notes', id); }
    nbOpenId = null;
    const w = document.getElementById('nbWrap'); if (w) w.classList.remove('editing');
    nbPlaceEditor(true);
    document.body.classList.remove('nb-editing');
    renderEditorEmpty(); renderNotesList(); updateNotesBadge();
    if (!fromPop && history.state && history.state.nbNote) { nbIgnorePop = true; try { history.back(); } catch (e) { nbIgnorePop = false; } }
}
let nbIgnorePop = false;   // retour arrière lancé par nous-mêmes (bouton ←), pas par le téléphone
window.addEventListener('popstate', () => { if (nbIgnorePop) { nbIgnorePop = false; return; } if (nbOpenId && window.innerWidth <= 900) closeNote(true); });

// Téléphone : l'éditeur passe au-dessus de tout (sorti de la page, sinon il reste sous l'en-tête et la barre du bas)
function nbPlaceEditor(back) {
    const pane = document.getElementById('nbEditorPane'), wrap = document.getElementById('nbWrap');
    if (!pane || !wrap) return;
    const float = !back && window.innerWidth <= 900;
    if (float && pane.parentNode !== document.body) { document.body.appendChild(pane); nbFitViewport(); }
    if (!float && pane.parentNode !== wrap) wrap.appendChild(pane);
    pane.classList.toggle('nb-floating', float);
}
window.addEventListener('resize', () => { if (nbOpenId) nbPlaceEditor(); });
function renderEditorEmpty() {
    const p = document.getElementById('nbEditorPane'); if (!p) return;
    const tpl = NB_TEMPLATES.map((t, i) => `<button class="nb-tpl" onclick="nbFromTemplate(${i})"><i class="ph-duotone ph-${t.icon}"></i><b>${t.name}</b><small>${t.hint}</small></button>`).join('');
    p.innerHTML = `<div class="nb-editor-empty"><i class="ph-duotone ph-note-pencil nb-big"></i><h3>Choisis une note ou commence-en une</h3><p>Tout est enregistré tout seul, sur ton téléphone et ton PC.</p><div class="nb-tpls">${tpl}</div></div>`;
}
const NB_TEMPLATES = [
    { name: 'Note vide', icon: 'file', hint: 'Une page blanche', title: '', html: '' },
    { name: 'Liste de tâches', icon: 'check-square', hint: 'Des cases à cocher', title: 'À faire', html: '<ul class="nb-tasks"><li class="nb-task"><br></li></ul>' },
    { name: 'Réunion / appel', icon: 'users-three', hint: 'Avec qui, décisions, suites', title: 'Réunion du ' + '{date}', html: '<h2>Avec qui</h2><p><br></p><h2>Ce qu’on a dit</h2><ul><li><br></li></ul><h2>Décisions</h2><ul><li><br></li></ul><h2>À faire ensuite</h2><ul class="nb-tasks"><li class="nb-task"><br></li></ul>' },
    { name: 'Journal du jour', icon: 'sun-horizon', hint: 'Gratitude, victoires, demain', title: 'Journal · {date}', html: '<h2>Ce qui s’est bien passé</h2><ul><li><br></li></ul><h2>Ce que j’ai appris</h2><p><br></p><h2>Demain, je…</h2><ul class="nb-tasks"><li class="nb-task"><br></li></ul>' },
    { name: 'Idée', icon: 'lightbulb', hint: 'Problème, idée, prochaine étape', title: 'Idée : ', html: '<h2>Le problème</h2><p><br></p><h2>L’idée</h2><p><br></p><h2>Première étape</h2><ul class="nb-tasks"><li class="nb-task"><br></li></ul>' },
    { name: 'Courses', icon: 'shopping-cart', hint: 'Liste à cocher', title: 'Courses', html: '<ul class="nb-tasks"><li class="nb-task"><br></li></ul>' }
];
function nbFromTemplate(i) {
    const t = NB_TEMPLATES[i], d = new Date(), p = x => String(x).padStart(2, '0'), date = `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
    nbNew();
    const n = NB.notes[nbOpenId];
    n.title = t.title.replace('{date}', date); n.html = t.html; n.text = nbHtmlText(t.html);
    nbTouch('notes', nbOpenId); fillEditor();
    const b = document.getElementById(t.title && !t.title.endsWith(' ') ? 'nbBody' : 'nbTitle');
    if (b) { b.focus(); nbCaretEnd(b); }
}

function renderEditor() {
    const p = document.getElementById('nbEditorPane'); if (!p) return;
    p.innerHTML = `
    <div class="nb-editor" id="nbEditor">
        <header class="nb-ed-head">
            <button class="nb-icon nb-back" onclick="closeNote()" aria-label="Retour aux notes"><i class="ph-duotone ph-arrow-left"></i></button>
            <button class="nb-book-pick" id="nbBookPick" onclick="nbPickBook()"></button>
            <span class="nb-grow"></span>
            <span class="nb-saved" id="nbSaved"></span>
            <button class="nb-icon" id="nbPinBtn" onclick="nbTogglePin()" aria-label="Épingler"></button>
            <button class="nb-icon" onclick="nbPickColor()" aria-label="Couleur de la note" title="Couleur"><i class="ph-duotone ph-palette"></i></button>
            <button class="nb-icon" onclick="nbNoteMenu()" aria-label="Plus d'options" title="Plus d'options"><i class="ph-duotone ph-dots-three-outline"></i></button>
        </header>
        <div class="nb-ed-trash" id="nbEdTrash" hidden><span><i class="ph-duotone ph-trash"></i>Cette note est dans la corbeille.</span><button class="nb-btn" onclick="nbRestore()">Restaurer</button><button class="nb-btn danger" onclick="nbPurge()">Supprimer pour toujours</button></div>
        <div class="nb-ed-scroll" id="nbEdScroll">
            <div class="nb-paper" id="nbPaper">
                <textarea class="nb-title" id="nbTitle" rows="1" placeholder="Titre" aria-label="Titre de la note"></textarea>
                <div class="nb-meta" id="nbMeta"></div>
                <div class="nb-body" id="nbBody" contenteditable="true" spellcheck="true" data-placeholder="Écris ici…  Astuce : tape « - » puis espace pour une liste, « [] » pour une case à cocher, « # » pour un titre." aria-label="Contenu de la note"></div>
                <div class="nb-tags-ed" id="nbTagsEd"></div>
            </div>
        </div>
        <div class="nb-toolbar" id="nbToolbar" role="toolbar" aria-label="Mise en forme">
            <button data-f="check" title="Case à cocher"><i class="ph-duotone ph-check-square"></i></button>
            <button data-f="h1" title="Grand titre"><b>H1</b></button>
            <button data-f="h2" title="Sous-titre"><b>H2</b></button>
            <button data-f="bold" title="Gras (Ctrl B)"><i class="ph-duotone ph-text-b"></i></button>
            <button data-f="italic" title="Italique (Ctrl I)"><i class="ph-duotone ph-text-italic"></i></button>
            <button data-f="underline" title="Souligné (Ctrl U)"><i class="ph-duotone ph-text-underline"></i></button>
            <button data-f="strike" title="Barré"><i class="ph-duotone ph-text-strikethrough"></i></button>
            <button data-f="mark" title="Surligner"><i class="ph-duotone ph-highlighter-circle"></i></button>
            <span class="nb-tb-sep"></span>
            <button data-f="ul" title="Liste à puces"><i class="ph-duotone ph-list-bullets"></i></button>
            <button data-f="ol" title="Liste numérotée"><i class="ph-duotone ph-list-numbers"></i></button>
            <button data-f="quote" title="Citation"><i class="ph-duotone ph-quotes"></i></button>
            <button data-f="hr" title="Séparateur"><i class="ph-duotone ph-minus"></i></button>
            <span class="nb-tb-sep"></span>
            <button data-f="link" title="Lien"><i class="ph-duotone ph-link"></i></button>
            <button data-f="image" title="Ajouter une image"><i class="ph-duotone ph-image"></i></button>
            <button data-f="date" title="Insérer la date et l'heure"><i class="ph-duotone ph-calendar-plus"></i></button>
            <button data-f="clear" title="Enlever la mise en forme"><i class="ph-duotone ph-text-t-slash"></i></button>
            <button data-f="mic" id="nbMic" class="nb-mic" title="Dicter à la voix"><i class="ph-duotone ph-microphone"></i><span>Dicter</span></button>
        </div>
    </div>`;
    const title = document.getElementById('nbTitle'), body = document.getElementById('nbBody');
    title.addEventListener('input', () => { nbGrow(title); nbScheduleSave(); });
    title.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); body.focus(); nbCaretStart(body); } });
    body.addEventListener('input', nbOnInput);
    body.addEventListener('keydown', nbOnKey);
    body.addEventListener('beforeinput', nbOnBeforeInput);
    body.addEventListener('click', nbOnClick);
    body.addEventListener('paste', nbOnPaste);
    body.addEventListener('blur', nbSaveRange);
    document.addEventListener('selectionchange', nbTrackSel);
    // mousedown : les boutons ne volent pas la sélection du texte
    document.getElementById('nbToolbar').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });
    document.getElementById('nbToolbar').addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) nbFormat(b.dataset.f); });
    fillEditor();
    nbFitViewport();
}
function fillEditor() {
    const n = NB.notes[nbOpenId]; if (!n) return;
    const title = document.getElementById('nbTitle'), body = document.getElementById('nbBody');
    title.value = n.title || ''; body.innerHTML = n.html || '';
    nbGrow(title); nbHeadState();
    const locked = !!n.trashed;
    title.readOnly = locked; body.contentEditable = locked ? 'false' : 'true';
    document.getElementById('nbEdTrash').hidden = !locked;
    document.getElementById('nbToolbar').hidden = locked;
}
function nbHeadState() {
    const n = NB.notes[nbOpenId]; if (!n) return;
    const b = NB.books[n.book];
    document.getElementById('nbBookPick').innerHTML = `<span class="nb-dot" style="background:${b ? NB_COLORS[b.color] || NB_COLORS.amber : 'var(--text-muted, #777)'}"></span>${escHtml(b && !b.deleted ? b.name : 'Sans carnet')}<i class="ph-duotone ph-caret-down"></i>`;
    document.getElementById('nbPinBtn').innerHTML = `<i class="ph-duotone ph-push-pin"></i>`;
    document.getElementById('nbPinBtn').classList.toggle('on', !!n.pinned);
    document.getElementById('nbPinBtn').title = n.pinned ? 'Détacher' : 'Épingler en haut';
    const words = ((n.text || '').match(/\S+/g) || []).length;
    document.getElementById('nbMeta').textContent = `Créée le ${nbFull(n.createdAt)} · modifiée le ${nbFull(n.updatedAt)} · ${words} mot${words > 1 ? 's' : ''}`;
    const p = document.getElementById('nbPaper'); p.className = 'nb-paper' + (n.color ? ' c-' + n.color : '');
    document.getElementById('nbTagsEd').innerHTML = (n.tags || []).map(t => `<span class="nb-tag-chip">#${escHtml(t)}<button onclick="nbRemoveTag('${escAttr(t)}')" aria-label="Retirer l'étiquette ${escAttr(t)}"><i class="ph-duotone ph-x"></i></button></span>`).join('')
        + (n.trashed ? '' : `<input class="nb-tag-input" id="nbTagInput" placeholder="+ étiquette" list="nbTagList" aria-label="Ajouter une étiquette" onkeydown="if(event.key==='Enter'||event.key===','){event.preventDefault();nbAddTag(this.value)}" onchange="nbAddTag(this.value)"><datalist id="nbTagList">${nbTags().map(([t]) => `<option value="${escAttr(t)}">`).join('')}</datalist>`);
}
function nbGrow(t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }

// ---------- enregistrement ----------
function nbScheduleSave() { const s = document.getElementById('nbSaved'); if (s) s.textContent = 'Écriture…'; clearTimeout(nbSaveTimer); nbSaveTimer = setTimeout(nbFlushSave, 450); }
function nbFlushSave() {
    clearTimeout(nbSaveTimer);
    const n = NB.notes[nbOpenId], body = document.getElementById('nbBody'), title = document.getElementById('nbTitle');
    if (!n || !body || n.trashed) return;
    body.querySelectorAll('ul.nb-tasks > li:not(.nb-task)').forEach(li => li.classList.add('nb-task'));
    const html = nbClean(body.innerHTML), t = title.value;
    if (html === (n.html || '') && t === (n.title || '')) { const s = document.getElementById('nbSaved'); if (s && s.textContent === 'Écriture…') s.textContent = 'Enregistré'; return; }
    n.html = html; n.title = t; n.text = nbHtmlText(html); n.updatedAt = Date.now();
    nbTouch('notes', nbOpenId);
    const s = document.getElementById('nbSaved'); if (s) s.innerHTML = '<i class="ph-duotone ph-check"></i>Enregistré';
    nbHeadState(); renderNotesList();
}
function nbClean(html) { return html === '<br>' || html === '<div><br></div>' || html === '<p><br></p>' ? '' : html; }
function nbHtmlText(html) {
    const d = document.createElement('div');
    d.innerHTML = html.replace(/<(\/p|\/div|\/h\d|\/li|br|\/blockquote|hr)[^>]*>/gi, m => m + '\n');
    d.querySelectorAll('img').forEach(i => i.remove());
    return (d.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
}
window.addEventListener('beforeunload', () => nbFlushSave());
document.addEventListener('visibilitychange', () => { if (document.hidden) { nbFlushSave(); nbPush(); } });

// ---------- éditeur : mise en forme ----------
function nbTrackSel() { const b = document.getElementById('nbBody'), s = window.getSelection(); if (b && s.rangeCount && b.contains(s.anchorNode)) nbRange = s.getRangeAt(0).cloneRange(); }
function nbSaveRange() { nbTrackSel(); }
function nbRestoreRange() {
    const b = document.getElementById('nbBody'); if (!b) return;
    b.focus();
    if (nbRange && b.contains(nbRange.startContainer)) { const s = window.getSelection(); s.removeAllRanges(); s.addRange(nbRange); }
    else nbCaretEnd(b);
}
function nbCaretEnd(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
function nbCaretStart(el) { const r = document.createRange(); r.selectNodeContents(el); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); }
function nbBlock() {
    const b = document.getElementById('nbBody'), s = window.getSelection();
    if (!s.rangeCount) return null;
    let n = s.anchorNode;
    while (n && n !== b) { if (n.nodeType === 1 && /^(P|DIV|H1|H2|H3|LI|BLOCKQUOTE|PRE)$/.test(n.nodeName)) return n; n = n.parentNode; }
    return null;
}
function nbFormat(f) {
    const n = NB.notes[nbOpenId]; if (!n || n.trashed) return;
    if (f === 'mic') return nbToggleMic();
    if (f === 'image') { nbSaveRange(); return nbPickImage(); }
    nbRestoreRange();
    const blk = nbBlock(), inTag = t => { let x = window.getSelection().anchorNode; while (x && x.id !== 'nbBody') { if (x.nodeName === t) return x; x = x.parentNode; } return null; };
    switch (f) {
        case 'h1': case 'h2': document.execCommand('formatBlock', false, blk && blk.nodeName === f.toUpperCase() ? 'div' : f); break;
        case 'quote': document.execCommand('formatBlock', false, inTag('BLOCKQUOTE') ? 'div' : 'blockquote'); break;
        case 'bold': case 'italic': case 'underline': document.execCommand(f); break;
        case 'strike': document.execCommand('strikeThrough'); break;
        case 'mark': {
            const m = inTag('MARK');
            if (m) { m.replaceWith(...m.childNodes); }
            else { const s = window.getSelection(); if (!s.isCollapsed) { const r = s.getRangeAt(0), mk = document.createElement('mark'); try { mk.appendChild(r.extractContents()); r.insertNode(mk); } catch (e) {} } else toast('Sélectionne d’abord le texte à surligner'); }
            break;
        }
        case 'ul': case 'ol': {
            const ul = inTag('UL');
            if (f === 'ul' && ul && ul.classList.contains('nb-tasks')) { ul.classList.remove('nb-tasks'); ul.querySelectorAll('li').forEach(li => li.classList.remove('nb-task', 'done')); }
            else document.execCommand(f === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
            break;
        }
        case 'check': {
            const ul = inTag('UL');
            if (ul && ul.classList.contains('nb-tasks')) { document.execCommand('insertUnorderedList'); }
            else {
                if (!ul) document.execCommand('insertUnorderedList');
                const u = inTag('UL'); if (u) { u.classList.add('nb-tasks'); u.querySelectorAll('li').forEach(li => li.classList.add('nb-task')); }
            }
            break;
        }
        case 'hr': document.execCommand('insertHTML', false, '<hr><div><br></div>'); break;
        case 'link': {
            const s = window.getSelection(), txt = s.toString();
            let url = prompt('Adresse du lien (ex. https://…)', /^https?:\/\//.test(txt) ? txt : 'https://');
            if (!url || url === 'https://') break;
            if (!/^[a-z]+:/i.test(url)) url = 'https://' + url;
            nbRestoreRange();
            if (s.isCollapsed) document.execCommand('insertHTML', false, `<a href="${escAttr(url)}">${escHtml(url)}</a>&nbsp;`);
            else document.execCommand('createLink', false, url);
            break;
        }
        case 'date': { const d = new Date(), p = x => String(x).padStart(2, '0'); document.execCommand('insertText', false, `${DAYS_FULL ? DAYS_FULL[d.getDay()] + ' ' : ''}${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())} `); break; }
        case 'clear': document.execCommand('removeFormat'); if (blk && /^H\d|BLOCKQUOTE$/.test(blk.nodeName)) document.execCommand('formatBlock', false, 'div'); break;
    }
    nbScheduleSave();
}
// Raccourcis : « - » « * » « 1. » « [] » « # » « ## » « > » en début de ligne
function nbOnInput(e) {
    // Quel que soit le clavier (PC, Gboard, iPhone…) : on regarde le début de la ligne après chaque frappe
    if (/^insert(Text|CompositionText|ReplacementText)?$/.test(e.inputType || 'insertText')) {
        const s = window.getSelection();
        if (s.rangeCount && s.isCollapsed) {
            const body = document.getElementById('nbBody'), anchor = s.anchorNode;
            let blk = nbBlock();
            // Ligne posée directement dans la zone (sans bloc) : on part du nœud de texte lui-même
            const start = blk || (anchor !== body ? anchor : null);
            if (start) {
                const r = document.createRange(); r.setStart(start, 0); r.setEnd(anchor, s.anchorOffset);
                const prefix = r.toString().replace(/ /g, ' ');
                const map = { '- ': 'ul', '* ': 'ul', '1. ': 'ol', '[] ': 'check', '[ ] ': 'check', '# ': 'h1', '## ': 'h2', '> ': 'quote' };
                const f = map[prefix];
                if (f && !(blk && blk.nodeName === 'LI' && f !== 'check')) {
                    r.deleteContents();
                    if (!blk) { blk = document.createElement('div'); anchor.parentNode.insertBefore(blk, anchor); blk.appendChild(anchor); }
                    if (!blk.textContent) blk.innerHTML = '<br>';
                    const c = document.createRange(); c.setStart(blk, 0); c.collapse(true); s.removeAllRanges(); s.addRange(c);
                    nbTrackSel();
                    // hors de l'événement en cours : le navigateur refuse une mise en forme imbriquée
                    setTimeout(() => nbFormat(f), 0); return;
                }
            }
        }
    }
    // Entrée dans une liste à cocher : la nouvelle case n'est pas déjà cochée
    if (e.inputType === 'insertParagraph') {
        const li = nbBlock();
        if (li && li.nodeName === 'LI' && li.parentNode.classList.contains('nb-tasks')) { li.classList.add('nb-task'); if (!li.textContent.trim()) li.classList.remove('done'); }
    }
    nbScheduleSave();
}
// Entrée sur une ligne de liste vide : on sort de la liste (comme dans toutes les applis de notes)
function nbExitEmptyItem() {
    const li = nbBlock();
    if (!li || li.nodeName !== 'LI' || li.textContent.trim() || li.querySelector('img')) return false;
    const list = li.parentNode, div = document.createElement('div');
    div.innerHTML = '<br>';
    const after = [...list.children].slice([...list.children].indexOf(li) + 1);
    list.parentNode.insertBefore(div, list.nextSibling);
    if (after.length) { const rest = list.cloneNode(false); after.forEach(x => rest.appendChild(x)); div.after(rest); }
    li.remove(); if (!list.children.length) list.remove();
    const r = document.createRange(); r.setStart(div, 0); r.collapse(true); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
    nbScheduleSave(); return true;
}
function nbOnBeforeInput(e) { if (e.inputType === 'insertParagraph' && nbExitEmptyItem()) e.preventDefault(); }
function nbOnKey(e) {
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && nbExitEmptyItem()) { e.preventDefault(); return; }
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); nbFormat('bold'); }
    else if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); nbFormat('italic'); }
    else if (mod && e.key.toLowerCase() === 'u') { e.preventDefault(); nbFormat('underline'); }
    else if (mod && e.key === 'Enter') { e.preventDefault(); nbFormat('check'); }
    else if (e.key === 'Tab') { e.preventDefault(); document.execCommand(e.shiftKey ? 'outdent' : 'indent'); }
}
function nbOnClick(e) {
    const li = e.target.closest && e.target.closest('li.nb-task');
    const n = NB.notes[nbOpenId];
    if (li && n && !n.trashed) {
        const r = li.getBoundingClientRect();
        if (e.clientX - r.left < 30) { e.preventDefault(); li.classList.toggle('done'); nbScheduleSave(); return; }
    }
    const a = e.target.closest && e.target.closest('a[href]');
    if (a && (e.ctrlKey || e.metaKey || confirm('Ouvrir ce lien ?\n' + a.href))) window.open(a.href, '_blank', 'noopener');
}
// Coller : texte simple (pas de styles d'autres sites), mais les images sont gardées
function nbOnPaste(e) {
    const cd = e.clipboardData; if (!cd) return;
    const img = [...(cd.items || [])].find(i => i.type.startsWith('image/'));
    e.preventDefault();
    if (img) { nbSaveRange(); nbInsertImageFile(img.getAsFile()); return; }
    const text = cd.getData('text/plain');
    if (text) document.execCommand('insertText', false, text);
}

// ---------- images ----------
function nbPickImage() {
    let inp = document.getElementById('nbImgInput');
    if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.id = 'nbImgInput'; inp.hidden = true; document.body.appendChild(inp); inp.addEventListener('change', () => { if (inp.files[0]) nbInsertImageFile(inp.files[0]); inp.value = ''; }); }
    inp.click();
}
function nbInsertImageFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
        // Réduite (1200 px max, JPEG) pour garder la synchro rapide
        const max = 1200, k = Math.min(1, max / Math.max(im.width, im.height));
        const c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
        const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(im, 0, 0, c.width, c.height);
        let q = .78, data = c.toDataURL('image/jpeg', q);
        while (data.length > 450000 && q > .4) { q -= .12; data = c.toDataURL('image/jpeg', q); }
        URL.revokeObjectURL(url);
        nbRestoreRange();
        document.execCommand('insertHTML', false, `<img src="${data}" alt=""><div><br></div>`);
        nbScheduleSave(); toast('Image ajoutée ✓');
    };
    im.onerror = () => { URL.revokeObjectURL(url); toast('Cette image ne peut pas être lue'); };
    im.src = url;
}

// ---------- dictée à la voix ----------
function nbToggleMic() { if (nbRec) nbStopMic(); else nbStartMic(); }
function nbStartMic() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast('La dictée n’est pas disponible sur ce navigateur (utilise Chrome)'); return; }
    nbRestoreRange();
    const rec = new SR(); rec.lang = 'fr-FR'; rec.continuous = true; rec.interimResults = true;
    let live = null;
    rec.onresult = ev => {
        let interim = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
            const r = ev.results[i], t = r[0].transcript;
            if (r.isFinal) {
                if (live) { live.remove(); live = null; }
                nbRestoreRange();
                const body = document.getElementById('nbBody'), before = (nbRange && nbRange.startContainer.textContent || '').slice(0, nbRange ? nbRange.startOffset : 0);
                let txt = t.trim(); if (!txt) continue;
                if (!before || /[.!?]\s*$/.test(before)) txt = txt.charAt(0).toUpperCase() + txt.slice(1);
                document.execCommand('insertText', false, (before && !/\s$/.test(before) ? ' ' : '') + txt + ' ');
                nbTrackSel(); nbScheduleSave();
            } else interim += t;
        }
        if (interim) {
            if (!live) { live = document.createElement('span'); live.className = 'nb-live'; live.contentEditable = 'false'; const r = window.getSelection().rangeCount ? window.getSelection().getRangeAt(0) : null; if (r) r.insertNode(live); }
            live.textContent = interim;
        }
    };
    rec.onerror = ev => { if (ev.error === 'not-allowed') toast('Autorise le micro pour dicter'); else if (ev.error !== 'no-speech' && ev.error !== 'aborted') toast('Dictée interrompue'); };
    rec.onend = () => { if (live) live.remove(); if (nbRec === rec) { try { rec.start(); } catch (e) { nbStopMic(); } } };
    try { rec.start(); } catch (e) { toast('Impossible de lancer la dictée'); return; }
    nbRec = rec;
    const b = document.getElementById('nbMic'); if (b) { b.classList.add('on'); b.querySelector('span').textContent = 'Arrêter'; }
    toast('Parle, j’écris… (touche « Arrêter » pour finir)');
}
function nbStopMic() {
    const rec = nbRec; nbRec = null;
    if (rec) { try { rec.stop(); } catch (e) {} }
    document.querySelectorAll('.nb-live').forEach(x => x.remove());
    const b = document.getElementById('nbMic'); if (b) { b.classList.remove('on'); b.querySelector('span').textContent = 'Dicter'; }
}

// ---------- actions sur la note ----------
function nbUpdate(fn, msg) { const n = NB.notes[nbOpenId]; if (!n) return; nbFlushSave(); fn(n); n.updatedAt = Date.now(); nbTouch('notes', nbOpenId); nbHeadState(); renderNotesList(); updateNotesBadge(); if (msg) toast(msg); }
function nbTogglePin() { nbUpdate(n => { n.pinned = !n.pinned; }, NB.notes[nbOpenId] && NB.notes[nbOpenId].pinned ? 'Note détachée' : 'Note épinglée en haut ✓'); }
function nbAddTag(v) {
    const t = String(v || '').trim().replace(/^#+/, '').replace(/[\s,]+/g, '-').toLowerCase().slice(0, 30);
    const inp = document.getElementById('nbTagInput'); if (inp) inp.value = '';
    if (!t) return;
    nbUpdate(n => { n.tags = [...new Set([...(n.tags || []), t])]; });
    setTimeout(() => { const i = document.getElementById('nbTagInput'); if (i) i.focus(); }, 30);
}
function nbRemoveTag(t) { nbUpdate(n => { n.tags = (n.tags || []).filter(x => x !== t); }); }
function nbPickColor() {
    const cur = (NB.notes[nbOpenId] || {}).color || '';
    nbSheet('Couleur de la note', `<div class="nb-colors">${Object.entries(NB_COLORS).map(([k, c]) => `<button class="nb-color${k === cur ? ' active' : ''}" onclick="nbUpdate(n=>{n.color='${k}'});nbCloseSheet()" aria-label="${c}"><span style="${k ? `background:${c}` : ''}">${k ? '' : '<i class="ph-duotone ph-prohibit"></i>'}</span>${k ? '' : 'Aucune'}</button>`).join('')}</div>`);
}
function nbPickBook() {
    const n = NB.notes[nbOpenId]; if (!n || n.trashed) return;
    const books = nbBooks();
    nbSheet('Ranger dans un carnet', `
        <button class="nb-opt${!n.book || !NB.books[n.book] ? ' active' : ''}" onclick="nbUpdate(n=>{n.book=''});nbCloseSheet()"><i class="ph-duotone ph-tray"></i>Sans carnet</button>
        ${books.map(b => `<button class="nb-opt${b.id === n.book ? ' active' : ''}" onclick="nbUpdate(n=>{n.book='${b.id}'},'Rangée dans ${escAttr(b.name).replace(/'/g, '’')} ✓');nbCloseSheet()"><span class="nb-dot" style="background:${NB_COLORS[b.color] || NB_COLORS.amber}"></span>${escHtml(b.name)}</button>`).join('')}
        <button class="nb-opt add" onclick="nbCloseSheet();nbNewBook(true)"><i class="ph-duotone ph-plus"></i>Nouveau carnet…</button>`);
}
function nbNoteMenu() {
    const n = NB.notes[nbOpenId]; if (!n) return;
    nbSheet('Options de la note', `
        <button class="nb-opt" onclick="nbCloseSheet();nbDuplicate()"><i class="ph-duotone ph-copy"></i>Dupliquer</button>
        <button class="nb-opt" onclick="nbCloseSheet();nbCopyText()"><i class="ph-duotone ph-clipboard-text"></i>Copier le texte</button>
        ${navigator.share ? `<button class="nb-opt" onclick="nbCloseSheet();nbShare()"><i class="ph-duotone ph-share-network"></i>Partager (WhatsApp, e-mail…)</button>` : ''}
        <button class="nb-opt" onclick="nbCloseSheet();nbExport()"><i class="ph-duotone ph-download-simple"></i>Télécharger en fichier texte</button>
        <button class="nb-opt" onclick="nbCloseSheet();nbUncheckAll()"><i class="ph-duotone ph-arrow-counter-clockwise"></i>Décocher toutes les cases</button>
        ${n.trashed ? `<button class="nb-opt" onclick="nbCloseSheet();nbRestore()"><i class="ph-duotone ph-arrow-u-up-left"></i>Restaurer</button>` : `<button class="nb-opt danger" onclick="nbCloseSheet();nbTrash()"><i class="ph-duotone ph-trash"></i>Mettre à la corbeille</button>`}`);
}
function nbDuplicate() { nbFlushSave(); const n = NB.notes[nbOpenId], id = nbId('n'), now = Date.now(); NB.notes[id] = { ...n, title: (n.title || nbTitleOf(n)) + ' (copie)', pinned: false, createdAt: now, updatedAt: now }; nbTouch('notes', id); openNote(id); toast('Note dupliquée ✓'); }
function nbPlain() { nbFlushSave(); const n = NB.notes[nbOpenId]; return ((n.title ? n.title + '\n\n' : '') + nbHtmlTextChecks(n.html || '')).trim(); }
function nbHtmlTextChecks(html) { return nbHtmlText(html.replace(/<li class="nb-task done">/g, '<li>☑ ').replace(/<li class="nb-task">/g, '<li>☐ ')); }
function nbCopyText() { const t = nbPlain(); (navigator.clipboard ? navigator.clipboard.writeText(t) : Promise.reject()).then(() => toast('Texte copié ✓')).catch(() => toast('Copie impossible')); }
function nbShare() { navigator.share({ title: nbTitleOf(NB.notes[nbOpenId]), text: nbPlain() }).catch(() => {}); }
function nbExport() {
    const t = nbPlain(), name = nbTitleOf(NB.notes[nbOpenId]).replace(/[\\/:*?"<>|]+/g, '').slice(0, 60) || 'note';
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([t], { type: 'text/plain;charset=utf-8' })); a.download = name + '.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
function nbUncheckAll() { const b = document.getElementById('nbBody'); b.querySelectorAll('li.nb-task.done').forEach(li => li.classList.remove('done')); nbFlushSave(); toast('Cases décochées'); }
function nbTrash() {
    const id = nbOpenId;
    nbUpdate(n => { n.trashed = Date.now(); n.pinned = false; });
    closeNote();
    nbToastUndo('Note mise à la corbeille', () => { const n = NB.notes[id]; if (n) { n.trashed = 0; n.updatedAt = Date.now(); nbTouch('notes', id); renderNotesList(); updateNotesBadge(); } });
}
function nbRestore() { nbUpdate(n => { n.trashed = 0; }, 'Note restaurée ✓'); fillEditor(); }
function nbPurge() {
    if (!confirm('Supprimer cette note pour toujours ? Elle ne pourra plus être récupérée.')) return;
    NB.notes[nbOpenId] = { purged: true, updatedAt: Date.now() }; nbTouch('notes', nbOpenId);
    nbOpenId = null; closeNote(); toast('Note supprimée pour toujours');
}
function nbEmptyTrash() {
    const list = nbAll().filter(n => n.trashed);
    if (!list.length || !confirm(`Supprimer pour toujours les ${list.length} note${list.length > 1 ? 's' : ''} de la corbeille ? Elles ne pourront plus être récupérées.`)) return;
    list.forEach(n => { NB.notes[n.id] = { purged: true, updatedAt: Date.now() }; nbTouch('notes', n.id); });
    if (nbOpenId && NB.notes[nbOpenId] && NB.notes[nbOpenId].purged) { nbOpenId = null; closeNote(); }
    renderNotesList(); toast('Corbeille vidée');
}

// ---------- carnets ----------
function nbNewBook(assignOpen) {
    const name = (prompt('Nom du nouveau carnet (ex. Idées, Travail, Clients)') || '').trim();
    if (!name) return;
    const id = nbId('b'), colors = Object.keys(NB_COLORS).filter(Boolean);
    NB.books[id] = { name: name.slice(0, 40), color: colors[nbBooks().length % colors.length], order: nbBooks().length, createdAt: Date.now(), updatedAt: Date.now() };
    nbTouch('books', id);
    if (assignOpen && nbOpenId) nbUpdate(n => { n.book = id; }, `Rangée dans ${name} ✓`);
    else { nbFilter = { kind: 'book', id }; toast(`Carnet « ${name} » créé ✓`); }
    renderNotesList();
}
function nbBookMenu(id) {
    const b = NB.books[id]; if (!b) return;
    nbSheet(`Carnet « ${escHtml(b.name)} »`, `
        <button class="nb-opt" onclick="nbCloseSheet();nbNew('${id}')"><i class="ph-duotone ph-plus"></i>Nouvelle note dans ce carnet</button>
        <button class="nb-opt" onclick="nbCloseSheet();nbRenameBook('${id}')"><i class="ph-duotone ph-pencil-simple"></i>Renommer</button>
        <div class="nb-colors">${Object.entries(NB_COLORS).filter(([k]) => k).map(([k, c]) => `<button class="nb-color${k === b.color ? ' active' : ''}" onclick="nbBookColor('${id}','${k}')" aria-label="Couleur"><span style="background:${c}"></span></button>`).join('')}</div>
        <button class="nb-opt danger" onclick="nbCloseSheet();nbDeleteBook('${id}')"><i class="ph-duotone ph-trash"></i>Supprimer le carnet (les notes restent)</button>`);
}
function nbRenameBook(id) { const b = NB.books[id], v = (prompt('Nouveau nom du carnet', b.name) || '').trim(); if (!v) return; b.name = v.slice(0, 40); b.updatedAt = Date.now(); nbTouch('books', id); renderNotesList(); if (nbOpenId) nbHeadState(); }
function nbBookColor(id, k) { const b = NB.books[id]; b.color = k; b.updatedAt = Date.now(); nbTouch('books', id); nbCloseSheet(); renderNotesList(); if (nbOpenId) nbHeadState(); }
function nbDeleteBook(id) {
    const b = NB.books[id], n = nbAll().filter(x => x.book === id).length;
    if (!confirm(`Supprimer le carnet « ${b.name} » ?${n ? `\nSes ${n} note${n > 1 ? 's' : ''} ne sont pas effacées : elles passent dans « Sans carnet ».` : ''}`)) return;
    nbAll().filter(x => x.book === id).forEach(x => { NB.notes[x.id].book = ''; NB.notes[x.id].updatedAt = Date.now(); nbTouch('notes', x.id); });
    NB.books[id] = { deleted: true, name: b.name, updatedAt: Date.now() }; nbTouch('books', id);
    if (nbFilter.kind === 'book' && nbFilter.id === id) nbFilter = { kind: 'all', id: null };
    renderNotesList(); if (nbOpenId) nbHeadState(); toast('Carnet supprimé');
}

// ---------- petites fenêtres ----------
function nbSheet(title, html) {
    let o = document.getElementById('nbSheet');
    if (!o) {
        o = document.createElement('div'); o.className = 'qa-overlay'; o.id = 'nbSheet';
        o.addEventListener('click', e => { if (e.target === o) nbCloseSheet(); });
        document.body.appendChild(o);
    }
    o.innerHTML = `<div class="qa-sheet nb-sheet" role="dialog" aria-modal="true"><div class="qa-head"><span style="width:44px"></span><h2>${title}</h2><button class="icon-btn" onclick="nbCloseSheet()" aria-label="Fermer"><span class="material-icons-outlined">close</span></button></div><div class="nb-sheet-body">${html}</div></div>`;
    o.classList.add('active');
}
function nbCloseSheet() { const o = document.getElementById('nbSheet'); if (o) o.classList.remove('active'); }
function nbToastUndo(msg, undo) {
    let t = document.getElementById('nbUndo');
    if (!t) { t = document.createElement('div'); t.id = 'nbUndo'; t.className = 'nb-undo'; document.body.appendChild(t); }
    t.innerHTML = `<span>${msg}</span><button>Annuler</button>`;
    t.querySelector('button').onclick = () => { undo(); t.classList.remove('show'); };
    t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 5000);
}
// Clavier du téléphone : l'éditeur prend la hauteur visible pour garder la barre d'outils au-dessus du clavier
function nbFitViewport() {
    const vv = window.visualViewport; if (!vv) return;
    const set = () => { document.documentElement.style.setProperty('--nb-vh', vv.height + 'px'); document.documentElement.style.setProperty('--nb-top', vv.offsetTop + 'px'); };
    if (!nbFitViewport.done) { vv.addEventListener('resize', set); vv.addEventListener('scroll', set); nbFitViewport.done = true; }
    set();
}

// ---------- accès depuis les autres rubriques (bouton jaune « Notes ») ----------
function currentNoteSection() { return NOTE_SECTIONS[S.currentView] ? S.currentView : null; }
function openNotes(sec) {
    sec = sec || currentNoteSection();
    if (sec) {
        const id = nbSectionBook(sec, false);
        nbFilter = NB.books[id] && !NB.books[id].deleted ? { kind: 'book', id } : { kind: 'all', id: null };
        nbBackFromSection = sec;
    } else nbFilter = { kind: 'all', id: null };
    switchView('notes');
}
function closeNotes() { if (nbOpenId) closeNote(); else if (nbBackFromSection) { const s = nbBackFromSection; nbBackFromSection = null; switchView(s); } }
// Le chiffre jaune : notes du carnet de la rubrique ouverte (ou toutes, dans Notes)
function updateNotesBadge() {
    const c = document.getElementById('notesCount'); if (!c || typeof S === 'undefined') return;
    const sec = currentNoteSection(), live = nbAll().filter(n => !n.trashed);
    const n = sec ? live.filter(x => x.book === 'sec-' + sec).length : 0;
    c.hidden = !n; c.textContent = n;
    const b = document.getElementById('notesBtn');
    if (b) { b.title = sec && n ? `Notes · ${NOTE_SECTIONS[sec]}` : 'Ouvrir mes notes'; b.classList.toggle('active', S.currentView === 'notes'); }
}
// Nouvelle note rattachée à la rubrique d'où l'on vient
function nbNewForSection() { const sec = nbBackFromSection || currentNoteSection(); nbNew(sec ? nbSectionBook(sec, true) : ''); }

// Raccourcis clavier (PC) dans la rubrique Notes
document.addEventListener('keydown', e => {
    if (S.currentView !== 'notes') return;
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && k === 'k') { e.preventDefault(); const s = document.getElementById('nbSearch'); if (s) { s.focus(); s.select(); } }
    else if (mod && e.altKey && k === 'n') { e.preventDefault(); nbNew(); }
    else if (e.key === 'Escape' && document.getElementById('nbSheet')?.classList.contains('active')) { nbCloseSheet(); }
    else if (e.key === 'Escape' && nbOpenId && !document.querySelector('.qa-overlay.active, .modal-overlay.active')) { closeNote(); }
});
(function hookNotes() {
    // Le gros bouton + du téléphone : dans Notes, il crée une note
    const oq = window.openQuickAdd;
    if (typeof oq === 'function') window.openQuickAdd = function () { if (S.currentView === 'notes') return nbNewForSection(); return oq.apply(this, arguments); };
    const orig = window.renderAll;
    if (typeof orig === 'function') window.renderAll = function () { const r = orig.apply(this, arguments); try { nbMigrateSectionNotes(); if (S.currentView === 'notes') renderNotesApp(); else if (nbOpenId) closeNote(true); updateNotesBadge(); } catch (e) { console.warn('Notes', e); } return r; };
    // Anciennes notes du bouton jaune : reprises dès le démarrage (même hors connexion)
    setTimeout(() => { try { nbMigrateSectionNotes(); nbPurgeOld(); updateNotesBadge(); } catch (e) {} }, 0);
})();
