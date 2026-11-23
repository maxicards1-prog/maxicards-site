/* Générateur d'équipes aléatoires ou équilibrées. Rien n'est envoyé : tout reste dans le navigateur. */
(function () {
  'use strict';
  var O = window.OCP;
  var CLE = 'outilsfoot.equipes.noms';
  var zone = document.getElementById('noms');
  var memo = O.lire(CLE);
  if (memo && zone && !zone.value) { zone.value = memo; }

  function lireJoueurs() {
    var lignes = String(zone.value).split(/\r?\n/);
    var joueurs = [];
    lignes.forEach(function (l) {
      var t = l.trim();
      if (!t) { return; }
      var m = t.match(/^(.*?)[\s;,:=-]+([1-5])$/);
      if (m && m[1].trim()) { joueurs.push({ nom: m[1].trim().slice(0, 40), niveau: Number(m[2]) }); }
      else { joueurs.push({ nom: t.slice(0, 40), niveau: 3 }); }
    });
    return joueurs.slice(0, 200);
  }

  function melanger(t) {
    for (var i = t.length - 1; i > 0; i--) {
      var j = Math.floor(O.hasard() * (i + 1));
      var x = t[i]; t[i] = t[j]; t[j] = x;
    }
    return t;
  }

  function tirer() {
    O.ecrire(CLE, zone.value);
    var joueurs = lireJoueurs();
    var nb = Math.round(O.nombre('nbEquipes', 2, 20)) || 2;
    var mode = document.getElementById('mode').value;
    var sortie = document.getElementById('sortie');
    sortie.textContent = '';
    if (joueurs.length < nb) {
      O.texte('message', 'Ajoutez au moins ' + nb + ' joueurs (un par ligne).');
      return;
    }
    O.texte('message', '');
    var equipes = [];
    for (var e = 0; e < nb; e++) { equipes.push([]); }
    melanger(joueurs);
    if (mode === 'equilibre') {
      joueurs.sort(function (a, b) { return b.niveau - a.niveau; });
      // serpentin : 1,2,3,3,2,1... en partant d'une équipe tirée au sort, puis on corrige par la somme
      var ordre = melanger(equipes.map(function (_, i) { return i; }));
      joueurs.forEach(function (j) {
        // l'équipe la plus faible parmi celles qui ont le moins de joueurs
        var min = Infinity;
        equipes.forEach(function (eq) { if (eq.length < min) { min = eq.length; } });
        var choix = -1, somme = Infinity;
        ordre.forEach(function (i) {
          if (equipes[i].length !== min) { return; }
          var s = equipes[i].reduce(function (a, p) { return a + p.niveau; }, 0);
          if (s < somme) { somme = s; choix = i; }
        });
        equipes[choix].push(j);
      });
    } else {
      joueurs.forEach(function (j, i) { equipes[i % nb].push(j); });
    }
    var copie = [];
    equipes.forEach(function (eq, i) {
      var bloc = document.createElement('div');
      bloc.className = 'equipe';
      var h = document.createElement('h3');
      var total = eq.reduce(function (a, p) { return a + p.niveau; }, 0);
      h.textContent = 'Équipe ' + (i + 1) + ' (' + eq.length + ' joueurs' + (mode === 'equilibre' ? ', niveau ' + total : '') + ')';
      bloc.appendChild(h);
      var ol = document.createElement('ol');
      eq.forEach(function (p) {
        var li = document.createElement('li');
        li.textContent = p.nom;
        ol.appendChild(li);
      });
      bloc.appendChild(ol);
      sortie.appendChild(bloc);
      copie.push('Équipe ' + (i + 1) + ' : ' + eq.map(function (p) { return p.nom; }).join(', '));
    });
    sortie.setAttribute('data-texte', copie.join('\n'));
  }

  document.getElementById('tirer').addEventListener('click', tirer);
  document.getElementById('copier').addEventListener('click', function () {
    var t = document.getElementById('sortie').getAttribute('data-texte') || '';
    if (!t) { O.texte('message', 'Faites d\'abord un tirage.'); return; }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(t).then(function () { O.texte('message', 'Équipes copiées : collez-les dans votre groupe.'); },
        function () { O.texte('message', 'Copie impossible : sélectionnez le texte à la main.'); });
    }
  });
}());
