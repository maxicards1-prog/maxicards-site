/* Palette de couleurs : harmonies d'une couleur de base, copie de la liste et en variables CSS. Tout se passe dans le navigateur. */
(function () {
  'use strict';
  var COUL = window.COUL, CQ = window.CQ, CC = window.CC;
  var courante = COUL.lire('#1e90ff');

  // Chaque harmonie : titre, noms de la liste, noms des variables CSS (sans accent).
  var TYPES = {
    complementaire: { titre: 'Complémentaire', noms: ['Complémentaire'], vars: ['complementaire'] },
    analogues: { titre: 'Analogues (±30°)', noms: ['Analogue −30°', 'Analogue +30°'], vars: ['analogue-1', 'analogue-2'] },
    triade: { titre: 'Triade (±120°)', noms: ['Triade 1', 'Triade 2'], vars: ['triade-1', 'triade-2'] },
    adjacentes: { titre: 'Complémentaires adjacentes (±150°)', noms: ['Adjacente 1', 'Adjacente 2'], vars: ['adjacente-1', 'adjacente-2'] },
    tetrade: { titre: 'Tétrade (carré, 90°)', noms: ['Tétrade 1', 'Tétrade 2', 'Tétrade 3'], vars: ['tetrade-1', 'tetrade-2', 'tetrade-3'] }
  };
  var ORDRE = ['complementaire', 'analogues', 'triade', 'adjacentes', 'tetrade'];

  function groupe(type, c) {
    if (type === 'nuancier') {
      var nu = COUL.nuancier(c);
      var pct = ['20', '40', '60', '80'];
      return {
        titre: 'Nuancier clair et foncé',
        couleurs: nu.claires.concat(nu.foncees),
        noms: pct.map(function (p) { return 'Plus clair de ' + p + ' %'; }).concat(pct.map(function (p) { return 'Plus foncé de ' + p + ' %'; })),
        vars: pct.map(function (p) { return 'clair-' + p; }).concat(pct.map(function (p) { return 'fonce-' + p; }))
      };
    }
    var t = TYPES[type];
    return { titre: t.titre, couleurs: COUL.harmonies(c)[type], noms: t.noms, vars: t.vars };
  }

  function appliquer(c, source) {
    courante = c;
    CC.poserChamps('sel', 'saisie', c, source);
    CC.peindre(CQ.el('apercuBase'), c);
    CQ.texte('vBase', COUL.hexAff(c) + ' · ' + COUL.rgbTexte(c));
    var zone = CQ.el('harmonies');
    CC.vider(zone);
    ORDRE.concat(['nuancier']).forEach(function (type) {
      var g = groupe(type, c);
      var bloc = document.createElement('div');
      bloc.className = 'harmonie';
      var h = document.createElement('h4');
      h.textContent = g.titre;
      var r = document.createElement('div');
      r.className = 'rangee';
      r.appendChild(CC.pastille(c, function (x) { appliquer(x, 'pastille'); }, 'Couleur de base'));
      g.couleurs.forEach(function (x, i) {
        r.appendChild(CC.pastille(x, function (y) { appliquer(y, 'pastille'); }, g.noms[i]));
      });
      bloc.appendChild(h);
      bloc.appendChild(r);
      zone.appendChild(bloc);
    });
    sorties();
    CC.versAdresse({ c: c });
  }

  function sorties() {
    var type = CQ.valeur('typeHarmonie');
    if (type !== 'nuancier' && !TYPES[type]) { type = 'complementaire'; }
    var g = groupe(type, courante);
    var liste = ['Base : ' + COUL.hexAff(courante)];
    var css = [':root {', '  --couleur-base: ' + '#' + COUL.versHex(courante) + ';'];
    g.couleurs.forEach(function (x, i) {
      liste.push(g.noms[i] + ' : ' + COUL.hexAff(x));
      css.push('  --' + g.vars[i] + ': #' + COUL.versHex(x) + ';');
    });
    css.push('}');
    CQ.el('sortieListe').value = liste.join('\n');
    CQ.el('sortieCss').value = css.join('\n');
  }

  CC.lierSaisie('sel', 'saisie', 'message', appliquer);
  CQ.surChangement(['typeHarmonie'], sorties);
  CC.lierCopie();
  CC.lierPartage(function () { return { c: courante }; });
  appliquer(CC.depuisAdresse('c') || courante, 'init');
}());
