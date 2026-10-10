// Rappel quotidien des abonnements (Vercel Cron, 07:00 UTC = 08:00 au Cameroun).
// Prévient à J-5 et le jour même (J-0), et rappelle les abonnements expirés depuis moins de 3 jours.
const FIREBASE_DB_URL = "https://bambie237iq-default-rtdb.firebaseio.com/";
const INACTIVE = /annul|stop|inactif|termin|fini|rembours/i;
const SERVICES = { netflix: 'Netflix', spotify: 'Spotify', prime: 'Prime Video', proton: 'ProtonVPN' };

const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Date du jour au Cameroun (UTC+1), à minuit, en UTC pour comparer avec "YYYY-MM-DD"
function todayCameroonUTC() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export default async function handler(req, res) {
  try {
    // Si CRON_SECRET est défini dans Vercel, seul le cron Vercel peut déclencher l'envoi
    if (process.env.CRON_SECRET && req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).send('Unauthorized');
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_TOKEN) return res.status(200).send('No TELEGRAM_BOT_TOKEN');

    let chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) {
      const updatesRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?limit=1`);
      const updatesData = await updatesRes.json();
      chatId = updatesData?.result?.[0]?.message?.chat?.id;
    }
    if (!chatId) {
      console.error("Aucun Chat ID trouvé.");
      return res.status(200).send('No Chat ID');
    }

    // L'app enregistre tout sous /userData (et non à la racine)
    const fetchRes = await fetch(`${FIREBASE_DB_URL}userData/subscriptions.json`);
    let subs = (await fetchRes.json()) || [];
    if (!Array.isArray(subs)) subs = Object.values(subs);

    const today = todayCameroonUTC();
    const groups = { j0: [], j5: [], expired: [] };

    for (const c of subs) {
      if (!c || !c.end) continue;
      if (c.duration && /life|vie/i.test(c.duration)) continue;
      if (c.status && INACTIVE.test(c.status)) continue;

      const [y, m, d] = String(c.end).split('-').map(Number);
      if (!y || !m || !d) continue;
      const diff = Math.round((Date.UTC(y, m - 1, d) - today) / 86400000);

      const svc = SERVICES[c.service] || c.service || '';
      const line = `• <b>${esc(c.name)}</b> — ${esc(svc)} ${c.account ? 'compte ' + esc(c.account) : ''}${c.profile ? ' (' + esc(c.profile) + ')' : ''}${c.code ? ' · ' + esc(c.code) : ''}`;

      if (diff === 0) groups.j0.push(line);
      else if (diff === 5) groups.j5.push(line + ` · fin le ${d}/${m}`);
      else if (diff < 0 && diff >= -3) groups.expired.push(line + ` · expiré depuis ${-diff} j`);
    }

    if (!groups.j0.length && !groups.j5.length && !groups.expired.length) {
      return res.status(200).send('Rien à signaler');
    }

    let msg = "🔔 <b>Abonnements — rappel du jour</b>\n\n";
    if (groups.j0.length) msg += "🚨 <b>Se termine AUJOURD'HUI</b>\n" + groups.j0.join("\n") + "\n\n";
    if (groups.j5.length) msg += "⏳ <b>Se termine dans 5 jours</b>\n" + groups.j5.join("\n") + "\n\n";
    if (groups.expired.length) msg += "❌ <b>Déjà expirés</b>\n" + groups.expired.join("\n") + "\n\n";
    msg += "Ouvrir l'app : https://bambie-237-iq.vercel.app/#abonnements";

    const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'HTML', disable_web_page_preview: true })
    });
    if (!tg.ok) console.error("Telegram error:", tg.status, await tg.text());

    return res.status(200).send(tg.ok ? 'Rappel envoyé' : 'Erreur Telegram');
  } catch (error) {
    console.error("Erreur CRON :", error);
    return res.status(500).send('Erreur');
  }
}
