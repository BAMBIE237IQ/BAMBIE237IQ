// ==================== SUBSCRIPTIONS ====================
// Services et comptes modifiables (enregistrés dans S.subServices, synchronisés).
// Valeurs de départ = l'ancienne configuration fixe.
const DEFAULT_SUB_SERVICES = {
    netflix: { name: 'Netflix', accounts: [1, 2, 3, 4], hasProfiles: true },
    spotify: { name: 'Spotify', accounts: [1, 2], hasProfiles: false },
    prime: { name: 'Prime Video', accounts: [1], hasProfiles: false },
    proton: { name: 'ProtonVPN', accounts: [1], hasProfiles: false }
};
const SUB_PROFILES = ['Rouge', 'Violet', 'Jaune', 'Vert', 'Blanc'];

function subServices() {
    if (!S.subServices || typeof S.subServices !== 'object' || !Object.keys(S.subServices).length) {
        S.subServices = JSON.parse(JSON.stringify(DEFAULT_SUB_SERVICES));
    }
    // Firebase peut renvoyer les tableaux sous forme d'objets : on normalise
    for (const id in S.subServices) {
        const sv = S.subServices[id];
        sv.accounts = (Array.isArray(sv.accounts) ? sv.accounts : Object.values(sv.accounts || {})).map(Number).filter(n => n > 0);
    }
    return S.subServices;
}
function subServiceName(id) { const sv = subServices()[id]; return sv ? sv.name : (id || ''); }
// Nom affiché d'un compte : le nom personnalisé s'il existe, sinon "Service · Compte N"
function subAccountLabel(service, acc) {
    const custom = S.subAccountNames && S.subAccountNames[`${service}_${acc}`];
    return custom || `${subServiceName(service)} · Compte ${acc}`;
}
function subClientsOf(service, acc) {
    return (S.subscriptions || []).filter(c => c.service === service && (acc === undefined || Number(c.account) === Number(acc)));
}

function renderSubTabs() {
    const box = document.getElementById('subTabs');
    if (!box) return;
    const svcs = subServices();
    if (!svcs[subFilter]) subFilter = Object.keys(svcs)[0];
    box.innerHTML = Object.keys(svcs).map(id => `<button class="nav-tab sub-tab-btn${id === subFilter ? ' active' : ''}" data-svc="${escAttr(id)}" onclick="setSubFilter(this.dataset.svc)">${escHtml(svcs[id].name)} <span class="sub-tab-count">${subClientsOf(id).length}</span></button>`).join('')
        + `<button class="nav-tab sub-tab-add" onclick="addSubService()"><span class="material-icons-outlined">add</span> Service</button>`;
}

function setSubFilter(f) {
    subFilter = f;
    renderSubscriptions();
}

function addSubService() {
    const name = (prompt('Nom du nouveau service (ex : Disney+, YouTube Premium, Canva) :') || '').trim();
    if (!name) return;
    const svcs = subServices();
    if (Object.values(svcs).some(sv => sv.name.toLowerCase() === name.toLowerCase())) return toast('Ce service existe déjà');
    let id = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '') || 'service';
    const base = id; let i = 2;
    while (svcs[id]) id = base + i++;
    const hasProfiles = confirm('Ce service utilise-t-il des profils de couleur, comme Netflix (Rouge, Violet, Jaune, Vert, Blanc) ?\n\nOK = oui, Annuler = non');
    svcs[id] = { name, accounts: [1], hasProfiles };
    subFilter = id;
    save(); renderSubscriptions();
    toast(`Service ${name} ajouté ✓`);
}

function removeSubService(id) {
    const n = subClientsOf(id).length;
    if (n) return toast(`Impossible : ${n} client${n > 1 ? 's' : ''} dans ce service. Supprime-les ou change-les de service d'abord.`);
    if (Object.keys(subServices()).length <= 1) return toast('Garde au moins un service');
    if (!confirm(`Supprimer le service ${subServiceName(id)} et tous ses comptes ?`)) return;
    delete S.subServices[id];
    for (const k of Object.keys(S.subAccountNames || {})) if (k.startsWith(id + '_')) delete S.subAccountNames[k];
    subFilter = Object.keys(S.subServices)[0];
    save(); renderSubscriptions();
    toast('Service supprimé');
}

