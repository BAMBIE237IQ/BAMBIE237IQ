# -*- coding: utf-8 -*-
"""
Génère apex/sheets/index.html à partir de APEX-FLOW-OS.gs.

À relancer après chaque modification du script :
    python apex/sheets/build.py

Le script Apps Script est injecté tel quel dans la page (bloc à copier +
bouton de téléchargement), il n'y a donc jamais deux versions à maintenir.
"""
import io, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
GS   = os.path.join(HERE, 'APEX-FLOW-OS.gs')
OUT  = os.path.join(HERE, 'index.html')

code = io.open(GS, encoding='utf-8').read()

# Le code part dans un <script type="text/plain"> : seule la séquence
# « </script » doit être neutralisée pour ne pas fermer la balise trop tôt.
safe = code.replace('</script', '<\\/script')
lignes = len(code.splitlines())

PAGE = u"""<!doctype html>
<html lang="fr" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>APEX FLOW OS — Installer la version Google Sheets</title>
<meta name="description" content="Comment générer ta version Google Sheets d'APEX FLOW OS : copie le script, colle-le dans Apps Script, le fichier complet se construit tout seul dans ton Drive.">
<meta name="theme-color" content="#07090E">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%2307090E'/%3E%3Cpath d='M16 6l8 20h-5l-3-8-3 8H8z' fill='%2310B981'/%3E%3C/svg%3E">
<script>(function(){try{var t=localStorage.getItem('apexflow.theme');
if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
document.documentElement.dataset.theme=t;}catch(e){}})();</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="../theme.css">
<script src="https://cdn.tailwindcss.com"></script>
<script src="../tw-config.js"></script>
<script src="../theme.js" defer></script>

<style>
  html{scroll-behavior:smooth}
  body{background:var(--bg); color:var(--ink); -webkit-font-smoothing:antialiased; overflow-x:hidden}
  .card{position:relative; background:var(--card-g); border:1px solid var(--line);
        border-radius:1.5rem; box-shadow:var(--card-sh)}
  .chip{display:inline-flex; align-items:center; gap:.45rem; padding:.4rem .75rem; border-radius:999px;
        border:1px solid var(--line); background:var(--chip-bg); font-size:.75rem; color:var(--muted)}
  .btn{display:inline-flex; align-items:center; justify-content:center; gap:.5rem; min-height:48px; padding:0 1.35rem;
       border-radius:.9rem; font-weight:700; font-family:"Space Grotesk",sans-serif; cursor:pointer;
       border:1px solid transparent; transition:transform .18s ease, background-color .18s ease, border-color .18s ease}
  .btn:active{transform:scale(.975)}
  .btn-primary{background:var(--em); color:var(--on-em); box-shadow:0 12px 34px -16px rgb(var(--c-em) / .8)}
  .btn-ghost{background:var(--inset); color:var(--ink); border-color:var(--line)}
  .btn-ghost:hover{border-color:var(--line-2)}
  :where(a,button,summary,[tabindex]):focus-visible{outline:2px solid var(--em); outline-offset:3px; border-radius:.6rem}
  .step{display:grid; grid-template-columns:auto 1fr; gap:1rem}
  .step-n{display:grid; place-items:center; width:38px; height:38px; flex:0 0 auto; border-radius:.8rem;
          font-family:"JetBrains Mono",monospace; font-weight:700; font-size:15px;
          background:rgb(var(--c-em) / .14); border:1px solid rgb(var(--c-em) / .34); color:var(--em)}
  .num{font-family:"JetBrains Mono",monospace; font-variant-numeric:tabular-nums}
  kbd{font-family:"JetBrains Mono",monospace; font-size:.8em; padding:.12rem .4rem; border-radius:.35rem;
      border:1px solid var(--line); background:var(--inset); color:var(--ink); white-space:nowrap}
  pre.code{margin:0; padding:1.1rem 1.2rem; overflow:auto; max-height:26rem; background:var(--inset);
           border-radius:1rem; border:1px solid var(--line);
           font-family:"JetBrains Mono",monospace; font-size:11.5px; line-height:1.65; color:var(--muted);
           white-space:pre; tab-size:2}
  table.menu{width:100%; border-collapse:collapse; font-size:14px}
  table.menu th{text-align:left; font-size:11px; letter-spacing:.06em; text-transform:uppercase;
                color:var(--dim); padding:.5rem .7rem; border-bottom:1px solid var(--line)}
  table.menu td{padding:.7rem; border-bottom:1px solid var(--line); vertical-align:top}
  table.menu tr:last-child td{border-bottom:none}
  details.faq{border:1px solid var(--line); border-radius:1.1rem; background:var(--inset); overflow:hidden}
  details.faq summary{cursor:pointer; list-style:none; padding:1rem 1.15rem; font-weight:600; min-height:56px;
                      display:flex; align-items:center; justify-content:space-between; gap:1rem}
  details.faq summary::-webkit-details-marker{display:none}
  details.faq .body{padding:0 1.15rem 1.15rem; color:var(--muted); line-height:1.75}
  .swatch{display:inline-block; width:14px; height:14px; border-radius:4px; border:1px solid var(--line); vertical-align:-2px}
  @media (prefers-reduced-motion: reduce){*{transition-duration:.001ms !important}}
</style>
</head>
<body class="font-sans">

<a href="#main" class="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:bg-emerald focus:text-onem focus:font-bold">Aller au contenu</a>

<!-- ============================ NAV ============================ -->
<header class="sticky top-0 z-40 border-b border-white/5" style="background:var(--topbar-bg); backdrop-filter:blur(12px)">
  <nav class="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center gap-3" aria-label="Navigation">
    <a href="../" class="flex items-center gap-2.5 shrink-0">
      <span class="grid place-items-center w-9 h-9 rounded-xl" style="background:rgb(var(--c-em) / .15); border:1px solid rgb(var(--c-em) / .3)">
        <svg viewBox="0 0 24 24" class="w-5 h-5" aria-hidden="true"><path d="M12 3l7 18h-4.4L12 13.6 9.4 21H5z" fill="currentColor" style="color:var(--em)"/></svg>
      </span>
      <span class="font-display font-bold tracking-tight text-[15px] leading-none">APEX FLOW<span class="text-emerald"> OS</span></span>
    </a>
    <ul class="hidden sm:flex items-center gap-1 ml-3 text-sm text-muted">
      <li><a class="px-3 py-2 rounded-lg hover:text-ink hover:bg-white/5 transition" href="../">Boutique</a></li>
      <li><a class="px-3 py-2 rounded-lg hover:text-ink hover:bg-white/5 transition" href="../app/">Web App</a></li>
    </ul>
    <div class="ml-auto flex items-center gap-2">
      <button type="button" class="theme-btn" aria-pressed="false" aria-label="Passer au thème clair" title="Passer au thème clair">
        <svg class="ic-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
        <svg class="ic-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
      </button>
      <a href="#copier" class="btn btn-primary !min-h-[42px] !px-4 text-sm">Installer</a>
    </div>
  </nav>
</header>

<main id="main" class="mx-auto max-w-5xl px-4 sm:px-6 py-10 sm:py-14">

  <!-- ============================ HERO ============================ -->
  <section class="mb-10">
    <span class="chip mb-5"><span style="width:7px;height:7px;border-radius:50%;background:var(--em);display:inline-block"></span>Livrable 3 · Google Sheets</span>
    <h1 class="font-display font-bold tracking-tight text-[2rem] sm:text-5xl leading-[1.1]">
      Ta version Google&nbsp;Sheets,<br>
      <span class="text-emerald">construite dans ton Drive</span> en 2&nbsp;minutes.
    </h1>
    <p class="mt-5 text-muted text-base sm:text-lg leading-relaxed max-w-2xl">
      Il n'y a pas de lien « ouvrir la feuille » : un fichier Google Sheets vit dans un Drive, et
      <strong class="text-ink">celui-ci doit être le tien</strong> — sinon tu ne pourrais ni écrire dedans, ni le garder.
      Tu colles le script une fois, et il fabrique tout seul le fichier complet : onglets, cases à cocher,
      formules, barres de progression et calcul d'XP.
    </p>
    <div class="mt-7 flex flex-col sm:flex-row gap-3">
      <button type="button" class="btn btn-primary" id="copy-top">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="w-[18px] h-[18px]" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 012-2h10"/></svg>
        Copier le script (<span class="num">__LIGNES__</span> lignes)
      </button>
      <a class="btn btn-ghost" href="https://sheets.new" target="_blank" rel="noopener">
        Ouvrir une feuille vierge
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" class="w-4 h-4" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>
      </a>
    </div>
  </section>

  <!-- ============================ ÉTAPES ============================ -->
  <section class="card p-6 sm:p-8 mb-6" id="copier">
    <h2 class="font-display font-bold text-2xl mb-1">Les 5 étapes</h2>
    <p class="text-muted text-sm mb-7">Compte 2 à 3 minutes la première fois. Rien à installer, rien à payer.</p>

    <ol class="grid gap-6">
      <li class="step">
        <span class="step-n">1</span>
        <div>
          <p class="font-semibold">Ouvre une feuille Google Sheets vierge</p>
          <p class="text-muted text-sm mt-1 leading-relaxed">
            Va sur <a class="text-emerald underline underline-offset-2" href="https://sheets.new" target="_blank" rel="noopener">sheets.new</a>
            (ou Drive ▸ Nouveau ▸ Google Sheets). Le fichier t'appartient dès cette seconde.
          </p>
        </div>
      </li>
      <li class="step">
        <span class="step-n">2</span>
        <div>
          <p class="font-semibold">Menu <kbd>Extensions</kbd> ▸ <kbd>Apps Script</kbd></p>
          <p class="text-muted text-sm mt-1 leading-relaxed">
            Un nouvel onglet s'ouvre avec un fichier <kbd>Code.gs</kbd> presque vide.
            Sélectionne tout ce qu'il contient (<kbd>Ctrl</kbd>+<kbd>A</kbd>) et supprime-le.
          </p>
        </div>
      </li>
      <li class="step">
        <span class="step-n">3</span>
        <div>
          <p class="font-semibold">Colle le script ci-dessous, puis enregistre</p>
          <p class="text-muted text-sm mt-1 leading-relaxed">
            Bouton « Copier le script », puis <kbd>Ctrl</kbd>+<kbd>V</kbd> dans Apps Script et
            <kbd>Ctrl</kbd>+<kbd>S</kbd> pour enregistrer.
          </p>
          <div class="mt-4 flex flex-wrap gap-2">
            <button type="button" class="btn btn-primary !min-h-[42px] !px-4 text-sm" id="copy-main">Copier le script</button>
            <button type="button" class="btn btn-ghost !min-h-[42px] !px-4 text-sm" id="dl">Télécharger le .gs</button>
            <button type="button" class="btn btn-ghost !min-h-[42px] !px-4 text-sm" id="see" aria-expanded="false" aria-controls="codewrap">Voir le code</button>
          </div>
          <div id="codewrap" class="mt-4" hidden>
            <pre class="code" id="codeview" tabindex="0"></pre>
          </div>
        </div>
      </li>
      <li class="step">
        <span class="step-n">4</span>
        <div>
          <p class="font-semibold">Reviens sur la feuille et recharge la page</p>
          <p class="text-muted text-sm mt-1 leading-relaxed">
            <kbd>F5</kbd>. Un nouveau menu <strong class="text-ink">⚡ APEX FLOW</strong> apparaît dans la barre du haut,
            à côté de « Aide ». S'il n'est pas là, attends 5 secondes et recharge encore.
          </p>
        </div>
      </li>
      <li class="step">
        <span class="step-n">5</span>
        <div>
          <p class="font-semibold">⚡ APEX FLOW ▸ Installer le système complet</p>
          <p class="text-muted text-sm mt-1 leading-relaxed">
            Google demande une autorisation la première fois (c'est ton propre script qui veut écrire dans ta propre
            feuille) — voir la question juste en dessous. Accepte, et le fichier se construit sous tes yeux :
            <strong class="text-ink">QG</strong>, <strong class="text-ink">Habitudes</strong>, <strong class="text-ink">Tâches</strong>.
          </p>
        </div>
      </li>
    </ol>
  </section>

  <!-- ============================ AUTORISATION ============================ -->
  <section class="card p-6 sm:p-8 mb-6" style="border-color:rgb(var(--c-am) / .35); background:linear-gradient(150deg,rgb(var(--c-am) / .10),transparent)">
    <h2 class="font-display font-bold text-xl mb-2">⚠ L'écran « Google n'a pas validé cette application »</h2>
    <p class="text-muted text-sm leading-relaxed">
      C'est normal et sans danger : le script n'est pas publié sur le store Google, il n'existe que dans ton fichier.
      Au premier lancement : <kbd>Autoriser l'accès</kbd> → choisis ton compte → <kbd>Paramètres avancés</kbd> →
      <kbd>Accéder à APEX FLOW OS (non sécurisé)</kbd> → <kbd>Autoriser</kbd>.
      Le script ne touche qu'à la feuille ouverte (et, si tu le demandes, crée les 6 fichiers modules dans ton Drive).
      Aucune donnée ne sort de ton compte Google.
    </p>
  </section>

  <!-- ============================ MENU ============================ -->
  <section class="card p-6 sm:p-8 mb-6">
    <h2 class="font-display font-bold text-2xl mb-1">Le menu ⚡ APEX FLOW</h2>
    <p class="text-muted text-sm mb-6">Tout se pilote depuis là, à n'importe quel moment.</p>
    <table class="menu">
      <thead><tr><th>Commande</th><th>Ce qu'elle fait</th></tr></thead>
      <tbody>
        <tr><td class="font-semibold">Installer le système complet</td>
            <td class="text-muted">Crée les onglets QG, Habitudes et Tâches : cases à cocher sur les 28 à 31 jours du mois, XP, niveau, rang, série, taux et Radar de Vie par pilier.</td></tr>
        <tr><td class="font-semibold">Générer les 6 modules ici</td>
            <td class="text-muted">Ajoute les 6 onglets experts : Cashflow &amp; Crypto, Épargne 52 semaines, Athlète, Side-Hustle, Créateur Viral, Second Cerveau.</td></tr>
        <tr><td class="font-semibold">Exporter les 6 modules en fichiers séparés</td>
            <td class="text-muted">Crée 6 fichiers Google Sheets indépendants dans ton Drive — la version à vendre à l'unité.</td></tr>
        <tr><td class="font-semibold">Apparence ▸ Thème sombre / Thème clair</td>
            <td class="text-muted">Repeint tout le fichier. Tes habitudes, tes cases cochées et tes tâches sont conservées.</td></tr>
        <tr><td class="font-semibold">Remettre le mois à zéro</td>
            <td class="text-muted">Décoche tout l'onglet Habitudes. Les noms, piliers et XP restent en place.</td></tr>
      </tbody>
    </table>
  </section>

  <!-- ============================ THÈMES ============================ -->
  <section class="card p-6 sm:p-8 mb-6">
    <h2 class="font-display font-bold text-2xl mb-1">Deux thèmes, dans la feuille aussi</h2>
    <p class="text-muted text-sm mb-6">
      Le choix est mémorisé dans le fichier : toute feuille générée ensuite reprend le même thème.
      Sur ce site, le bouton en haut à droite fait la même chose.
    </p>
    <div class="grid sm:grid-cols-2 gap-4">
      <div class="rounded-2xl p-5" style="background:#07090E; border:1px solid rgb(148 163 184 / .18)">
        <p class="font-display font-bold" style="color:#F8FAFC">Sombre · Obsidienne</p>
        <p class="text-sm mt-1" style="color:#94A3B8">Pour travailler le soir, et pour les captures d'écran de vente.</p>
        <p class="mt-4 text-xs num" style="color:#94A3B8">
          <span class="swatch" style="background:#07090E"></span> #07090E &nbsp;
          <span class="swatch" style="background:#10B981"></span> #10B981 &nbsp;
          <span class="swatch" style="background:#F59E0B"></span> #F59E0B
        </p>
      </div>
      <div class="rounded-2xl p-5" style="background:#FFFFFF; border:1px solid rgb(15 23 42 / .14)">
        <p class="font-display font-bold" style="color:#0B1220">Clair · Papier</p>
        <p class="text-sm mt-1" style="color:#51607A">Pour imprimer, projeter, ou travailler en plein jour.</p>
        <p class="mt-4 text-xs num" style="color:#51607A">
          <span class="swatch" style="background:#FFFFFF"></span> #FFFFFF &nbsp;
          <span class="swatch" style="background:#047857"></span> #047857 &nbsp;
          <span class="swatch" style="background:#B45309"></span> #B45309
        </p>
      </div>
    </div>
  </section>

  <!-- ============================ FAQ ============================ -->
  <section class="mb-10">
    <h2 class="font-display font-bold text-2xl mb-4">Si quelque chose coince</h2>
    <div class="grid gap-3">
      <details class="faq">
        <summary>Le menu ⚡ APEX FLOW n'apparaît pas
          <span aria-hidden="true" class="text-muted">+</span></summary>
        <div class="body">Le script n'a pas été enregistré, ou la feuille n'a pas été rechargée. Retourne dans Apps Script,
          <kbd>Ctrl</kbd>+<kbd>S</kbd>, puis <kbd>F5</kbd> sur la feuille. Le menu met parfois 5 à 10 secondes à se charger.</div>
      </details>
      <details class="faq">
        <summary>« Exception : vous n'avez pas l'autorisation »
          <span aria-hidden="true" class="text-muted">+</span></summary>
        <div class="body">Tu n'as pas terminé l'écran d'autorisation. Relance la commande du menu et va jusqu'au bout :
          Paramètres avancés ▸ Accéder à … (non sécurisé) ▸ Autoriser.</div>
      </details>
      <details class="faq">
        <summary>Les formules s'affichent en français, le script est en anglais
          <span aria-hidden="true" class="text-muted">+</span></summary>
        <div class="body">C'est voulu. Apps Script n'accepte que les noms anglais (<span class="num">COUNTIF</span>,
          <span class="num">SUMIF</span>, <span class="num">AVERAGEIF</span>) ; Google Sheets les affiche ensuite en français
          (<span class="num">NB.SI</span>, <span class="num">SOMME.SI</span>, <span class="num">MOYENNE.SI</span>). Rien à faire.</div>
      </details>
      <details class="faq">
        <summary>Est-ce que je peux changer de thème après coup ?
          <span aria-hidden="true" class="text-muted">+</span></summary>
        <div class="body">Oui, autant de fois que tu veux : ⚡ APEX FLOW ▸ Apparence. Le script met tes données de côté,
          repeint toute la mise en forme, puis les remet en place.</div>
      </details>
      <details class="faq">
        <summary>Et le mois prochain ?
          <span aria-hidden="true" class="text-muted">+</span></summary>
        <div class="body">Deux possibilités : « Remettre le mois à zéro » pour repartir sur la même feuille, ou
          « Installer le système complet » pour régénérer la grille au nombre de jours du nouveau mois
          (pense à copier le fichier avant si tu veux garder l'historique).</div>
      </details>
    </div>
  </section>

  <p class="text-center text-sm text-muted">
    <a class="text-emerald underline underline-offset-2" href="../">← Retour à la boutique</a>
    &nbsp;·&nbsp;
    <a class="text-emerald underline underline-offset-2" href="../app/">Ouvrir la Web App</a>
  </p>
</main>

<div id="toast" class="fixed left-1/2 bottom-5 z-50 px-4 py-3 rounded-xl text-sm font-semibold"
     style="transform:translate(-50%,160%); transition:transform .3s cubic-bezier(.2,.8,.2,1);
            background:var(--panel); border:1px solid rgb(var(--c-em) / .4); box-shadow:var(--sh)" role="status" aria-live="polite"></div>

<script type="text/plain" id="gs-source">__CODE__</script>
<script>
(function(){
  var CODE = document.getElementById('gs-source').textContent;
  var toastEl = document.getElementById('toast'), tmr;

  function toast(msg){
    toastEl.textContent = msg;
    toastEl.style.transform = 'translate(-50%,0)';
    clearTimeout(tmr);
    tmr = setTimeout(function(){ toastEl.style.transform = 'translate(-50%,160%)'; }, 2600);
  }

  function copier(){
    if (navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(CODE)
        .then(function(){ toast('Script copié · colle-le dans Apps Script'); })
        .catch(secours);
    } else { secours(); }
  }
  function secours(){
    var ta = document.createElement('textarea');
    ta.value = CODE; ta.setAttribute('readonly',''); ta.style.position='fixed'; ta.style.top='-1000px';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('Script copié · colle-le dans Apps Script'); }
    catch(e){ toast('Copie impossible : ouvre « Voir le code » et copie à la main'); }
    document.body.removeChild(ta);
  }

  document.getElementById('copy-top').addEventListener('click', copier);
  document.getElementById('copy-main').addEventListener('click', copier);

  document.getElementById('dl').addEventListener('click', function(){
    var b = new Blob([CODE], { type:'text/plain;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = 'APEX-FLOW-OS.gs';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
    toast('Fichier APEX-FLOW-OS.gs téléchargé');
  });

  var see = document.getElementById('see'), wrap = document.getElementById('codewrap');
  see.addEventListener('click', function(){
    var open = wrap.hidden;
    if (open && !document.getElementById('codeview').textContent) {
      document.getElementById('codeview').textContent = CODE;
    }
    wrap.hidden = !open;
    see.setAttribute('aria-expanded', open ? 'true' : 'false');
    see.textContent = open ? 'Masquer le code' : 'Voir le code';
  });

  document.querySelectorAll('details.faq').forEach(function(d){
    d.addEventListener('toggle', function(){
      var s = d.querySelector('summary span[aria-hidden]');
      if (s) s.textContent = d.open ? '−' : '+';
    });
  });
})();
</script>
</body>
</html>
"""

html = PAGE.replace('__CODE__', safe).replace('__LIGNES__', str(lignes))
io.open(OUT, 'w', encoding='utf-8', newline='\n').write(html)
print('index.html généré — %d lignes de script embarquées' % lignes)
