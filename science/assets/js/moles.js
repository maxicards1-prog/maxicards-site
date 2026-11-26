/* Convertisseur grammes, moles, nombre de particules (constante d'Avogadro exacte). Textes seulement. */
(function () {
  'use strict';
  var SC = window.SC;
  var CQ = window.CQ;
  if (!SC || !CQ) { return; }
  var AIDES = {
    masse: 'Masse en grammes (exemple : 18 ou 2,5).',
    moles: 'Quantité de matière en moles (exemple : 0,5).',
    particules: 'Nombre d\'atomes ou de molécules (exemple : 6,022e23 ou 3 × 10^22).'
  };

  function calcul() {
    var saisie = CQ.valeur('mf');
    var type = CQ.valeur('mt');
    var aide = document.getElementById('mvAide');
    if (aide && AIDES[type]) { aide.textContent = AIDES[type]; }
    var msg = document.getElementById('mvMessage');
    var champM = document.getElementById('mf');
    var champV = document.getElementById('mv');
    var M = SC.masseDepuisSaisie(saisie);
    var max = type === 'particules' ? 1e60 : 1e30;
    var v = SC.lireNombre(CQ.valeur('mv'), max);
    var texteM = '–';
    if (M.ok) {
      texteM = M.source === 'formule' ? CQ.decimal(M.arrondie, M.decimales) + ' g/mol' : CQ.souple(M.masse, 6) + ' g/mol';
    }
    CQ.texte('mvM', texteM);
    if (champM) { champM.setAttribute('aria-invalid', String(!M.ok && saisie.trim() !== '')); }
    if (champV) { champV.setAttribute('aria-invalid', String(!isFinite(v) && CQ.valeur('mv').trim() !== '')); }
    var r = M.ok && isFinite(v) ? SC.convertir(type, v, M.masse) : null;
    if (!r) {
      ['mvMasse', 'mvMoles', 'mvParticules'].forEach(function (id) { CQ.texte(id, '–'); });
      var m = '';
      if (!M.ok && saisie.trim() !== '') { m = M.erreur; } else if (CQ.valeur('mv').trim() !== '' && !isFinite(v)) { m = 'Valeur non lue : tapez un nombre positif, par exemple 12,5 ou 6,02e23.'; }
      if (msg) { msg.textContent = m; }
      CQ.texte('phrase', '');
      return;
    }
    CQ.texte('mvMasse', SC.scientifiqueTexte(r.masse, 4) + ' g');
    CQ.texte('mvMoles', SC.scientifiqueTexte(r.moles, 4) + ' mol');
    CQ.texte('mvParticules', SC.scientifiqueTexte(r.particules, 4));
    if (msg) { msg.textContent = M.isotopes && M.isotopes.length ? 'Masse molaire approchée : ' + M.isotopes.join(', ') + ' n\'a pas de masse atomique standard.' : ''; }
    var nom = M.source === 'formule' ? saisie.trim().slice(0, 40) : 'cette substance';
    CQ.texte('phrase', SC.scientifiqueTexte(r.masse, 4) + ' g de ' + nom + ' = ' + SC.scientifiqueTexte(r.moles, 4) + ' mol = ' + SC.scientifiqueTexte(r.particules, 4) + ' entités.');
  }

  CQ.surChangement(['mf', 'mt', 'mv'], calcul);
  CQ.initPartage(calcul);
}());
