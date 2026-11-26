/* Noms de couleurs CSS : filtre du tableau (par nom, code ou famille). Le tableau est écrit dans la page ; ce script ne fait que cacher des lignes. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var lignes = Array.prototype.slice.call(document.querySelectorAll('#corpsNoms tr'));

  function norme(t) {
    return String(t).toLowerCase().replace(/^\s*#/, '').replace(/[\s_-]+/g, ' ').trim()
      .replace(/é|è|ê/g, 'e').replace(/[àâ]/g, 'a').replace(/[îï]/g, 'i').replace(/ô/g, 'o').replace(/[ûù]/g, 'u').slice(0, 40);
  }

  function filtrer() {
    var q = norme(CQ.valeur('filtre'));
    var qsansEspace = q.replace(/ /g, '');
    var visibles = 0;
    lignes.forEach(function (tr) {
      var texte = tr.getAttribute('data-recherche') || '';
      var ok = q === '' || texte.indexOf(q) !== -1 || texte.indexOf(qsansEspace) !== -1;
      tr.hidden = !ok;
      if (ok) { visibles++; }
    });
    CQ.texte('compte', q === '' ? lignes.length + ' noms affichés.' : visibles + ' sur ' + lignes.length + ' noms affichés.');
    CQ.el('aucun').hidden = visibles !== 0;
  }

  CQ.surChangement(['filtre'], filtrer);
  filtrer();
}());
