/* Rôtis et gigot : temps selon le poids et la cuisson, températures à cœur. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function plage(a, b) { return b < 60 ? a + ' à ' + b + ' min' : CQ.hm(a) + ' à ' + CQ.hm(b); }
  function viande() {
    var id = CQ.valeur('viande'), r = null;
    CU.D.rotis.forEach(function (x) { if (x.id === id) { r = x; } });
    return r;
  }
  function remplirNiveaux() {
    var sel = document.getElementById('niveau'), r = viande(), avant = sel.value;
    affichee = CQ.valeur('viande');
    while (sel.firstChild) { sel.removeChild(sel.firstChild); }
    r.niveaux.forEach(function (n) {
      var o = document.createElement('option'); o.value = n.id; o.textContent = n.nom; sel.appendChild(o);
    });
    var ok = r.niveaux.some(function (n) { return n.id === avant; });
    sel.value = ok ? avant : r.niveaux[1].id;
  }
  var affichee = '';
  function recalcul() {
    if (affichee !== CQ.valeur('viande')) { remplirNiveaux(); }
    var kg = CQ.nombre('kg', 0.3, 10);
    var ids = ['rTemps', 'rFour', 'rCoeur', 'rRepos'];
    if (!isFinite(kg) || kg <= 0) { ids.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var x = CU.roti(CQ.valeur('viande'), CQ.valeur('niveau'), kg);
    if (!x) { return; }
    CQ.texte('rTemps', plage(x.lo, x.hi));
    CQ.texte('rFour', x.r.four + ' °C (th. ' + CQ.souple(x.r.four / 30, 1) + ')');
    CQ.texte('rCoeur', x.n.coeur[0] + ' à ' + x.n.coeur[1] + ' °C');
    CQ.texte('rRepos', x.r.repos[0] + ' à ' + x.r.repos[1] + ' min');
    var msg = x.r.nom + ' ' + x.n.nom.toLowerCase() + ' de ' + CQ.souple(kg, 2) + ' kg : ' + x.n.mkg[0] + ' à ' + x.n.mkg[1] + ' min par kilo à ' + x.r.four + ' °C.';
    if (x.n.coeur[1] < 63) { msg += ' Sous 63 °C à cœur, la cuisson est un choix de goût : les personnes fragiles (jeunes enfants, femmes enceintes, personnes âgées) la préfèrent plus cuite.'; }
    if (x.horsPlage) { msg += ' Ce poids est inhabituel : le temps est une estimation.'; }
    CQ.texte('phrase', msg);
  }
  remplirNiveaux();
  CQ.surChangement(['viande', 'niveau', 'kg'], recalcul);
  CQ.initPartage(recalcul);
}());
