/* Area and perimeter of common shapes, with conversion to ft² and m². */
(function () {
  'use strict';
  var CQ = window.CQ;
  var F = {
    rectangle: ['Length', 'Width', null],
    square: ['Side', null, null],
    triangle: ['Base', 'Height', null],
    triangle3: ['Side a', 'Side b', 'Side c'],
    circle: ['Radius', null, null],
    trapezoid: ['Base 1', 'Base 2', 'Height'],
    parallelogram: ['Base', 'Height', 'Slanted side']
  };
  var M = { ft: 0.3048, 'in': 0.0254, yd: 0.9144, m: 1, cm: 0.01, mm: 0.001 };
  function recalcul() {
    var forme = F[CQ.valeur('shape')] ? CQ.valeur('shape') : 'rectangle', lab = F[forme];
    ['a', 'b', 'c'].forEach(function (id, i) {
      CQ.el('bloc_' + id).hidden = !lab[i];
      if (lab[i]) { document.querySelector('label[for="' + id + '"]').textContent = lab[i]; }
    });
    var u = M[CQ.valeur('unit')] ? CQ.valeur('unit') : 'ft';
    var a = CQ.nombre('a', 0), b = CQ.nombre('b', 0), c = CQ.nombre('c', 0);
    var aire = NaN, per = NaN, op = '';
    if (forme === 'rectangle') { aire = a * b; per = 2 * (a + b); op = 'Area = length × width'; }
    else if (forme === 'square') { aire = a * a; per = 4 * a; op = 'Area = side × side'; }
    else if (forme === 'triangle') { aire = a * b / 2; op = 'Area = base × height ÷ 2'; }
    else if (forme === 'triangle3') {
      var s = (a + b + c) / 2, p = s * (s - a) * (s - b) * (s - c);
      if (p >= 0) { aire = Math.sqrt(p); per = a + b + c; op = "Heron's formula: √(s × (s − a) × (s − b) × (s − c)), where s = half the perimeter = " + CQ.souple(s, 4); }
      else if (isFinite(p)) { op = 'These three lengths cannot form a triangle: each side must be shorter than the sum of the other two.'; }
    }
    else if (forme === 'circle') { aire = Math.PI * a * a; per = 2 * Math.PI * a; op = 'Area = π × r²; circumference = 2 × π × r'; }
    else if (forme === 'trapezoid') { aire = (a + b) * c / 2; op = 'Area = (base 1 + base 2) × height ÷ 2'; }
    else if (forme === 'parallelogram') { aire = a * b; per = isFinite(c) ? 2 * (a + c) : NaN; op = 'Area = base × height'; }
    var okA = isFinite(aire), m2 = okA ? aire * M[u] * M[u] : NaN;
    CQ.texte('rArea', okA ? CQ.souple(aire, 4) + ' ' + u + '²' : '–');
    CQ.texte('rPer', isFinite(per) ? CQ.souple(per, 4) + ' ' + u : '–');
    CQ.texte('rFt', okA ? CQ.souple(m2 / (0.3048 * 0.3048), 4) + ' ft²' : '–');
    CQ.texte('rM', okA ? CQ.souple(m2, 4) + ' m²' : '–');
    var lp = CQ.el('rPer').parentNode.querySelector('.libelle');
    if (lp) { lp.textContent = forme === 'circle' ? 'circumference' : 'perimeter'; }
    CQ.texte('phrase', op);
  }
  CQ.surChangement(['shape', 'unit', 'a', 'b', 'c'], recalcul);
  CQ.initPartage(recalcul);
}());
