// ==================== DESCRIPTIONS VIDÉOS ====================
// Rangées dans un nœud Firebase à part (videoDescriptions), hors de userData :
// save() écrase userData en entier, ici Claude peut ajouter des descriptions sans y toucher.
// Forme : { folders: { id: { name, order } }, items: { id: { folder, title, text, createdAt, copied } } }
const DESC_KEY = 'handy-video-desc';
let DESC = { folders: {}, items: {} };
let descFolder = null;     // dossier ouvert (null = liste des dossiers)
let descOpen = {};         // descriptions dépliées
let descRef = null;

try { const c = JSON.parse(localStorage.getItem(DESC_KEY)); if (c) DESC = { folders: c.folders || {}, items: c.items || {} }; } catch (e) {}

function attachDescSync() {
    if (typeof firebase === 'undefined' || !firebase.apps.length) return;
    if (descRef) descRef.off('value');
    descRef = firebase.database().ref('videoDescriptions');
    descRef.on('value', snap => {
        const d = snap.val() || {};
        DESC = { folders: d.folders || {}, items: d.items || {} };
        try { localStorage.setItem(DESC_KEY, JSON.stringify(DESC)); } catch (e) {}
        if (descFolder && !DESC.folders[descFolder]) descFolder = null;
        if (S.currentView === 'descriptions') renderDescriptions();
    }, err => console.warn('Descriptions', err && err.code));
}

function descFolders() {
    return Object.entries(DESC.folders)
        .map(([id, f]) => ({ id, ...f }))
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.name || '').localeCompare(b.name || ''));
}

function descItems(folderId) {
    return Object.entries(DESC.items)
        .map(([id, it]) => ({ id, ...it }))
        .filter(it => it.folder === folderId)
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
}

function descDate(ts) {
    if (!ts) return '';
    return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function renderDescriptions() {
    const box = document.getElementById('descContent');
    if (!box) return;
    const head = document.getElementById('descHeadActions');

    if (!descFolder) {
        head.innerHTML = `<button class="btn primary" onclick="addDescFolder()"><span class="material-icons-outlined">add</span> Nouveau dossier</button>`;
        const folders = descFolders();
        if (!folders.length) {
            box.innerHTML = `<div class="desc-empty card"><span class="material-icons-outlined">folder</span>
                <p>Aucun dossier pour l'instant.</p>
                <span>Crée un dossier par type de contenu, puis demande à Claude une description : elle apparaîtra ici, prête à copier.</span></div>`;
            return;
        }
        box.innerHTML = `<div class="desc-folders">${folders.map(f => {
            const items = descItems(f.id);
            const fresh = items.filter(it => !it.copied).length;
            return `<button class="desc-folder card" onclick="openDescFolder('${escAttr(f.id)}')">
                <span class="desc-folder-icon material-icons-outlined">folder</span>
                <span class="desc-folder-name">${escHtml(f.name || 'Sans nom')}</span>
                <span class="desc-folder-meta">${items.length} description${items.length > 1 ? 's' : ''}${items[0] ? ' · ' + descDate(items[0].createdAt) : ''}</span>
                ${fresh ? `<span class="desc-new">${fresh} nouvelle${fresh > 1 ? 's' : ''}</span>` : ''}
            </button>`;
        }).join('')}</div>`;
        return;
    }

    const f = DESC.folders[descFolder];
    head.innerHTML = `
        <button class="btn" onclick="renameDescFolder()" title="Renommer le dossier"><span class="material-icons-outlined">edit</span></button>
        <button class="btn" onclick="deleteDescFolder()" title="Supprimer le dossier"><span class="material-icons-outlined">delete</span></button>`;
    const items = descItems(descFolder);
    box.innerHTML = `
        <button class="desc-back" onclick="openDescFolder(null)"><span class="material-icons-outlined">chevron_left</span> Tous les dossiers</button>
        <h3 class="desc-folder-title">${escHtml(f.name || 'Sans nom')}</h3>
        ${items.length ? `<div class="desc-list">${items.map(it => `
            <article class="desc-item card${it.copied ? ' is-copied' : ''}">
                <div class="desc-item-head">
                    <div>
                        <strong>${escHtml(it.title || 'Sans titre')}</strong>
                        <span>${descDate(it.createdAt)}${it.copied ? ' · copiée' : ''}</span>
                    </div>
                    <button class="icon-btn" onclick="deleteDescItem('${escAttr(it.id)}')" aria-label="Supprimer"><span class="material-icons-outlined">delete</span></button>
                </div>
                <p class="desc-text${descOpen[it.id] ? ' open' : ''}" onclick="toggleDescItem('${escAttr(it.id)}')">${escHtml(it.text || '')}</p>
                <div class="desc-item-actions">
                    <button class="btn" onclick="toggleDescItem('${escAttr(it.id)}')">${descOpen[it.id] ? 'Réduire' : 'Tout voir'}</button>
                    <button class="btn-primary" onclick="copyDescItem('${escAttr(it.id)}')"><span class="material-icons-outlined">content_copy</span> Copier</button>
                </div>
            </article>`).join('')}</div>`
        : `<div class="desc-empty card"><span class="material-icons-outlined">folder</span>
            <p>Ce dossier est vide.</p>
            <span>Demande à Claude une description pour « ${escHtml(f.name || '')} » : elle arrivera ici.</span></div>`}`;
}

function openDescFolder(id) { descFolder = id; descOpen = {}; renderDescriptions(); window.scrollTo(0, 0); }
function toggleDescItem(id) { descOpen[id] = !descOpen[id]; renderDescriptions(); }

function copyDescItem(id) {
    const it = DESC.items[id];
    if (!it) return;
    copyText(it.text || '', 'Description copiée ✓');
    if (!it.copied && descRef) descRef.child('items/' + id + '/copied').set(true);
}

function addDescFolder() {
    const name = (prompt('Nom du dossier (type de contenu) :') || '').trim();
    if (!name || !descRef) return;
    const order = descFolders().reduce((m, f) => Math.max(m, f.order ?? 0), 0) + 1;
    descRef.child('folders/' + genId()).set({ name, order }).then(() => toast('Dossier créé ✓'));
}

function renameDescFolder() {
    const f = DESC.folders[descFolder];
    const name = (prompt('Nouveau nom du dossier :', f.name || '') || '').trim();
    if (!name || name === f.name) return;
    descRef.child('folders/' + descFolder + '/name').set(name);
}

function deleteDescFolder() {
    const f = DESC.folders[descFolder];
    const items = descItems(descFolder);
    if (!confirm(`Supprimer le dossier « ${f.name} »${items.length ? ` et ses ${items.length} description(s)` : ''} ?`)) return;
    const upd = { ['folders/' + descFolder]: null };
    items.forEach(it => upd['items/' + it.id] = null);
    descFolder = null;
    descRef.update(upd).then(() => toast('Dossier supprimé'));
}

function deleteDescItem(id) {
    if (!confirm('Supprimer cette description ?')) return;
    descRef.child('items/' + id).remove();
}
