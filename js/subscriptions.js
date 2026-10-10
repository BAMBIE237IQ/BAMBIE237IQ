// ==================== SUBSCRIPTIONS ====================
const SUB_CONFIG = {
    netflix: { accounts: [1,2,3,4], hasProfiles: true },
    spotify: { accounts: [1,2], hasProfiles: false },
    prime: { accounts: [1], hasProfiles: false },
    proton: { accounts: [1], hasProfiles: false }
};

function setSubFilter(f) {
    subFilter = f;
    document.querySelectorAll('.sub-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.sub-tab-btn[onclick*="${f}"]`).classList.add('active');
    renderSubscriptions();
}

function renderSubscriptions() {
    const c = document.getElementById('subContent');
    const conf = SUB_CONFIG[subFilter];
    let html = '<div class="sub-grid">';

    for (const acc of conf.accounts) {
        const accKey = `${subFilter}_${acc}`;
        const defaultName = `${subFilter.toUpperCase()} - Compte ${acc}`;
        const accName = (S.subAccountNames && S.subAccountNames[accKey]) ? S.subAccountNames[accKey] : defaultName;
        
        html += `<div class="sub-card">
            <div class="sub-card-header">
                <span>${escHtml(accName)}</span>
                <button class="btn" style="padding:4px 8px;" onclick="renameSubAccount('${subFilter}', ${acc}, '${escHtml(accName)}')">
                    <span class="material-icons-outlined" style="font-size:14px;">edit</span>
                </button>
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
            const profiles = ['Rouge', 'Violet', 'Jaune', 'Vert', 'Blanc'];
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
    html += '</div>';
    c.innerHTML = html;
}

function getSubClientsRowsHtml(service, acc, profile) {
    let clients = S.subscriptions.filter(s => s.service === service && s.account == acc && (profile ? s.profile === profile : true));
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
            else if (diffDays <= 3) { badgeClass = 'warning'; badgeText = `J-${diffDays}`; }
            if (diffDays === 0) { badgeClass = 'warning'; badgeText = "Aujourd'hui"; }
        }
        if (c.duration && c.duration.toLowerCase().includes('life')) { badgeClass = 'active'; badgeText = 'A Vie'; }

        let profCell = '';
        if (profile) {
            profCell = `<td class="profil-cell profil-${profile.toLowerCase()}">${profile}</td>`;
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
    const c = SUB_CONFIG[s];
    
    const accSel = document.getElementById('subAccount');
    accSel.innerHTML = '';
    for (const a of c.accounts) accSel.innerHTML += `<option value="${a}">Compte ${a}</option>`;
    
    document.getElementById('subProfileDiv').style.display = c.hasProfiles ? 'block' : 'none';
}

function openSubModal(id = null) {
    editingSubId = id;
    document.getElementById('subModalTitle').textContent = id ? 'Modifier Client' : 'Nouveau Client';
    const m = document.getElementById('subModalOverlay');
    
    if (id) {
        const c = S.subscriptions.find(x => x.id === id);
        if (c) {
            document.getElementById('subService').value = c.service;
            updateSubModalFields();
            document.getElementById('subAccount').value = c.account;
            if (SUB_CONFIG[c.service].hasProfiles) document.getElementById('subProfile').value = c.profile;
            document.getElementById('subName').value = c.name;
            document.getElementById('subStatus').value = c.status;
            document.getElementById('subStart').value = c.start;
            document.getElementById('subEnd').value = c.end;
            document.getElementById('subDuration').value = c.duration;
            document.getElementById('subCode').value = c.code;
        }
    } else {
        document.getElementById('subService').value = subFilter;
        updateSubModalFields();
        document.getElementById('subName').value = '';
        document.getElementById('subStatus').value = 'Sell';
        document.getElementById('subStart').value = localDateStr();
        document.getElementById('subEnd').value = '';
        document.getElementById('subDuration').value = '01Mois';
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
        profile: SUB_CONFIG[s].hasProfiles ? document.getElementById('subProfile').value : null,
        name: document.getElementById('subName').value.trim(),
        status: document.getElementById('subStatus').value.trim(),
        start: document.getElementById('subStart').value,
        end: document.getElementById('subEnd').value,
        duration: document.getElementById('subDuration').value.trim(),
        code: document.getElementById('subCode').value.trim()
    };

    if (!obj.name) return toast("Erreur : Nom requis");

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

function renameSubAccount(service, acc, currentName) {
    const newName = prompt("Nouveau nom pour ce compte :", currentName);
    if (newName !== null && newName.trim() !== "") {
        if (!S.subAccountNames) S.subAccountNames = {};
        S.subAccountNames[`${service}_${acc}`] = newName.trim();
        save();
        renderSubscriptions();
        toast("Compte renommé");
    }
}
