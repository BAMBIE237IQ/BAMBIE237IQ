// ===== START =====
init();
initSyncIndicator();

// PWA : installable sur l'écran d'accueil (https ou localhost uniquement)
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(e => console.warn('SW', e)));
}
