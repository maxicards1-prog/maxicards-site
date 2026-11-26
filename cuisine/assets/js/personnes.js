/* Adapter une recette au nombre de personnes : texte saisi, résultat écrit avec textContent seulement. */
(function () {
  'use strict';
  var CQ = window.CQ, CU = window.CU;
  function recalcul() {
    var de = CQ.nombre('de', 1, 1000), vers = CQ.nombre('vers', 1, 1000);
    var zone = document.getElementById('resultat');
    while (zone.firstChild) { zone.removeChild(zone.firstChild); }
    var lignes = String(document.getElementById('liste').value).split(/\r?\n/).map(function (x) { return x.trim(); }).filter(function (x) { return x; }).slice(0, 80);
    if (!isFinite(de) || !isFinite(vers) || !lignes.length) { CQ.texte('phrase', ''); return; }
    CU.adapterRecette(lignes, de, vers).forEach(function (r) {
      var li = document.createElement('li');
      li.textContent = r.apres;
      if (r.note) { var s = document.createElement('small'); s.textContent = ' (' + r.note + ')'; li.appendChild(s); }
      zone.appendChild(li);
    });
    CQ.texte('phrase', 'Coefficient : × ' + CQ.souple(vers / de, 3) + '. Les quantités sont multipliées ; goûtez avant de saler ou d\'épicer autant.');
  }
  CQ.surChangement(['de', 'vers', 'liste'], recalcul);
  CQ.initPartage(recalcul);
}());
