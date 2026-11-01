/**
 * =====================================================================
 *  APEX FLOW OS — Générateur Google Sheets
 *  ---------------------------------------------------------------
 *  Colle ce fichier dans Extensions ▸ Apps Script d'une feuille vierge,
 *  enregistre, recharge la feuille : un menu « APEX FLOW » apparaît.
 *
 *  Menu :
 *    • Installer le système complet  → QG + Habitudes + Tâches dans CE fichier
 *    • Générer les 6 modules ici     → 6 onglets supplémentaires
 *    • Exporter les modules séparés  → 6 fichiers Drive indépendants (vente à l'unité)
 *    • Thème sombre / Thème clair    → repeint tout le fichier, tes données restent
 *    • Remettre le mois à zéro       → vide les cases à cocher du mois
 *
 *  Deux thèmes :
 *    • Sombre « Obsidienne »  #07090E / Émeraude #10B981 / Ambre #F59E0B
 *    • Clair  « Papier »      #FFFFFF / Émeraude #047857 / Ambre #B45309
 *  Le thème choisi est mémorisé dans le fichier et réutilisé à chaque génération.
 *  Les formules sont écrites en anglais (obligatoire dans Apps Script) ;
 *  Sheets les affiche en français : COUNTIF → NB.SI, SUMIF → SOMME.SI, etc.
 * =====================================================================
 */

/* ------------------------------ THÈMES ------------------------------ */
var CLE_THEME = 'APEX_THEME';

var PALETTES = {
  // ---- Sombre « Obsidienne » ----
  sombre: {
    nom:     'sombre',
    bg:      '#07090E',   // fond obsidienne
    surf:    '#111622',   // carte
    surf2:   '#1A2130',   // ligne / séparateur
    ink:     '#F8FAFC',   // texte principal
    muted:   '#94A3B8',   // texte secondaire
    dim:     '#64748B',
    em:      '#10B981',   // émeraude — action / validation
    emDeep:  '#065F46',
    am:      '#F59E0B',   // ambre — XP, gamification
    indigo:  '#6366F1',   // indigo — statistiques
    rose:    '#F43F5E',
    todayBg: '#15110A'    // colonne du jour en cours
  },
  // ---- Clair « Papier » ----
  clair: {
    nom:     'clair',
    bg:      '#FFFFFF',
    surf:    '#F4F7FB',
    surf2:   '#DFE6EF',
    ink:     '#0B1220',
    muted:   '#51607A',
    dim:     '#7A8699',
    em:      '#047857',
    emDeep:  '#065F46',
    am:      '#B45309',
    indigo:  '#4F46E5',
    rose:    '#BE123C',
    todayBg: '#FEF3C7'
  }
};

/** Nom du thème mémorisé dans le fichier (sombre par défaut). */
function themeNom_() {
  try {
    var p = PropertiesService.getDocumentProperties().getProperty(CLE_THEME);
    return p === 'clair' ? 'clair' : 'sombre';
  } catch (e) {
    return 'sombre';   // onOpen tourne en autorisation limitée : pas d'accès aux propriétés
  }
}

// palette active — relue à chaque exécution du script
var T = PALETTES[themeNom_()];

var FONT_TITLE = 'Space Grotesk';   // bascule sur Roboto si la police n'est pas dispo
var FONT_BODY  = 'Roboto';
var FONT_NUM   = 'Roboto Mono';

var PILIERS = ['Santé', 'Finances', 'Business', 'Créativité', 'Mental', 'Discipline'];

var MODULES = [
  { id: 'cashflow', nom: 'Cashflow & Crypto',        onglet: 'M1 · Cashflow' },
  { id: 'epargne',  nom: 'Défi Épargne 52 Semaines', onglet: 'M2 · Épargne 52' },
  { id: 'athlete',  nom: 'Athlète · Masse & Sèche',  onglet: 'M3 · Athlète' },
  { id: 'hustle',   nom: 'Architecte de Side-Hustle', onglet: 'M4 · Side-Hustle' },
  { id: 'viral',    nom: 'Créateur Viral',            onglet: 'M5 · Créateur Viral' },
  { id: 'cerveau',  nom: 'Second Cerveau',            onglet: 'M6 · Second Cerveau' }
];

/* ------------------------------ MENU ------------------------------ */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚡ APEX FLOW')
    .addItem('Installer le système complet', 'installerSystemeComplet')
    .addItem('Générer les 6 modules ici', 'genererTousLesModulesIci')
    .addSeparator()
    .addItem('Exporter les 6 modules en fichiers séparés', 'exporterModulesSepares')
    .addSeparator()
    .addSubMenu(SpreadsheetApp.getUi().createMenu('Apparence')
      .addItem('Thème sombre · Obsidienne', 'themeSombre')
      .addItem('Thème clair · Papier', 'themeClair'))
    .addSeparator()
    .addItem('Remettre le mois à zéro', 'reinitialiserMois')
    .addToUi();
}

/* =====================================================================
   1. INSTALLATION DU SYSTÈME COMPLET
   ===================================================================== */
function installerSystemeComplet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.rename('APEX FLOW OS — ' + anneeMois_());

  construireQG_(ss);
  construireHabitudes_(ss);
  construireTaches_(ss);

  // on enlève la feuille vide par défaut si elle traîne
  ['Feuille 1', 'Sheet1', 'Feuille1'].forEach(function (n) {
    var s = ss.getSheetByName(n);
    if (s && ss.getSheets().length > 1) { ss.deleteSheet(s); }
  });

  ss.setActiveSheet(ss.getSheetByName('QG'));
  alerte_('Système installé',
    'Trois onglets sont prêts : QG, Habitudes et Tâches.\n\n' +
    'Coche une case dans Habitudes : l\'XP, le niveau et les barres du QG se mettent à jour tout seuls.');
}

