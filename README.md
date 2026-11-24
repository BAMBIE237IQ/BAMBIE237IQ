# Handy Tracker — et les apps qui vivent avec lui

> Dépôt de l'application personnelle **Handy Tracker** (habitudes, finances, abonnements, notes).
> Il héberge aussi **APEX FLOW OS** (produit à vendre) et **FLUENT 90** (anglais oral en 90 jours) :
> les trois apps sont mises en ligne ensemble par Vercel à chaque envoi sur `main`.

| App | Lien en ligne | Dossier |
|---|---|---|
| **Handy Tracker** | https://bambie-237-iq.vercel.app | racine (`index.html`, `css/`, `js/`) |
| **APEX FLOW OS** — boutique | https://bambie-237-iq.vercel.app/apex/ | `apex/index.html` |
| APEX FLOW OS — application web | https://bambie-237-iq.vercel.app/apex/app/ | `apex/app/` |
| APEX FLOW OS — édition Google Sheets | https://bambie-237-iq.vercel.app/apex/sheets/ | `apex/sheets/` |
| **FLUENT 90** | https://bambie-237-iq.vercel.app/fluent/ | `fluent/` |
| Streamify Réseau | https://bambie-237-iq.vercel.app/reseau | `reseau/` |

## Handy Tracker

Application personnelle, installable sur téléphone (PWA, et APK Android) :

- **Habitudes** : vues jour / semaine / mois, humeur, statistiques et graphiques.
- **Corps** : poids, mensurations, journal alimentaire.
- **Journal** : tâches du jour.
- **Finances** : transactions, soldes des comptes, tableau de bord global, chiffre d'affaires.
- **Abonnements** (revente de services de streaming) : clients, échéances, rappels personnalisés
  par service (`{nom}`, `{jours}`, `{service}`, `{thème}`…), simulation de prix, meilleurs clients, export.
- **Notes** : carnets, étiquettes, épingles, couleurs, texte riche, listes à cocher, images,
  dictée vocale, corbeille, recherche, modèles.
- **Calendrier** (carte de chaleur) et **notifications** push, même app fermée.

Données : copie locale dans le navigateur (`localStorage`) et synchronisation en temps réel avec
**Firebase Realtime Database**, après connexion avec un compte Google.

## APEX FLOW OS

Système de productivité gamifié, vendu en deux éditions :
- une **application web** installable (`apex/app/`) ;
- une édition **Google Sheets** : la page `apex/sheets/` fournit un script Apps Script qui construit
  le fichier directement dans le Google Drive de l'acheteur (il n'y a donc pas de lien à partager).

`apex/theme.css` et `apex/theme.js` portent les couleurs claires / sombres communes aux trois pages.

## FLUENT 90

Programme de 90 jours pour parler anglais : contenus (`fluent/data.js`), moteur (`core.js`, `brain.js`),
écrans (`ui.js`), traducteur FR ↔ EN à 4 niveaux avec choix de la vitesse de lecture, exercices sur mesure
créés par le coach, tableaux de conjugaison et révisions espacées. La progression est enregistrée dans
Firebase (`fluent90/{uid}`).

Rappels : `api/fluent-remind.js`, appelé 6 fois par jour par `.github/workflows/fluent-reminders.yml`.

## Organisation des fichiers

| Chemin | Rôle |
|---|---|
| `index.html`, `css/`, `js/`, `icons/`, `manifest.webmanifest`, `sw.js` | Handy Tracker (un module par section : `habits.js`, `finance.js`, `subscriptions.js`, `notes.js`, `calendar.js`…) |
| `apex/` | APEX FLOW OS |
| `fluent/` | FLUENT 90 |
| `reseau/` | Streamify Réseau : tableau des adresses e-mail et de leurs comptes par réseau social, avec un carnet de notes (Firebase, nœud `reseau/`) |
| `charlito/`, `lena/`, `paul/` | Copies de démonstration de l'app d'abonnements pour des prospects (créées avec `make-instance.js` du dépôt **streams-light**) |
| `api/` | Fonctions serveur Vercel : `cron.js` (rappels d'abonnements chaque jour à 8 h, heure du Cameroun), `fluent-remind.js` (rappels FLUENT), `bot.js` (bot Telegram « Handy Finance ») |
| `firebase/` | Règles de sécurité de la base Firebase |
| `.well-known/assetlinks.json` | Lien de confiance entre le site et l'APK Android |
| `.github/workflows/` | Rappels FLUENT automatiques (GitHub Actions) |
| `research_notes/` | Notes de recherche pour FLUENT 90 |
| `streamify-reseau.html` | Version autonome de la page Streamify Réseau, sauvegardée ici mais **pas publiée** sur le site |
| `index_classic.html` | Ancienne version de Handy Tracker en un seul fichier |
| `CLAUDE_CONTEXT.md` | Contexte technique pour reprendre le projet avec une IA |

## Mise en ligne

Chaque envoi sur la branche `main` (et `refactor/modules`) déclenche le déploiement automatique sur
**Vercel**. `vercel.json` programme le rappel quotidien (`/api/cron`). Les fichiers listés dans
`.vercelignore` (dont ce README) restent dans le dépôt mais ne sont pas publiés sur le site.

## Volontairement absent de ce dépôt

- `apk/` : les APK Android **et leurs clés de signature** (Handy Tracker, Screamify, Screamify Admin).
  Elles restent sur le PC ; garde-en une copie dans un endroit sûr (Coffre-fort OneDrive, clé USB) :
  sans ces clés, impossible de publier une mise à jour des APK.
- `VAPID-CLE-PRIVEE.txt` : clé privée des notifications (elle est enregistrée dans les variables
  d'environnement de Vercel).
- `_archive/` et `.claude/` : anciens essais et réglages locaux.
- `moncampus-android/` : projet à part, dans son propre dépôt **moncampus-android**.

## Technologies

HTML, CSS et JavaScript sans framework · Chart.js · Firebase Realtime Database et connexion Google ·
Vercel (hébergement, fonctions serveur, cron) · notifications web-push (VAPID) · GitHub Actions.
