/* Calculateur de classement : on tape les résultats, le tableau se calcule. Rien n'est envoyé. */
(function () {
  'use strict';
  var O = window.OCP;
  var tr = O.tr;
  var CLE = 'outilsfoot.classement.resultats';
  var zone = document.getElementById('resultats');
  var memo = O.lire(CLE);
  if (memo && zone && !zone.value) { zone.value = memo; }

  function cellule(tr, texte, nombre) {
    var td = document.createElement('td');
    td.textContent = texte;
    if (nombre) { td.className = 'nombre'; }
    tr.appendChild(td);
  }

  function calculer() {
    O.ecrire(CLE, zone.value);
    var pv = O.nombre('ptsVictoire', 0, 10), pn = O.nombre('ptsNul', 0, 10), pd = O.nombre('ptsDefaite', -5, 10);
    if (!isFinite(pv)) { pv = 3; } if (!isFinite(pn)) { pn = 1; } if (!isFinite(pd)) { pd = 0; }
    var equipes = {}, erreurs = [];
    function eq(nom) {
      var cle = nom.toLowerCase();
      if (!equipes[cle]) { equipes[cle] = { nom: nom, j: 0, g: 0, n: 0, p: 0, bp: 0, bc: 0, pts: 0 }; }
      return equipes[cle];
    }
    String(zone.value).split(/\r?\n/).forEach(function (l, i) {
      var t = l.trim();
      if (!t) { return; }
      var m = t.match(/^(.+?)\s+(\d{1,2})\s*[-–:]\s*(\d{1,2})\s+(.+)$/);
      if (!m || m[1].trim().toLowerCase() === m[4].trim().toLowerCase()) { erreurs.push(tr('Ligne ' + (i + 1) + ' non comprise : « ' + t.slice(0, 60) + ' »', 'Line ' + (i + 1) + ' not understood: "' + t.slice(0, 60) + '"')); return; }
      var a = eq(m[1].trim().slice(0, 40)), b = eq(m[4].trim().slice(0, 40));
      var ba = Number(m[2]), bb = Number(m[3]);
      a.j++; b.j++; a.bp += ba; a.bc += bb; b.bp += bb; b.bc += ba;
      if (ba > bb) { a.g++; b.p++; a.pts += pv; b.pts += pd; }
      else if (ba < bb) { b.g++; a.p++; b.pts += pv; a.pts += pd; }
      else { a.n++; b.n++; a.pts += pn; b.pts += pn; }
    });
    var liste = Object.keys(equipes).map(function (k) { return equipes[k]; });
    liste.sort(function (x, y) {
      return (y.pts - x.pts) || ((y.bp - y.bc) - (x.bp - x.bc)) || (y.bp - x.bp) || x.nom.localeCompare(y.nom, tr('fr', 'en'));
    });
    var corps = document.getElementById('corpsClassement');
    corps.textContent = '';
    liste.forEach(function (e, i) {
      var tr = document.createElement('tr');
      cellule(tr, String(i + 1), true);
      cellule(tr, e.nom, false);
      cellule(tr, String(e.pts), true);
      cellule(tr, String(e.j), true);
      cellule(tr, String(e.g), true);
      cellule(tr, String(e.n), true);
      cellule(tr, String(e.p), true);
      cellule(tr, String(e.bp), true);
      cellule(tr, String(e.bc), true);
      var diff = e.bp - e.bc;
      cellule(tr, (diff > 0 ? '+' : '') + diff, true);
      corps.appendChild(tr);
    });
    O.texte('message', erreurs.length ? erreurs.slice(0, 5).join(' · ') : (liste.length ? '' : tr('Tapez un résultat par ligne, par exemple : Lyon 2-1 Nantes', 'Type one result per line, for example: Arsenal 2-1 Chelsea')));
  }
  O.surChangement(['resultats', 'ptsVictoire', 'ptsNul', 'ptsDefaite'], calculer);
  calculer();
}());
