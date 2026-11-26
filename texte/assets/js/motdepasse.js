/* Générateur de mot de passe : crypto.getRandomValues SEULEMENT (CQ.hasard), rien d'envoyé ni de gardé (ni adresse,
   ni stockage). Le mot de passe n'est jamais annoncé à voix haute ni écrit ailleurs que dans son champ. */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX;
  if (!CQ || !TX) { return; }
  var R = (window.TX_DATA && window.TX_DATA.reglages) || {};
  var NIVEAUX = R.mdp_niveaux || ['Faible', 'Moyen', 'Solide', 'Très solide'];
  var COURTS = ['Faible', 'Moyen', 'Solide', 'Très solide'];
  var sortie = CQ.el('mp-resultat'), lon = CQ.el('mp-longueur'), lonv = CQ.el('mp-long-val');
  var jauge = CQ.el('mp-jauge'), avis = CQ.el('mp-avis'), msg = CQ.el('mp-msg');
  if (!sortie || !lon) { return; }

  function options() {
    return {
      longueur: parseInt(lon.value, 10), minuscules: CQ.el('mp-min').checked, majuscules: CQ.el('mp-maj').checked,
      chiffres: CQ.el('mp-chi').checked, symboles: CQ.el('mp-sym').checked, sansAmbigus: CQ.el('mp-amb').checked
    };
  }
  function force(bits) {
    if (!bits) {
      CQ.texte('mp-bits', '–');
      CQ.texte('mp-niveau', '–');
      jauge.style.setProperty('--pos', '0%');
      avis.textContent = '';
      return;
    }
    var nv = TX.niveau(bits);
    CQ.texte('mp-bits', String(Math.floor(bits)));
    CQ.texte('mp-niveau', COURTS[nv]);
    jauge.style.setProperty('--pos', Math.min(100, bits / 128 * 100).toFixed(1) + '%');
    avis.textContent = NIVEAUX[nv];
  }
  function generer() {
    lonv.textContent = lon.value;
    var o = options();
    sortie.value = '';
    if (!CQ.hasard) {
      msg.textContent = 'Votre navigateur ne fournit pas de générateur aléatoire sûr : impossible de créer un mot de passe ici.';
      force(0);
      return;
    }
    if (!(o.minuscules || o.majuscules || o.chiffres || o.symboles)) {
      msg.textContent = 'Cochez au moins une famille de caractères.';
      force(0);
      return;
    }
    msg.textContent = '';
    sortie.value = TX.motDePasse(o, CQ.hasard);
    force(TX.entropie(o));
  }

  lon.addEventListener('input', generer);
  ['mp-min', 'mp-maj', 'mp-chi', 'mp-sym', 'mp-amb'].forEach(function (id) { CQ.el(id).addEventListener('change', generer); });
  CQ.el('mp-nouveau').addEventListener('click', generer);
  CQ.el('mp-copier').addEventListener('click', function () {
    CQ.copier(sortie.value, 'Mot de passe copié : collez-le dans votre gestionnaire');
  });
  generer();
}());
