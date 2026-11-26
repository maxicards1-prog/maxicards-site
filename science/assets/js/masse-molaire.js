/* Calculateur de masse molaire : lecture de la formule, masse en g/mol, composition en % massique. Textes seulement. */
(function () {
  'use strict';
  var SC = window.SC;
  var CQ = window.CQ;
  if (!SC || !CQ) { return; }
  var champ = document.getElementById('f');

  function fr(v, dec) { return CQ.decimal(v, dec); }

  function calcul() {
    var texte = champ ? champ.value : '';
    var r = SC.masseMolaire(texte);
    var msg = document.getElementById('mmMessage');
    if (!r.ok) {
      CQ.texte('mmMasse', '–');
      CQ.texte('mmHill', '–');
      CQ.texte('mmAtomes', '–');
      CQ.lignes('mmCompo', []);
      if (champ) { champ.setAttribute('aria-invalid', String(texte.trim() !== '')); }
      if (msg) { msg.textContent = texte.trim() === '' ? '' : r.erreur; }
      CQ.texte('phrase', '');
      return;
    }
    if (champ) { champ.setAttribute('aria-invalid', 'false'); }
    CQ.texte('mmMasse', fr(r.arrondie, r.decimales) + ' g/mol');
    CQ.texte('mmHill', r.hill);
    CQ.texte('mmAtomes', SC.scientifiqueTexte(r.atomes, 6));
    CQ.lignes('mmCompo', r.lignes.map(function (l) {
      return { cellules: [l.symbole + ' (' + l.nom.toLowerCase() + ')', CQ.entier(l.nombre), CQ.souple(l.masseAtome, 4), CQ.souple(l.masse, 4), fr(l.pourcent, 2) + ' %'], nombres: [1, 2, 3, 4] };
    }));
    var note = '';
    if (r.isotopes.length) {
      note = 'Valeur approchée : ' + r.isotopes.join(', ') + ' n\'a pas de masse atomique standard ; on utilise le nombre de masse de son isotope le plus stable.';
    }
    if (msg) { msg.textContent = note; }
    CQ.texte('phrase', 'Une mole de ' + texte.trim().slice(0, 60) + ' pèse ' + fr(r.arrondie, r.decimales) + ' g, soit 6,022 × 10²³ unités de formule.');
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-formule]'), function (b) {
    b.addEventListener('click', function () {
      if (!champ) { return; }
      champ.value = b.getAttribute('data-formule');
      champ.dispatchEvent(new Event('input'));
    });
  });
  CQ.surChangement(['f'], calcul);
  CQ.initPartage(calcul);
}());
