// FLUENT 90 reminders: called at 07:00, 13:00 and 20:00 Cameroon time (UTC+1) by an external cron.
// For each learner, reads today's status (written by the app at fluent90/<uid>/status/<date>)
// and sends a push notification only if that part of the day is not done yet.
// Safe to call several times: each slot is sent at most once per day (fluent90/<uid>/lastPush).
import webpush from 'web-push';

const DB = 'https://bambie237iq-default-rtdb.firebaseio.com/';
const AUTH = process.env.FIREBASE_DB_SECRET ? `?auth=${encodeURIComponent(process.env.FIREBASE_DB_SECRET)}` : '';
const VAPID_PUBLIC_KEY = 'BADrdDsq0XOHsky2PafVKaweQwMNwbHpOxWHVu-MxeZYy-KxenIVlE35EgW7z6h2zOigZsHzgsefnZbauBR9zdU';
const APP_URL = 'https://bambie-237-iq.vercel.app';

function cameroonNow() {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  return { date, hour: d.getUTCHours() };
}
function slotFor(hour) {
  if (hour >= 6 && hour < 11) return 'morning';
  if (hour >= 12 && hour < 17) return 'midday';
  if (hour >= 19 && hour <= 23) return 'evening';
  return null;
}
const get = async (path, q = '') => (await fetch(`${DB}${path}.json${AUTH}${q ? (AUTH ? '&' : '?') + q : ''}`)).json();
const put = (path, val) => fetch(`${DB}${path}.json${AUTH}`, { method: 'PUT', body: JSON.stringify(val) });

function message(slot, st, startDate) {
  if (!startDate) return slot === 'morning' ? { title: 'Fluent 90', body: 'Your 90 days are waiting. Take the 4-minute test and press Start.' } : null;
  const s = st || {};
  const streak = s.streak || 0;
  if (s.complete) return null;
  if (slot === 'morning' && !s.morning) return { title: `Day ${s.n || ''} · Morning (10 min)`, body: `Phrase cards + today's episode, with headphones. ${streak ? `Streak: ${streak} 🔥` : 'Start your streak today.'}` };
  if (slot === 'midday' && !s.midday) return { title: 'Midday session (10 min)', body: '5 fast reflexes + a few lines to write. Silent, you can do it anywhere.' };
  if (slot === 'evening') {
    const left = s.left != null ? s.left : 6;
    return { title: `${left} task${left > 1 ? 's' : ''} left today`, body: `At home, out loud: shadowing + speaking. Miss today and your ${streak ? `${streak}-day ` : ''}streak goes back to 0.` };
  }
  return null;
}

export default async function handler(req, res) {
  try {
    if (!process.env.VAPID_PRIVATE_KEY) return res.status(200).send('VAPID_PRIVATE_KEY missing');
    webpush.setVapidDetails(APP_URL, VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
    const { date, hour } = cameroonNow();
    const slot = (req.query && req.query.slot && ['morning', 'midday', 'evening'].includes(req.query.slot) && req.query.force === '1') ? req.query.slot : slotFor(hour);
    if (!slot) return res.status(200).send(`No reminder at ${hour}h`);
    const users = (await get('fluent90', 'shallow=true')) || {};
    let sent = 0;
    const out = [];
    for (const uid of Object.keys(users)) {
      const [meta, status, push, last] = await Promise.all([get(`fluent90/${uid}/meta`), get(`fluent90/${uid}/status/${date}`), get(`fluent90/${uid}/push`), get(`fluent90/${uid}/lastPush`)]);
      const tag = `${date}-${slot}`;
      if (last === tag) { out.push(`${uid.slice(0, 5)}: already sent`); continue; }
      if (!push) continue;
      const msg = message(slot, status, meta && meta.startDate);
      await put(`fluent90/${uid}/lastPush`, tag);
      if (!msg) { out.push(`${uid.slice(0, 5)}: nothing to remind`); continue; }
      const payload = JSON.stringify(Object.assign(msg, { tag: 'fluent90-' + slot, url: '/fluent/#today' }));
      for (const [key, dev] of Object.entries(push)) {
        if (!dev || !dev.endpoint || !dev.keys) continue;
        try { await webpush.sendNotification({ endpoint: dev.endpoint, keys: dev.keys }, payload, { TTL: 4 * 3600 }); sent++; }
        catch (e) {
          if ([403, 404, 410].includes(e.statusCode)) await fetch(`${DB}fluent90/${uid}/push/${key}.json${AUTH}`, { method: 'DELETE' });
          else console.error('push', e.statusCode, e.body);
        }
      }
    }
    return res.status(200).send(`Slot ${slot} · sent ${sent} · ${out.join(' | ')}`);
  } catch (e) {
    console.error('fluent-remind', e);
    return res.status(500).send('Error');
  }
}
