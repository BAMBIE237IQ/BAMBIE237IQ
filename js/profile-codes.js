// ==================== CODES DES PROFILS (Abonnements) ====================
// Pour chaque compte (Netflix, Prime Video…) : la liste des profils avec leur nom et leur code.
// Stocké dans S.subProfileCodes["service_compte"] = [{ name, code }], synchronisé comme le reste.
// Les codes sont masqués par défaut ; l'œil les affiche.
let pcShow = false;

function pcList(service, acc) {
    const v = (S.subProfileCodes || {})[`${service}_${acc}`];
    return Array.isArray(v) ? v : Object.values(v || {});
}
function pcSet(service, acc, list) {
    if (!S.subProfileCodes) S.subProfileCodes = {};
    const k = `${service}_${acc}`, clean = list.filter(p => (p.name || '').trim() || (p.code || '').trim());
    if (clean.length) S.subProfileCodes[k] = clean; else delete S.subProfileCodes[k];
}
// Profils déjà utilisés par les clients de ce compte : proposés quand on tape un nom
function pcClientProfiles(service, acc) {
    return [...new Set((S.subscriptions || []).filter(c => c.service === service && Number(c.account) === Number(acc) && c.profile).map(c => String(c.profile).trim()).filter(Boolean))];
}

function openProfileCodes() {
    renderProfileCodes();
    document.getElementById('pcOverlay').classList.add('active');
}
function closeProfileCodes() { document.getElementById('pcOverlay').classList.remove('active'); }
function togglePcShow() { pcShow = !pcShow; renderProfileCodes(); }

function renderProfileCodes() {
    const body = document.getElementById('pcBody');
    const ids = subServiceIds();
    let total = 0;
    const html = ids.map(id => {
        const conf = subServices()[id];
        const accs = (conf.accounts || []).map(acc => {
            const list = pcList(id, acc); total += list.length;
            const sugg = pcClientProfiles(id, acc), dl = `pcdl_${id}_${acc}`;
            const rows = list.map((p, i) => `
                <div class="pc-row">
                    <input class="pc-name" value="${escAttr(p.name || '')}" placeholder="Nom du profil" list="${dl}" onchange="pcEdit('${escAttr(id)}', ${acc}, ${i}, 'name', this.value)" aria-label="Nom du profil">
                    <input class="pc-code" value="${escAttr(p.code || '')}" placeholder="Code" type="${pcShow ? 'text' : 'password'}" inputmode="numeric" autocomplete="off" onchange="pcEdit('${escAttr(id)}', ${acc}, ${i}, 'code', this.value)" aria-label="Code du profil">
                    <button class="pc-del" onclick="pcRemove('${escAttr(id)}', ${acc}, ${i})" aria-label="Supprimer ce profil"><span class="material-icons-outlined">delete</span></button>
                </div>`).join('');
            return `<div class="pc-acc">
                <div class="pc-acc-head"><strong>${escHtml(subAccountLabel(id, acc))}</strong><span>${list.length} profil${list.length > 1 ? 's' : ''}</span></div>
                ${rows || '<div class="pc-empty">Aucun profil enregistré.</div>'}
                <datalist id="${dl}">${sugg.map(s => `<option value="${escAttr(s)}"></option>`).join('')}</datalist>
                <button class="pc-add" onclick="pcAdd('${escAttr(id)}', ${acc})"><span class="material-icons-outlined">add</span> Ajouter un profil</button>
            </div>`;
        }).join('');
        return `<details class="pc-svc"${ids.length <= 3 || pcCount(id) ? ' open' : ''}><summary>${escHtml(conf.name)}<small>${pcCount(id)} profil${pcCount(id) > 1 ? 's' : ''}</small></summary>${accs || '<div class="pc-empty">Aucun compte.</div>'}</details>`;
    }).join('');
    body.innerHTML = html;
    document.getElementById('pcSummary').textContent = `${total} profil${total > 1 ? 's' : ''} enregistré${total > 1 ? 's' : ''}`;
    document.getElementById('pcShowBtn').innerHTML = `<span class="material-icons-outlined">${pcShow ? 'visibility_off' : 'visibility'}</span> ${pcShow ? 'Masquer les codes' : 'Afficher les codes'}`;
}
function pcCount(service) { return ((subServices()[service] || {}).accounts || []).reduce((n, acc) => n + pcList(service, acc).length, 0); }

function pcAdd(service, acc) {
    const list = pcList(service, acc).slice(); list.push({ name: '', code: '' });
    if (!S.subProfileCodes) S.subProfileCodes = {};
    S.subProfileCodes[`${service}_${acc}`] = list;   // ligne vide gardée le temps de la remplir
    renderProfileCodes();
    const last = [...document.querySelectorAll('#pcBody .pc-name')].find(i => i.getAttribute('onchange').includes(`'${service}', ${acc}, ${list.length - 1},`));
    if (last) last.focus();
}
function pcEdit(service, acc, i, field, value) {
    const list = pcList(service, acc).slice();
    if (!list[i]) return;
    list[i] = { ...list[i], [field]: String(value).trim() };
    S.subProfileCodes[`${service}_${acc}`] = list;
    if ((list[i].name || list[i].code)) { save(); toast('Profil enregistré ✓'); }
}
function pcRemove(service, acc, i) {
    const list = pcList(service, acc).slice(), p = list[i];
    if (p && (p.name || p.code) && !confirm(`Supprimer le profil « ${p.name || 'sans nom'} » ?`)) return;
    list.splice(i, 1); pcSet(service, acc, list); save(); renderProfileCodes();
}
