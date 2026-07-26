export default async function handler(req, res) {
  // Le Webhook de Telegram utilise POST
  if (req.method !== 'POST') {
    return res.status(200).json({ message: "Bot Telegram Handy Finance. En attente de webhook." });
  }

  try {
    const body = req.body;
    
    // Telegram envoie le message dans body.message
    if (!body || !body.message) {
      return res.status(200).send('OK');
    }

    const chatId = body.message.chat.id;
    const text = body.message.text || '';

    if (!text) {
      return res.status(200).send('OK');
    }

    const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const FIREBASE_DB_URL = "https://bambie237iq-default-rtdb.firebaseio.com/";

    // Fonction pour renvoyer un message sur Telegram
    const sendMessage = async (msg) => {
      if(!TELEGRAM_TOKEN) return;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' })
      });
    };

    const lowerText = text.toLowerCase();
    
    if (lowerText === '/start') {
      await sendMessage("👋 *Bienvenue sur Handy Finance Bot !*\n\nPour ajouter une transaction sans ouvrir l'application, envoyez un message sous ce format :\n👉 `Depense 5000 Repas`\n👉 `Entree 15000 Remboursement`\n👉 `Banque 50000 Salaire`\n👉 `Mobile 10000 Transfert`");
      return res.status(200).send('OK');
    }

    // Déterminer le type
    let type = '';
    if (lowerText.includes('depense') || lowerText.includes('dépense') || lowerText.includes('sortie') || lowerText.includes('retrait')) {
      type = 'expense';
    } else if (lowerText.includes('entree') || lowerText.includes('entrée') || lowerText.includes('ajout') || lowerText.includes('revenu')) {
      type = 'income';
    } else if (lowerText.includes('banque')) {
      type = 'bank';
    } else if (lowerText.includes('mobile')) {
      type = 'mobile';
    } else {
      await sendMessage("❌ *Erreur* : Je n'ai pas compris le type d'opération.\n\nCommencez votre message par `Dépense`, `Entrée`, `Banque` ou `Mobile`.");
      return res.status(200).send('OK');
    }

    // Extraire le premier nombre trouvé pour le montant
    const amountMatch = text.match(/\d+/);
    if (!amountMatch) {
      await sendMessage(`❌ *Erreur* : Aucun montant trouvé.\n\nEssayez : \`${type === 'expense' ? 'Dépense' : 'Entrée'} 5000 Motif\``);
      return res.status(200).send('OK');
    }
    const amount = parseInt(amountMatch[0], 10);
    
    // Le reste du texte devient le libellé
    const words = text.split(' ');
    const labelWords = words.filter(w => {
      const lw = w.toLowerCase();
      return lw !== 'dépense' && lw !== 'depense' && lw !== 'sortie' && lw !== 'retrait' &&
             lw !== 'entrée' && lw !== 'entree' && lw !== 'ajout' && lw !== 'revenu' &&
             lw !== 'banque' && lw !== 'mobile' &&
             w !== amountMatch[0];
    });
    
    let defaultLabel = "Divers";
    if (type === 'expense') defaultLabel = "Dépense Diverse";
    if (type === 'income') defaultLabel = "Entrée Diverse";
    if (type === 'bank') defaultLabel = "Opération Bancaire";
    if (type === 'mobile') defaultLabel = "Opération Mobile Money";
    
    const label = labelWords.join(' ').trim() || defaultLabel;

    // Date actuelle du Cameroun (UTC+1)
    const date = new Date();
    const cameroonTime = new Date(date.getTime() + (60 * 60 * 1000)); 
    const year = cameroonTime.getFullYear();
    const month = cameroonTime.getMonth();
    const monthKey = `${year}-${month}`;
    const dateStr = cameroonTime.toISOString().split('T')[0];

    // Création de l'objet transaction
    const tx = {
      id: Date.now().toString(),
      type: type,
      amount: amount,
      label: label,
      justification: "Via Telegram Bot 🤖",
      day: cameroonTime.getDate(),
      date: dateStr
    };

    // Firebase REST API - Fetch puis PUT pour préserver la structure tableau
    const monthUrl = `${FIREBASE_DB_URL}transactions/${monthKey}.json`;
    
    const fetchRes = await fetch(monthUrl);
    let currentTxs = await fetchRes.json();
    
    if (!currentTxs) {
      currentTxs = [];
    } else if (!Array.isArray(currentTxs)) {
      currentTxs = Object.values(currentTxs);
    }
    
    currentTxs.push(tx);
    
    const putRes = await fetch(monthUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(currentTxs)
    });

    if (putRes.ok) {
       const icon = type === 'expense' ? '🔴' : '🟢';
       const typeStr = type === 'expense' ? 'Dépense' : (type === 'income' ? 'Entrée' : (type === 'bank' ? 'Banque' : 'Mobile'));
       await sendMessage(`✅ *${typeStr} enregistrée !*\n\n${icon} Montant : ${amount} FCFA\n📝 Libellé : ${label}`);
    } else {
       await sendMessage("⚠️ *Erreur serveur* : Impossible d'enregistrer dans Firebase.");
    }

    return res.status(200).send('OK');

  } catch (error) {
    console.error("Erreur Webhook Telegram :", error);
    return res.status(200).send('OK'); // Toujours renvoyer 200 pour éviter que Telegram ne boucle
  }
}