/* ------------------------------ QG ------------------------------ */
function construireQG_(ss) {
  var sh = feuille_(ss, 'QG', 0);
  sh.setTabColor(T.em);
  habiller_(sh, 30, 10);

  sh.setColumnWidth(1, 28);
  sh.setColumnWidths(2, 6, 150);
  sh.setColumnWidth(8, 28);

  titre_(sh, 'B2:G2', 'APEX FLOW OS', 26);
  sousTitre_(sh, 'B3:G3', 'Le système d\'exploitation de ta discipline · ' + anneeMois_());

  /* ---- bandeau niveau / XP ---- */
  carte_(sh, 'B5:G8');
  etiquette_(sh, 'B5', 'XP TOTAL');
  sh.getRange('B6').setFormula("=IFERROR(Habitudes!AJ2,0)+IFERROR('Tâches'!H2,0)");
  grosChiffre_(sh, 'B6', T.em);

  etiquette_(sh, 'C5', 'NIVEAU');
  // niveau = plus grand L tel que 7,5L² + 2,5L − 10 ≤ XP   (coût croissant, 50 niveaux)
  sh.getRange('C6').setFormula('=MIN(50, INT((-2.5 + SQRT(6.25 + 30*(B6+10)))/15))');
  grosChiffre_(sh, 'C6', T.am);

  etiquette_(sh, 'D5', 'RANG');
  sh.getRange('D6').setFormula(
    '=IFS(C6>=50,"Légende",C6>=47,"Oracle",C6>=41,"Titan",C6>=34,"Virtuose",C6>=27,"Maître",' +
    'C6>=21,"Architecte",C6>=15,"Stratège",C6>=10,"Exécutant",C6>=5,"Apprenti",TRUE,"Novice")');
  sh.getRange('D6').setFontFamily(FONT_TITLE).setFontSize(18).setFontWeight('bold').setFontColor(T.ink);

  etiquette_(sh, 'E5', 'SÉRIE EN COURS');
  sh.getRange('E6').setFormula('=IFERROR(Habitudes!AL2,0)');
  grosChiffre_(sh, 'E6', T.em);

  etiquette_(sh, 'F5', 'JOURS PARFAITS');
  sh.getRange('F6').setFormula('=IFERROR(Habitudes!AM2,0)');
  grosChiffre_(sh, 'F6', T.indigo);

  etiquette_(sh, 'G5', 'TAUX DU MOIS');
  sh.getRange('G6').setFormula('=IFERROR(Habitudes!AK2,0)');
  sh.getRange('G6').setNumberFormat('0%');
  grosChiffre_(sh, 'G6', T.am);

  /* barre de progression vers le niveau suivant */
  etiquette_(sh, 'B8', 'PROGRESSION VERS LE NIVEAU SUIVANT');
  sh.getRange('C8:G8').merge();
  sh.getRange('C8').setFormula(
    '=SPARKLINE((B6-(7.5*C6^2+2.5*C6-10))/MAX(1,(7.5*(C6+1)^2+2.5*(C6+1)-10)-(7.5*C6^2+2.5*C6-10)),' +
    '{"charttype","bar";"max",1;"color1","' + T.am + '";"empty","zero"})');

  /* ---- radar de vie (barres par pilier) ---- */
  carte_(sh, 'B10:G18');
  titre_(sh, 'B10:G10', 'RADAR D\'ÉQUILIBRE DE VIE', 13);

  sh.getRange('B11:G11').setValues([['Pilier', 'Habitudes du pilier', 'Score /100', 'Jauge', 'Tâches finies', '']]);
  enTete_(sh, 'B11:G11');

  for (var i = 0; i < PILIERS.length; i++) {
    var r = 12 + i;
    sh.getRange(r, 2).setValue(PILIERS[i]);
    // nombre d'habitudes rattachées au pilier
    sh.getRange(r, 3).setFormula('=COUNTIF(Habitudes!$C$6:$C$40,$B' + r + ')');
    // score = taux de réussite moyen des habitudes du pilier, sur 100
    sh.getRange(r, 4).setFormula(
      '=IFERROR(ROUND(AVERAGEIF(Habitudes!$C$6:$C$40,$B' + r + ',Habitudes!$AK$6:$AK$40)*100,0),0)');
    sh.getRange(r, 5).setFormula(
      '=SPARKLINE($D' + r + ',{"charttype","bar";"max",100;"color1","' + T.em + '";"empty","zero"})');
    sh.getRange(r, 6).setFormula("=COUNTIFS('Tâches'!$D$6:$D$200,$B" + r + ",'Tâches'!$B$6:$B$200,TRUE)");
  }
  sh.getRange('B12:B17').setFontColor(T.ink).setFontWeight('bold');
  sh.getRange('C12:C17').setFontFamily(FONT_NUM).setFontColor(T.muted).setHorizontalAlignment('center');
  sh.getRange('D12:D17').setFontFamily(FONT_NUM).setFontColor(T.em).setFontWeight('bold').setHorizontalAlignment('center');
  sh.getRange('F12:F17').setFontFamily(FONT_NUM).setFontColor(T.indigo).setHorizontalAlignment('center');

  etiquette_(sh, 'B19', 'ÉQUILIBRE GLOBAL');
  sh.getRange('C19').setFormula('=ROUND(AVERAGE(D12:D17),0)');
  grosChiffre_(sh, 'C19', T.indigo);
  sh.getRange('D19:G19').merge();
  sh.getRange('D19').setFormula(
    '=SPARKLINE(C19,{"charttype","bar";"max",100;"color1","' + T.indigo + '";"empty","zero"})');

  /* ---- rappel du barème ---- */
  carte_(sh, 'B21:G26');
  titre_(sh, 'B21:G21', 'COMMENT L\'XP EST CALCULÉ', 13);
  var bareme = [
    ['Habitude cochée', '+ l\'XP défini sur la ligne (10 par défaut)'],
    ['Tâche terminée', '+12 XP · +18 XP si la priorité est Haute'],
    ['Journée parfaite', '+25 XP quand toutes les habitudes du jour sont cochées'],
    ['Niveau maximum', '50 — Légende, à 18 865 XP'],
    ['Série', 'jours consécutifs avec au moins une habitude cochée']
  ];
  sh.getRange(22, 2, bareme.length, 1).setValues(bareme.map(function (r) { return [r[0]]; }));
  sh.getRange(22, 3, bareme.length, 1).setValues(bareme.map(function (r) { return [r[1]]; }));
  sh.getRange(22, 3, bareme.length, 5).mergeAcross();
  sh.getRange(22, 2, bareme.length, 1).setFontColor(T.ink).setFontWeight('bold').setFontSize(10);
  sh.getRange(22, 3, bareme.length, 1).setFontColor(T.muted).setFontSize(10);

  sh.setFrozenRows(3);
}

