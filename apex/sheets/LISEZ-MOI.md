# APEX FLOW OS — version Google Sheets

Le fichier `APEX-FLOW-OS.gs` construit tout seul la version tableur du système,
avec la même charte que la boutique et l'application, en **thème sombre** (fond
obsidienne `#07090E`, émeraude `#10B981`, ambre `#F59E0B`) ou en **thème clair**
(fond `#FFFFFF`, émeraude `#047857`, ambre `#B45309`).

> La procédure complète, avec le script à copier en un clic, est aussi en ligne :
> **<https://bambie-237-iq.vercel.app/apex/sheets/>**

## Installation (5 minutes, aucune compétence technique)

1. Ouvre [sheets.new](https://sheets.new) pour créer une feuille vierge.
2. Menu **Extensions ▸ Apps Script**.
3. Efface le `function myFunction() {}` qui s'y trouve, colle **tout** le contenu
   de `APEX-FLOW-OS.gs`, puis clique sur l'icône **Enregistrer**.
4. Reviens sur la feuille et **recharge la page** (F5).
5. Un nouveau menu **⚡ APEX FLOW** apparaît à droite de « Aide ».
6. Clique sur **Installer le système complet**. Google demande une autorisation
   la première fois : *Autoriser* ▸ choisis ton compte ▸ *Paramètres avancés* ▸
   *Accéder à (projet sans titre)* ▸ *Autoriser*. C'est ton propre script, sur
   ton propre fichier.

## Le menu ⚡ APEX FLOW

| Entrée | Ce qu'elle fait |
|---|---|
| **Installer le système complet** | Crée les onglets `QG`, `Habitudes` et `Tâches`. |
| **Générer les 6 modules ici** | Ajoute les 6 onglets de modules dans le même fichier. |
| **Exporter les 6 modules en fichiers séparés** | Crée 6 fichiers Google Sheets indépendants dans ton Drive — c'est ce qui permet de les vendre à l'unité. Le script affiche les 6 liens à la fin. |
| **Apparence ▸ Thème sombre / Thème clair** | Repeint tout le fichier. Les habitudes, les cases cochées et les tâches sont mises de côté puis remises en place : rien n'est perdu. Le choix est mémorisé et réutilisé par les générations suivantes. |
| **Remettre le mois à zéro** | Décoche toutes les cases d'`Habitudes` sans toucher aux noms, aux piliers ni à l'XP. |

## Ce qui est automatique

- **Cases à cocher** sur tous les jours du mois en cours (28, 29, 30 ou 31 selon le mois).
- **`COUNTIF`** compte les jours validés par habitude ; **`AVERAGEIF`** calcule le score de chaque pilier.
- **`SPARKLINE`** dessine les barres de régularité (émeraude) et les jauges de progression (ambre, indigo).
- **Niveau et rang** : le QG résout `7,5·L² + 2,5·L − 10 ≤ XP` pour trouver le niveau,
  puis `IFS` donne le rang, de *Novice* à *Légende* (50 niveaux, 18 865 XP).
- **Série de jours consécutifs** : une ligne masquée (42) tient le compteur jour après jour.
- **Journée parfaite** : la ligne 4 affiche `P` quand toutes les habitudes du jour sont cochées.
- **Thème** : une seule palette pilote tout (`PALETTES.sombre` et `PALETTES.clair` en
  haut du fichier). Changer de thème passe par le menu, jamais par une modification du code.

## Bon à savoir

- Les formules sont écrites en anglais — Apps Script l'impose. Google Sheets les
  affiche automatiquement en français : `COUNTIF` devient `NB.SI`, `SUMIF` devient
  `SOMME.SI`, `AVERAGEIF` devient `MOYENNE.SI`.
- Les polices *Space Grotesk* et *Roboto Mono* s'installent toutes seules si ton
  compte y a accès ; sinon Sheets retombe sur Roboto, la mise en page ne bouge pas.
- Relancer **Installer le système complet** reconstruit les onglets à neuf :
  fais une copie du fichier avant si tu as déjà des données dedans.
- La version application (habitudes, tâches, XP, Radar de Vie, Deep Work et les
  6 modules) vit à part dans `apex/app/` et n'a besoin d'aucun tableur.
