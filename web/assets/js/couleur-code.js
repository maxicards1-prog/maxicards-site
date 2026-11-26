/* Code couleur : HEX, RGB, HSL, CMJN, nom CSS, texte lisible, nuancier, harmonies. Tout se passe dans le navigateur. */
(function () {
  'use strict';
  var COUL = window.COUL, CQ = window.CQ, CC = window.CC;
  var courante = COUL.lire('#1e90ff');

  function rangee(conteneur, couleurs, etiquettes) {
    couleurs.forEach(function (c, i) {
      conteneur.appendChild(CC.pastille(c, function (x) { appliquer(x, 'pastille'); }, etiquettes ? etiquettes[i] : ''));
    });
  }

  function dessinerNuancier(c) {
    var zone = CQ.el('nuancier');
    CC.vider(zone);
    var nu = COUL.nuancier(c);
    var claires = nu.claires.slice().reverse();
    rangee(zone, claires.concat([c]).concat(nu.foncees),
      ['Plus clair', 'Plus clair', 'Plus clair', 'Plus clair', 'Couleur choisie', 'Plus foncé', 'Plus foncé', 'Plus foncé', 'Plus foncé']);
  }

  var GROUPES = [
    ['complementaire', 'Complémentaire (à l\'opposé sur le cercle)'],
    ['analogues', 'Analogues (30° de part et d\'autre)'],
    ['triade', 'Triade (trois couleurs à 120°)'],
    ['adjacentes', 'Complémentaires adjacentes (150°)'],
    ['tetrade', 'Tétrade (quatre couleurs à 90°)']
  ];
  function dessinerHarmonies(c) {
    var zone = CQ.el('harmonies');
    CC.vider(zone);
    var h = COUL.harmonies(c);
    GROUPES.forEach(function (g) {
      var bloc = document.createElement('div');
      bloc.className = 'harmonie';
      var t = document.createElement('h4');
      t.textContent = g[1];
      var r = document.createElement('div');
      r.className = 'rangee';
      rangee(r, [c].concat(h[g[0]]), ['Couleur choisie'].concat(h[g[0]].map(function () { return g[1]; })));
      bloc.appendChild(t);
      bloc.appendChild(r);
      zone.appendChild(bloc);
    });
  }

  function appliquer(c, source) {
    courante = c;
    CC.poserChamps('sel', 'saisie', c, source);
    var lisible = COUL.texteLisible(c);
    var apercu = CQ.el('apercu');
    CC.peindre(apercu, c);
    apercu.style.color = '#' + COUL.versHex(lisible.couleur);
    CQ.texte('vHex', COUL.hexAff(c));
    CQ.texte('vRgb', COUL.rgbTexte(c));
    CQ.texte('vHsl', COUL.hslTexte(c));
    CQ.texte('vCmjn', COUL.cmjnTexte(c));
    var nom = COUL.nomProche(c);
    CQ.texte('vNom', nom.exact ? nom.nom : nom.nom + ' (le plus proche, ' + COUL.hexAff(COUL.depuisHex(nom.hex)) + ')');
    CQ.texte('libNom', nom.exact ? 'Nom CSS exact' : 'Nom CSS le plus proche');
    CQ.texte('vTexte', 'Texte ' + lisible.nom + ' (contraste ' + CC.ratio(lisible.ratio) + ')');
    dessinerNuancier(c);
    dessinerHarmonies(c);
    CC.versAdresse({ c: c });
  }

  CC.lierCopie();
  CC.lierSaisie('sel', 'saisie', 'message', appliquer);
  CC.lierPartage(function () { return { c: courante }; });
  appliquer(CC.depuisAdresse('c') || courante, 'init');
}());