/* --------------------------- HABITUDES --------------------------- */
function construireHabitudes_(ss) {
  var sh = feuille_(ss, 'Habitudes', 1);
  sh.setTabColor(T.em);
  habiller_(sh, 45, 40);

  var nbJours = joursDuMois_();

  sh.setColumnWidth(1, 28);
  sh.setColumnWidth(2, 230);   // B : nom
  sh.setColumnWidth(3, 120);   // C : pilier
  sh.setColumnWidth(4, 60);    // D : XP
  for (var c = 5; c < 5 + nbJours; c++) sh.setColumnWidth(c, 28);   // E..  jours
  sh.setColumnWidth(36, 70);   // AJ : total
  sh.setColumnWidth(37, 70);   // AK : taux
  sh.setColumnWidth(38, 150);  // AL : sparkline

  titre_(sh, 'B2:D2', 'HABITUDES', 22);
  sousTitre_(sh, 'B3:H3', 'Une case par jour. Coche, l\'XP tombe.');

  /* compteurs globaux, lus par le QG (ligne 2, colonnes techniques) */
  sh.getRange('AJ2').setFormula('=SUMPRODUCT($D$6:$D$40, $AJ$6:$AJ$40)');   // XP des habitudes
  sh.getRange('AK2').setFormula('=IFERROR(AVERAGE($AK$6:$AK$40),0)');        // taux moyen du mois
  var finCol = colonne_(4 + nbJours);
  sh.getRange('AL2').setFormula(                                            // série de jours consécutifs
    '=IFERROR(IF(INDEX($E$42:$' + finCol + '$42,1,DAY(TODAY()))>0,INDEX($E$42:$' + finCol + '$42,1,DAY(TODAY())),' +
    'IF(DAY(TODAY())>1,INDEX($E$42:$' + finCol + '$42,1,DAY(TODAY())-1),0)),0)');
  sh.getRange('AM2').setFormula('=COUNTIF($E$4:$AI$4,"P")');                 // journées parfaites
  sh.getRange('AJ2:AM2').setFontColor(T.bg);   // valeurs techniques, invisibles sur le fond

  /* en-têtes — Total / Taux / Régularité restent en AJ, AK, AL quel que soit le mois */
  sh.getRange(5, 2, 1, 3).setValues([['Habitude', 'Pilier', 'XP']]);
  var jours = [];
  for (var j = 1; j <= nbJours; j++) jours.push(j);
  sh.getRange(5, 5, 1, nbJours).setValues([jours]);
  sh.getRange(5, 36, 1, 3).setValues([['Total', 'Taux', 'Régularité du mois']]);
  enTete_(sh, sh.getRange(5, 2, 1, 37));
  sh.getRange(5, 5, 1, nbJours).setHorizontalAlignment('center').setFontSize(8);

  /* ligne 4 : synthèse par jour (P = journée parfaite) */
  sh.getRange('B4').setValue('Journée').setFontColor(T.dim).setFontSize(9).setFontWeight('bold');
  for (var d = 1; d <= nbJours; d++) {
    var col = 4 + d;
    var lettre = colonne_(col);
    sh.getRange(4, col).setFormula(
      '=IF(COUNTA($B$6:$B$40)=0,"",IF(COUNTIF(' + lettre + '$6:' + lettre + '$40,TRUE)=COUNTA($B$6:$B$40),"P",' +
      'IF(COUNTIF(' + lettre + '$6:' + lettre + '$40,TRUE)>0,"·","")))');
  }
  sh.getRange(4, 5, 1, nbJours)
    .setHorizontalAlignment('center').setFontFamily(FONT_NUM).setFontSize(8).setFontColor(T.am);

  /* ligne 42, masquée : série courante jour après jour */
  for (var k = 1; k <= nbJours; k++) {
    var cc = colonne_(4 + k);
    sh.getRange(42, 4 + k).setFormula(
      k === 1 ? '=IF(' + cc + '$4="",0,1)'
              : '=IF(' + cc + '$4="",0,' + colonne_(3 + k) + '42+1)');
  }
  sh.hideRows(42);

  /* 35 lignes d'habitudes, dont 5 pré-remplies */
  var exemples = [
    ['Sport · 30 min', 'Santé', 10],
    ['Deep Work · 90 min', 'Discipline', 20],
    ['Lecture · 20 pages', 'Mental', 15],
    ['Pas de dépense inutile', 'Finances', 10],
    ['1 contenu créé', 'Créativité', 15]
  ];
  sh.getRange(6, 2, exemples.length, 3).setValues(exemples);

  for (var r = 6; r <= 40; r++) {
    var L = 'E' + r, R = colonne_(4 + nbJours) + r;
    sh.getRange(r, 36).setFormula('=COUNTIF(' + L + ':' + R + ',TRUE)');                 // total coché
    sh.getRange(r, 37).setFormula('=IF($B' + r + '="","",IFERROR(AJ' + r + '/' + nbJours + ',0))');
    sh.getRange(r, 38).setFormula(
      '=IF($B' + r + '="","",SPARKLINE(' + L + ':' + R + ',' +
      '{"charttype","column";"color","' + T.em + '";"empty","zero";"max",1}))');
  }

  /* cases à cocher sur toute la grille */
  sh.getRange(6, 5, 35, nbJours).insertCheckboxes();
  sh.getRange(6, 5, 35, nbJours).setHorizontalAlignment('center');

  /* listes déroulantes de piliers */
  var vp = SpreadsheetApp.newDataValidation().requireValueInList(PILIERS, true).setAllowInvalid(false).build();
  sh.getRange(6, 3, 35, 1).setDataValidation(vp);

  /* mise en forme */
  sh.getRange(6, 2, 35, 1).setFontColor(T.ink).setFontWeight('bold');
  sh.getRange(6, 3, 35, 1).setFontColor(T.muted).setFontSize(10);
  sh.getRange(6, 4, 35, 1).setFontFamily(FONT_NUM).setFontColor(T.am).setHorizontalAlignment('center');
  sh.getRange(6, 36, 35, 1).setFontFamily(FONT_NUM).setFontColor(T.em).setHorizontalAlignment('center').setFontWeight('bold');
  sh.getRange(6, 37, 35, 1).setFontFamily(FONT_NUM).setFontColor(T.muted).setHorizontalAlignment('center').setNumberFormat('0%');

  /* le jour en cours est souligné en ambre */
  var jour = new Date().getDate();
  if (jour <= nbJours) {
    sh.getRange(5, 4 + jour, 36, 1).setBackground(T.todayBg);
    sh.getRange(5, 4 + jour).setFontColor(T.am).setFontWeight('bold');
  }

  /* un taux ≥ 80 % passe la ligne en vert, < 40 % en rouge */
  var zone = sh.getRange(6, 37, 35, 1);
  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(0.8).setFontColor(T.em).setRanges([zone]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(0.4).setFontColor(T.rose).setRanges([zone]).build()
  ]);

  sh.setFrozenRows(5);
  sh.setFrozenColumns(4);
}