function addSubAccount(service) {
    const sv = subServices()[service];
    if (!sv) return;
    const next = sv.accounts.length ? Math.max(...sv.accounts) + 1 : 1;
    const name = prompt(`Nom du nouveau compte ${sv.name} (laisse vide pour « Compte ${next} ») :`);
    if (name === null) return;
    sv.accounts.push(next);
    if (name.trim()) { if (!S.subAccountNames) S.subAccountNames = {}; S.subAccountNames[`${service}_${next}`] = name.trim(); }
    save(); renderSubscriptions();
    toast('Compte ajouté ✓');
}

function removeSubAccount(service, acc) {
    const n = subClientsOf(service, acc).length;
    if (n) return toast(`Impossible : ${n} client${n > 1 ? 's' : ''} sur ce compte. Supprime-les ou déplace-les d'abord.`);
    if (!confirm(`Supprimer le compte « ${subAccountLabel(service, acc)} » ?`)) return;
    const sv = subServices()[service];
    sv.accounts = sv.accounts.filter(a => Number(a) !== Number(acc));
    if (S.subAccountNames) delete S.subAccountNames[`${service}_${acc}`];
    save(); renderSubscriptions();
    toast('Compte supprimé');
}

function renderSubscriptions() {
    const c = document.getElementById('subContent');
    renderSubTabs();
    const conf = subServices()[subFilter];
    let html = '<div class="sub-grid">';

    for (const acc of conf.accounts) {
        const accName = subAccountLabel(subFilter, acc);
        
        html += `<div class="sub-card">
            <div class="sub-card-header">
                <span>${escHtml(accName)}</span>
                <span class="sub-card-actions">
                    <button class="btn" style="padding:4px 8px;" onclick="renameSubAccount('${subFilter}', ${acc})" aria-label="Renommer le compte" title="Renommer">
                        <span class="material-icons-outlined" style="font-size:14px;">edit</span>
                    </button>
                    <button class="btn" style="padding:4px 8px;" onclick="removeSubAccount('${subFilter}', ${acc})" aria-label="Supprimer le compte" title="Supprimer le compte">
                        <span class="material-icons-outlined" style="font-size:14px;">delete</span>
                    </button>
                </span>
            </div>
            <div class="sub-table-wrapper">
                <table class="sub-table">
                    <thead>
                        <tr>
                            ${conf.hasProfiles ? '<th>Profil</th>' : ''}
                            <th>Noms</th>
                            <th>Statut</th>
                            <th>Durée</th>
                            <th>Début</th>
                            <th>Fin</th>
                            <th>Facturation</th>
                            <th>État</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        if (conf.hasProfiles) {
            const custom = (S.subscriptions || []).filter(x => x.service === subFilter && Number(x.account) === Number(acc) && x.profile && !SUB_PROFILES.includes(x.profile)).map(x => x.profile);
            const profiles = [...SUB_PROFILES, ...new Set(custom)];
            if ((S.subscriptions || []).some(x => x.service === subFilter && Number(x.account) === Number(acc) && !x.profile)) profiles.push('__none__');
            let hasData = false;
            for (const p of profiles) {
                const rows = getSubClientsRowsHtml(subFilter, acc, p);
                if (rows) { html += rows; hasData = true; }
            }
            if (!hasData) html += `<tr><td colspan="8" style="text-align:center; color:#6b7280; font-style:italic;">Aucun client enregistré</td></tr>`;
        } else {
            const rows = getSubClientsRowsHtml(subFilter, acc, null);
            if (rows) html += rows;
            else html += `<tr><td colspan="7" style="text-align:center; color:#6b7280; font-style:italic;">Aucun client enregistré</td></tr>`;
        }

        html += `       </tbody>
                </table>
            </div>
        </div>`;
    }
    html += `<button class="sub-add-account" onclick="addSubAccount('${subFilter}')"><span class="material-icons-outlined">add</span> Ajouter un compte ${escHtml(conf.name)}</button>`;
    html += '</div>';
    html += `<div class="sub-service-foot"><button class="sub-remove-service" onclick="removeSubService('${subFilter}')">Supprimer le service ${escHtml(conf.name)}</button></div>`;
    c.innerHTML = html;
}

function getSubClientsRowsHtml(service, acc, profile) {
    let clients = S.subscriptions.filter(s => s.service === service && s.account == acc && (profile === '__none__' ? !s.profile : profile ? s.profile === profile : true));
    if (!clients.length) return '';
    
    let html = '';
    const today = new Date();
    today.setHours(0,0,0,0);

    // Sort by End Date (soonest expiring first)
    clients.sort((a,b) => {
        if (!a.end) return 1;
        if (!b.end) return -1;
        return new Date(a.end) - new Date(b.end);
    });

    for (const c of clients) {
        let badgeClass = 'active';
        let badgeText = 'Actif';
        let diffDays = 999;
        
        if (c.end) {
            const endD = new Date(c.end);
            endD.setHours(0,0,0,0);
            diffDays = Math.ceil((endD - today) / (1000 * 60 * 60 * 24));
            if (diffDays < 0) { badgeClass = 'expired'; badgeText = 'Expiré'; }
            else if (diffDays <= 5) { badgeClass = 'warning'; badgeText = `J-${diffDays}`; }
            if (diffDays === 0) { badgeClass = 'warning'; badgeText = "Aujourd'hui"; }
        }
        if (c.duration && c.duration.toLowerCase().includes('life')) { badgeClass = 'active'; badgeText = 'A Vie'; }

        let profCell = '';
        if (profile) {
            const pc = SUB_PROFILES.includes(profile) ? 'profil-' + profile.toLowerCase() : 'profil-custom';
            profCell = `<td class="profil-cell ${pc}">${profile === '__none__' ? '—' : escHtml(profile)}</td>`;
        }

        html += `<tr onclick="openSubModal('${c.id}')">
            ${profCell}
            <td style="font-weight:600;">${escHtml(c.name)}</td>
            <td>${escHtml(c.status)}</td>
            <td>${escHtml(c.duration)}</td>
            <td>${c.start || '-'}</td>
            <td>${c.end || '-'}</td>
            <td><span style="font-family:monospace; background:#1f2937; padding:2px 6px; border-radius:4px;">${escHtml(c.code) || '-'}</span></td>
            <td><span class="sub-badge ${badgeClass}">${badgeText}</span></td>
        </tr>`;
    }
    return html;
}

function updateSubModalFields() {
    const s = document.getElementById('subService').value;
    const c = subServices()[s];
    if (!c) return;
    
    const accSel = document.getElementById('subAccount');
    accSel.innerHTML = c.accounts.map(a => `<option value="${a}">${escHtml(subAccountLabel(s, a))}</option>`).join('');
    
    document.getElementById('subProfileDiv').style.display = c.hasProfiles ? 'block' : 'none';
    const used = (S.subscriptions || []).filter(x => x.service === s && x.profile).map(x => x.profile);
    const names = [...new Set([...SUB_PROFILES, ...used])];
    document.getElementById('subProfileList').innerHTML = names.map(n => `<option value="${escAttr(n)}"></option>`).join('');
}

// Durée choisie -> nombre de mois ("01Mois", "12 Mois" -> 12 ; "For Life" -> 'life')
function subDurationValue(duration) {
    if (duration && /life|vie/i.test(duration)) return 'life';
    const n = parseInt(String(duration || '').replace(/[^\d]/g, ''), 10);
    return n > 0 ? String(n) : '1';
}

// Début + N mois (même jour ; 31 janv. + 1 mois -> 28/29 févr.)
function addMonthsToDate(dateStr, months) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const last = new Date(y, m - 1 + months + 1, 0).getDate();
    return localDateStr(new Date(y, m - 1 + months, Math.min(d, last)));
}

function updateSubEndDate() {
    const start = document.getElementById('subStart').value, dur = document.getElementById('subDuration').value;
    if (dur === 'life') { document.getElementById('subEnd').value = ''; return; }
    if (start) document.getElementById('subEnd').value = addMonthsToDate(start, parseInt(dur, 10) || 1);
}

function fillSubServiceSelect() {
    const sel = document.getElementById('subService');
    const svcs = subServices();
    sel.innerHTML = Object.keys(svcs).map(id => `<option value="${escAttr(id)}">${escHtml(svcs[id].name)}</option>`).join('');
}

function openSubModal(id = null) {
    editingSubId = id;
    fillSubServiceSelect();
    document.getElementById('subModalTitle').textContent = id ? 'Modifier Client' : 'Nouveau Client';
    const m = document.getElementById('subModalOverlay');
    
    if (id) {
        const c = S.subscriptions.find(x => x.id === id);
        if (c) {
            document.getElementById('subService').value = c.service;
            updateSubModalFields();
            document.getElementById('subAccount').value = c.account;
            document.getElementById('subProfile').value = c.profile || '';
            document.getElementById('subName').value = c.name;
            document.getElementById('subStatus').value = c.status;
            document.getElementById('subStart').value = c.start;
            document.getElementById('subEnd').value = c.end;
            const dv = subDurationValue(c.duration), sel = document.getElementById('subDuration');
            if (![...sel.options].some(o => o.value === dv)) sel.insertAdjacentHTML('beforeend', `<option value="${dv}">${dv} mois</option>`);
            sel.value = dv;
            document.getElementById('subCode').value = c.code;
        }
    } else {
        document.getElementById('subService').value = subFilter;
        updateSubModalFields();
        document.getElementById('subName').value = '';
        document.getElementById('subStatus').value = 'Sell';
        document.getElementById('subStart').value = localDateStr();
        document.getElementById('subProfile').value = '';
        document.getElementById('subDuration').value = '1';
        updateSubEndDate();
        document.getElementById('subCode').value = '';
    }
    
    m.classList.add('active');
    document.getElementById('subName').focus();
}

function closeSubModal() { document.getElementById('subModalOverlay').classList.remove('active'); }

function saveSub() {
    const s = document.getElementById('subService').value;
    const obj = {
        id: editingSubId || Date.now().toString(),
        service: s,
        account: parseInt(document.getElementById('subAccount').value),
        profile: (subServices()[s] || {}).hasProfiles ? (document.getElementById('subProfile').value.trim() || null) : null,
        name: document.getElementById('subName').value.trim(),
        status: document.getElementById('subStatus').value.trim(),
        start: document.getElementById('subStart').value,
        end: document.getElementById('subEnd').value,
        duration: document.getElementById('subDuration').value === 'life' ? 'For Life' : `${document.getElementById('subDuration').value} Mois`,
        code: document.getElementById('subCode').value.trim()
    };

    if (!obj.name) return toast("Erreur : Nom requis");
    if (!obj.account) return toast("Erreur : ajoute d'abord un compte à ce service");

    if (editingSubId) {
        const idx = S.subscriptions.findIndex(x => x.id === editingSubId);
        if (idx > -1) S.subscriptions[idx] = obj;
    } else {
        S.subscriptions.push(obj);
    }
    
    save();
    closeSubModal();
    renderSubscriptions();
    toast("Client sauvegardé ✓");
}

function renameSubAccount(service, acc) {
    const newName = prompt("Nouveau nom pour ce compte :", subAccountLabel(service, acc));
    if (newName !== null && newName.trim() !== "") {
        if (!S.subAccountNames) S.subAccountNames = {};
        S.subAccountNames[`${service}_${acc}`] = newName.trim();
        save();
        renderSubscriptions();
        toast("Compte renommé");
    }
}
