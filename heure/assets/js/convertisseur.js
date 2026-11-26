/* Convertisseur d'heure : une heure dans une ville -> l'heure dans vos autres villes, et la journée entière en un tableau
   (heures de bureau, soirée, nuit) pour trouver un créneau de réunion. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var CLE = 'heure-convertisseur-villes', MAX = 12, DEFAUT = ['new-york', 'londres', 'tokyo'];
  var champ = CQ.el('v'), ul = CQ.el('liste'), liste = [];

  function classe(h) { return h >= 9 && h < 18 ? 'bureau' : (h >= 7 && h < 9) || (h >= 18 && h < 22) ? 'possible' : 'nuit'; }
  // Liste ouverte par un lien (différente de la liste gardée) : on ne remplace jamais la liste gardée de la personne.
  var depuisLien = false;
  function sauver() {
    if (!depuisLien) { HX.garder(CLE, liste.join(',')); }
    champ.value = liste.join(','); HX.signaler(champ);
  }

  function jourChoisi(zone) {
    var d = HX.lireDate(CQ.valeur('d'), 1900, 2100);
    if (d) { return d; }
    var p = HE.parties(zone, Date.now());
    return { a: p.a, mo: p.mo, j: p.j };
  }

  function dessiner() {
    HX.vider(ul);
    liste.forEach(function (id) {
      var v = HX.ville(id), li = HX.el('li'), nom = HX.el('span', 'lv-nom'), b = HX.el('button', '', 'Retirer');
      li.setAttribute('data-ville', id);
      nom.appendChild(HX.el('strong', '', v.nom));
      nom.appendChild(HX.el('span', 'lv-info', '–'));
      b.type = 'button';
      b.setAttribute('aria-label', 'Retirer ' + v.nom);
      b.addEventListener('click', function () {
        var i = liste.indexOf(id);
        if (i !== -1) { liste.splice(i, 1); }
        sauver(); dessiner(); recalcul();
      });
      li.appendChild(nom);
      li.appendChild(HX.el('span', 'lv-heure', '–'));
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  function recalcul() {
    var S = HX.ville(CQ.valeur('de')) || HX.ville('paris');
    var d = jourChoisi(S.zone), h = HX.lireHeure(CQ.valeur('h')) || { h: 9, mi: 0 };
    var r = HE.versInstant(S.zone, d.a, d.mo, d.j, h.h, h.mi), t = r.ms, ps = HE.parties(S.zone, t);
    var msg = '';
    if (!r.ok) {
      msg = 'Attention : ' + h.h + ' h ' + HE.deux(h.mi) + ' n\'existe pas à ' + S.nom + ' ce jour-là (on passe à l\'heure d\'été et les horloges sautent une heure). Calcul fait pour ' + HX.heureTexte(ps) + '. ';
    }
    var lignesPhrase = [];
    Array.prototype.forEach.call(ul.querySelectorAll('li[data-ville]'), function (li) {
      var v = HX.ville(li.getAttribute('data-ville'));
      if (!v) { return; }
      var p = HE.parties(v.zone, t), j = HX.jourRelatif(p, ps), e = HE.decalage(v.zone, t) - HE.decalage(S.zone, t);
      HX.ecrire(li.querySelector('.lv-heure'), HX.hm(p));
      var info = HE.texteUTC(HE.decalage(v.zone, t)) + ' · ' + HE.texteEcart(e) + (j ? ' · ' + HX.texteJour(j) : '') +
        (classe(p.h) === 'bureau' ? ' · heures de bureau' : classe(p.h) === 'nuit' ? ' · la nuit' : '');
      HX.ecrire(li.querySelector('.lv-info'), info);
      lignesPhrase.push(HX.heureTexte(p) + ' à ' + v.nom + (j ? ' (' + HX.texteJour(j) + ')' : ''));
    });
    CQ.texte('rSource', HX.heureTexte(ps));
    HX.ecrire('lSource', 'à ' + S.nom + ', le ' + HX.dateCourte(ps));
    msg += lignesPhrase.length ? 'Quand il est ' + HX.heureTexte(ps) + ' à ' + S.nom + ' le ' + HX.dateCourte(ps) + ', il est ' + lignesPhrase.join(', ') + '.' :
      'Ajoutez au moins une ville pour voir l\'heure correspondante.';
    // Journée entière, heure par heure, à partir de minuit dans la ville de départ.
    var villes = [S].concat(liste.map(HX.ville).filter(function (v) { return v && v.id !== S.id; }));
    var tete = CQ.el('plagesTete'), corps = CQ.el('plages');
    HX.vider(tete); HX.vider(corps);
    tete.appendChild(HX.el('th', '', 'Heure à ' + S.nom));
    var debut = [], score = [];
    for (var i = 0; i < 24; i++) {
      var x = HE.versInstant(S.zone, d.a, d.mo, d.j, i, 0);
      debut.push(x.ok ? x.ms : null);
      var th = HX.el('th', i === h.h ? 'choisie' : ''), bt = HX.el('button', 'case-heure', i + ' h');
      bt.type = 'button';
      bt.setAttribute('aria-label', 'Choisir ' + i + ' h à ' + S.nom);
      bt.setAttribute('data-h', String(i));
      bt.addEventListener('click', function () {
        var hc = CQ.el('h');
        hc.value = HE.deux(+this.getAttribute('data-h')) + ':00';
        HX.signaler(hc);
        recalcul();
      });
      th.appendChild(bt);
      tete.appendChild(th);
      score.push(0);
    }
    villes.forEach(function (v) {
      var tr = HX.el('tr');
      tr.appendChild(HX.el('th', '', v.nom));
      debut.forEach(function (ms, k) {
        if (ms === null) { tr.appendChild(HX.el('td', 'nuit', '–')); return; }
        var p = HE.parties(v.zone, ms), c = classe(p.h);
        if (c === 'bureau') { score[k] += 1; }
        tr.appendChild(HX.el('td', c + (k === h.h ? ' choisie' : ''), p.h + (p.mi ? ':' + HE.deux(p.mi) : '')));
      });
      corps.appendChild(tr);
    });
    // Créneaux où toutes les villes sont aux heures de bureau (9 h - 18 h).
    var tous = [], max = 0;
    score.forEach(function (s, k) { if (debut[k] !== null) { max = Math.max(max, s); if (s === villes.length) { tous.push(k); } } });
    if (villes.length > 1) {
      if (tous.length) {
        msg += ' Créneaux où tout le monde est aux heures de bureau (9 h - 18 h) : ' + tous.map(function (k) { return k + ' h'; }).join(', ') + ' (heure de ' + S.nom + ').';
      } else {
        var mieux = [];
        score.forEach(function (s, k) { if (s === max && debut[k] !== null) { mieux.push(k + ' h'); } });
        msg += ' Aucun créneau commun aux heures de bureau ce jour-là ; le plus de villes (' + max + ' sur ' + villes.length + ') sont au bureau à ' + mieux.join(', ') + ' (heure de ' + S.nom + ').';
      }
    }
    CQ.texte('phrase', msg);
  }

  CQ.el('ajouter').addEventListener('click', function () {
    var id = CQ.valeur('ajout'), v = HX.ville(id);
    if (!v || liste.indexOf(id) !== -1 || liste.length >= MAX) {
      CQ.texte('etatListe', !v ? '' : liste.length >= MAX ? 'Liste limitée à ' + MAX + ' villes.' : v.nom + ' est déjà dans la liste.');
      return;
    }
    liste.push(id);
    sauver(); dessiner(); recalcul();
    CQ.texte('etatListe', v.nom + ' ajoutée.');
  });
  CQ.surChangement(['d', 'h', 'de'], recalcul);
  CQ.initPartage(function () {
    var garde = HX.lireListe(HX.relire(CLE), MAX);
    liste = HX.lireListe(champ.value, MAX);
    depuisLien = liste.length > 0 && liste.join(',') !== garde.join(',');
    if (!liste.length) { liste = garde; }
    if (!liste.length) { liste = DEFAUT.slice(); }
    if (depuisLien) { CQ.texte('etatListe', 'Liste ouverte par un lien : votre liste gardée dans ce navigateur ne change pas.'); }
    if (!CQ.valeur('d')) {
      var S = HX.ville(CQ.valeur('de')) || HX.ville('paris');
      CQ.el('d').value = HX.iso(HE.parties(S.zone, Date.now()));
    }
    dessiner();
    recalcul();
  });
}());
