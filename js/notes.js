// ==================== NOTES PAR RUBRIQUE ====================
// Un carnet de notes pour chaque rubrique (Accueil, Journal, Abonnements, Finance…).
// Stocké dans S.sectionNotes[rubrique] = [{ id, text, createdAt, updatedAt }], synchronisé comme le reste.
const NOTE_SECTIONS = {
    today: 'Accueil', weekly: 'Task Tracker', monthly: 'Habit Tracker', finance: 'Dashboard',
    subscriptions: 'Abonnements', finance2: 'Finance', calendar: 'Journal de bord', fitness: 'Santé',
    descriptions: 'Descriptions vidéos'
};
let notesSection = null;   // rubrique affichée dans le panneau ('all' = toutes)

function notesOf(sec) {
    const v = (S.sectionNotes || {})[sec];
    return (Array.isArray(v) ? v : Object.values(v || {})).filter(n => n && n.id);
}
function notesSetList(sec, list) {
    if (!S.sectionNotes) S.sectionNotes = {};
    if (list.length) S.sectionNotes[sec] = list; else delete S.sectionNotes[sec];
}
function currentNoteSection() { return NOTE_SECTIONS[S.currentView] ? S.currentView : 'today'; }

function openNotes(sec) {
    notesSection = sec || currentNoteSection();
    renderNotes();
    document.getElementById('notesOverlay').classList.add('active');
    requestAnimationFrame(notesLayout);   // tailles calculées une fois le panneau visible
    if (notesSection !== 'all') setTimeout(() => { const t = document.getElementById('noteNew'); if (t && window.innerWidth > 768) t.focus(); }, 60);
}
function closeNotes() { document.getElementById('notesOverlay').classList.remove('active'); updateNotesBadge(); }
function setNotesSection(sec) { notesSection = sec; renderNotes(); }

function renderNotes() {
    const sec = notesSection || currentNoteSection();
    const q = (document.getElementById('notesSearch')?.value || '').trim().toLowerCase();
    // Onglets : une puce par rubrique, avec son nombre de notes
    document.getElementById('notesTabs').innerHTML = [['all', 'Toutes'], ...Object.entries(NOTE_SECTIONS)].map(([k, label]) => {
        const n = k === 'all' ? Object.keys(NOTE_SECTIONS).reduce((s, x) => s + notesOf(x).length, 0) : notesOf(k).length;
        return `<button class="notes-tab${k === sec ? ' active' : ''}" onclick="setNotesSection('${k}')">${escHtml(label)}${n ? `<small>${n}</small>` : ''}</button>`;
    }).join('');
    document.getElementById('notesTitle').textContent = sec === 'all' ? 'Toutes mes notes' : `Notes · ${NOTE_SECTIONS[sec]}`;
    document.getElementById('notesComposer').hidden = sec === 'all';

    const secs = sec === 'all' ? Object.keys(NOTE_SECTIONS) : [sec];
    let items = [];
    secs.forEach(s => notesOf(s).forEach(n => items.push({ ...n, sec: s })));
    if (q) items = items.filter(n => (n.text || '').toLowerCase().includes(q) || (sec === 'all' && NOTE_SECTIONS[n.sec].toLowerCase().includes(q)));
    items.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.updatedAt || b.createdAt).localeCompare(String(a.updatedAt || a.createdAt)));

    const list = document.getElementById('notesList');
    if (!items.length) {
        list.innerHTML = `<div class="notes-empty">${q ? `Aucune note ne contient « ${escHtml(q)} ».` : sec === 'all' ? 'Aucune note pour l’instant.' : 'Aucune note dans cette rubrique. Écris la première ci-dessus.'}</div>`;
        return;
    }
    list.innerHTML = items.map(n => `
        <div class="note-item${n.pinned ? ' pinned' : ''}">
            ${sec === 'all' ? `<button class="note-sec" onclick="setNotesSection('${n.sec}')">${escHtml(NOTE_SECTIONS[n.sec])}</button>` : ''}
            <textarea class="note-text" rows="1" oninput="autoGrowNote(this)" onchange="editNote('${n.sec}', '${n.id}', this.value)" aria-label="Note">${escHtml(n.text || '')}</textarea>
            <div class="note-foot">
                <span>${n.updatedAt && n.updatedAt !== n.createdAt ? `Modifiée le ${noteDate(n.updatedAt)}` : `Écrite le ${noteDate(n.createdAt)}`}</span>
                <span class="note-actions">
                    <button onclick="togglePinNote('${n.sec}', '${n.id}')" title="${n.pinned ? 'Détacher' : 'Épingler en haut'}" aria-label="${n.pinned ? 'Détacher' : 'Épingler en haut'}"><span class="material-icons-outlined">${n.pinned ? 'keep_off' : 'keep'}</span></button>
                    <button onclick="deleteNote('${n.sec}', '${n.id}')" title="Supprimer" aria-label="Supprimer la note"><span class="material-icons-outlined">delete</span></button>
                </span>
            </div>
        </div>`).join('');
    notesLayout();
}
function notesLayout() {
    document.querySelectorAll('#notesList .note-text').forEach(autoGrowNote);
    const tabs = document.getElementById('notesTabs'), at = tabs && tabs.querySelector('.notes-tab.active');
    if (at) tabs.scrollLeft = at.offsetLeft - (tabs.clientWidth - at.offsetWidth) / 2;
}
function autoGrowNote(t) { t.style.height = 'auto'; t.style.height = Math.max(t.id === 'noteNew' ? 64 : 0, t.scrollHeight + 2) + 'px'; }

