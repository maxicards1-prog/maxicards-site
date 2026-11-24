/* Statistics of a list: median, quartiles (median of each half, middle value excluded when the count is odd), mean, spread.
   Separators: commas, spaces, semicolons, new lines. The period is the decimal mark. */
(function () {
  'use strict';
  var CQ = window.CQ;
  var IDS = ['rN', 'rMean', 'rMed', 'rQ1', 'rQ3', 'rIqr', 'rMin', 'rMax', 'rRange', 'rSd', 'rSdp'];
  function lire(t) {
    return String(t || '').split(/[\s,;]+/).filter(function (x) { return x !== ''; })
      .slice(0, 5000).map(function (x) { return /^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(x) ? Number(x) : NaN; });
  }
  function mediane(v) {
    var n = v.length;
    return n % 2 ? v[(n - 1) / 2] : (v[n / 2 - 1] + v[n / 2]) / 2;
  }
  function recalcul() {
    var brut = lire(CQ.valeur('series')), v = brut.filter(isFinite).sort(function (a, b) { return a - b; });
    var ignores = brut.length - v.length, n = v.length;
    if (!n) { IDS.forEach(function (i) { CQ.texte(i, '–'); }); CQ.texte('phrase', ''); return; }
    var s = v.reduce(function (a, b) { return a + b; }, 0), m = s / n;
    var med = mediane(v);
    var bas = v.slice(0, Math.floor(n / 2)), haut = v.slice(Math.ceil(n / 2));
    var q1 = bas.length ? mediane(bas) : v[0], q3 = haut.length ? mediane(haut) : v[n - 1];
    var ss = v.reduce(function (a, x) { return a + (x - m) * (x - m); }, 0);
    var f = function (x) { return CQ.souple(x, 4); };
    CQ.texte('rN', String(n));
    CQ.texte('rMean', f(m));
    CQ.texte('rMed', f(med));
    CQ.texte('rQ1', f(q1));
    CQ.texte('rQ3', f(q3));
    CQ.texte('rIqr', f(q3 - q1));
    CQ.texte('rMin', f(v[0]));
    CQ.texte('rMax', f(v[n - 1]));
    CQ.texte('rRange', f(v[n - 1] - v[0]));
    CQ.texte('rSd', n > 1 ? f(Math.sqrt(ss / (n - 1))) : '–');
    CQ.texte('rSdp', f(Math.sqrt(ss / n)));
    CQ.texte('phrase', 'Sorted list: ' + v.slice(0, 40).map(f).join(', ') + (n > 40 ? ' …' : '') +
      (ignores ? ' (' + ignores + (ignores > 1 ? ' entries' : ' entry') + ' ignored: not a number)' : ''));
  }
  CQ.surChangement(['series'], recalcul);
  CQ.initPartage(recalcul);
}());
