/* =====================================================================
   APEX FLOW OS — bascule thème clair / thème sombre
   Le choix est mémorisé dans le navigateur et repris sur toutes les pages
   (boutique, Web App, page Google Sheets).

   Dans le <head> de chaque page, AVANT tout affichage :
     <script>(function(){try{var t=localStorage.getItem('apexflow.theme');
       if(!t)t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';
       document.documentElement.dataset.theme=t;}catch(e){}})();</script>

   Bouton : <button class="theme-btn" type="button">… soleil + lune …</button>
   Écouter le changement : document.addEventListener('apex:theme', e => …)
   ===================================================================== */
(function () {
  var KEY  = 'apexflow.theme';
  var root = document.documentElement;

  function current() { return root.dataset.theme === 'light' ? 'light' : 'dark'; }

  function paint(t) {
    root.dataset.theme = t;

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', t === 'light' ? '#F6F8FC' : '#07090E');

    var label = t === 'light' ? 'Passer au thème sombre' : 'Passer au thème clair';
    Array.prototype.forEach.call(document.querySelectorAll('.theme-btn'), function (b) {
      b.setAttribute('aria-pressed', t === 'light' ? 'true' : 'false');
      b.setAttribute('aria-label', label);
      b.setAttribute('title', label);
    });

    document.dispatchEvent(new CustomEvent('apex:theme', { detail: { theme: t } }));
  }

  function set(t) {
    try { localStorage.setItem(KEY, t); } catch (e) {}
    paint(t);
  }

  window.ApexTheme = {
    get: current,
    set: set,
    toggle: function () { set(current() === 'light' ? 'dark' : 'light'); }
  };

  function wire() {
    Array.prototype.forEach.call(document.querySelectorAll('.theme-btn'), function (b) {
      if (b.dataset.wired) return;
      b.dataset.wired = '1';
      b.addEventListener('click', function () { window.ApexTheme.toggle(); });
    });
    paint(current());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire);
  else wire();
})();
