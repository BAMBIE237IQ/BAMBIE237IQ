// ==================== PARAMÈTRES DES ABONNEMENTS ====================
// Une fenêtre en rubriques : Messages de relance · Calcul du CA · Comment ça marche · Simulation · Clients · Export.
// PC : menu à gauche, contenu à droite. Téléphone : onglets qui défilent en haut, contenu en dessous.
// Données : S.subMessages = { soon, today, expired } (textes écrits par l'utilisateur)
//           S.subThemes = { serviceId: { theme, emoji } } (thème de chaque service, sinon deviné d'après le nom)
//           S.subSim = { accounts: [{ name, count, cost, seats }], offers: [{ name, months, price, clients }], margin }
let subSetTab = 'messages';
const SUBSET_TABS = [
    ['messages', 'Messages de relance', 'chat'],
    ['ca', 'Calcul du chiffre d’affaires', 'payments'],
    ['help', 'Comment ça marche', 'help'],
    ['sim', 'Simulation', 'calculate'],
    ['clients', 'Meilleurs clients', 'emoji_events'],
    ['export', 'Export', 'download']
];

// ---------- Messages de relance ----------
const SUB_MSG_KINDS = [
    ['soon', 'Bientôt fini', 'Envoyé quand il reste 1 jour ou plus (la cloche s’allume à J-5).'],
    ['today', 'Se termine aujourd’hui', 'Envoyé le jour de la fin.'],
    ['expired', 'Déjà expiré', 'Envoyé après la date de fin. {jours} = nombre de jours depuis la fin.']
];
const SUB_MSG_DEFAULTS = {
    soon: 'Bonjour {nom} 👋\nTon abonnement {service} se termine dans {jours} jours. Pour continuer à profiter de {thème} sans coupure, tu veux le renouveler ? {emoji}',
    today: 'Bonjour {nom} 👋\nTon abonnement {service} se termine aujourd’hui. Réponds-moi pour garder {thème} sans coupure {emoji}',
    expired: 'Bonjour {nom} 👋\nTon abonnement {service} est terminé depuis {jours} jours. Tu veux retrouver {thème} ? Je te le réactive tout de suite {emoji}'
};
const SUB_TOKENS = ['{nom}', '{quand}', '{jours}', '{service}', '{thème}', '{emoji}'];

// Thème de chaque service : ce dont le client profite (séries, musique, IA…), deviné d'après le nom, modifiable dans les Paramètres
const SUB_THEME_GUESS = [
    [/netflix/i, 'tes séries et tes films', '🎬'],
    [/prime|amazon/i, 'tes films et tes séries', '🎬'],
    [/disney/i, 'tes films Disney, Marvel et Star Wars', '🏰'],
    [/crunchy|anime|adn/i, 'tes animés', '🍥'],
    [/hbo|max\b|apple ?tv|paramount|canal|mycanal/i, 'tes films, tes séries et tes chaînes', '📺'],
    [/iptv|tv\b|bein|dazn/i, 'tes chaînes et ton sport', '⚽'],
    [/youtube ?music|spotify|deezer|apple ?music|tidal|audiomack|boomplay|music/i, 'ta musique et tes playlists', '🎵'],
    [/youtube/i, 'tes vidéos sans pub', '▶️'],
    [/chat ?gpt|openai|gpt/i, 'ton assistant IA ChatGPT', '🤖'],
    [/claude|gemini|perplexity|copilot|mistral|grok|deepseek|\bia\b|\bai\b/i, 'ton assistant IA', '🤖'],
    [/midjourney|leonardo|dall|runway|kling|suno|eleven/i, 'tes créations avec l’IA', '🎨'],
    [/canva|adobe|photoshop|figma|capcut/i, 'tes outils de création', '🎨'],
    [/office|microsoft|365|notion|google ?one|drive|icloud/i, 'tes outils de travail', '💼'],
    [/xbox|game ?pass|playstation|psn|ps plus|steam|nintendo/i, 'tes jeux', '🎮'],
    [/proton ?vpn/i, 'ta connexion VPN protégée', '🔒'],
    [/proton/i, 'ta messagerie sécurisée', '🔒'],
    [/vpn|nord|express/i, 'ta connexion protégée', '🔒'],
    [/duolingo|coursera|udemy|babbel|masterclass/i, 'tes cours', '📚']
];
function subThemeGuess(id) {
    const t = `${id} ${subServiceName(id)}`;
    const hit = SUB_THEME_GUESS.find(([re]) => re.test(t));
    return hit ? { theme: hit[1], emoji: hit[2] } : { theme: 'ton abonnement', emoji: '🙏' };
}
function subThemeOf(id) {
    const g = subThemeGuess(id), o = (S.subThemes || {})[id] || {};
    return { theme: (o.theme || '').trim() || g.theme, emoji: (o.emoji || '').trim() || g.emoji };
}
function setSubTheme(id, field, v) {
    if (!S.subThemes) S.subThemes = {};
    S.subThemes[id] = { ...(S.subThemes[id] || {}), [field]: v };
    save();
    SUB_MSG_KINDS.forEach(([k]) => { const p = document.getElementById('subMsgPrev_' + k); if (p) p.textContent = subMsgPreview(k); });
}