/* ----------------------------- TÂCHES ----------------------------- */
function construireTaches_(ss) {
  var sh = feuille_(ss, 'Tâches', 2);
  sh.setTabColor(T.indigo);
  habiller_(sh, 210, 10);

  sh.setColumnWidth(1, 28);
  sh.setColumnWidth(2, 60);    // B : fait
  sh.setColumnWidth(3, 340);   // C : tâche
  sh.setColumnWidth(4, 130);   // D : pilier
  sh.setColumnWidth(5, 110);   // E : priorité
  sh.setColumnWidth(6, 120);   // F : échéance
  sh.setColumnWidth(7, 80);    // G : XP
  sh.setColumnWidth(8, 120);   // H : synthèse

  titre_(sh, 'B2:E2', 'TÂCHES', 22);
  sousTitre_(sh, 'B3:H3', 'Priorité Haute = +18 XP. Normale ou Basse = +12 XP.');

  sh.getRange('H2').setFormula('=SUMPRODUCT(($B$6:$B$200=TRUE)*$G$6:$G$200)');
  sh.getRange('H2').setFontColor(T.bg);   // XP des tâches, lu par le QG

  sh.getRange('B5:H5').setValues([['Fait', 'Tâche', 'Pilier', 'Priorité', 'Échéance', 'XP', 'État']]);
  enTete_(sh, 'B5:H5');

  var exemples = [
    ['Définir mes 3 objectifs du mois', 'Business', 'Haute'],
    ['Préparer 5 idées de contenu', 'Créativité', 'Normale'],
    ['Ranger l\'espace de travail', 'Discipline', 'Basse']
  ];
  sh.getRange(6, 3, exemples.length, 3).setValues(exemples);

  sh.getRange(6, 2, 195, 1).insertCheckboxes();
  sh.getRange(6, 2, 195, 1).setHorizontalAlignment('center');

  var vp = SpreadsheetApp.newDataValidation().requireValueInList(PILIERS, true).setAllowInvalid(false).build();
  sh.getRange(6, 4, 195, 1).setDataValidation(vp);
  var vpr = SpreadsheetApp.newDataValidation().requireValueInList(['Haute', 'Normale', 'Basse'], true).setAllowInvalid(false).build();
  sh.getRange(6, 5, 195, 1).setDataValidation(vpr);

  for (var r = 6; r <= 200; r++) {
    sh.getRange(r, 7).setFormula('=IF($C' + r + '="","",IF($E' + r + '="Haute",18,12))');
    sh.getRange(r, 8).setFormula(
      '=IF($C' + r + '="","",IF($B' + r + '=TRUE,"✓ terminée",' +
      'IF(AND($F' + r + '<>"",$F' + r + '<TODAY()),"⚠ en retard","à faire")))');
  }

  sh.getRange(6, 3, 195, 1).setFontColor(T.ink).setFontWeight('bold');
  sh.getRange(6, 4, 195, 2).setFontColor(T.muted).setFontSize(10);
  sh.getRange(6, 6, 195, 1).setNumberFormat('dd/mm/yyyy').setFontFamily(FONT_NUM).setFontColor(T.muted).setHorizontalAlignment('center');
  sh.getRange(6, 7, 195, 1).setFontFamily(FONT_NUM).setFontColor(T.am).setHorizontalAlignment('center');
  sh.getRange(6, 8, 195, 1).setFontSize(10).setHorizontalAlignment('center');

  sh.setConditionalFormatRules([
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('terminée').setFontColor(T.em).setRanges([sh.getRange(6, 8, 195, 1)]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenTextContains('retard').setFontColor(T.rose).setRanges([sh.getRange(6, 8, 195, 1)]).build()
  ]);

  sh.setFrozenRows(5);
}

/* =====================================================================
   2. LES 6 MODULES
   ===================================================================== */
function genererTousLesModulesIci() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  MODULES.forEach(function (m, i) { construireModule_(ss, m, 3 + i); });
  alerte_('Modules générés', 'Les 6 onglets de modules sont dans ce fichier.');
}

function construireModule_(ss, m, position) {
  var sh = feuille_(ss, m.onglet, position);
  sh.setTabColor(T.am);
  habiller_(sh, 520, 14);
  sh.setColumnWidth(1, 28);

  titre_(sh, 'B2:F2', m.nom.toUpperCase(), 20);

  switch (m.id) {
    case 'cashflow': modCashflow_(sh); break;
    case 'epargne':  modEpargne_(sh);  break;
    case 'athlete':  modAthlete_(sh);  break;
    case 'hustle':   modHustle_(sh);   break;
    case 'viral':    modViral_(sh);    break;
    case 'cerveau':  modCerveau_(sh);  break;
  }
  sh.setFrozenRows(7);
  return sh;
}

