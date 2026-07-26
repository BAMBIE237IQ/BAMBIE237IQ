export default async function handler(req, res) {
  try {
    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const FIREBASE_DB_URL = "https://bambie237iq-default-rtdb.firebaseio.com/";
    
    // Pour envoyer un message sans que l'utilisateur nous parle, on a besoin du Chat ID.
    // L'utilisateur peut l'avoir défini dans Vercel, ou on lit le dernier message du bot.
    let chatId = process.env.TELEGRAM_CHAT_ID;
    
    if (!chatId) {
      const updatesRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getUpdates?limit=1`);
      const updatesData = await updatesRes.json();
      if (updatesData && updatesData.result && updatesData.result.length > 0) {
          chatId = updatesData.result[0].message.chat.id;
      }
    }

    if (!chatId) {
        console.error("Aucun Chat ID trouvé.");
        return res.status(200).send('No Chat ID');
    }

    const sendMessage = async (msg) => {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
      });
    };

    const subUrl = `${FIREBASE_DB_URL}subscriptions.json`;
    const fetchRes = await fetch(subUrl);
    let subs = await fetchRes.json() || [];
    if (!Array.isArray(subs)) subs = Object.values(subs);

    const today = new Date();
    today.setHours(0,0,0,0);
    
    let msgJ5 = [];
    let msgJ3 = [];
    let msgJ0 = [];
    let msgExpired = [];

    for (const c of subs) {
        if (!c.end) continue;
        if (c.duration && c.duration.toLowerCase().includes('life')) continue;
        if (c.status && c.status.toLowerCase() !== 'okay' && c.status.toLowerCase() !== 'sell') continue; // Ignorer les inactifs

        const endD = new Date(c.end);
        endD.setHours(0,0,0,0);
        const diffDays = Math.ceil((endD - today) / (1000 * 60 * 60 * 24));
        
        const line = `• *${c.service.toUpperCase()} ${c.account}* ${c.profile ? '('+c.profile+') ' : ''}- ${c.name}`;
        
        if (diffDays === 5) msgJ5.push(line);
        else if (diffDays === 3) msgJ3.push(line);
        else if (diffDays === 0) msgJ0.push(line);
        else if (diffDays < 0 && diffDays >= -7) msgExpired.push(line); // Rappel jusqu'à 7 jours après
    }

    let finalMessage = "🔔 *RAPPEL QUOTIDIEN DES ABONNEMENTS* 🔔\n\n";
    let hasAlerts = false;

    if (msgJ0.length > 0) {
        finalMessage += "🚨 *EXPIRE AUJOURD'HUI (J-0) :*\n" + msgJ0.join("\n") + "\n\n";
        hasAlerts = true;
    }
    if (msgJ3.length > 0) {
        finalMessage += "⚠️ *EXPIRE DANS 3 JOURS (J-3) :*\n" + msgJ3.join("\n") + "\n\n";
        hasAlerts = true;
    }
    if (msgJ5.length > 0) {
        finalMessage += "ℹ️ *EXPIRE DANS 5 JOURS (J-5) :*\n" + msgJ5.join("\n") + "\n\n";
        hasAlerts = true;
    }
    if (msgExpired.length > 0) {
        finalMessage += "❌ *DÉJÀ EXPIRÉS :*\n" + msgExpired.join("\n") + "\n\n";
        hasAlerts = true;
    }

    if (hasAlerts) {
        await sendMessage(finalMessage);
    }

    return res.status(200).send('Cron Exécuté');
  } catch (error) {
    console.error("Erreur CRON :", error);
    return res.status(500).send('Erreur');
  }
}