function subMsgTemplate(kind) {
    const m = S.subMessages || {};
    return typeof m[kind] === 'string' ? m[kind] : SUB_MSG_DEFAULTS[kind];
}
// Remplit {nom}, {jours}, {service}, {thème} et {emoji} ; « 1 jours » devient « 1 jour »
// {quand} : « demain », « dans 3 jours », « aujourd'hui », « hier », « il y a 4 jours »
function subWhen(kind, days) {
    if (kind === 'today' || days === 0) return 'aujourd’hui';
    if (kind === 'expired') return days === 1 ? 'hier' : `il y a ${days} jours`;
    return days === 1 ? 'demain' : `dans ${days} jours`;
}
function subMsgFill(tpl, name, days, serviceId, kind) {
    const th = serviceId ? subThemeOf(serviceId) : { theme: 'ton abonnement', emoji: '🙏' };
    return String(tpl)
        .replace(/\{nom\}/gi, name || '')
        .replace(/\{quand\}/gi, subWhen(kind, days))
        .replace(/\{jours\}/gi, days == null ? '' : String(days))
        .replace(/\{service\}/gi, serviceId ? subServiceName(serviceId) : '')
        .replace(/\{th[eèé]me\}/gi, th.theme)
        .replace(/\{emoji\}/gi, th.emoji)
        .replace(/(^|[^\d])1 jours\b/g, '$11 jour')
        .replace(/ {2,}/g, ' ');
}
// Message d'un client : le bon modèle selon les jours restants. Modèle vide ou abonnement sans date de fin : message automatique détaillé.
function subRelanceCustom(c) {
    const d = c && c.end ? subDaysLeft(c.end) : null;
    if (d === null || (c.duration && /life|vie/i.test(c.duration))) return null;
    const kind = d > 0 ? 'soon' : d === 0 ? 'today' : 'expired';
    const tpl = subMsgTemplate(kind);
    if (!tpl.trim()) return null;
    return subMsgFill(tpl, c.name, Math.abs(d), c.service, kind);
}
// Le bouton « Copier la relance » de la fiche client passe désormais par les messages personnalisés
(function hookRelance() {
    const auto = window.subRelanceText;
    if (typeof auto !== 'function') return;
    window.subRelanceAuto = auto;
    window.subRelanceText = function (c) { return subRelanceCustom(c) || auto(c); };
})();
function saveSubMsg(kind, v) {
    if (!S.subMessages) S.subMessages = {};
    S.subMessages[kind] = v;
    save();
    const p = document.getElementById('subMsgPrev_' + kind); if (p) p.textContent = subMsgPreview(kind);
    subMsgSavedFlash(kind);
}
function subMsgSavedFlash(kind) { const f = document.getElementById('subMsgOk_' + kind); if (!f) return; f.textContent = 'Enregistré ✓'; clearTimeout(f._t); f._t = setTimeout(() => { f.textContent = ''; }, 1600); }
let subMsgPrevSvc = null;   // service utilisé pour l'aperçu
function subMsgPrevService() { const ids = subServiceIds(); return ids.includes(subMsgPrevSvc) ? subMsgPrevSvc : ids[0]; }
function setSubMsgPrevService(id) { subMsgPrevSvc = id; SUB_MSG_KINDS.forEach(([k]) => { const p = document.getElementById('subMsgPrev_' + k); if (p) p.textContent = subMsgPreview(k); }); }
function subMsgPreview(kind) {
    const tpl = subMsgTemplate(kind);
    if (!tpl.trim()) return '(Vide : l’app enverra le message automatique détaillé, avec service, date et prix.)';
    return subMsgFill(tpl, 'Awa', kind === 'soon' ? 3 : kind === 'expired' ? 2 : 0, subMsgPrevService(), kind);
}
function subMsgInsert(kind, token) {
    const ta = document.getElementById('subMsg_' + kind); if (!ta) return;
    const a = ta.selectionStart ?? ta.value.length, b = ta.selectionEnd ?? ta.value.length;
    ta.value = ta.value.slice(0, a) + token + ta.value.slice(b);
    ta.focus(); ta.selectionStart = ta.selectionEnd = a + token.length;
    saveSubMsg(kind, ta.value);
}
function subMsgReset(kind) {
    if (!confirm('Remettre le message proposé par défaut ? Ton texte actuel sera remplacé.')) return;
    if (!S.subMessages) S.subMessages = {};
    delete S.subMessages[kind]; save(); renderSubSettings();
    toast('Message par défaut remis ✓');
}
function subSetMessagesHtml() {
    const ids = subServiceIds(), prev = subMsgPrevService();
    return `
    <p class="set-lead">Écris tes propres messages. L’app choisit le bon selon la date de fin du client, puis remplace les mots entre accolades :</p>
    <ul class="msg-legend">
        <li><code>{nom}</code> le nom du client</li>
        <li><code>{quand}</code> « demain », « dans 3 jours », « aujourd’hui », « hier », « il y a 4 jours »</li>
        <li><code>{jours}</code> le nombre de jours seul</li>
        <li><code>{service}</code> le service (Netflix, Spotify…)</li>
        <li><code>{thème}</code> ce dont il profite : « tes séries et tes films », « ta musique et tes playlists », « ton assistant IA »…</li>
        <li><code>{emoji}</code> l’emoji du service (🎬, 🎵, 🤖…)</li>
    </ul>
    <p class="set-hint">Ils servent pour le bouton <b>Copier la relance</b> dans la fiche d’un client.</p>
    <label class="msg-prevpick">Aperçu avec <select onchange="setSubMsgPrevService(this.value)">${ids.map(id => `<option value="${escAttr(id)}"${id === prev ? ' selected' : ''}>${escHtml(subServiceName(id))}</option>`).join('')}</select></label>
    ${SUB_MSG_KINDS.map(([k, title, hint]) => `
    <div class="msg-card">
        <div class="msg-head"><strong>${title}</strong><span class="msg-ok" id="subMsgOk_${k}"></span></div>
        <p class="set-hint">${hint}</p>
        <textarea id="subMsg_${k}" rows="4" oninput="saveSubMsgDebounced('${k}', this.value)" aria-label="Message ${title}">${escHtml(subMsgTemplate(k))}</textarea>
        <div class="msg-tools">
            ${SUB_TOKENS.map(t => `<button class="msg-chip" onclick="subMsgInsert('${k}', '${t}')">+ ${t}</button>`).join('')}
            <span class="grow"></span>
            <button class="msg-link" onclick="subMsgReset('${k}')">Message par défaut</button>
        </div>
        <div class="msg-prev"><span>Aperçu pour « Awa »</span><p id="subMsgPrev_${k}">${escHtml(subMsgPreview(k))}</p></div>
    </div>`).join('')}
    ${typeof subCodeMsgCardHtml === 'function' ? subCodeMsgCardHtml() : ''}
    <div class="msg-card">
        <div class="msg-head"><strong>Thème de chaque service</strong></div>
        <p class="set-hint">Ce que <code>{thème}</code> et <code>{emoji}</code> deviennent pour chaque service. Déjà rempli d’après le nom du service : change-le si besoin, ou vide la case pour revenir à la proposition.</p>
        <div class="theme-list">${ids.map(id => { const o = (S.subThemes || {})[id] || {}, g = subThemeGuess(id); return `
            <div class="theme-row">
                <strong>${escHtml(subServiceName(id))}</strong>
                <input class="theme-emoji" value="${escAttr(o.emoji || '')}" placeholder="${escAttr(g.emoji)}" oninput="setSubTheme('${escAttr(id)}', 'emoji', this.value)" aria-label="Emoji de ${escAttr(subServiceName(id))}">
                <input value="${escAttr(o.theme || '')}" placeholder="${escAttr(g.theme)}" oninput="setSubTheme('${escAttr(id)}', 'theme', this.value)" aria-label="Thème de ${escAttr(subServiceName(id))}">
            </div>`; }).join('')}</div>
    </div>`;
}
let subMsgTimers = {};
function saveSubMsgDebounced(kind, v) { clearTimeout(subMsgTimers[kind]); subMsgTimers[kind] = setTimeout(() => saveSubMsg(kind, v), 500); }