/* ---- M1 · Cashflow & Crypto ---- */
function modCashflow_(sh) {
  sousTitre_(sh, 'B3:H3', 'Chaque mouvement nourrit ton pilier Finances.');
  sh.setColumnWidth(2, 110); sh.setColumnWidth(3, 280); sh.setColumnWidth(4, 110);
  sh.setColumnWidth(5, 140); sh.setColumnWidth(6, 130); sh.setColumnWidth(7, 40);
  sh.setColumnWidth(8, 150); sh.setColumnWidth(9, 130);

  carte_(sh, 'B5:F6');
  etiquette_(sh, 'B5', 'ENTRÉES');   sh.getRange('B6').setFormula('=SUMIF($D$8:$D$500,"Entrée",$F$8:$F$500)');
  etiquette_(sh, 'C5', 'SORTIES');   sh.getRange('C6').setFormula('=SUMIF($D$8:$D$500,"Sortie",$F$8:$F$500)');
  etiquette_(sh, 'D5', 'SOLDE NET'); sh.getRange('D6').setFormula('=B6-C6');
  etiquette_(sh, 'E5', 'CRYPTO');    sh.getRange('E6').setFormula('=SUMPRODUCT($J$8:$J$40,$L$8:$L$40)');
  etiquette_(sh, 'F5', 'P/L CRYPTO');sh.getRange('F6').setFormula('=SUMPRODUCT($J$8:$J$40,($L$8:$L$40-$K$8:$K$40))');
  grosChiffre_(sh, 'B6', T.em); grosChiffre_(sh, 'C6', T.rose);
  grosChiffre_(sh, 'D6', T.ink); grosChiffre_(sh, 'E6', T.indigo); grosChiffre_(sh, 'F6', T.am);

  sh.getRange('B7:F7').setValues([['Date', 'Libellé', 'Type', 'Catégorie', 'Montant']]);
  enTete_(sh, 'B7:F7');
  var v = SpreadsheetApp.newDataValidation().requireValueInList(['Entrée', 'Sortie'], true).build();
  sh.getRange(8, 4, 493, 1).setDataValidation(v);
  sh.getRange(8, 2, 493, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(8, 6, 493, 1).setNumberFormat('#,##0');
  corpsTableau_(sh, 8, 2, 493, 5);

  sh.getRange('H7:L7').setValues([['Actif', 'Quantité', 'PRU', 'Prix actuel', 'Valeur']]);
  enTete_(sh, 'H7:L7');
  for (var r = 8; r <= 40; r++) sh.getRange(r, 12).setFormula('=IF($I' + r + '="","",$J' + r + '*$L' + r + ')');
  corpsTableau_(sh, 8, 8, 33, 5);
}

/* ---- M2 · Défi Épargne 52 semaines ---- */
function modEpargne_(sh) {
  sousTitre_(sh, 'B3:G3', 'Une case par semaine. La courbe fait le reste.');
  sh.setColumnWidth(2, 90); sh.setColumnWidth(3, 130); sh.setColumnWidth(4, 70);
  sh.setColumnWidth(5, 140); sh.setColumnWidth(6, 180);

  carte_(sh, 'B5:F6');
  etiquette_(sh, 'B5', 'MONTANT DE BASE');  sh.getRange('B6').setValue(500);
  etiquette_(sh, 'C5', 'OBJECTIF ANNUEL');  sh.getRange('C6').setFormula('=SUM($C$8:$C$59)');
  etiquette_(sh, 'D5', 'DÉJÀ ÉPARGNÉ');     sh.getRange('D6').setFormula('=SUMIF($D$8:$D$59,TRUE,$C$8:$C$59)');
  etiquette_(sh, 'E5', 'SEMAINES FAITES');  sh.getRange('E6').setFormula('=COUNTIF($D$8:$D$59,TRUE)&" / 52"');
  etiquette_(sh, 'F5', 'AVANCEMENT');
  sh.getRange('F6').setFormula('=SPARKLINE(D6/MAX(1,C6),{"charttype","bar";"max",1;"color1","' + T.em + '"})');
  grosChiffre_(sh, 'B6', T.muted); grosChiffre_(sh, 'C6', T.ink);
  grosChiffre_(sh, 'D6', T.em);
  sh.getRange('E6').setFontFamily(FONT_NUM).setFontSize(16).setFontColor(T.am).setFontWeight('bold');

  sh.getRange('B7:F7').setValues([['Semaine', 'À épargner', 'Fait', 'Cumulé', 'Progression']]);
  enTete_(sh, 'B7:F7');

  for (var i = 0; i < 52; i++) {
    var r = 8 + i, n = i + 1;
    sh.getRange(r, 2).setValue(n);
    sh.getRange(r, 3).setFormula('=ROUND($B$6*(0.4+(' + n + '-1)*0.0245),0)');
    sh.getRange(r, 5).setFormula('=SUMIF($D$8:$D' + r + ',TRUE,$C$8:$C' + r + ')');
    sh.getRange(r, 6).setFormula('=SPARKLINE($E' + r + '/MAX(1,$C$6),{"charttype","bar";"max",1;"color1","' + T.am + '"})');
  }
  sh.getRange(8, 4, 52, 1).insertCheckboxes().setHorizontalAlignment('center');
  sh.getRange(8, 2, 52, 1).setFontFamily(FONT_NUM).setFontColor(T.muted).setHorizontalAlignment('center');
  sh.getRange(8, 3, 52, 2).setFontFamily(FONT_NUM).setNumberFormat('#,##0').setFontColor(T.ink).setHorizontalAlignment('center');
  sh.getRange(8, 5, 52, 1).setFontColor(T.em);
}

/* ---- M3 · Athlète ---- */
function modAthlete_(sh) {
  sousTitre_(sh, 'B3:H3', 'Poids, séances et cibles. Ce qui se mesure se transforme.');
  sh.setColumnWidth(2, 120); sh.setColumnWidth(3, 100); sh.setColumnWidth(4, 40);
  sh.setColumnWidth(5, 120); sh.setColumnWidth(6, 220); sh.setColumnWidth(7, 120);

  carte_(sh, 'B5:G6');
  etiquette_(sh, 'B5', 'POIDS ACTUEL');  sh.getRange('B6').setFormula('=IFERROR(LOOKUP(2,1/($C$8:$C$300<>""),$C$8:$C$300),0)');
  etiquette_(sh, 'C5', 'POIDS CIBLE');   sh.getRange('C6').setValue(0);
  etiquette_(sh, 'D5', 'ÉCART');         sh.getRange('D6').setFormula('=IF(C6=0,"",ROUND(C6-B6,1))');
  etiquette_(sh, 'E5', 'SÉANCES');       sh.getRange('E6').setFormula('=COUNTA($F$8:$F$300)');
  etiquette_(sh, 'F5', 'VOLUME TOTAL');  sh.getRange('F6').setFormula('=SUM($G$8:$G$300)');
  etiquette_(sh, 'G5', 'COURBE DU POIDS');
  sh.getRange('G6').setFormula('=SPARKLINE($C$8:$C$300,{"charttype","line";"color","' + T.em + '";"linewidth",2})');
  grosChiffre_(sh, 'B6', T.em); grosChiffre_(sh, 'C6', T.am);
  grosChiffre_(sh, 'D6', T.indigo); grosChiffre_(sh, 'E6', T.ink); grosChiffre_(sh, 'F6', T.muted);

  sh.getRange('B7:C7').setValues([['Date de pesée', 'Poids (kg)']]);
  sh.getRange('E7:G7').setValues([['Date', 'Séance', 'Volume (kg)']]);
  enTete_(sh, 'B7:C7'); enTete_(sh, 'E7:G7');
  sh.getRange(8, 2, 293, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(8, 5, 293, 1).setNumberFormat('dd/mm/yyyy');
  corpsTableau_(sh, 8, 2, 293, 2);
  corpsTableau_(sh, 8, 5, 293, 3);
}

/* ---- M4 · Side-Hustle ---- */
function modHustle_(sh) {
  sousTitre_(sh, 'B3:H3', 'Du projet à l\'argent, sans perdre le fil.');
  sh.setColumnWidth(2, 220); sh.setColumnWidth(3, 110); sh.setColumnWidth(4, 120);
  sh.setColumnWidth(5, 120); sh.setColumnWidth(6, 150); sh.setColumnWidth(7, 40);
  sh.setColumnWidth(8, 110); sh.setColumnWidth(9, 220); sh.setColumnWidth(10, 120);

  carte_(sh, 'B5:F6');
  etiquette_(sh, 'B5', 'REVENUS CUMULÉS'); sh.getRange('B6').setFormula('=SUM($J$8:$J$300)');
  etiquette_(sh, 'C5', 'PROJETS');         sh.getRange('C6').setFormula('=COUNTA($B$8:$B$60)');
  etiquette_(sh, 'D5', 'OBJECTIF TOTAL');  sh.getRange('D6').setFormula('=SUM($D$8:$D$60)');
  etiquette_(sh, 'E5', 'TAUX');            sh.getRange('E6').setFormula('=IFERROR(B6/D6,0)');
  sh.getRange('E6').setNumberFormat('0%');
  etiquette_(sh, 'F5', 'AVANCEMENT');
  sh.getRange('F6').setFormula('=SPARKLINE(IFERROR(B6/MAX(1,D6),0),{"charttype","bar";"max",1;"color1","' + T.em + '"})');
  grosChiffre_(sh, 'B6', T.em); grosChiffre_(sh, 'C6', T.ink);
  grosChiffre_(sh, 'D6', T.muted); grosChiffre_(sh, 'E6', T.am);

  sh.getRange('B7:F7').setValues([['Projet', 'Statut', 'Objectif', 'Encaissé', 'Avancement']]);
  sh.getRange('H7:J7').setValues([['Date', 'Libellé', 'Montant']]);
  enTete_(sh, 'B7:F7'); enTete_(sh, 'H7:J7');

  var v = SpreadsheetApp.newDataValidation().requireValueInList(['Idée', 'Lancé', 'Rentable', 'En pause'], true).build();
  sh.getRange(8, 3, 53, 1).setDataValidation(v);
  for (var r = 8; r <= 60; r++) {
    sh.getRange(r, 5).setFormula('=IF($B' + r + '="","",SUMIF($I$8:$I$300,$B' + r + ',$J$8:$J$300))');
    sh.getRange(r, 6).setFormula('=IF($B' + r + '="","",SPARKLINE(IFERROR($E' + r + '/MAX(1,$D' + r + '),0),' +
      '{"charttype","bar";"max",1;"color1","' + T.em + '"}))');
  }
  sh.getRange(8, 9, 293, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInRange(sh.getRange('B8:B60'), true).setAllowInvalid(true).build());
  sh.getRange(8, 8, 293, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(8, 10, 293, 1).setNumberFormat('#,##0');
  corpsTableau_(sh, 8, 2, 53, 5);
  corpsTableau_(sh, 8, 8, 293, 3);
}

/* ---- M5 · Créateur Viral ---- */
function modViral_(sh) {
  sousTitre_(sh, 'B3:H3', 'TikTok, Shorts, Reels : du vide-idées à la publication.');
  sh.setColumnWidth(2, 320); sh.setColumnWidth(3, 120); sh.setColumnWidth(4, 130);
  sh.setColumnWidth(5, 120); sh.setColumnWidth(6, 110); sh.setColumnWidth(7, 110);

  carte_(sh, 'B5:G6');
  etiquette_(sh, 'B5', 'CONTENUS');        sh.getRange('B6').setFormula('=COUNTA($B$8:$B$300)');
  etiquette_(sh, 'C5', 'PUBLIÉS');         sh.getRange('C6').setFormula('=COUNTIF($D$8:$D$300,"Publié")');
  etiquette_(sh, 'D5', 'VUES CUMULÉES');   sh.getRange('D6').setFormula('=SUM($F$8:$F$300)');
  etiquette_(sh, 'E5', 'ACCROCHE MOY.');   sh.getRange('E6').setFormula('=IFERROR(AVERAGE($G$8:$G$300),0)');
  sh.getRange('E6').setNumberFormat('0.0"%"');
  etiquette_(sh, 'F5', 'MEILLEURE VUE');   sh.getRange('F6').setFormula('=IFERROR(MAX($F$8:$F$300),0)');
  etiquette_(sh, 'G5', 'TENDANCE');
  sh.getRange('G6').setFormula('=SPARKLINE($F$8:$F$300,{"charttype","column";"color","' + T.indigo + '"})');
  grosChiffre_(sh, 'B6', T.ink); grosChiffre_(sh, 'C6', T.em);
  grosChiffre_(sh, 'D6', T.indigo); grosChiffre_(sh, 'E6', T.am); grosChiffre_(sh, 'F6', T.muted);

  sh.getRange('B7:G7').setValues([['Titre / accroche', 'Plateforme', 'Statut', 'Date', 'Vues', 'Accroche %']]);
  enTete_(sh, 'B7:G7');
  sh.getRange(8, 3, 293, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['TikTok', 'Shorts', 'Reels', 'Autre'], true).build());
  sh.getRange(8, 4, 293, 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['Idée', 'En production', 'Planifié', 'Publié'], true).build());
  sh.getRange(8, 5, 293, 1).setNumberFormat('dd/mm/yyyy');
  sh.getRange(8, 6, 293, 1).setNumberFormat('#,##0');
  corpsTableau_(sh, 8, 2, 293, 6);
}

/* ---- M6 · Second Cerveau ---- */
function modCerveau_(sh) {
  sousTitre_(sh, 'B3:H3', 'Ce que tu lis et ce que tu pratiques vraiment.');
  sh.setColumnWidth(2, 280); sh.setColumnWidth(3, 90); sh.setColumnWidth(4, 90);
  sh.setColumnWidth(5, 150); sh.setColumnWidth(6, 40);
  sh.setColumnWidth(7, 220); sh.setColumnWidth(8, 90); sh.setColumnWidth(9, 90); sh.setColumnWidth(10, 150);

  carte_(sh, 'B5:E6');
  etiquette_(sh, 'B5', 'PAGES LUES');      sh.getRange('B6').setFormula('=SUM($D$8:$D$200)');
  etiquette_(sh, 'C5', 'LIVRES FINIS');    sh.getRange('C6').setFormula('=SUMPRODUCT(($C$8:$C$200>0)*($D$8:$D$200>=$C$8:$C$200))');
  etiquette_(sh, 'D5', 'HEURES PRATIQUE'); sh.getRange('D6').setFormula('=SUM($H$8:$H$200)');
  etiquette_(sh, 'E5', 'COMPÉTENCES');     sh.getRange('E6').setFormula('=COUNTA($G$8:$G$200)');
  grosChiffre_(sh, 'B6', T.em); grosChiffre_(sh, 'C6', T.ink);
  grosChiffre_(sh, 'D6', T.indigo); grosChiffre_(sh, 'E6', T.am);

  sh.getRange('B7:E7').setValues([['Livre', 'Pages', 'Lues', 'Avancement']]);
  sh.getRange('G7:J7').setValues([['Compétence', 'Heures', 'Objectif', 'Avancement']]);
  enTete_(sh, 'B7:E7'); enTete_(sh, 'G7:J7');

  for (var r = 8; r <= 200; r++) {
    sh.getRange(r, 5).setFormula('=IF($B' + r + '="","",SPARKLINE(IFERROR($D' + r + '/MAX(1,$C' + r + '),0),' +
      '{"charttype","bar";"max",1;"color1","' + T.em + '"}))');
    sh.getRange(r, 10).setFormula('=IF($G' + r + '="","",SPARKLINE(IFERROR($H' + r + '/MAX(1,$I' + r + '),0),' +
      '{"charttype","bar";"max",1;"color1","' + T.indigo + '"}))');
  }
  corpsTableau_(sh, 8, 2, 193, 4);
  corpsTableau_(sh, 8, 7, 193, 4);
}

/* =====================================================================
   3. EXPORT : 6 FICHIERS SÉPARÉS (vente à l'unité)
   ===================================================================== */
function exporterModulesSepares() {
  var liens = [];
  MODULES.forEach(function (m) {
    var nouveau = SpreadsheetApp.create('APEX FLOW · ' + m.nom);
    var sh = construireModule_(nouveau, m, 0);
    sh.setName(m.onglet);
    // on retire la feuille vide créée par défaut
    nouveau.getSheets().forEach(function (s) {
      if (s.getSheetId() !== sh.getSheetId() && nouveau.getSheets().length > 1) nouveau.deleteSheet(s);
    });
    liens.push(m.nom + '\n' + nouveau.getUrl());
  });

  alerte_('6 fichiers créés dans ton Drive',
    'Chaque module est maintenant un fichier indépendant, prêt à être vendu à l\'unité :\n\n' + liens.join('\n\n'));
  return liens;
}

/* =====================================================================
   4. THÈME CLAIR / THÈME SOMBRE
   Repeint tout le fichier sans toucher à ce que tu as saisi :
   les données sont mises de côté, la mise en forme est régénérée,
   puis les données sont remises à leur place.
   ===================================================================== */

/** Zones saisies à la main — tout le reste est reconstruit par le script. */
var ZONES_DATA = {
  'Habitudes':            ['B6:AI40'],
  'Tâches':               ['B6:F200'],
  'M1 · Cashflow':        ['B8:F500', 'H8:K40'],
  'M2 · Épargne 52':      ['B6', 'D8:D59'],
  'M3 · Athlète':         ['C6', 'B8:C300', 'E8:G300'],
  'M4 · Side-Hustle':     ['B8:D60', 'H8:J300'],
  'M5 · Créateur Viral':  ['B8:G300'],
  'M6 · Second Cerveau':  ['B8:D200', 'G8:I200']
};

function themeSombre() { appliquerTheme_('sombre'); }
function themeClair()  { appliquerTheme_('clair'); }

function appliquerTheme_(nom) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. on mémorise le choix dans le fichier
  try { PropertiesService.getDocumentProperties().setProperty(CLE_THEME, nom); } catch (e) {}
  T = PALETTES[nom];

  var libelle = (nom === 'clair') ? 'clair · Papier' : 'sombre · Obsidienne';

  // 2. rien d'installé : le thème servira à la prochaine génération
  var qg = ss.getSheetByName('QG');
  var hab = ss.getSheetByName('Habitudes');
  var modulesPresents = MODULES.filter(function (m) { return !!ss.getSheetByName(m.onglet); });
  if (!qg && !hab && modulesPresents.length === 0) {
    alerte_('Thème ' + libelle,
      'Le thème est enregistré. Lance « Installer le système complet » : tout sera généré avec ce thème.');
    return;
  }

  // 3. on met de côté ce que tu as saisi
  var sauvegarde = {};
  ss.getSheets().forEach(function (sh) {
    var zones = ZONES_DATA[sh.getName()];
    if (!zones) return;
    sauvegarde[sh.getName()] = zones.map(function (a1) {
      try { return { a1: a1, valeurs: sh.getRange(a1).getValues() }; }
      catch (e) { return null; }
    }).filter(function (x) { return !!x; });
  });

  // 4. on régénère la mise en forme
  if (qg)  construireQG_(ss);
  if (hab) construireHabitudes_(ss);
  if (ss.getSheetByName('Tâches')) construireTaches_(ss);
  modulesPresents.forEach(function (m) {
    construireModule_(ss, m, ss.getSheetByName(m.onglet).getIndex() - 1);
  });

  // 5. on remet les données en place
  Object.keys(sauvegarde).forEach(function (nomFeuille) {
    var sh = ss.getSheetByName(nomFeuille);
    if (!sh) return;
    sauvegarde[nomFeuille].forEach(function (z) {
      try { sh.getRange(z.a1).setValues(z.valeurs); } catch (e) {}
    });
  });

  SpreadsheetApp.flush();
  var premiere = ss.getSheetByName('QG') || ss.getSheetByName('Habitudes') || ss.getSheets()[0];
  try { ss.setActiveSheet(premiere); } catch (e) {}

  alerte_('Thème ' + libelle,
    'Tout le fichier est repeint. Tes habitudes, tes cases cochées et tes tâches sont intactes.\n\n' +
    'Tu peux changer d\'avis autant de fois que tu veux : menu ⚡ APEX FLOW ▸ Apparence.');
}

