/* Faux texte (Lorem ipsum latin et faux texte français) : logique pure, sans accès au DOM.
   Même graine = même texte. Tout est borné (plafonds) : un nombre énorme ou invalide ne fige rien. */
(function (racine) {
  'use strict';

  var PLAFONDS = { paragraphes: 50, phrases: 500, mots: 5000, liste: 100 };
  var PPP_MAX = 20;

  // ---------- Latin : mots du passage classique du Lorem ipsum (domaine public) ----------
  var PREMIERE_PHRASE = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do',
    'eiusmod', 'tempor', 'incididunt', 'ut', 'labore', 'et', 'dolore', 'magna', 'aliqua'];
  var MOTS_LATINS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ' +
    'et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea commodo ' +
    'consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur excepteur sint ' +
    'occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum').split(' ');

  // ---------- Français : banque de mots neutres et gabarits de phrases ----------
  var NOMS = [
    ['jardin', 'm'], ['village', 'm'], ['matin', 'm'], ['chemin', 'm'], ['livre', 'm'], ['voyage', 'm'],
    ['souvenir', 'm'], ['marché', 'm'], ['silence', 'm'], ['nuage', 'm'], ['moment', 'm'], ['projet', 'm'],
    ['voisin', 'm'], ['café', 'm'], ['pont', 'm'], ['paysage', 'm'], ['fruit', 'm'], ['soir', 'm'], ['vent', 'm'],
    ['atelier', 'm'], ['carnet', 'm'], ['sentier', 'm'], ['horizon', 'm'], ['miroir', 'm'], ['escalier', 'm'],
    ['dessin', 'm'], ['panier', 'm'],
    ['maison', 'f'], ['rue', 'f'], ['fenêtre', 'f'], ['histoire', 'f'], ['lumière', 'f'], ['saison', 'f'],
    ['table', 'f'], ['route', 'f'], ['idée', 'f'], ['forêt', 'f'], ['chambre', 'f'], ['rivière', 'f'],
    ['montagne', 'f'], ['cuisine', 'f'], ['lampe', 'f'], ['valise', 'f'], ['soirée', 'f'], ['journée', 'f'],
    ['musique', 'f'], ['place', 'f'], ['colline', 'f'], ['porte', 'f'], ['bibliothèque', 'f'], ['cour', 'f'],
    ['plage', 'f']
  ];
  var ADJECTIFS = [
    ['petit', 'petite'], ['grand', 'grande'], ['calme', 'calme'], ['ancien', 'ancienne'], ['lent', 'lente'],
    ['clair', 'claire'], ['simple', 'simple'], ['joli', 'jolie'], ['discret', 'discrète'], ['léger', 'légère'],
    ['profond', 'profonde'], ['ordinaire', 'ordinaire'], ['utile', 'utile'], ['fragile', 'fragile'],
    ['familier', 'familière'], ['tranquille', 'tranquille']
  ];
  var COPULES = [['reste', 'restent'], ['semble', 'semblent'], ['devient', 'deviennent'], ['paraît', 'paraissent']];
  var TRANSITIFS = [['regarde', 'regardent'], ['traverse', 'traversent'], ['prépare', 'préparent'],
    ['garde', 'gardent'], ['cherche', 'cherchent'], ['observe', 'observent'], ['ouvre', 'ouvrent'],
    ['suit', 'suivent'], ['dessine', 'dessinent'], ['range', 'rangent'], ['porte', 'portent'],
    ['rejoint', 'rejoignent']];
  var INTRANSITIFS = [['avance', 'avancent'], ['attend', 'attendent'], ['repose', 'reposent'],
    ['passe', 'passent'], ['brille', 'brillent'], ['demeure', 'demeurent'], ['change', 'changent']];
  var ADVERBES = ['doucement', 'lentement', 'calmement', 'tranquillement', 'simplement', 'discrètement',
    'longtemps', 'encore', 'toujours'];
  var PREPOSITIONS = ['devant', 'derrière', 'sous', 'sur', 'dans', 'avec', 'sans', 'vers'];
  var OUVERTURES = ['ce matin', 'le soir', 'parfois', 'souvent', 'au loin', 'chaque jour', 'plus tard', 'ensuite',
    'alors', 'pendant la journée'];
  var LIAISONS = ['puis', 'mais', 'et'];
  var DETERMINANTS = ['le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cet', 'cette', 'ces', 'notre', 'nos'];

  function jetons(texte) { return String(texte).match(/[a-zà-ÿ]+/g) || []; }

  // Tous les mots que le générateur français peut produire (formes accordées et « l' » comprises).
  var MOTS_FR = (function () {
    var ens = {};
    function ajoute(t) { jetons(t).forEach(function (m) { ens[m] = true; }); }
    NOMS.forEach(function (n) { ajoute(n[0]); ajoute(n[0] + 's'); });
    ADJECTIFS.forEach(function (a) { ajoute(a[0]); ajoute(a[1]); ajoute(a[0] + 's'); ajoute(a[1] + 's'); });
    [COPULES, TRANSITIFS, INTRANSITIFS].forEach(function (l) { l.forEach(function (v) { ajoute(v[0]); ajoute(v[1]); }); });
    [ADVERBES, PREPOSITIONS, OUVERTURES, LIAISONS, DETERMINANTS].forEach(function (l) { l.forEach(ajoute); });
    ajoute('l');
    return Object.keys(ens).sort();
  }());

  // Mots isolés (option « mots » en français) : un mélange simple de la banque.
  var POOL_FR = [];
  NOMS.forEach(function (n) { POOL_FR.push(n[0]); });
  ADJECTIFS.forEach(function (a) { POOL_FR.push(a[0]); });
  TRANSITIFS.concat(INTRANSITIFS, COPULES).forEach(function (v) { POOL_FR.push(v[0]); });
  POOL_FR = POOL_FR.concat(ADVERBES, PREPOSITIONS, ['le', 'la', 'un', 'une', 'puis', 'mais']);

  // ---------- outils de base ----------
  // Générateur pseudo-aléatoire mulberry32 : renvoie une fonction qui donne un nombre dans [0 ; 1[.
  function alea(graine) {
    var g = Math.floor(Math.abs(Number(graine)));
    if (!isFinite(g)) { g = 1; }
    var a = (g % 4294967296) >>> 0;
    if (a === 0) { a = 1; }
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Entier entre 1 et max (texte, NaN, négatif, énorme : tout est ramené dans les bornes).
  function borne(valeur, max, defaut) {
    var v = (typeof valeur === 'number') ? valeur : Number(String(valeur === undefined || valeur === null ? '' : valeur).replace(',', '.'));
    if (isNaN(v)) { v = (typeof defaut === 'number') ? defaut : 1; }
    v = Math.floor(v);
    if (v < 1) { v = 1; }
    if (v > max) { v = max; }
    return v;
  }

  function entre(r, a, b) { return a + Math.floor(r() * (b - a + 1)); }
  function pioche(r, liste) { return liste[Math.floor(r() * liste.length)]; }
  function majuscule(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function voyelle(mot) { return /^[aeiouyhéèêâîôû]/.test(mot); }

  // ---------- latin ----------
  function motsLatins(r, n, depart) {
    var sortie = [];
    var i;
    for (i = 0; i < n; i++) {
      if (depart && i < PREMIERE_PHRASE.length) { sortie.push(PREMIERE_PHRASE[i]); continue; }
      var mot;
      var essais = 0;
      do { mot = pioche(r, MOTS_LATINS); essais++; } while (sortie.length && mot === sortie[sortie.length - 1] && essais < 5);
      sortie.push(mot);
    }
    return sortie;
  }

  function phraseLatine(r) {
    var n = entre(r, 6, 14);
    var m = motsLatins(r, n, false);
    if (n >= 8) {
      var v1 = entre(r, 3, n - 3);
      m[v1 - 1] += ',';
      if (n >= 12 && r() < 0.5) {
        var v2 = entre(r, 3, n - 3);
        if (Math.abs(v2 - v1) > 2) { m[v2 - 1] += ','; }
      }
    }
    return majuscule(m.join(' ')) + '.';
  }

  var PHRASE_CLASSIQUE = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  // ---------- français ----------
  function groupeNominal(r, simple) {
    var n = pioche(r, NOMS);
    var pluriel = r() < 0.35;
    var type = r();
    var det;
    var nom = n[0];
    if (type < 0.4) {
      det = pluriel ? 'les' : (voyelle(nom) ? "l'" : (n[1] === 'm' ? 'le' : 'la'));
    } else if (type < 0.8) {
      det = pluriel ? 'des' : (n[1] === 'm' ? 'un' : 'une');
    } else if (type < 0.9) {
      det = pluriel ? 'ces' : (n[1] === 'm' ? (voyelle(nom) ? 'cet' : 'ce') : 'cette');
    } else {
      det = pluriel ? 'nos' : 'notre';
    }
    var adj = null;
    if (!simple || r() < 0.5) {
      if (r() < 0.6) {
        var a = pioche(r, ADJECTIFS);
        adj = n[1] === 'm' ? a[0] : a[1];
        if (pluriel) { adj += 's'; }
      }
    }
    var texte = det + (det === "l'" ? '' : ' ') + nom + (pluriel ? 's' : '') + (adj ? ' ' + adj : '');
    return { texte: texte, pluriel: pluriel, genre: n[1], nom: nom };
  }

  function adjectifAccorde(r, g) {
    var a = pioche(r, ADJECTIFS);
    var s = g.genre === 'm' ? a[0] : a[1];
    return g.pluriel ? s + 's' : s;
  }

  function verbe(liste, r, g) { var v = pioche(r, liste); return g.pluriel ? v[1] : v[0]; }

  function complementLieu(r) {
    var g = groupeNominal(r, true);
    return pioche(r, PREPOSITIONS) + ' ' + g.texte;
  }

  function phraseFrancaise(r) {
    var s = groupeNominal(r, false);
    var gabarit = r();
    var corps;
    if (gabarit < 0.22) {
      corps = s.texte + ' ' + verbe(COPULES, r, s) + ' ' + adjectifAccorde(r, s);
    } else if (gabarit < 0.5) {
      corps = s.texte + ' ' + verbe(TRANSITIFS, r, s) + ' ' + groupeNominal(r, true).texte;
      if (r() < 0.4) { corps += ' ' + pioche(r, ADVERBES); }
    } else if (gabarit < 0.72) {
      corps = s.texte + ' ' + verbe(INTRANSITIFS, r, s) + ' ' + complementLieu(r);
      if (r() < 0.3) { corps += ' ' + pioche(r, ADVERBES); }
    } else if (gabarit < 0.88) {
      corps = s.texte + ' ' + verbe(TRANSITIFS, r, s) + ' ' + groupeNominal(r, true).texte + ', ' +
        pioche(r, ['puis', 'et']) + ' ' + verbe(INTRANSITIFS, r, s) + ' ' + complementLieu(r);
    } else {
      var s2 = groupeNominal(r, true);
      corps = s.texte + ' ' + verbe(COPULES, r, s) + ' ' + adjectifAccorde(r, s) + ', mais ' + s2.texte + ' ' +
        verbe(INTRANSITIFS, r, s2) + ' ' + complementLieu(r);
    }
    if (r() < 0.3) { corps = pioche(r, OUVERTURES) + ', ' + corps; }
    return majuscule(corps) + '.';
  }

  function elementFrancais(r) {
    var g = groupeNominal(r, false);
    var t = g.texte;
    if (r() < 0.35) { t += ' ' + complementLieu(r); }
    return majuscule(t);
  }

  function elementLatin(r) {
    return majuscule(motsLatins(r, entre(r, 3, 7), false).join(' '));
  }

  // ---------- fonctions publiques ----------
  function langueFr(o) { return !!o && (o.langue === 'fr' || o.langue === 'francais' || o.langue === 'français'); }
  function graineDe(o) { return alea(o && o.graine !== undefined ? o.graine : 1); }
  function loremDe(o) { return !!(o && o.lorem) && !langueFr(o); }

  // Tableau de n mots (n entre 1 et 5 000).
  function mots(n, o) {
    var nb = borne(n, PLAFONDS.mots);
    var r = graineDe(o);
    if (langueFr(o)) {
      var sortie = [];
      for (var i = 0; i < nb; i++) {
        var m;
        var essais = 0;
        do { m = pioche(r, POOL_FR); essais++; } while (sortie.length && m === sortie[sortie.length - 1] && essais < 5);
        sortie.push(m);
      }
      return sortie;
    }
    var l = motsLatins(r, nb, loremDe(o));
    if (loremDe(o)) { l[0] = majuscule(l[0]); }
    return l;
  }

  // Tableau de n phrases (n entre 1 et 500).
  function phrases(n, o) {
    var nb = borne(n, PLAFONDS.phrases);
    var r = graineDe(o);
    var fr = langueFr(o);
    var sortie = [];
    for (var i = 0; i < nb; i++) {
      if (i === 0 && loremDe(o)) { sortie.push(PHRASE_CLASSIQUE); }
      else { sortie.push(fr ? phraseFrancaise(r) : phraseLatine(r)); }
    }
    return sortie;
  }

  // Tableau de n paragraphes de ppp phrases chacun (n ≤ 50 ; au plus 500 phrases en tout).
  function paragraphes(n, ppp, o) {
    var nb = borne(n, PLAFONDS.paragraphes);
    var par = borne(ppp, PPP_MAX, 5);
    par = Math.max(1, Math.min(par, Math.floor(PLAFONDS.phrases / nb)));
    var r = graineDe(o);
    var fr = langueFr(o);
    var sortie = [];
    for (var i = 0; i < nb; i++) {
      var p = [];
      for (var j = 0; j < par; j++) {
        if (i === 0 && j === 0 && loremDe(o)) { p.push(PHRASE_CLASSIQUE); }
        else { p.push(fr ? phraseFrancaise(r) : phraseLatine(r)); }
      }
      sortie.push(p.join(' '));
    }
    return sortie;
  }

  // Tableau de n éléments de liste courts, sans point final (n entre 1 et 100).
  function liste(n, o) {
    var nb = borne(n, PLAFONDS.liste);
    var r = graineDe(o);
    var fr = langueFr(o);
    var sortie = [];
    for (var i = 0; i < nb; i++) {
      if (i === 0 && loremDe(o)) { sortie.push('Lorem ipsum dolor sit amet'); }
      else { sortie.push(fr ? elementFrancais(r) : elementLatin(r)); }
    }
    return sortie;
  }

  function compter(texte) {
    var t = String(texte === undefined || texte === null ? '' : texte);
    var m = t.match(/\S+/g);
    return { mots: m ? m.length : 0, caracteres: t.length };
  }

  // Échappe le texte pour l'afficher comme CODE HTML (résultat montré avec textContent, jamais interprété).
  function echapper(t) {
    return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Génère un texte complet. o : { type, nombre, parParagraphe, langue, lorem, html, graine }.
  // Renvoie { type, nombre, plafonne, contenu, sortie, mots, caracteres } ; `sortie` est du TEXTE (brut ou code HTML).
  function generer(o) {
    o = o || {};
    var type = (o.type === 'phrases' || o.type === 'mots' || o.type === 'liste') ? o.type : 'paragraphes';
    var max = PLAFONDS[type];
    var brut = (typeof o.nombre === 'number') ? o.nombre : Number(String(o.nombre === undefined || o.nombre === null ? '' : o.nombre).replace(',', '.'));
    var nombre = borne(o.nombre, max, 1);
    var plafonne = !isNaN(brut) && Math.floor(brut) > max;
    var elements, contenu, sortie, h;
    if (type === 'paragraphes') {
      elements = paragraphes(nombre, o.parParagraphe, o);
      contenu = elements.join('\n\n');
      sortie = o.html ? elements.map(function (p) { return '<p>' + echapper(p) + '</p>'; }).join('\n') : contenu;
    } else if (type === 'phrases') {
      elements = phrases(nombre, o);
      contenu = elements.join(' ');
      sortie = o.html ? '<p>' + echapper(contenu) + '</p>' : contenu;
    } else if (type === 'mots') {
      elements = mots(nombre, o);
      contenu = elements.join(' ');
      sortie = o.html ? '<p>' + echapper(contenu) + '</p>' : contenu;
    } else {
      elements = liste(nombre, o);
      contenu = elements.join('\n');
      if (o.html) {
        h = ['<ul>'];
        elements.forEach(function (e) { h.push('  <li>' + echapper(e) + '</li>'); });
        h.push('</ul>');
        sortie = h.join('\n');
      } else {
        sortie = elements.map(function (e) { return '- ' + e; }).join('\n');
      }
    }
    var c = compter(contenu);
    return { type: type, nombre: nombre, plafonne: plafonne, contenu: contenu, sortie: sortie, mots: c.mots, caracteres: c.caracteres };
  }

  var FT = {
    PLAFONDS: PLAFONDS,
    PPP_MAX: PPP_MAX,
    PHRASE_CLASSIQUE: PHRASE_CLASSIQUE,
    MOTS_LATINS: MOTS_LATINS,
    MOTS_FR: MOTS_FR,
    alea: alea,
    borne: borne,
    mots: mots,
    phrases: phrases,
    paragraphes: paragraphes,
    liste: liste,
    compter: compter,
    echapper: echapper,
    generer: generer
  };
  if (typeof module === 'object' && module.exports) { module.exports = FT; } else { racine.FT = FT; }
}(this));
