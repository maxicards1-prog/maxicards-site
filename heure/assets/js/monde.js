/* Heure dans le monde : votre heure, votre liste de villes (gardée dans ce navigateur) et le tableau de toutes les villes. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var CLE = 'heure-monde-villes', MAX = 20;
  var DEFAUT = ['paris', 'londres', 'new-york', 'montreal', 'tokyo', 'sydney', 'saint-denis'];
  var champ = CQ.el('v'), ul = CQ.el('liste'), choix = CQ.el('ajout'), etat = CQ.el('etatListe');
  var liste = [], derniereMinute = -1;
  var lignesTableau = Array.prototype.slice.call(document.querySelectorAll('tr[data-ville]'));

  // Liste ouverte par un lien (différente de la liste gardée) : on ne remplace jamais la liste gardée de la personne.
  var depuisLien = false;
  function sauver() {
    if (!depuisLien) { HX.garder(CLE, liste.join(',')); }
    champ.value = liste.join(',');
    HX.signaler(champ);
  }
  function dessiner() {
    HX.vider(ul);
    liste.forEach(function (id) {
      var v = HX.ville(id);
      var li = HX.el('li'), nom = HX.el('span', 'lv-nom'), b = HX.el('button', '', 'Retirer');
      li.setAttribute('data-ville', id);
      nom.appendChild(HX.el('strong', '', v.nom));
      nom.appendChild(HX.el('span', 'lv-info', '–'));
      b.type = 'button';
      b.setAttribute('aria-label', 'Retirer ' + v.nom + ' de la liste');
      b.addEventListener('click', function () {
        var i = liste.indexOf(id);
        if (i !== -1) { liste.splice(i, 1); }
        sauver(); dessiner(); tic();
        CQ.texte('etatListe', v.nom + ' retirée de la liste.');
      });
      li.appendChild(nom);
      li.appendChild(HX.el('span', 'lv-heure', '–'));
      li.appendChild(b);
      ul.appendChild(li);
    });
  }
  function tic() {
    var now = Date.now(), zi = HX.zoneAppareil(), pi = HE.parties(zi, now), di = HE.decalage(zi, now);
    HX.ecrire('hIci', HX.hms(pi));
    HX.ecrire('hIciInfo', HX.dateLongue(pi) + ' · ' + zi.replace(/_/g, ' ') + ' (' + HE.texteUTC(di) + ')');
    Array.prototype.forEach.call(ul.querySelectorAll('li[data-ville]'), function (li) {
      var v = HX.ville(li.getAttribute('data-ville'));
      if (!v) { return; }
      var p = HE.parties(v.zone, now), d = HE.decalage(v.zone, now) - di, j = HX.jourRelatif(p, pi);
      HX.ecrire(li.querySelector('.lv-heure'), HX.hm(p));
      HX.ecrire(li.querySelector('.lv-info'), v.pays + ' · ' + HE.texteEcart(d) + (j ? ' · ' + HX.texteJour(j) : ''));
    });
    if (pi.mi !== derniereMinute) {
      derniereMinute = pi.mi;
      var dParis = HE.decalage('Europe/Paris', now);
      lignesTableau.forEach(function (tr) {
        var v = HX.ville(tr.getAttribute('data-ville'));
        if (!v) { return; }
        var p = HE.parties(v.zone, now), c = tr.cells;
        HX.ecrire(c[2], HX.hm(p) + (HX.jourRelatif(p, pi) ? ' (' + HX.dateCourte(p).replace(/^(\S+) .*/, '$1') + ')' : ''));
        HX.ecrire(c[3], HE.texteEcart(HE.decalage(v.zone, now) - dParis));
      });
    }
  }
  CQ.el('ajouter').addEventListener('click', function () {
    var id = choix.value, v = HX.ville(id);
    if (!v) { return; }
    if (liste.indexOf(id) !== -1) { CQ.texte('etatListe', v.nom + ' est déjà dans la liste.'); return; }
    if (liste.length >= MAX) { CQ.texte('etatListe', 'La liste est limitée à ' + MAX + ' villes.'); return; }
    liste.push(id);
    sauver(); dessiner(); tic();
    CQ.texte('etatListe', v.nom + ' ajoutée à la liste.');
  });
  CQ.initPartage(function () {
    var garde = HX.lireListe(HX.relire(CLE), MAX);
    liste = HX.lireListe(champ.value, MAX);
    depuisLien = liste.length > 0 && liste.join(',') !== garde.join(',');
    if (!liste.length) { liste = garde; }
    if (!liste.length) { liste = DEFAUT.slice(); }
    dessiner();
    if (etat) { etat.textContent = depuisLien ? 'Liste ouverte par un lien : votre liste gardée dans ce navigateur ne change pas.' : ''; }
    HX.chaqueSeconde(tic);
  });
}());
