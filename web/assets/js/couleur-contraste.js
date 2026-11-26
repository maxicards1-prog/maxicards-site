/* Contraste de deux couleurs (WCAG 2.2) : ratio, verdicts AA / AAA, aperçu, suggestion. Tout se passe dans le navigateur. */
(function () {
  'use strict';
  var COUL = window.COUL, CQ = window.CQ, CC = window.CC;
  var texte = COUL.lire('#595959');
  var fond = COUL.lire('#ffffff');
  var suggestion = null;

  var CRITERES = [
    ['Texte normal, niveau AA', '4,5:1', 'normalAA'],
    ['Texte normal, niveau AAA', '7:1', 'normalAAA'],
    ['Grand texte, niveau AA', '3:1', 'grandAA'],
    ['Grand texte, niveau AAA', '4,5:1', 'grandAAA'],
    ['Interface et icônes, niveau AA', '3:1', 'interface']
  ];

  function dessinerSuggestion() {
    var zone = CQ.el('suggestion');
    CC.vider(zone);
    suggestion = null;
    var cible = CQ.nombre('cible', 1, 21);
    if (!isFinite(cible)) { return; }
    var s = COUL.suggerer(texte, fond, cible);
    var p = document.createElement('p');
    p.className = 'phrase-suggestion';
    if (s.deja) {
      p.textContent = 'Le contraste atteint déjà ' + CC.ratio(cible) + '. Rien à changer.';
      zone.appendChild(p);
      return;
    }
    suggestion = s.couleur;
    p.textContent = s.atteint
      ? 'Couleur de texte la plus proche qui atteint ' + CC.ratio(cible) + ' sur ce fond :'
      : 'Aucune couleur de cette teinte n\'atteint ' + CC.ratio(cible) + ' sur ce fond. Le meilleur choix est ' + (s.couleur.r === 0 ? 'le noir' : 'le blanc') + ' ; sinon, changez le fond :';
    zone.appendChild(p);
    var r = document.createElement('div');
    r.className = 'rangee';
    r.appendChild(CC.pastille(s.couleur, function (c) { appliquerTexte(c, 'pastille'); }, 'Suggestion'));
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Appliquer au texte (contraste ' + CC.ratio(COUL.contraste(s.couleur, fond)) + ')';
    b.addEventListener('click', function () { appliquerTexte(s.couleur, 'pastille'); });
    r.appendChild(b);
    zone.appendChild(r);
  }

  function recalcul() {
    var ratio = COUL.contraste(texte, fond);
    var v = COUL.verdicts(ratio);
    var apercu = CQ.el('apercu');
    CC.peindre(apercu, fond);
    apercu.style.color = '#' + COUL.versHex(texte);
    CQ.texte('ratio', CC.ratio(ratio));
    CQ.texte('verdictGlobal', v.normalAAA ? 'Excellent : niveau AAA pour le texte normal.' : v.normalAA ? 'Bien : niveau AA pour le texte normal.' : v.grandAA ? 'Réservé aux grands textes et aux éléments d\'interface.' : 'Insuffisant : le texte sera difficile à lire.');
    CQ.lignes('corpsVerdicts', CRITERES.map(function (c) {
      var reussi = v[c[2]];
      return { cellules: [c[0], c[1], reussi ? '✔ Réussi' : '✘ Échec'], classe: reussi ? 'reussi' : 'echec' };
    }));
    dessinerSuggestion();
    CC.versAdresse({ t: texte, f: fond });
  }

  function appliquerTexte(c, source) {
    texte = c;
    CC.poserChamps('selT', 'saisieT', c, source);
    recalcul();
  }
  function appliquerFond(c, source) {
    fond = c;
    CC.poserChamps('selF', 'saisieF', c, source);
    recalcul();
  }

  CC.lierSaisie('selT', 'saisieT', 'messageT', appliquerTexte);
  CC.lierSaisie('selF', 'saisieF', 'messageF', appliquerFond);
  CQ.surChangement(['cible'], dessinerSuggestion);
  CQ.el('inverser').addEventListener('click', function () {
    var t = texte;
    texte = fond;
    fond = t;
    CC.poserChamps('selT', 'saisieT', texte, 'init');
    CC.poserChamps('selF', 'saisieF', fond, 'init');
    recalcul();
  });
  CC.lierPartage(function () { return { t: texte, f: fond }; });
  texte = CC.depuisAdresse('t') || texte;
  fond = CC.depuisAdresse('f') || fond;
  CC.poserChamps('selT', 'saisieT', texte, 'init');
  CC.poserChamps('selF', 'saisieF', fond, 'init');
  recalcul();
}());
