/* Alphabet morse : bouton « Écouter » sur chaque ligne du tableau. */
(function () {
  'use strict';
  var $ = window.CQ.el, CO = window.CO, vitesse = $('am-vitesse');
  function maj() { $('am-vitesse-v').textContent = vitesse.value + ' mots/min'; }
  vitesse.addEventListener('input', maj);
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('button[data-morse]') : null;
    if (!b) { return; }
    var code = b.getAttribute('data-morse') || '';
    if (!/^[.\- ]{1,20}$/.test(code)) { return; }
    window.SON.jouer(code, { mpm: CO.vitesseBornee(vitesse.value), frequence: 600, son: true });
  });
  maj();
}());
