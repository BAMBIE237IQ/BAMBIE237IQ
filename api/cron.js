// Rappel quotidien des abonnements (Vercel Cron, 07:00 UTC = 08:00 au Cameroun).
// Envoie une notification push sur chaque téléphone abonné aux rappels :
// à J-5, le jour même (J-0), et pour les abonnements expirés depuis moins de 3 jours.
import webpush from 'web-push';

const FIREBASE_DB_URL = "https://bambie237iq-default-rtdb.firebaseio.com/";
// Clé publique VAPID (la même que dans js/notifications.js). La clé privée est dans Vercel : VAPID_PRIVATE_KEY.
const VAPID_PUBLIC_KEY = "BGg0hVJMDZO57ph2XW7OQc1WSpkFFQtUeBkynJTwkVKXLMfsWOqUJyXEO6iBcObi0DbTW3Z3EU7CpF6DAeA-G_k";
const APP_URL = "https://bambie-237-iq.vercel.app";
const INACTIVE = /annul|stop|inactif|termin|fini|rembours/i;
const SERVICES = { netflix: 'Netflix', spotify: 'Spotify', prime: 'Prime Video', proton: 'ProtonVPN' };

// Date du jour au Cameroun (UTC+1), à minuit, en UTC pour comparer avec "YYYY-MM-DD"
function todayCameroonUTC() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

function collectAlerts(subs) {
  const today = todayCameroonUTC();
  const out = { j0: [], j5: [], expired: [] };
  for (const c of subs) {
    if (!c || !c.end) continue;
    if (c.duration && /life|vie/i.test(c.duration)) continue;
    if (c.status && INACTIVE.test(c.status)) continue;
    const [y, m, d] = String(c.end).split('-').map(Number);
    if (!y || !m || !d) continue;
    const diff = Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);
    const who = `${c.name || 'Client'} (${SERVICES[c.service] || c.service || ''}${c.account ? ' ' + c.account : ''}${c.profile ? ' ' + c.profile : ''})`;
    if (diff === 0) out.j0.push(who);
    else if (diff === 5) out.j5.push(who);
    else if (diff < 0 && diff >= -3) out.expired.push(who);
  }
  return out;
}

function buildNotification(a) {
  const parts = [];
  if (a.j0.length) parts.push(`Se termine aujourd'hui : ${a.j0.join(', ')}`);
  if (a.j5.length) parts.push(`Fin dans 5 jours : ${a.j5.join(', ')}`);
  if (a.expired.length) parts.push(`Expiré : ${a.expired.join(', ')}`);
  const n = a.j0.length + a.j5.length + a.expired.length;
  const title = a.j0.length
    ? (a.j0.length === 1 ? `Abonnement terminé aujourd'hui : ${a.j0[0].split(' (')[0]}` : `${a.j0.length} abonnements se terminent aujourd'hui`)
    : `${n} abonnement${n > 1 ? 's' : ''} à renouveler`;
  return { title, body: parts.join('\n'), url: `${APP_URL}/#abonnements`, tag: `subs-${new Date().toISOString().slice(0, 10)}` };
}

export default async function handler(req, res) {
  try {
    // Si CRON_SECRET est défini dans Vercel, seul le cron Vercel peut déclencher l'envoi
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }
    if (!process.env.VAPID_PRIVATE_KEY) return res.status(200).send('VAPID_PRIVATE_KEY manquante dans Vercel');
    webpush.setVapidDetails(APP_URL, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

    // L'app enregistre tout sous /userData (et non à la racine)
    let subs = (await (await fetch(`${FIREBASE_DB_URL}userData/subscriptions.json`)).json()) || [];
    if (!Array.isArray(subs)) subs = Object.values(subs);
    const alerts = collectAlerts(subs);
    if (!alerts.j0.length && !alerts.j5.length && !alerts.expired.length) return res.status(200).send('Rien à signaler');

    // Téléphones qui ont activé les rappels (stockés hors de /userData pour ne pas être écrasés par l'app)
    const devices = (await (await fetch(`${FIREBASE_DB_URL}pushSubscriptions.json`)).json()) || {};
    const payload = JSON.stringify(buildNotification(alerts));
    let sent = 0;
    for (const [key, dev] of Object.entries(devices)) {
      if (!dev || !dev.endpoint || !dev.keys) continue;
      try {
        await webpush.sendNotification({ endpoint: dev.endpoint, keys: dev.keys }, payload, { TTL: 12 * 3600 });
        sent++;
      } catch (e) {
        // Abonnement révoqué ou expiré côté téléphone : on le supprime
        if (e.statusCode === 404 || e.statusCode === 410) await fetch(`${FIREBASE_DB_URL}pushSubscriptions/${key}.json`, { method: 'DELETE' });
        else console.error('Push error', e.statusCode, e.body);
      }
    }
    return res.status(200).send(`Notifications envoyées : ${sent}`);
  } catch (error) {
    console.error("Erreur CRON :", error);
    return res.status(500).send('Erreur');
  }
}
