/* Jours fériés et fêtes : aides communes aux outils (années bornées, petits calendriers, étiquettes).
   Rien n'est envoyé : tout est calculé dans le navigateur avec logique.js (objet FE). Aucun HTML injecté : textContent seulement. */
(function () {
  'use strict';
  var FE = window.FE;
  var ENTETE = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  // Effet d'un jour férié selon le jour de la semaine (mêmes textes que les pages « année », voir build.py).
  var EFFETS = {
    weekend: ['Tombe un week-end', 'e-we'], lundi: ['Week-end de 3 jours', 'e-long'], vendredi: ['Week-end de 3 jours', 'e-long'],
    'pont-lundi': ['Pont possible le lundi', 'e-pont'], 'pont-vendredi': ['Pont possible le vendredi', 'e-pont'],
    mercredi: ['Milieu de semaine', 'e-milieu']
  };

  var FX = {
    el: function (tag, classe, texte) {
      var e = document.createElement(tag);
      if (classe) { e.className = classe; }
      if (texte !== undefined && texte !== null) { e.textContent = texte; }
      return e;
    },
    vider: function (n) { while (n && n.firstChild) { n.removeChild(n.firstChild); } },
    ecrire: function (id, texte) {
      var e = document.getElementById(id);
      if (e && e.textContent !== texte) { e.textContent = texte; }
    },
    // Numéro du jour d'aujourd'hui (date de l'appareil).
    aujourdhui: function () { var d = new Date(); return FE.num(d.getFullYear(), d.getMonth() + 1, d.getDate()); },
    anneeCourante: function () { return new Date().getFullYear(); },
    // Année lue dans un champ : entière et bornée, sinon la valeur par défaut (et un message sous le champ).
    annee: function (id, min, max, defaut) {
      var e = document.getElementById(id), a = FE.lireAnnee(e ? e.value : '', min, max), msg = document.getElementById(id + 'Msg');
      if (msg) { msg.textContent = isFinite(a) || !e || e.value === '' ? '' : 'Année entre ' + min + ' et ' + max + ' : ' + defaut + ' affichée.'; }
      return isFinite(a) ? a : defaut;
    },
    // Remplit un champ vide avec une valeur par défaut (avant la lecture de l'adresse par CQ.initPartage).
    defaut: function (id, valeur) { var e = document.getElementById(id); if (e && e.value === '') { e.value = String(valeur); } },
    dans: function (n, ref) {
      var d = n - ref;
      return d === 0 ? "aujourd'hui" : d === 1 ? 'demain' : d > 1 ? 'dans ' + d + ' jours' : d === -1 ? 'hier' : 'il y a ' + (-d) + ' jours';
    },
    majuscule: function (t) { return t ? t.charAt(0).toUpperCase() + t.slice(1) : t; },
    etiquette: function (effet) {
      var x = EFFETS[effet] || ['', ''];
      return FX.el('span', 'etiquette ' + x[1], x[0]);
    },
    texteEffet: function (effet) { return (EFFETS[effet] || [''])[0]; },
    // Un mois en petit calendrier : marques = {numéro de jour: {classe, titre}}.
    mois: function (a, mo, marques, auj) {
      var bloc = FX.el('div', 'mois-cal'), t = FX.el('table', 'mini'), thead = FX.el('thead'), tr = FX.el('tr'), tb = FX.el('tbody');
      bloc.appendChild(FX.el('p', 'titre-mois', FE.MOIS[mo - 1] + ' ' + a));
      ENTETE.forEach(function (j) { tr.appendChild(FX.el('th', '', j)); });
      thead.appendChild(tr);
      t.appendChild(thead);
      var premier = FE.num(a, mo, 1), decal = (FE.jourSemaine(premier) + 6) % 7, nb = FE.joursDansMois(a, mo), j, n, td, m;
      tr = FX.el('tr');
      for (j = 0; j < decal; j++) { tr.appendChild(FX.el('td')); }
      for (j = 1; j <= nb; j++) {
        n = premier + j - 1;
        td = FX.el('td', FE.jourSemaine(n) % 6 === 0 ? 'we' : '', String(j));
        m = marques && marques[n];
        if (m) { td.className = m.classe; if (m.titre) { td.title = m.titre; } }
        if (n === auj) { td.className += ' aujourdhui'; }
        tr.appendChild(td);
        if ((decal + j) % 7 === 0) { tb.appendChild(tr); tr = FX.el('tr'); }
      }
      if (tr.childNodes.length) { while (tr.childNodes.length < 7) { tr.appendChild(FX.el('td')); } tb.appendChild(tr); }
      t.appendChild(tb);
      bloc.appendChild(t);
      return bloc;
    },
    // Plusieurs mois à la suite (au plus 14) dans un conteneur.
    calendrier: function (id, a, moDebut, nbMois, marques) {
      var c = document.getElementById(id), auj = FX.aujourdhui(), k, mo, an;
      if (!c) { return; }
      FX.vider(c);
      for (k = 0; k < Math.min(14, nbMois); k++) {
        mo = ((moDebut - 1 + k) % 12) + 1;
        an = a + Math.floor((moDebut - 1 + k) / 12);
        c.appendChild(FX.mois(an, mo, marques, auj));
      }
    }
  };
  window.FX = FX;
}());
