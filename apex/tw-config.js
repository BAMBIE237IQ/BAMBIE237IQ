/* =====================================================================
   APEX FLOW OS — configuration Tailwind partagée
   À charger APRÈS le script CDN de Tailwind.
   Les couleurs pointent sur les jetons de theme.css : les classes
   Tailwind suivent donc automatiquement le thème clair ou sombre.
   ===================================================================== */
var c = function (name) { return 'rgb(var(--c-' + name + ') / <alpha-value>)'; };

tailwind.config = {
  theme: {
    extend: {
      colors: {
        obsidian: c('bg'),
        slate0:   c('bg2'),
        slate1:   c('surf'),
        slate2:   c('surf2'),
        ink:      c('ink'),
        muted:    c('muted'),
        dim:      c('dim'),
        /* « white » sert aux filets et aux survols : il suit le thème */
        white:    c('hair'),
        emerald:  { DEFAULT: c('em'), soft: c('em-soft'), deep: c('em-deep'), lite: c('em-lite') },
        amber:    { DEFAULT: c('am'), soft: c('am-soft'), deep: c('am-deep'), lite: c('am-lite') },
        indigo:   { DEFAULT: c('in'), soft: c('in-soft'), deep: c('in-deep'), lite: c('in-lite') },
        rose:     { DEFAULT: c('rose'), lite: c('rose-lite') },
        onem:     c('on-em'),
        onam:     c('on-am')
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      },
      borderRadius: { '4xl': '2rem' }
    }
  }
};
