/* Nombre de jours entre deux dates, et date + ou - N jours / semaines / mois. */
(function () {
  'use strict';
  var CQ = window.CQ;
  // écart en années, mois, jours (comme on le dit à l'oral)
  function ecartAMJ(d, f) {
    var a = CQ.versDate(d), b = CQ.versDate(f);
    var ans = b.getUTCFullYear() - a.getUTCFullYear();
    var mois = b.getUTCMonth() - a.getUTCMonth();
    var jours = b.getUTCDate() - a.getUTCDate();
    if (jours < 0) {
      mois--;
      jours += new Date(Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), 0)).getUTCDate();
    }
    if (mois < 0) { ans--; mois += 12; }
    return { ans: ans, mois: mois, jours: jours };
  }
  function pluriel(n, mot) { return n + ' ' + mot + (n > 1 && mot !== 'mois' ? 's' : ''); }
  function texteAMJ(e) {
    var p = [];
    if (e.ans) { p.push(pluriel(e.ans, 'an')); }
    if (e.mois) { p.push(pluriel(e.mois, 'mois')); }
    if (e.jours || !p.length) { p.push(pluriel(e.jours, 'jour')); }
    return p.join(', ');
  }
  function ecart() {
    var d = CQ.jour(CQ.valeur('d1')), f = CQ.jour(CQ.valeur('d2'));
    if (!isFinite(d) || !isFinite(f)) { ['rJours', 'rSemaines', 'rAMJ', 'rHeures'].forEach(function (id) { CQ.texte(id, '–'); }); CQ.texte('phrase1', ''); return; }
    var signe = f < d ? -1 : 1;
    var a = Math.min(d, f), b = Math.max(d, f);
    var n = b - a + (CQ.coche('inclureFin') ? 1 : 0);
    CQ.texte('rJours', CQ.entier(n));
    CQ.texte('rSemaines', Math.floor(n / 7) + ' sem. ' + (n % 7) + ' j');
    CQ.texte('rAMJ', texteAMJ(ecartAMJ(a, b)));
    CQ.texte('rHeures', CQ.entier(n * 24));
    CQ.texte('phrase1', (signe < 0 ? 'La 2e date est avant la 1re. ' : '') + 'Entre le ' + CQ.dateLongue(a) + ' et le ' +
      CQ.dateLongue(b) + ', il y a ' + CQ.entier(n) + ' jour' + (n > 1 ? 's' : '') + (CQ.coche('inclureFin') ? ' (dernier jour compris)' : '') + '.');
  }
  function ajouter() {
    var d = CQ.jour(CQ.valeur('d3'));
    var n = CQ.nombre('n3', -100000, 100000);
    var unite = CQ.valeur('u3');
    var sens = CQ.valeur('s3') === 'moins' ? -1 : 1;
    if (!isFinite(d) || !isFinite(n)) { CQ.texte('rDate', '–'); CQ.texte('phrase2', ''); return; }
    n = Math.round(n) * sens;
    var res;
    if (unite === 'mois' || unite === 'ans') {
      var x = CQ.versDate(d);
      var m = x.getUTCMonth() + (unite === 'ans' ? 12 * n : n);
      var an = x.getUTCFullYear() + Math.floor(m / 12);
      var mo = ((m % 12) + 12) % 12;
      var dernierJour = new Date(Date.UTC(an, mo + 1, 0)).getUTCDate();
      // le 31 + 1 mois tombe au dernier jour du mois suivant (pas de débordement)
      res = Date.UTC(an, mo, Math.min(x.getUTCDate(), dernierJour)) / 86400000;
    } else {
      res = d + n * (unite === 'semaines' ? 7 : 1);
    }
    CQ.texte('rDate', CQ.dateLongue(res));
    CQ.texte('phrase2', CQ.dateLongue(d) + (sens > 0 ? ' + ' : ' − ') + Math.abs(n) + ' ' + unite + ' = ' + CQ.dateLongue(res) + '.');
  }
  var auj = CQ.aujourdhui();
  if (CQ.el('d1') && !CQ.el('d1').value) { CQ.el('d1').value = CQ.versTexteIso(auj); }
  if (CQ.el('d2') && !CQ.el('d2').value) { CQ.el('d2').value = CQ.versTexteIso(Date.UTC(CQ.annee(auj), 11, 25) / 86400000 < auj ? Date.UTC(CQ.annee(auj) + 1, 11, 25) / 86400000 : Date.UTC(CQ.annee(auj), 11, 25) / 86400000); }
  if (CQ.el('d3') && !CQ.el('d3').value) { CQ.el('d3').value = CQ.versTexteIso(auj); }
  CQ.surChangement(['d1', 'd2', 'inclureFin'], ecart);
  CQ.surChangement(['d3', 'n3', 'u3', 's3'], ajouter);
  CQ.initPartage(function () { ecart(); ajouter(); });
}());
