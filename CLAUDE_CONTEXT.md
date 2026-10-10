# 📁 PROJET : HANDY TRACKER (BAMBIE237IQ)
**Document de transmission de contexte technique**

Ce document est con\xE7u pour fournir tout le contexte n\xE9cessaire \xE0 une IA (comme Claude) ou \xE0 un d\xE9veloppeur pour reprendre le projet imm\xE9diatement.

## 1. ARCHITECTURE ET TECHNOLOGIES
*   **Structure actuelle :** Application Monofichier (\index.html\). Plus de 4000 lignes de code regroupant HTML, CSS et Vanilla JS.
*   **Frontend :** HTML5, CSS3 (Variables CSS, Flexbox/Grid, Glassmorphism, Dark Mode "Apple/Vercel" style), Vanilla JavaScript (ES6+).
*   **Biblioth\xE8ques tierces (via CDN) :** 
    *   Chart.js (v4.4.4) pour les graphiques.
    *   Google Material Icons Outlined pour l'iconographie.
*   **Backend & Base de donn\xE9es :** 
    *   \localStorage\ (comme cache primaire).
    *   Firebase Realtime Database (via SDK Compat v10.12.2) pour la synchronisation Cloud en temps r\xE9el.
*   **D\xE9ploiement :** Vercel, branch\xE9 sur le d\xE9p\xF4t GitHub \BAMBIE237IQ\.

## 2. STRUCTURE DES DONN\xC9ES (L'OBJET GLOBAL \S\)
Tout l'\xE9tat de l'application est g\xE9r\xE9 par un unique objet global \S\ qui est synchronis\xE9 avec Firebase :
\\\javascript
let S = {
    currentView: 'weekly', // Vue active
    habits: [],            // Tableau des habitudes (id, name, type, icon, color)
    data: {},              // Tracking des habitudes { habitId: { "YYYY-MM-DD": boolean } }
    moods: {},             // Tracking d'humeur
    fitness: {             // Suivi Corporel
        targetWeight: 82, 
        height: 1.81, 
        records: { "YYYY-MM-DD": { weightAM, weightPM, thighAM, thighPM, foodLog, dailyLog } }
    },
    journal: {},           // To-Do list journali\xE8re { "YYYY-MM-DD": [{ text: "...", done: false }] }
    transactions: {},      // Transactions financi\xE8res journali\xE8res
    finAccounts: {},       // Soldes des comptes journaliers
    finance2Transactions: {}, // Transactions Dashboard global
    fin2Accounts: {},      // Soldes Dashboard global
    subscriptions: [],     // Abonnements r\xE9currents
    calendarEvents: {}     // \xC9v\xE9nements du calendrier (Heatmap)
};
\\\

## 3. FONCTIONNALIT\xC9S ACTUELLES (LES ONGLETS)
*   **Menu Lat\xE9ral (Sidebar) :** D\xE9di\xE9 au PC (Navigation verticale avec scrollbar). Sur mobile, menu \xE0 d\xE9filement horizontal en bas (\.mobile-bottom-nav\).
*   **Habit Tracker :** Grille hebdomadaire, calcul des s\xE9ries (streaks).
*   **Journal de bord :** Planificateur de t\xE2ches (To-Do list) s\xE9lectionnable par date (historique + planif du lendemain).
*   **Suivi Corporel (Sant\xE9) :** Calcul IMC, affichage dynamique d'un bonhomme SVG selon le ratio taille/poids (moyenne Matin/Soir), graphiques de suivi.
*   **Dashboard Financier :** Suivi des d\xE9penses/entr\xE9es, r\xE9partition par cat\xE9gorie via graphiques circulaires (Doughnut Chart.js), cartes de comparaison (Aujourd'hui vs Hier, etc.).
*   **Abonnements :** Gestion des co\xFBts r\xE9currents (Netflix, Spotify...).

## 4. CONTEXTE FIREBASE
*   **ID du projet :** \ambie237iq\
*   **M\xE9canique :** \dbRef.on('value', ...)\ \xE9coute les changements et \xE9crase l'objet \S\. La fonction \save()\ sauvegarde dans le \localStorage\ PUIS fait un \dbRef.set()\.
*   **R\xE8gles de s\xE9curit\xE9 :** Test Mode (Ouvertes jusqu'en Novembre 2026). Aucune authentification n'est requise.

## 5. POINTS CRITIQUES & RECOMMANDATIONS POUR LE REFACTORING
1.  **Refactoring d'urgence :** Le fichier \index.html\ a d\xE9pass\xE9 les limites du maintenable (4000+ lignes). Il doit \xEAtre d\xE9coup\xE9 (soit en modules ES6, soit migr\xE9 vers un framework comme React/Next.js ou Vue.js).
2.  **Encodage (UTF-8) :** Les scripts pr\xE9c\xE9dents ont parfois corrompu les accents (A%volution au lieu de \xC9volution). Lors des remplacements de cha\xEEnes, utiliser imp\xE9rativement l'unicode (\\\xE9\, \\\xE8\) pour prot\xE9ger le fichier.
3.  **UI/UX :** Le design a r\xE9cemment \xE9t\xE9 migr\xE9 vers un "Dark Mode Minimaliste" avec Sidebar. Ne pas casser cette structure CSS.

---
**Message \xE0 Claude :**
L'utilisateur te confie ce d\xE9p\xF4t. L'application fonctionne, est connect\xE9e \xE0 Firebase, et est d\xE9ploy\xE9e sur Vercel. Ton objectif sera probablement de modulariser le code, corriger des d\xE9tails d'interface, et ajouter les nouvelles id\xE9es de l'utilisateur de mani\xE8re robuste. Bonne chance !
