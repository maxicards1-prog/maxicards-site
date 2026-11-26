/* Chiffres romains : conversion dans les deux sens (1 à 3 999), avec le détail et la raison d'un refus. */
(function () {
  'use strict';
  var CQ = window.CQ, TX = window.TX;
  if (!CQ || !TX) { return; }
  var saisie = CQ.el('rm-saisie'), res = CQ.el('rm-res'), lib = CQ.el('rm-lib'), detail = CQ.el('rm-detail'), msg = CQ.el('rm-msg');
  if (!saisie || !res) { return; }
  var nf = new Intl.NumberFormat('fr-FR'), actuel = '';

  function detailDe(n) {
    var d = TX.decomposer(n);
    return d.map(function (x) { return x[0]; }).join(' + ') + ' = ' + d.map(function (x) { return nf.format(x[1]); }).join(' + ');
  }
  function poser(valeur, libelle, n) {
    actuel = String(valeur);
    CQ.texte(res, actuel);
    lib.textContent = libelle;
    detail.textContent = detailDe(n);
    msg.textContent = '';
    saisie.removeAttribute('aria-invalid');
  }
  function refuser(message) {
    actuel = '';
    CQ.texte(res, '–');
    lib.textContent = '';
    detail.textContent = '';
    msg.textContent = message;
    if (message) { saisie.setAttribute('aria-invalid', 'true'); } else { saisie.removeAttribute('aria-invalid'); }
  }

  function calculer() {
    var s = saisie.value.trim().replace(/[\s  .]/g, '').slice(0, 20);
    if (!s) { refuser(''); return; }
    if (/^\d+$/.test(s)) {
      var n = parseInt(s, 10);
      if (n === 0) { refuser('Le zéro n\'existe pas en chiffres romains : la numération commence à I, qui vaut 1.'); return; }
      if (n > 3999) { refuser('Les chiffres romains classiques s\'arrêtent à 3 999, qui s\'écrit MMMCMXCIX.'); return; }
      poser(TX.versRomain(n), 'en chiffres romains', n);
      return;
    }
    var d = TX.diagnosticRomain(s), haut = s.toUpperCase();
    if (d.ok) { poser(nf.format(d.valeur), 'en chiffres arabes', d.valeur); return; }
    if (d.raison === 'lettres') {
      refuser('Tapez un nombre en chiffres, ou un nombre romain : seules les lettres I, V, X, L, C, D et M existent.');
    } else if (d.raison === 'long') {
      refuser('Trop long : le plus long nombre romain classique, MMMDCCCLXXXVIII (3 888), a 15 lettres.');
    } else if (d.correct) {
      refuser('« ' + haut + ' » n\'est pas l\'écriture classique : on lit ' + nf.format(d.lecture) + ', qui s\'écrit ' + d.correct + '.');
    } else {
      refuser('« ' + haut + ' » ne correspond à aucun nombre de 1 à 3 999.');
    }
  }

  saisie.addEventListener('input', calculer);
  CQ.el('rm-copier').addEventListener('click', function () { CQ.copier(actuel, 'Résultat copié'); });
  calculer();
}());