// ---------- Calcul du CA ----------
function subSetCAHtml() {
    const mode = caMode();
    return `
    <p class="set-lead">Choisis comment l’argent encaissé est compté dans le chiffre d’affaires de chaque mois. Le réglage change seulement l’affichage : tes paiements enregistrés ne bougent pas.</p>
    <p class="set-hint"><b>Au paiement</b> est prioritaire : il ne divise jamais le montant par le nombre de mois, et il remplace les autres règles pour les paiements qu’il couvre.</p>
    <div class="ca-modes">
        <button class="ca-mode${mode === 'cash' ? ' active' : ''}" onclick="setCAMode('cash')"><strong><span class="material-icons-outlined ca-ic">payments</span> Au paiement</strong><span>Tout le montant compte en entier le mois où le client paie. 5 000 payés pour 2 mois comptent 5 000 ce mois-là, et zéro le mois suivant.</span></button>
        <button class="ca-mode${mode === 'entry' ? ' active' : ''}" onclick="setCAMode('entry')"><strong><span class="material-icons-outlined ca-ic">account_balance_wallet</span> Tout au mois d’entrée</strong><span>Tout le montant compte une seule fois, le mois où l’abonnement commence. La date de fin reste affichée.</span></button>
        <button class="ca-mode${mode === 'split' ? ' active' : ''}" onclick="setCAMode('split')"><strong><span class="material-icons-outlined ca-ic">drag_handle</span> Parts égales par mois</strong><span>Le montant est divisé par le nombre de mois : 5 000 pour 2 mois = 2 500 + 2 500, chaque part dans son mois.</span></button>
        <button class="ca-mode${mode === 'days' ? ' active' : ''}" onclick="setCAMode('days')"><strong><span class="material-icons-outlined ca-ic">calendar_month</span> Au prorata jour à jour</strong><span>Chaque part mensuelle est répartie selon les jours de chaque mois : du 10 sept. au 10 oct., 21 jours comptent en septembre et 9 en octobre.</span></button>
    </div>`;
}

