// ==================== STREAMIFY RÉSEAU ====================
// Tableau des adresses e-mail et de leurs comptes, enregistré dans Firebase
// sous un nœud à part (reseau/), hors de userData : save() du tracker ne l'écrase pas.
// Forme : { rows: { id: { email, accounts: { youtube: { name } }, createdAt } }, notes: { id: { text, at } } }
const firebaseConfig = {
  apiKey: "AIzaSyCqZhTn6fA7lHwN5JHwaowDzGWohA9rOQ0",
  authDomain: "bambie237iq.firebaseapp.com",
  databaseURL: "https://bambie237iq-default-rtdb.firebaseio.com",
  projectId: "bambie237iq",
  storageBucket: "bambie237iq.firebasestorage.app",
  messagingSenderId: "730310282369",
  appId: "1:730310282369:web:fa4cc5068a718be30c5180"
};

const PLATFORMS = [
  { k: "youtube", n: "YouTube", c: "#ff0033", ph: "@machaine", svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M9 7.5v9l7.5-4.5z"/></svg>' },
  { k: "tiktok", n: "TikTok", c: "#111111", ph: "@moncompte", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M13 4v11a3 3 0 1 1-3-3"/><path d="M13 4c.5 2.5 2.3 4 5 4"/></svg>' },
  { k: "instagram", n: "Instagram", c: "#d62976", ph: "@moncompte", svg: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2"><rect x="4" y="4" width="16" height="16" rx="5"/><circle cx="12" cy="12" r="3.6"/><circle cx="17" cy="7" r=".8" fill="#fff"/></svg>' },
  { k: "facebook", n: "Facebook", c: "#1877f2", ph: "Nom de la page", svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.8 1.4-3.8 3.9v2.3H8v3h2.5V21z"/></svg>' },
  { k: "snapchat", n: "Snapchat", c: "#fffc00", ph: "moncompte", svg: '<svg viewBox="0 0 24 24" fill="#fff" stroke="#111" stroke-width="1.4" stroke-linejoin="round"><path d="M12 3.5c3 0 5 2.2 5 5v2.3l1.8-.4c.6 0 .8.7.2 1l-2 .9c.6 1.8 2 3 3.5 3.4-.3.8-1.6 1-2.6 1.2l-.4 1.2c-1.2-.2-2.2 0-3.3.9-1.3.9-3.1.9-4.4 0-1.1-.9-2.1-1.1-3.3-.9l-.4-1.2c-1-.2-2.3-.4-2.6-1.2 1.5-.4 2.9-1.6 3.5-3.4l-2-.9c-.6-.3-.4-1 .2-1l1.8.4V8.5c0-2.8 2-5 5-5z"/></svg>' },
  { k: "x", n: "X", c: "#000000", ph: "@moncompte", svg: '<svg viewBox="0 0 24 24" fill="#fff"><path d="M17.8 3.5h3l-6.6 7.5 7.8 9.5h-6.1l-4.8-6-5.4 6h-3l7-8L2.4 3.5h6.2l4.3 5.5zm-1 15.3h1.7L7.3 5.1H5.5z"/></svg>' }
];
const URLS = {
  youtube: h => "https://www.youtube.com/" + (h.startsWith("@") ? h : "@" + h),
  tiktok: h => "https://www.tiktok.com/" + (h.startsWith("@") ? h : "@" + h),
  instagram: h => "https://www.instagram.com/" + h.replace(/^@/, ""),
  facebook: h => "https://www.facebook.com/" + h.replace(/^@/, "").replace(/\s+/g, ""),
  snapchat: h => "https://www.snapchat.com/add/" + h.replace(/^@/, ""),
  x: h => "https://x.com/" + h.replace(/^@/, "")
};

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
let rows = [], notes = [], rowsRef = null, notesRef = null, user = null;

function toast(t) { const el = $("toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 1800); }
function getVal(d, f) { return f === "email" ? (d.email || "") : (((d.accounts || {})[f] || {}).name || ""); }
function linkFor(k, name) { if (!name) return ""; try { return URLS[k](name.trim()); } catch { return ""; } }

$("headRow").innerHTML = '<th>#</th><th>Adresse e-mail</th>' +
  PLATFORMS.map(p => `<th><span class="pl"><span class="ico" style="background:${p.c}">${p.svg}</span>${p.n}</span></th>`).join("") + '<th></th>';

function refreshLink(inp) {
  const a = inp.parentNode.querySelector("a[data-link]"); if (!a) return;
  const u = linkFor(a.dataset.link, inp.value.trim());
  a.hidden = !u; if (u) a.href = u;
}

function render() {
  const q = $("q").value.trim().toLowerCase();
  const list = rows.filter(r => !q || JSON.stringify(r.d).toLowerCase().includes(q));
  const tb = $("body");
  const sig = list.map(r => r.id).join("|") + "#" + !!rowsRef;
  if (tb.dataset.sig === sig) {
    // Mise à jour sans reconstruire : on ne touche pas à la case en cours de saisie
    tb.querySelectorAll("input[data-f]").forEach(inp => {
      if (inp === document.activeElement) return;
      const r = rows.find(x => x.id === inp.dataset.id);
      if (r) { const v = getVal(r.d, inp.dataset.f); if (inp.value !== v) inp.value = v; refreshLink(inp); }
    });
  } else {
    tb.dataset.sig = sig;
    tb.innerHTML = list.map((r, i) => `<tr>
      <td class="num">${i + 1}</td>
      <td><div class="cellbox"><input class="mono" data-id="${esc(r.id)}" data-f="email" value="${esc(r.d.email)}" placeholder="nom@gmail.com" aria-label="Adresse e-mail ligne ${i + 1}"></div></td>
      ${PLATFORMS.map(p => `<td><div class="cellbox"><input data-id="${esc(r.id)}" data-f="${p.k}" value="${esc(getVal(r.d, p.k))}" placeholder="${esc(p.ph)}" aria-label="${p.n} ligne ${i + 1}"><a data-link="${p.k}" target="_blank" rel="noopener" title="Ouvrir le profil" hidden>↗</a></div></td>`).join("")}
      <td><button class="danger" data-del="${esc(r.id)}" title="Supprimer la ligne">✕</button></td></tr>`).join("")
      + (rowsRef ? `<tr class="addrow"><td colspan="${PLATFORMS.length + 3}"><button data-addrow>+ Nouvelle ligne</button></td></tr>` : "");
    tb.querySelectorAll("input[data-f]").forEach(refreshLink);
  }

  const st = $("state");
  if (!user) {
    st.hidden = false;
    st.innerHTML = '<h3>Connexion requise</h3><p>Connecte-toi avec ton compte Google pour voir et modifier ton tableau.</p><button id="loginBtn">Se connecter avec Google</button>';
    $("loginBtn").onclick = signIn;
  } else if (!rowsRef) { st.hidden = false; st.innerHTML = '<h3>Chargement…</h3><p>Connexion à ta base.</p>'; }
  else if (!rows.length) { st.hidden = false; st.innerHTML = '<h3>Aucune ligne pour l’instant</h3><p>Clique sur « + Nouvelle ligne » puis remplis les cases : adresse e-mail, YouTube, TikTok…</p>'; }
  else if (!list.length) { st.hidden = false; st.innerHTML = '<h3>Aucun résultat</h3><p>Rien ne correspond à cette recherche.</p>'; }
  else st.hidden = true;

  const counts = PLATFORMS.map(p => [p.n, rows.filter(r => getVal(r.d, p.k)).length]);
  $("stats").innerHTML = `<span class="chip"><b>${rows.length}</b> adresses</span>` + counts.map(([n, c]) => `<span class="chip">${n} <b>${c}</b></span>`).join("");
  $("notes").innerHTML = notes.length
    ? notes.map(n => `<div class="note"><p>${esc(n.d.text)}</p><div class="meta"><span>${new Date(n.d.at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</span><button class="ghost" data-delnote="${esc(n.id)}">Supprimer</button></div></div>`).join("")
    : '<p class="muted">Tes notes apparaîtront ici.</p>';
  $("who").innerHTML = user ? `${esc(user.email || "")} <button class="ghost" id="outBtn">Déconnexion</button>` : "";
  if (user) $("outBtn").onclick = () => firebase.auth().signOut();
}

async function saveCell(inp) {
  const r = rows.find(x => x.id === inp.dataset.id); if (!r) return;
  const f = inp.dataset.f, v = inp.value.trim();
  if (getVal(r.d, f) === v) return;
  try {
    const ref = rowsRef.child(r.id);
    if (f === "email") await ref.update({ email: v, updatedAt: Date.now() });
    else await ref.update({ ["accounts/" + f]: v ? { name: v } : null, updatedAt: Date.now() });
    const box = inp.parentNode; box.classList.remove("saved"); void box.offsetWidth; box.classList.add("saved");
  } catch { toast("Enregistrement impossible, réessaie"); }
}

async function addRow() {
  if (!rowsRef) return toast("Connecte-toi d’abord");
  try {
    await rowsRef.push({ email: "", createdAt: Date.now(), updatedAt: Date.now() });
    setTimeout(() => { const ins = $("body").querySelectorAll('input[data-f="email"]'); ins[ins.length - 1]?.focus(); }, 200);
  } catch { toast("Ajout impossible"); }
}

async function signIn() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    await firebase.auth().signInWithPopup(provider);
  } catch (e) {
    if (e && /popup-blocked|operation-not-supported/i.test(e.code || "")) { firebase.auth().signInWithRedirect(new firebase.auth.GoogleAuthProvider()); return; }
    if (e && e.code !== "auth/popup-closed-by-user") toast("Connexion impossible (" + (e.code || "erreur") + ")");
  }
}

$("addBtn").onclick = addRow;
$("q").oninput = render;
document.addEventListener("input", e => { if (e.target.matches("input[data-f]")) refreshLink(e.target); });
document.addEventListener("change", e => { if (e.target.matches("input[data-f]")) saveCell(e.target); });
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target.matches("input[data-f]")) e.target.blur(); });
document.addEventListener("click", e => {
  if (e.target.closest("[data-addrow]")) { addRow(); return; }
  const del = e.target.closest("[data-del]");
  if (del) {
    if (del.dataset.arm !== "1") { del.dataset.arm = "1"; del.textContent = "Confirmer ?"; setTimeout(() => { if (del.isConnected) { del.dataset.arm = ""; del.textContent = "✕"; } }, 3000); return; }
    rowsRef.child(del.dataset.del).remove().then(() => toast("Ligne supprimée")).catch(() => toast("Suppression impossible"));
    return;
  }
  const dn = e.target.closest("[data-delnote]");
  if (dn && notesRef) notesRef.child(dn.dataset.delnote).remove().then(() => toast("Note supprimée")).catch(() => toast("Suppression impossible"));
});
$("noteBtn").onclick = async () => {
  const t = $("noteIn").value.trim(); if (!t) return;
  if (!notesRef) return toast("Connecte-toi d’abord");
  try { await notesRef.push({ text: t, at: Date.now() }); $("noteIn").value = ""; toast("Note ajoutée"); } catch { toast("Ajout impossible"); }
};

function attach() {
  const db = firebase.database();
  rowsRef = db.ref("reseau/rows"); notesRef = db.ref("reseau/notes");
  rowsRef.on("value", s => {
    const v = s.val() || {};
    rows = Object.entries(v).map(([id, d]) => ({ id, d })).sort((a, b) => (a.d.createdAt || 0) - (b.d.createdAt || 0));
    render();
  }, () => toast("Accès refusé à la base"));
  notesRef.on("value", s => {
    const v = s.val() || {};
    notes = Object.entries(v).map(([id, d]) => ({ id, d })).sort((a, b) => (b.d.at || 0) - (a.d.at || 0));
    render();
  });
}
function detach() {
  if (rowsRef) rowsRef.off(); if (notesRef) notesRef.off();
  rowsRef = notesRef = null; rows = []; notes = [];
}

firebase.initializeApp(firebaseConfig);
firebase.auth().getRedirectResult().catch(() => {});
firebase.auth().onAuthStateChanged(u => {
  user = u;
  if (u) attach(); else detach();
  render();
});
render();
