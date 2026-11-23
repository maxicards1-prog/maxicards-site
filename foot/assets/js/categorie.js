/* Calculateur de catégorie (page catégories et page ballon). */
(function () {
  'use strict';
  var O = window.OCP, F = window.FOOT;
  function calculer() {
    var annee = O.nombre('annee', 1900, 2100);
    var saisonEl = document.getElementById('saison');
    var saison = saisonEl ? Number(saisonEl.value) : 2026;
    if (!isFinite(annee) || String(document.getElementById('annee').value).length < 4) {
      O.texte('rCat', '–'); O.texte('rPratique', '–'); O.texte('rBallon', '–'); O.texte('rAge', '–');
      return;
    }
    var r = F.categorie(annee, saison);
    O.texte('rCat', r.nom);
    O.texte('rPratique', r.pratique);
    O.texte('rBallon', r.ballon);
    O.texte('rAge', r.age > 0 ? r.age + ' ans en ' + (saison + 1) : '–');
  }
  O.surChangement(['annee', 'saison'], calculer);
  calculer();
}());