// ---------- Comment ça marche ----------
const SUB_HELP = [
    ['groups', 'Clients du mois', `Un client compte pour un mois si une de ses périodes payées couvre au moins un jour de ce mois (les abonnements « à vie » comptent tous les mois). Les clients suspendus et les abonnements remboursés ne comptent pas.
<br><b>Nouveaux clients</b> : personnes dont le tout premier abonnement commence ce mois-là. Une même personne = même nom (majuscules, accents et espaces ignorés).`],
    ['history', 'Réabonnés (Stats)', `Un client est <b>réabonné</b> s’il était abonné le mois d’avant <b>et</b> l’est encore ce mois-ci, sur le même service et sous le même nom. Les abonnements « à vie » ne sont pas comptés.
<br>Exemple : Awa avait Netflix en octobre et l’a encore en novembre → réabonnée en novembre.`],
    ['percent', 'Taux de réabonnement (CA du mois)', `On regarde les abonnements qui <b>se terminent</b> ce mois-là. Une fin suivie d’une nouvelle période qui commence au plus <b>${RENEW_GRACE_DAYS} jours</b> après = renouvelée. Une fin sans suite depuis plus de ${RENEW_GRACE_DAYS} jours = perdue. Entre les deux = « en attente ».
<br><b>Taux</b> = renouvelées ÷ (renouvelées + perdues). Les « en attente » ne comptent pas encore.`],
    ['payments', 'Chiffre d’affaires', `C’est le montant payé (champ « Montant ») de chaque période, y compris les renouvellements de l’historique. Il est réparti dans les mois selon le réglage de <b>Calcul du chiffre d’affaires</b>. Les abonnements remboursés sont retirés.
<br><b>Ventes du mois</b> (Stats) : nombre de périodes qui commencent ce mois-là et leur total.`],
    ['account_balance', 'Coûts des comptes et bénéfice', `Chaque compte (Netflix 1, Prime 2…) peut avoir un <b>coût d’achat par mois</b>. Le coût compte à partir du mois où tu l’as saisi, et chaque changement de prix garde l’ancien prix pour les mois passés.
<br><b>Bénéfice</b> = chiffre d’affaires du mois − coûts des comptes du mois.`],
    ['autorenew', 'Renouvellement', `Le bouton <b>Renouveler</b> de la fiche client : tu choisis la durée, le montant et la date de début. Par défaut, la nouvelle période commence le jour de la fin si l’abonnement court encore, sinon aujourd’hui.
<br>L’ancienne période part dans l’<b>historique</b> du client (elle reste comptée dans le chiffre d’affaires et les stats). Un client suspendu est réactivé.`],
    ['notifications', 'Alertes et relances', `La cloche s’allume pour les abonnements qui finissent dans <b>5 jours ou moins</b>, le jour même, et pour ceux expirés depuis <b>moins de 7 jours</b>. Les « à vie », suspendus, annulés et remboursés sont ignorés.
<br>Le message de relance copié suit tes <b>Messages de relance</b>.`],
    ['person_off', 'À reconquérir', 'Clients expirés depuis <b>plus de 7 jours</b> et pas renouvelés (hors « à vie » et statuts annulé, stop, remboursé…). Ce sont ceux à relancer en priorité.'],
    ['event_seat', 'Places par compte', 'Spotify (6), Netflix (5), Crunchyroll (4) et Prime Video (3) ont un nombre maximum de clients par compte. L’étiquette « places libres » se calcule avec les clients actifs du compte ; touche-la pour changer le maximum.']
];
function subSetHelpHtml() {
    return `<p class="set-lead">Ce que l’app calcule en coulisses, et comment.</p>
    <div class="help-list">${SUB_HELP.map(([ic, t, body], i) => `
        <details class="help-item"${i === 0 ? ' open' : ''}><summary><span class="material-icons-outlined">${ic}</span>${t}</summary><div class="help-body">${body}</div></details>`).join('')}</div>`;
}

