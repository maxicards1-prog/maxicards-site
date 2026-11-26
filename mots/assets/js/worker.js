/* Jeux de lettres : recherche dans un Web Worker (la page reste fluide). Les listes du dictionnaire libre
   (lexique Grammalecte, MPL 2.0) sont chargées à la demande, une par longueur, depuis ce site seulement. */
'use strict';
var params = new URLSearchParams(self.location.search);
var V_LOGIQUE = (params.get('l') || '').replace(/[^a-f0-9]/g, '').slice(0, 16);
var V_DICO = (params.get('d') || '').replace(/[^a-f0-9]/g, '').slice(0, 16);
importScripts('logique.js' + (V_LOGIQUE ? '?v=' + V_LOGIQUE : ''));

var ML = self.ML;
var MAX_PAR_GROUPE = 400;
var LONGUEURS = [];
for (var n = 2; n <= 26; n++) { LONGUEURS.push(n); }
var cache = {};

function liste(longueur) {
  if (LONGUEURS.indexOf(longueur) === -1) { return Promise.resolve([]); }
  if (!cache[longueur]) {
    var nom = 'm' + (longueur < 10 ? '0' : '') + longueur + '.txt' + (V_DICO ? '?v=' + V_DICO : '');
    var url = new URL('../dico/' + nom, self.location.href);
    if (url.origin !== self.location.origin) { return Promise.reject(new Error('origine')); }
    cache[longueur] = fetch(url.href, { credentials: 'omit' }).then(function (r) {
      if (!r.ok) { throw new Error('HTTP ' + r.status); }
      return r.text();
    }).then(ML.lireListe, function (e) { delete cache[longueur]; throw e; });
  }
  return cache[longueur];
}

function borne(v, mini, maxi, defaut) {
  var x = Math.floor(Number(v));
  if (!isFinite(x)) { return defaut; }
  return Math.max(mini, Math.min(maxi, x));
}

function envoyer(id, quoi) {
  quoi.id = id;
  self.postMessage(quoi);
}

// Cherche longueur par longueur (dans l'ordre donné) et envoie chaque groupe dès qu'il est prêt.
function parLongueurs(id, longueurs, test) {
  var i = 0;
  function suivant() {
    if (i >= longueurs.length) { envoyer(id, { type: 'fin' }); return null; }
    var L = longueurs[i++];
    return liste(L).then(function (l) {
      var r = ML.filtrer(l, test, MAX_PAR_GROUPE);
      envoyer(id, { type: 'groupe', longueur: L, mots: r.mots, total: r.total });
      return suivant();
    });
  }
  return Promise.resolve().then(suivant);
}

var TRAITEMENTS = {
  anagramme: function (id, p) {
    var brut = ML.lettres(p.lettres, true, ML.MAX_LETTRES);
    var jokers = Math.min(ML.MAX_JOKERS, (brut.match(/\?/g) || []).length);
    var connues = brut.replace(/\?/g, '');
    var n = connues.length + jokers;
    if (n < 2) { envoyer(id, { type: 'fin' }); return null; }
    var comptes = ML.compte(connues);
    var longueurs = [n];
    if (p.courts) { for (var L = n - 1; L >= 2; L--) { longueurs.push(L); } }
    return parLongueurs(id, longueurs, function (e) {
      var pos = ML.avecLettres(e.k, comptes, jokers);
      return pos === null ? false : { k: e.k, f: e.f, j: pos, p: ML.points(e.k, pos) };
    });
  },
  motif: function (id, p) {
    var m = ML.motif(p.motif);
    var sans = ML.lettres(p.sans, false, 26);
    if (m.length < 2) { envoyer(id, { type: 'fin' }); return null; }
    return parLongueurs(id, [m.length], function (e) {
      return ML.correspondMotif(e.k, m) && (!sans || ML.filtreLettres(e.k, { sans: sans }));
    });
  },
  lettres: function (id, p) {
    var o = { debut: ML.lettres(p.debut, false, 25), fin: ML.lettres(p.fin, false, 25),
      contient: ML.lettres(p.contient, false, 25), sans: ML.lettres(p.sans, false, 26) };
    var L = borne(p.longueur, 2, 25, 5);
    return parLongueurs(id, [L], function (e) { return ML.filtreLettres(e.k, o); });
  },
  sutom: function (id, p) {
    var L = borne(p.longueur, 4, 12, 6);
    var c = ML.preparerSutom({ longueur: L, bien: (p.bien || []).slice(0, L), mal: (p.mal || []).slice(0, L), absentes: p.absentes });
    return parLongueurs(id, [L], function (e) { return ML.filtreSutom(e.k, c); });
  },
  verifier: function (id, p) {
    var brut = String(p.mot || '').slice(0, 40).trim().toLowerCase();
    var k = ML.lettres(brut, false, 26);
    if (k.length < 2) { envoyer(id, { type: 'verdict', saisie: brut, cle: k, formes: [], exact: false }); envoyer(id, { type: 'fin' }); return null; }
    return liste(k.length).then(function (l) {
      var formes = [];
      var trie = k.split('').sort().join('');
      var anag = [];
      for (var i = 0; i < l.length; i++) {
        if (l[i].k === k) { formes = l[i].f.slice(); } else if (anag.length < 12 && l[i].k.split('').sort().join('') === trie) { anag.push({ k: l[i].k, f: l[i].f }); }
      }
      envoyer(id, { type: 'verdict', saisie: brut, cle: k, formes: formes, exact: formes.indexOf(brut) !== -1, anagrammes: anag, points: ML.points(k, []) });
      envoyer(id, { type: 'fin' });
    });
  }
};

self.onmessage = function (ev) {
  var d = ev.data || {};
  var id = d.id;
  var f = Object.prototype.hasOwnProperty.call(TRAITEMENTS, d.type) ? TRAITEMENTS[d.type] : null;
  if (!f) { envoyer(id, { type: 'erreur', message: 'demande inconnue' }); return; }
  try {
    var r = f(id, d.params || {});
    if (r && r.catch) { r.catch(function () { envoyer(id, { type: 'erreur', message: 'Le dictionnaire ne s\'est pas chargé. Vérifiez la connexion puis réessayez.' }); }); }
  } catch (e) {
    envoyer(id, { type: 'erreur', message: 'Recherche impossible.' });
  }
};
