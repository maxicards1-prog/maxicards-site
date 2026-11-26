/* Épeler un texte avec l'alphabet radio (Alfa, Bravo, Charlie…). */
(function () {
  'use strict';
  var CQ = window.CQ, $ = CQ.el, CO = window.CO;
  var texte = $('ot-texte'), chiffres = $('ot-chiffres'), liste = $('ot-liste'), ligne = $('ot-ligne');
  var derniere = '';
  function maj() {
    var r = CO.epeler(texte.value, chiffres.value === 'en');
    CQ.vider(liste);
    r.forEach(function (x) {
      var li = CQ.cree('li', x[2] === 'espace' ? 'espace' : '');
      if (x[2] !== 'espace') { li.appendChild(CQ.cree('span', 'epel-car', x[0])); }
      li.appendChild(CQ.cree('span', 'epel-mot', x[1]));
      if (x[3]) { li.appendChild(CQ.cree('span', 'epel-note', x[3])); }
      liste.appendChild(li);
    });
    derniere = r.map(function (x) { return x[3] ? x[1] + ' (' + x[3] + ')' : x[1]; }).join(' ').replace(/ \(espace\) /g, ' / ');
    ligne.textContent = derniere || '–';
  }
  texte.addEventListener('input', maj);
  chiffres.addEventListener('change', maj);
  $('ot-copier').addEventListener('click', function () { CQ.copier(derniere, 'Épellation copiée'); });
  maj();
}());