// ---------- Simulation ----------
function simData() {
    if (!S.subSim) S.subSim = { accounts: [], offers: [], margin: 40 };
    const s = S.subSim;
    s.accounts = Array.isArray(s.accounts) ? s.accounts : Object.values(s.accounts || {});
    s.offers = Array.isArray(s.offers) ? s.offers : Object.values(s.offers || {});
    if (!s.accounts.length) s.accounts.push({ name: '', count: '', cost: '', seats: '' });
    if (!s.offers.length) s.offers.push({ name: '', months: '', price: '', clients: '' });
    if (s.margin == null) s.margin = 40;
    return s;
}
const simN = v => { const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.')); return isFinite(n) && n > 0 ? n : 0; };
const simF = n => formatFCFA(Math.round(n));
function simCompute() {
    const s = simData();
    const offers = s.offers.map(o => ({ ...o, m: simN(o.months) || 1, p: simN(o.price), n: Math.round(simN(o.clients)) })).filter(o => o.p && o.n);
    const accs = s.accounts.map(a => ({ ...a, c: Math.round(simN(a.count)), k: simN(a.cost), z: Math.round(simN(a.seats)) })).filter(a => a.c);
    const clients = offers.reduce((t, o) => t + o.n, 0);
    const caMonth = offers.reduce((t, o) => t + o.p / o.m * o.n, 0);
    const cashCycle = offers.reduce((t, o) => t + o.p * o.n, 0);
    const cost = accs.reduce((t, a) => t + a.c * a.k, 0);
    const seats = accs.reduce((t, a) => t + a.c * a.z, 0);
    const profit = caMonth - cost, margin = caMonth ? profit / caMonth * 100 : 0;
    const perClient = clients ? caMonth / clients : 0;                       // ce que rapporte un client par mois, en moyenne
    const costPerClient = clients ? cost / clients : 0;                      // coût d'un client par mois
    const costPerSeat = seats ? cost / seats : 0;                            // coût d'une place pleine par mois
    const breakEven = perClient ? Math.ceil(cost / perClient) : 0;           // clients nécessaires pour ne rien perdre
    const target = Math.min(90, Math.max(0, simN(s.margin)));
    const unit = costPerSeat || costPerClient;                               // coût de référence d'un client par mois
    const advice = offers.map(o => {
        const min = unit * o.m, best = target < 100 ? min / (1 - target / 100) : min;
        return { name: o.name || `${o.m} mois`, m: o.m, price: o.p, min, best, ok: o.p >= best };
    });
    const avgSeats = accs.length ? seats / accs.reduce((t, a) => t + a.c, 0) : 0;
    const accountsNeeded = avgSeats ? Math.ceil(clients / avgSeats) : 0;
    return { offers, accs, clients, caMonth, cashCycle, cost, seats, profit, margin, perClient, costPerClient, costPerSeat, breakEven, target, advice, accountsNeeded, avgSeats };
}
function simSet(list, i, field, v) { const s = simData(); s[list][i][field] = v; save(); renderSimResults(); }
function simAdd(list) { const s = simData(); s[list].push(list === 'offers' ? { name: '', months: '', price: '', clients: '' } : { name: '', count: '', cost: '', seats: '' }); save(); renderSubSettings(); }
function simDel(list, i) { const s = simData(); s[list].splice(i, 1); save(); renderSubSettings(); }
function simClear() { if (!confirm('Vider toute la simulation ?')) return; S.subSim = null; save(); renderSubSettings(); }
function simMargin(v) { simData().margin = v; save(); renderSimResults(); }
function subSetSimHtml() {
    const s = simData();
    const inp = (list, i, f, ph, type) => `<input ${type === 'n' ? 'inputmode="decimal"' : ''} value="${escAttr(String(s[list][i][f] ?? ''))}" placeholder="${ph}" oninput="simSet('${list}', ${i}, '${f}', this.value)">`;
    return `
    <p class="set-lead">Teste des prix avant de les appliquer : entre tes comptes achetés et tes offres. L’app calcule ce que ça rapporte chaque mois, ce que ça coûte, et le prix minimum ou conseillé pour chaque offre. Rien ici ne modifie tes vrais clients.</p>
    <div class="sim-block">
        <div class="sim-title"><strong>Comptes achetés</strong><span>Ce que tu paies chaque mois</span></div>
        <div class="sim-grid acc-grid sim-headrow"><span>Service</span><span>Nb de comptes</span><span>Coût / compte / mois</span><span>Clients max / compte</span><span></span></div>
        ${s.accounts.map((a, i) => `<div class="sim-grid acc-grid">
            <label><small>Service</small>${inp('accounts', i, 'name', 'Ex : Netflix')}</label>
            <label><small>Nb de comptes</small>${inp('accounts', i, 'count', '2', 'n')}</label>
            <label><small>Coût / compte / mois</small>${inp('accounts', i, 'cost', '7 000', 'n')}</label>
            <label><small>Clients max / compte</small>${inp('accounts', i, 'seats', '5', 'n')}</label>
            <button class="sim-del" onclick="simDel('accounts', ${i})" aria-label="Retirer cette ligne"><span class="material-icons-outlined">delete</span></button>
        </div>`).join('')}
        <button class="sim-add" onclick="simAdd('accounts')"><span class="material-icons-outlined">add</span> Ajouter un compte</button>
    </div>
    <div class="sim-block">
        <div class="sim-title"><strong>Offres vendues</strong><span>Ce que paient tes clients</span></div>
        <div class="sim-grid off-grid sim-headrow"><span>Type d’abonnement</span><span>Durée (mois)</span><span>Prix de vente</span><span>Nb de clients</span><span></span></div>
        ${s.offers.map((o, i) => `<div class="sim-grid off-grid">
            <label><small>Type d’abonnement</small>${inp('offers', i, 'name', 'Ex : Netflix 1 mois')}</label>
            <label><small>Durée (mois)</small>${inp('offers', i, 'months', '1', 'n')}</label>
            <label><small>Prix de vente</small>${inp('offers', i, 'price', '2 500', 'n')}</label>
            <label><small>Nb de clients</small>${inp('offers', i, 'clients', '10', 'n')}</label>
            <button class="sim-del" onclick="simDel('offers', ${i})" aria-label="Retirer cette ligne"><span class="material-icons-outlined">delete</span></button>
        </div>`).join('')}
        <button class="sim-add" onclick="simAdd('offers')"><span class="material-icons-outlined">add</span> Ajouter une offre</button>
    </div>
    <div class="sim-block sim-target">
        <label>Marge visée <span><input inputmode="decimal" value="${escAttr(String(s.margin ?? 40))}" oninput="simMargin(this.value)"> %</span></label>
        <p class="set-hint">Part du prix qui te reste une fois le coût du compte payé. Sert à calculer le prix conseillé.</p>
    </div>
    <div id="simResults"></div>
    <button class="msg-link sim-clear" onclick="simClear()">Vider la simulation</button>`;
}
function renderSimResults() {
    const box = document.getElementById('simResults'); if (!box) return;
    const r = simCompute();
    if (!r.offers.length) { box.innerHTML = '<div class="sim-empty">Remplis au moins une offre (prix et nombre de clients) pour voir les résultats.</div>'; return; }
    const kpi = (label, val, sub, cls) => `<div class="sim-kpi ${cls || ''}"><span>${label}</span><strong>${val}</strong>${sub ? `<small>${sub}</small>` : ''}</div>`;
    const tips = [];
    if (r.seats && r.clients > r.seats) tips.push(`<li class="bad">Il manque des places : ${r.clients} clients pour ${r.seats} places. Il faudrait environ <b>${r.accountsNeeded} comptes</b>.</li>`);
    else if (r.seats) tips.push(`<li>Places occupées : <b>${r.clients} sur ${r.seats}</b> (${Math.round(r.clients / r.seats * 100)} %).${r.seats - r.clients > 0 ? ` Encore ${r.seats - r.clients} place${r.seats - r.clients > 1 ? 's' : ''} à vendre : ${simF((r.seats - r.clients) * r.perClient)} FCFA de plus par mois.` : ''}</li>`);
    if (r.cost) tips.push(r.profit >= 0 ? `<li>Tu commences à gagner de l’argent à partir de <b>${r.breakEven} client${r.breakEven > 1 ? 's' : ''}</b> (seuil de rentabilité).</li>` : `<li class="bad">Tu perds de l’argent : il faut au moins <b>${r.breakEven} clients</b> au prix moyen actuel, ou des prix plus hauts.</li>`);
    if (!r.cost) tips.push('<li>Ajoute tes comptes achetés pour voir le bénéfice et le prix conseillé.</li>');
    const steps = [-20, -10, 0, 10, 20];
    box.innerHTML = `
    <div class="sim-kpis">
        ${kpi('Chiffre d’affaires / mois', simF(r.caMonth) + ' F', `${r.clients} client${r.clients > 1 ? 's' : ''} · ${simF(r.perClient)} F par client`)}
        ${kpi('Coûts / mois', simF(r.cost) + ' F', r.seats ? `${simF(r.costPerSeat)} F par place` : '')}
        ${kpi('Bénéfice / mois', simF(r.profit) + ' F', r.caMonth ? `marge ${Math.round(r.margin)} %` : '', r.profit >= 0 ? 'good' : 'bad')}
        ${kpi('Sur 12 mois', simF(r.profit * 12) + ' F', `encaissé par cycle : ${simF(r.cashCycle)} F`, r.profit >= 0 ? 'good' : 'bad')}
    </div>
    <ul class="sim-tips">${tips.join('')}</ul>
    ${r.cost ? `<h4 class="sim-sub">Prix par offre</h4>
    <div class="sim-table">
        <div class="sim-tr sim-th"><span>Offre</span><span>Ton prix</span><span>Minimum</span><span>Conseillé (${r.target} %)</span></div>
        ${r.advice.map(a => `<div class="sim-tr"><span>${escHtml(a.name)}</span><span>${simF(a.price)}</span><span>${simF(a.min)}</span><span class="${a.ok ? 'ok' : 'low'}">${simF(Math.ceil(a.best / 50) * 50)}${a.ok ? ' ✓' : ' ↑'}</span></div>`).join('')}
    </div>
    <p class="set-hint">Minimum = coût d’une place pendant la durée de l’offre (en dessous, tu perds de l’argent). Conseillé = minimum + ta marge visée, arrondi à 50 F.</p>` : ''}
    <h4 class="sim-sub">Si tu changes tous tes prix (même nombre de clients)</h4>
    <div class="sim-table">
        <div class="sim-tr sim-th"><span>Prix</span><span>CA / mois</span><span>Bénéfice / mois</span><span>Marge</span></div>
        ${steps.map(p => { const ca = r.caMonth * (1 + p / 100), pr = ca - r.cost; return `<div class="sim-tr${p === 0 ? ' cur' : ''}"><span>${p === 0 ? 'Actuel' : (p > 0 ? '+' : '') + p + ' %'}</span><span>${simF(ca)}</span><span class="${pr >= 0 ? 'ok' : 'low'}">${simF(pr)}</span><span>${ca ? Math.round(pr / ca * 100) : 0} %</span></div>`; }).join('')}
    </div>`;
}

// ---------- Meilleurs clients / À reconquérir ----------
function subSetClientsHtml() {
    const all = (S.subscriptions || []).map(c => ({ c, total: subTotalPaid(c), renew: subHistory(c).length }));
    const top = all.filter(x => x.total > 0).sort((a, b) => b.total - a.total).slice(0, 10);
    const lost = all.filter(x => x.c.end && !(x.c.duration && /life|vie/i.test(x.c.duration)) && (subDaysLeft(x.c.end) ?? 0) < -7 && !(x.c.status && SUB_INACTIVE.test(x.c.status)))
        .sort((a, b) => (a.c.end || '').localeCompare(b.c.end || ''));
    const row = (x, i, extra) => `<button class="rank-row" onclick="closeSubSettings(); setSubFilter('${escAttr(x.c.service)}'); openSubModal('${escAttr(x.c.id)}')">
        <span class="rank-pos${i === 0 ? ' gold' : ''}">${i + 1}</span>
        <span class="rank-main"><strong>${escHtml(x.c.name)}</strong><span>${escHtml(subAlertTitle(x.c))}${extra ? ' · ' + extra : ''}</span></span>
        <span class="rank-val">${formatFCFA(x.total)}</span>
    </button>`;
    return `
    <div class="subset-two">
        <div><h3 class="set-title">Meilleurs clients</h3><p class="set-hint">Classés par total encaissé, renouvellements compris.</p>
        <div class="rank-list">${top.length ? top.map((x, i) => row(x, i, `${x.renew} renouvellement${x.renew > 1 ? 's' : ''}`)).join('') : '<div class="notif-empty">Aucun paiement enregistré pour l’instant.</div>'}</div></div>
        <div><h3 class="set-title">À reconquérir</h3><p class="set-hint">Expirés depuis plus de 7 jours sans renouvellement.</p>
        <div class="rank-list">${lost.length ? lost.slice(0, 10).map((x, i) => row(x, i, `expiré le ${fmtDateFr(x.c.end)}`)).join('') : '<div class="notif-empty">Aucun client perdu 👍</div>'}</div></div>
    </div>`;
}
function subSetExportHtml() {
    return `<p class="set-lead">Télécharge tous tes abonnements (clients, services, dates, montants, historique) dans un fichier à ouvrir avec Excel ou Google Sheets.</p>
    <button class="btn ca-btn set-export" onclick="exportSubsExcel()"><span class="material-icons-outlined">download</span> Exporter tous les abonnements (Excel)</button>`;
}

// ---------- Fenêtre ----------
function openSubSettings(tab) {
    if (tab) subSetTab = tab;
    renderSubSettings();
    document.getElementById('subSettingsOverlay').classList.add('active');
}
function setSubSetTab(t) { subSetTab = t; renderSubSettings(); const c = document.getElementById('subSetContent'); if (c) c.scrollTop = 0; }
function renderSubSettings() {
    const body = document.getElementById('subSettingsBody'); if (!body) return;
    const html = { messages: subSetMessagesHtml, ca: subSetCAHtml, help: subSetHelpHtml, sim: subSetSimHtml, clients: subSetClientsHtml, export: subSetExportHtml }[subSetTab] || subSetMessagesHtml;
    const cur = SUBSET_TABS.find(t => t[0] === subSetTab) || SUBSET_TABS[0];
    body.innerHTML = `
    <div class="subset">
        <nav class="subset-nav" aria-label="Rubriques des paramètres">${SUBSET_TABS.map(([k, label, ic]) => `<button class="${k === subSetTab ? 'active' : ''}" onclick="setSubSetTab('${k}')"><span class="material-icons-outlined">${ic}</span><span>${label}</span></button>`).join('')}</nav>
        <section class="subset-content" id="subSetContent"><h3 class="subset-h">${cur[1]}</h3>${html()}</section>
    </div>`;
    if (subSetTab === 'sim') renderSimResults();
    const a = body.querySelector('.subset-nav button.active'); if (a && window.innerWidth <= 900) a.scrollIntoView({ block: 'nearest', inline: 'center' });
}