function addNote() {
    const t = document.getElementById('noteNew'), text = (t.value || '').trim();
    if (!text) { t.focus(); return; }
    const sec = notesSection && notesSection !== 'all' ? notesSection : currentNoteSection(), now = new Date().toISOString();
    notesSetList(sec, [{ id: 'n' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text, createdAt: now, updatedAt: now }, ...notesOf(sec)]);
    t.value = ''; autoGrowNote(t);
    save(); toast('Note enregistrée ✓'); renderNotes(); updateNotesBadge();
}
function editNote(sec, id, value) {
    const text = String(value).trim();
    const list = notesOf(sec).map(n => n.id === id ? { ...n, text, updatedAt: new Date().toISOString() } : n);
    const n = list.find(x => x.id === id);
    if (n && n.text === (notesOf(sec).find(x => x.id === id) || {}).text) return;
    if (!text) return deleteNote(sec, id, true);
    notesSetList(sec, list); save(); toast('Note modifiée ✓'); renderNotes();
}
function togglePinNote(sec, id) {
    notesSetList(sec, notesOf(sec).map(n => n.id === id ? { ...n, pinned: !n.pinned } : n)); save(); renderNotes();
}
function deleteNote(sec, id, silent) {
    const n = notesOf(sec).find(x => x.id === id);
    if (!silent && n && n.text && !confirm('Supprimer cette note ?')) return;
    notesSetList(sec, notesOf(sec).filter(x => x.id !== id)); save(); toast('Note supprimée'); renderNotes(); updateNotesBadge();
}
// « 21/11/2026 à 14:05 »
function noteDate(iso) {
    const d = new Date(iso); if (isNaN(d)) return '';
    const p = x => String(x).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} à ${p(d.getHours())}:${p(d.getMinutes())}`;
}
// Petit chiffre sur le bouton : nombre de notes de la rubrique ouverte
function updateNotesBadge() {
    const c = document.getElementById('notesCount'); if (!c || typeof S === 'undefined') return;
    const n = notesOf(currentNoteSection()).length;
    c.hidden = !n; c.textContent = n;
    const b = document.getElementById('notesBtn');
    if (b) b.title = `Notes · ${NOTE_SECTIONS[currentNoteSection()]}`;
}
// Mise à jour du chiffre quand on change de rubrique ou que les données arrivent du cloud
(function hookNotes() {
    const orig = window.renderAll;
    if (typeof orig === 'function') window.renderAll = function () { const r = orig.apply(this, arguments); try { updateNotesBadge(); } catch (e) {} return r; };
    setTimeout(updateNotesBadge, 0);
})();