/* ====================== 5. REMISE À ZÉRO DU MOIS ====================== */
function reinitialiserMois() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert('Remettre le mois à zéro ?',
    'Toutes les cases à cocher de l\'onglet Habitudes seront décochées. Les noms, piliers et XP sont conservés.',
    ui.ButtonSet.YES_NO);
  if (rep !== ui.Button.YES) return;

  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Habitudes');
  if (!sh) { alerte_('Introuvable', 'L\'onglet Habitudes n\'existe pas encore.'); return; }
  sh.getRange(6, 5, 35, joursDuMois_()).uncheck();
  alerte_('C\'est reparti', 'Le mois est vierge. La série repart de la prochaine case cochée.');
}

/* =====================================================================
   OUTILS INTERNES
   ===================================================================== */
function feuille_(ss, nom, position) {
  var sh = ss.getSheetByName(nom);
  if (sh) { sh.clear(); sh.clearConditionalFormatRules(); }
  else { sh = ss.insertSheet(nom); }
  try { ss.setActiveSheet(sh); ss.moveActiveSheet(position + 1); } catch (e) {}
  return sh;
}

function habiller_(sh, lignes, colonnes) {
  sh.setHiddenGridlines(true);
  var max = sh.getMaxRows(), maxc = sh.getMaxColumns();
  if (maxc < colonnes) sh.insertColumnsAfter(maxc, colonnes - maxc);
  if (max < lignes) sh.insertRowsAfter(max, lignes - max);
  var tout = sh.getRange(1, 1, sh.getMaxRows(), sh.getMaxColumns());
  try { tout.breakApart(); } catch (e) {}
  tout.setBackground(T.bg).setFontColor(T.ink).setFontFamily(FONT_BODY).setFontSize(11)
      .setVerticalAlignment('middle');
  sh.setRowHeight(1, 10);
}

