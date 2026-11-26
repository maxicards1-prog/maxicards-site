/* Rubrique Heure : aides communes aux outils (villes, formats, listes gardées). Rien n'est envoyé : tout est calculé
   dans le navigateur, à partir de l'horloge de l'appareil et de la base des fuseaux horaires du navigateur. */
(function () {
  'use strict';
  var HE = window.HE, V = window.HV || {};
  var JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  var deux = HE.deux;
  var zoneIci = null;

  var HX = {
    JOURS: JOURS, MOIS: MOIS,
    // Ville connue (liste fixe du site) ou null : jamais d'identifiant inventé.
    ville: function (id) {
      if (typeof id !== 'string' || !Object.prototype.hasOwnProperty.call(V, id)) { return null; }
      var v = V[id];
      return { id: id, nom: v[0], pays: v[1], zone: v[2], lat: v[3], lon: v[4] };
    },
    // Fuseau de l'appareil (UTC si le navigateur ne le donne pas).
    zoneAppareil: function () {
      if (zoneIci === null) {
        try { zoneIci = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { zoneIci = 'UTC'; }
        if (!HE.zoneValide(zoneIci)) { zoneIci = 'UTC'; }
      }
      return zoneIci;
    },
    hm: function (p) { return deux(p.h) + ':' + deux(p.mi); },
    hms: function (p) { return deux(p.h) + ':' + deux(p.mi) + ':' + deux(p.s); },
    heureTexte: function (p) { return p.h + ' h ' + deux(p.mi); },
    dateLongue: function (p) { return JOURS[p.js] + ' ' + p.j + (p.j === 1 ? 'er' : '') + ' ' + MOIS[p.mo - 1] + ' ' + p.a; },
    dateCourte: function (p) { return JOURS[p.js] + ' ' + p.j + (p.j === 1 ? 'er' : '') + ' ' + MOIS[p.mo - 1]; },
    jourMois: function (p) { return p.j + (p.j === 1 ? 'er' : '') + ' ' + MOIS[p.mo - 1]; },
    // Écart en jours entre deux dates murales (-1 : la veille, +1 : le lendemain).
    jourRelatif: function (p, ref) {
      return Math.round((Date.UTC(p.a, p.mo - 1, p.j) - Date.UTC(ref.a, ref.mo - 1, ref.j)) / 86400000);
    },
    texteJour: function (d) { return d === 0 ? 'même jour' : d === 1 ? 'le lendemain' : d === -1 ? 'la veille' : (d > 0 ? '+' : '') + d + ' j'; },
    // "AAAA-MM-JJ" -> {a, mo, j} (date réelle, année bornée), ou null.
    lireDate: function (texte, amin, amax) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texte || ''));
      if (!m) { return null; }
      var a = +m[1], mo = +m[2], j = +m[3];
      if (a < (amin || 1000) || a > (amax || 3000) || mo < 1 || mo > 12 || j < 1) { return null; }
      var d = new Date(Date.UTC(a, mo - 1, j));
      if (d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) { return null; }
      return { a: a, mo: mo, j: j };
    },
    iso: function (p) { return p.a + '-' + deux(p.mo) + '-' + deux(p.j); },
    // "HH:MM" -> {h, mi} ou null.
    lireHeure: function (texte) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(texte || '').trim());
      if (!m || +m[1] > 23 || +m[2] > 59) { return null; }
      return { h: +m[1], mi: +m[2] };
    },
    // "paris,new-york" -> identifiants connus, sans doublon, au plus n.
    lireListe: function (texte, n) {
      var res = [];
      String(texte || '').slice(0, 400).split(',').forEach(function (id) {
        id = id.trim();
        if (res.length < n && HX.ville(id) && res.indexOf(id) === -1) { res.push(id); }
      });
      return res;
    },
    // Stockage local : seulement la liste de villes choisie par la personne.
    garder: function (cle, valeur) { try { window.localStorage.setItem(cle, valeur); } catch (e) { /* stockage refusé */ } },
    relire: function (cle) { try { return window.localStorage.getItem(cle) || ''; } catch (e) { return ''; } },
    el: function (tag, classe, texte) {
      var e = document.createElement(tag);
      if (classe) { e.className = classe; }
      if (texte !== undefined && texte !== null) { e.textContent = texte; }
      return e;
    },
    vider: function (n) { while (n && n.firstChild) { n.removeChild(n.firstChild); } },
    // Texte posé sans animation (horloges), seulement s'il change.
    ecrire: function (cible, texte) {
      var e = typeof cible === 'string' ? document.getElementById(cible) : cible;
      if (e && e.textContent !== texte) { e.textContent = texte; }
    },
    // Appelle fn à chaque nouvelle seconde.
    chaqueSeconde: function (fn) {
      var boucle = function () { fn(); setTimeout(boucle, 1000 - (Date.now() % 1000) + 15); };
      boucle();
    },
    // Avertit la page qu'un champ caché [data-p] a changé (pour le lien de partage).
    signaler: function (champ) {
      var ev;
      try { ev = new Event('input'); } catch (e) { ev = document.createEvent('Event'); ev.initEvent('input', true, true); }
      champ.dispatchEvent(ev);
    },
    // Heure murale avant un changement d'heure (ex. "2 h 00" pour 2 h -> 3 h).
    avantChangement: function (zone, t) {
      var p = HE.parties(zone, t.ms), m = ((p.h * 60 + p.mi - (t.apres - t.avant)) % 1440 + 1440) % 1440;
      return Math.floor(m / 60) + ' h ' + deux(m % 60);
    },
    // Dessin de la Lune : chemin de la partie éclairée (cercle de rayon 49 centré en 50, 50).
    cheminLune: function (fraction, croissante, sud) {
      var k = Math.max(0, Math.min(1, fraction)), r = 49, rx = Math.abs(1 - 2 * k) * r;
      var droite = croissante !== !!sud; // côté éclairé : à droite pour une lune croissante vue de l'hémisphère nord
      var bord = droite ? 'M50 1 A49 49 0 0 1 50 99' : 'M50 1 A49 49 0 0 0 50 99';
      var balayage = droite ? (k < 0.5 ? 0 : 1) : (k < 0.5 ? 1 : 0);
      if (k < 0.005) { return ''; }
      return bord + ' A' + rx.toFixed(2) + ' ' + r + ' 0 0 ' + balayage + ' 50 1 Z';
    }
  };
  window.HX = HX;
}());
