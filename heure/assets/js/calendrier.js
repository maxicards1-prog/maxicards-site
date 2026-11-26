/* Calendrier lunaire d'un mois : la Lune de chaque soir (22 h, heure de Paris) et les phases principales avec leur heure. */
(function () {
  'use strict';
  var CQ = window.CQ, HE = window.HE, HX = window.HX;
  var P = 'Europe/Paris', NS = 'http://www.w3.org/2000/svg';

  function lunePetite(fraction, croissante) {
    var s = document.createElementNS(NS, 'svg'), c = document.createElementNS(NS, 'circle'), p = document.createElementNS(NS, 'path');
    s.setAttribute('viewBox', '0 0 100 100');
    s.setAttribute('aria-hidden', 'true');
    s.setAttribute('class', 'mini-lune');
    c.setAttribute('cx', '50'); c.setAttribute('cy', '50'); c.setAttribute('r', '49'); c.setAttribute('class', 'fond-lune');
    p.setAttribute('d', HX.cheminLune(fraction, croissante, false) || 'M50 50');
    p.setAttribute('class', 'clair');
    s.appendChild(c); s.appendChild(p);
    return s;
  }

  function lire() {
    var m = Math.round(CQ.nombre('m', 1, 12)), a = Math.round(CQ.nombre('a', 1900, 2100));
    var now = HE.parties(P, Date.now());
    return { mo: isFinite(m) ? m : now.mo, a: isFinite(a) ? a : now.a };
  }

  function recalcul() {
    var x = lire(), n = new Date(Date.UTC(x.a, x.mo, 0)).getUTCDate();
    var debut = HE.versInstant(P, x.a, x.mo, 1, 0, 0).ms, fin = HE.versInstant(P, x.mo === 12 ? x.a + 1 : x.a, x.mo === 12 ? 1 : x.mo + 1, 1, 0, 0).ms;
    var phases = HE.phasesEntre(debut, fin), parJour = {};
    phases.forEach(function (p) { parJour[HE.parties(P, p.ms).j] = p; });
    var titre = HX.MOIS[x.mo - 1] + ' ' + x.a;
    HX.ecrire('calTitre', 'Calendrier lunaire de ' + titre);
    HX.ecrire('phTitre', 'Les phases de la Lune en ' + titre);
    var corps = CQ.el('cal'), premier = (new Date(Date.UTC(x.a, x.mo - 1, 1)).getUTCDay() + 6) % 7, tr = HX.el('tr');
    var aujourdHui = HE.parties(P, Date.now());
    HX.vider(corps);
    for (var k = 0; k < premier; k++) { tr.appendChild(HX.el('td', 'vide')); }
    for (var j = 1; j <= n; j++) {
      var t = HE.versInstant(P, x.a, x.mo, j, 22, 0).ms, L = HE.lune(t), td = HX.el('td'), ph = parJour[j];
      if (ph) { td.className = 'phase'; }
      if (aujourdHui.a === x.a && aujourdHui.mo === x.mo && aujourdHui.j === j) { td.className += ' aujourdhui'; }
      td.appendChild(HX.el('span', 'n', String(j)));
      td.appendChild(lunePetite(L.fraction, L.croissante));
      if (ph) { td.appendChild(HX.el('span', 'ph', HE.NOMS_PHASES[ph.type])); }
      td.setAttribute('title', j + ' ' + HX.MOIS[x.mo - 1] + ' : ' + (ph ? HE.NOMS_PHASES[ph.type] + ' à ' + HX.heureTexte(HE.parties(P, ph.ms)) : HE.NOMS_ENTRE[L.quartier]) + ', ' + Math.round(L.fraction * 100) + ' % éclairée');
      tr.appendChild(td);
      if ((premier + j) % 7 === 0) { corps.appendChild(tr); tr = HX.el('tr'); }
    }
    if (tr.childNodes.length) {
      while (tr.childNodes.length < 7) { tr.appendChild(HX.el('td', 'vide')); }
      corps.appendChild(tr);
    }
    CQ.lignes('phases', phases.map(function (p) {
      var q = HE.parties(P, p.ms);
      return { cellules: [HE.NOMS_PHASES[p.type], HX.dateLongue(q), HX.heureTexte(q)], nombres: [2] };
    }));
  }

  function decaler(n) {
    var x = lire(), m = x.mo + n, a = x.a;
    if (m < 1) { m = 12; a -= 1; }
    if (m > 12) { m = 1; a += 1; }
    if (a < 1900 || a > 2100) { return; }
    CQ.el('m').value = String(m);
    CQ.el('a').value = String(a);
    HX.signaler(CQ.el('a'));
    recalcul();
  }
  CQ.el('prec').addEventListener('click', function () { decaler(-1); });
  CQ.el('suiv').addEventListener('click', function () { decaler(1); });
  CQ.surChangement(['m', 'a'], recalcul);
  var now = HE.parties(P, Date.now());
  CQ.el('m').value = String(now.mo);
  CQ.el('a').value = String(now.a);
  CQ.initPartage(recalcul);
}());