function carte_(sh, a1) {
  sh.getRange(a1)
    .setBackground(T.surf)
    .setBorder(true, true, true, true, false, false, T.surf2, SpreadsheetApp.BorderStyle.SOLID);
}

function titre_(sh, a1, texte, taille) {
  var r = sh.getRange(a1);
  r.merge();
  r.setValue(texte)
   .setFontFamily(FONT_TITLE).setFontSize(taille || 18).setFontWeight('bold')
   .setFontColor(T.ink).setVerticalAlignment('middle');
  sh.setRowHeight(r.getRow(), Math.max(30, (taille || 18) * 1.9));
}

function sousTitre_(sh, a1, texte) {
  var r = sh.getRange(a1);
  r.merge();
  r.setValue(texte).setFontSize(10).setFontColor(T.muted);
}

function etiquette_(sh, a1, texte) {
  sh.getRange(a1).setValue(texte)
    .setFontSize(8).setFontColor(T.dim).setFontWeight('bold').setVerticalAlignment('bottom');
}

function grosChiffre_(sh, a1, couleur) {
  sh.getRange(a1)
    .setFontFamily(FONT_NUM).setFontSize(18).setFontWeight('bold')
    .setFontColor(couleur).setVerticalAlignment('top');
}

function enTete_(sh, a1) {
  var r = (typeof a1 === 'string') ? sh.getRange(a1) : a1;
  r.setBackground(T.surf2).setFontColor(T.muted).setFontSize(9).setFontWeight('bold')
   .setVerticalAlignment('middle')
   .setBorder(false, false, true, false, false, false, T.em, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setRowHeight(r.getRow(), 26);
}

function corpsTableau_(sh, ligne, colonne, nbLignes, nbCols) {
  sh.getRange(ligne, colonne, nbLignes, nbCols)
    .setFontSize(10).setFontColor(T.ink)
    .setBorder(null, null, null, null, null, true, T.surf2, SpreadsheetApp.BorderStyle.SOLID);
}

function colonne_(n) {
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

function joursDuMois_() {
  var d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

function anneeMois_() {
  var mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  var d = new Date();
  return mois[d.getMonth()] + ' ' + d.getFullYear();
}

function alerte_(titre, message) {
  try { SpreadsheetApp.getUi().alert(titre, message, SpreadsheetApp.getUi().ButtonSet.OK); }
  catch (e) { Logger.log(titre + ' — ' + message); }
}
