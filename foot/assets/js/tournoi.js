/* Générateur de calendrier de tournoi (championnat, poules) par la méthode du tourniquet (Berger). */
(function () {
  'use strict';
  var O = window.OCP;
  var tr = O.tr;
  var CLE = 'outilsfoot.tournoi.equipes';
  var zone = document.getElementById('equipes');
  var memo = O.lire(CLE);
  if (memo && zone && !zone.value) { zone.value = memo; }

  function lireEquipes() {
    var vues = {};
    return String(zone.value).split(/\r?\n/).map(function (l) { return l.trim().slice(0, 40); })
      .filter(function (l) { if (!l || vues[l.toLowerCase()]) { return false; } vues[l.toLowerCase()] = 1; return true; })
      .slice(0, 64);
  }

  // Renvoie une liste de journées ; chaque journée = liste de [domicile, extérieur] ; null = exempt.
  function tourniquet(equipes) {
    var t = equipes.slice();
    if (t.length % 2) { t.push(null); }
    var n = t.length, journees = [];
    for (var r = 0; r < n - 1; r++) {
      var j = [];
      for (var i = 0; i < n / 2; i++) {
        var a = t[i], b = t[n - 1 - i];
        j.push(r % 2 === 0 ? [a, b] : [b, a]);
      }
      journees.push(j);
      t.splice(1, 0, t.pop());
    }
    return journees;
  }

  function el(tag, texte, classe) {
    var e = document.createElement(tag);
    if (texte) { e.textContent = texte; }
    if (classe) { e.className = classe; }
    return e;
  }

  function generer() {
    O.ecrire(CLE, zone.value);
    var equipes = lireEquipes();
    var sortie = document.getElementById('sortie');
    sortie.textContent = '';
    if (equipes.length < 2) { O.texte('message', tr('Ajoutez au moins 2 équipes (une par ligne).', 'Add at least 2 teams (one per line).')); return; }
    O.texte('message', '');
    var format = document.getElementById('format').value;
    var nbPoules = format === 'poules' ? Math.max(2, Math.min(Math.round(O.nombre('nbPoules', 2, 16)) || 2, Math.floor(equipes.length / 2))) : 1;
    var retour = document.getElementById('retour').checked;
    var duree = O.nombre('dureeMatch', 1, 200);
    var terrains = Math.round(O.nombre('terrains', 1, 50)) || 1;
    var pause = O.nombre('pause', 0, 120) || 0;
    if (document.getElementById('melanger').checked) {
      for (var i = equipes.length - 1; i > 0; i--) {
        var k = Math.floor(O.hasard() * (i + 1)); var x = equipes[i]; equipes[i] = equipes[k]; equipes[k] = x;
      }
    }
    var poules = [];
    for (var p = 0; p < nbPoules; p++) { poules.push([]); }
    equipes.forEach(function (e, idx) { poules[idx % nbPoules].push(e); });
    var totalMatchs = 0, maxJournees = 0, texte = [];
    poules.forEach(function (poule, ip) {
      var js = tourniquet(poule);
      if (retour) {
        js = js.concat(js.map(function (j) { return j.map(function (m) { return [m[1], m[0]]; }); }));
      }
      maxJournees = Math.max(maxJournees, js.length);
      var bloc = el('div', null, 'equipe');
      var titre = nbPoules > 1 ? tr('Poule ', 'Group ') + String.fromCharCode(65 + ip) : tr('Championnat', 'League');
      bloc.appendChild(el('h3', titre + tr(' : ', ': ') + poule.join(', ')));
      texte.push(titre);
      js.forEach(function (j, ij) {
        var d = el('div', null, 'journee');
        d.appendChild(el('h3', tr('Tour ', 'Round ') + (ij + 1)));
        var ul = el('ul');
        j.forEach(function (m) {
          if (m[0] === null || m[1] === null) {
            ul.appendChild(el('li', tr('Exempt : ', 'Bye: ') + (m[0] === null ? m[1] : m[0])));
          } else {
            ul.appendChild(el('li', m[0] + ' – ' + m[1]));
            totalMatchs++;
            texte.push(tr('Tour ', 'Round ') + (ij + 1) + tr(' : ', ': ') + m[0] + ' – ' + m[1]);
          }
        });
        d.appendChild(ul);
        bloc.appendChild(d);
      });
      sortie.appendChild(bloc);
    });
    O.texte('rMatchs', O.entier(totalMatchs));
    O.texte('rTours', O.entier(maxJournees));
    if (isFinite(duree)) {
      // créneaux : les matchs se jouent par vagues de « terrains » matchs à la fois
      var vagues = Math.ceil(totalMatchs / terrains);
      var minutes = vagues * duree + Math.max(0, vagues - 1) * pause;
      O.texte('rDuree', Math.floor(minutes / 60) + tr(' h ', 'h ') + String(Math.round(minutes % 60)).padStart(2, '0'));
    } else { O.texte('rDuree', '–'); }
    sortie.setAttribute('data-texte', texte.join('\n'));
  }

  document.getElementById('generer').addEventListener('click', generer);
  document.getElementById('imprimer').addEventListener('click', function () { window.print(); });
  O.surChangement(['format'], function () {
    document.getElementById('blocPoules').hidden = document.getElementById('format').value !== 'poules';
  });
}());
