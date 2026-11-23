/* Aire et périmètre des formes usuelles. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var F = {
    rectangle: ['Longueur', 'Largeur', null],
    carre: ['Côté', null, null],
    triangle: ['Base', 'Hauteur', null],
    triangle3: ['Côté a', 'Côté b', 'Côté c'],
    cercle: ['Rayon', null, null],
    trapeze: ['Grande base', 'Petite base', 'Hauteur'],
    parallelogramme: ['Base', 'Hauteur', 'Côté oblique']
  };
  function recalcul() {
    var forme = F[CQ.valeur('forme')] ? CQ.valeur('forme') : 'rectangle', lab = F[forme];
    ['a', 'b', 'c'].forEach(function (id, i) {
      CQ.el('bloc_' + id).hidden = !lab[i];
      if (lab[i]) { document.querySelector('label[for="' + id + '"]').textContent = lab[i]; }
    });
    var u = CQ.valeur('unite') || 'm', a = CQ.nombre('a', 0), b = CQ.nombre('b', 0), c = CQ.nombre('c', 0);
    var aire = NaN, per = NaN, op = '';
    if (forme === 'rectangle') { aire = a * b; per = 2 * (a + b); op = 'Aire = longueur × largeur'; }
    else if (forme === 'carre') { aire = a * a; per = 4 * a; op = 'Aire = côté × côté'; }
    else if (forme === 'triangle') { aire = a * b / 2; op = 'Aire = base × hauteur ÷ 2'; }
    else if (forme === 'triangle3') {
      var s = (a + b + c) / 2, p = s * (s - a) * (s - b) * (s - c);
      if (p >= 0) { aire = Math.sqrt(p); per = a + b + c; op = 'Formule de Héron : √(s(s−a)(s−b)(s−c)), s = demi-périmètre = ' + CQ.souple(s, 4); }
      else { op = 'Ces trois longueurs ne forment pas un triangle (chaque côté doit être plus petit que la somme des deux autres).'; }
    }
    else if (forme === 'cercle') { aire = Math.PI * a * a; per = 2 * Math.PI * a; op = 'Aire = π × r² ; périmètre = 2 × π × r'; }
    else if (forme === 'trapeze') { aire = (a + b) * c / 2; op = 'Aire = (grande base + petite base) × hauteur ÷ 2'; }
    else if (forme === 'parallelogramme') { aire = a * b; per = isFinite(c) ? 2 * (a + c) : NaN; op = 'Aire = base × hauteur'; }
    CQ.texte('rAire', isFinite(aire) ? CQ.souple(aire, 4) + ' ' + u + '²' : '–');
    CQ.texte('rPer', isFinite(per) ? CQ.souple(per, 4) + ' ' + u : '–');
    CQ.texte('phrase', op);
  }
  CQ.surChangement(['forme', 'unite', 'a', 'b', 'c'], recalcul);
  CQ.initPartage(recalcul);
}());
