// ==================== CONNEXION GOOGLE (sécurisation Firebase) ====================
// Une fois connecté, l'app relance la synchro avec ton identité. Quand les règles Firebase
// seront verrouillées sur ton compte, seuls tes appareils connectés pourront lire / écrire.
let currentUser = null;

function initAuth() {
    if (typeof firebase === 'undefined' || !firebase.auth) return;
    // Retour d'une connexion par redirection (mobile / app installée)
    firebase.auth().getRedirectResult().catch(e => authError(e));
    firebase.auth().onAuthStateChanged(user => {
        const wasSignedIn = !!currentUser;
        currentUser = user;
        updateAuthUI();
        if (user && !wasSignedIn && typeof startSync === 'function') { startSync(); attachDescSync(); }
    });
}

async function signInGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        // Fenêtre de connexion partout : la redirection tourne en rond sur les navigateurs récents
        await firebase.auth().signInWithPopup(provider);
    } catch (e) {
        // Fenêtre bloquée : on bascule sur la redirection
        if (e && /popup-blocked|operation-not-supported/i.test(e.code || '')) { try { await firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider()); return; } catch (e2) { e = e2; } }
        authError(e);
    }
}

async function signOutGoogle() {
    if (!confirm('Se déconnecter de ce appareil ? Une fois la base sécurisée, il faudra te reconnecter pour voir tes données.')) return;
    await firebase.auth().signOut();
    toast('Déconnecté');
}

function authError(e) {
    if (!e || !e.code) return;
    console.warn('Auth', e.code, e.message);
    const msg = {
        'auth/operation-not-allowed': 'Connexion Google pas encore activée dans Firebase (Authentication → Google).',
        'auth/unauthorized-domain': 'Ce site n’est pas encore autorisé dans Firebase (Authentication → Paramètres → Domaines autorisés).',
        'auth/popup-closed-by-user': 'Connexion annulée.',
        'auth/network-request-failed': 'Pas de connexion internet.'
    }[e.code] || `Connexion impossible (${e.code}).`;
    toast('⚠ ' + msg);
}

// Base verrouillée et pas connecté : on propose la connexion au lieu d'afficher des données vides
function onSyncDenied(err) {
    if (!err || !/permission/i.test(err.code || err.message || '')) return;
    document.querySelectorAll('.sync-status, .online-chip').forEach(el => el.classList.add('offline'));
    const l = document.getElementById('syncLabel'); if (l) l.textContent = 'Connexion requise';
    if (!currentUser) openSecurity();
}

function updateAuthUI() {
    const box = document.getElementById('securityBody');
    if (!box) return;
    if (currentUser) {
        box.innerHTML = `
            <div class="sec-user">
                ${currentUser.photoURL ? `<img src="${escAttr(currentUser.photoURL)}" alt="" referrerpolicy="no-referrer">` : '<span class="sec-avatar">' + escHtml((currentUser.displayName || currentUser.email || '?').charAt(0)) + '</span>'}
                <div><strong>${escHtml(currentUser.displayName || 'Connecté')}</strong><span>${escHtml(currentUser.email || '')}</span></div>
            </div>
            <p class="sec-ok">✓ Cet appareil est connecté à ton compte Google.</p>
            <label class="sec-uid">Ton identifiant (à coller dans les règles Firebase)
                <span class="sec-uid-row"><code>${escHtml(currentUser.uid)}</code><button class="btn" onclick="copyText('${escAttr(currentUser.uid)}', 'Identifiant copié ✓')">Copier</button></span>
            </label>
            <button class="btn sec-out" onclick="signOutGoogle()">Se déconnecter de cet appareil</button>`;
    } else {
        box.innerHTML = `
            <p class="sec-text">Connecte-toi avec ton compte Google sur chaque appareil (PC et téléphone). Ensuite, ta base pourra être verrouillée : plus personne d'autre ne pourra lire ou effacer tes données, et plus de limite d'un mois.</p>
            <button class="btn-primary sec-in" onclick="signInGoogle()"><span class="material-icons-outlined">login</span> Se connecter avec Google</button>`;
    }
}
function openSecurity() { updateAuthUI(); document.getElementById('securityOverlay').classList.add('active'); }
function closeSecurity() { document.getElementById('securityOverlay').classList.remove('active'); }
