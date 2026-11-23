/* Simulateur d'ouverture de boosters (raretés seulement, aucune image) */
(function () {
  'use strict';
  var O = window.OCP, D = window.OCP_DONNEES;
  if (!O || !D || !document.getElementById('lancer')) { return; }

  function tirerSlot(liste, champ) {
    var x = O.hasard() * 100, cumul = 0;
    for (var i = 0; i < liste.length; i++) {
      cumul += liste[i][champ];
      if (x < cumul) { return liste[i]; }
    }
    return liste[0];
  }

  var rangCarte = 0;
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function carte(nom, niveau) {
    var s = document.createElement('span');
    s.className = 'carte r' + niveau;
    s.style.setProperty('--i', String(Math.min(rangCarte++, 14)));
    s.textContent = nom;
    return s;
  }

  function ligneRecap(corps, nom, obtenu, attendu) {
    var tr = document.createElement('tr');
    [nom, O.entier(obtenu), O.decimal(attendu, 2)].forEach(function (t, i) {
      var td = document.createElement('td');
      td.textContent = t;
      if (i > 0) { td.className = 'nombre'; }
      tr.appendChild(td);
    });
    corps.appendChild(tr);
  }

  function lancer() {
    var mode = document.getElementById('mode').value === 'pocket' ? 'pocket' : 'mega';
    var n = Math.floor(O.nombre('nombre', 1, 100));
    if (!(n >= 1)) { n = 1; }
    var zone = document.getElementById('boosters');
    var corps = document.getElementById('recap');
    while (zone.firstChild) { zone.removeChild(zone.firstChild); }
    while (corps.firstChild) { corps.removeChild(corps.firstChild); }
    // ouverture animée : un paquet qui se secoue et s'ouvre, puis les cartes se retournent
    rangCarte = 0;
    zone.classList.remove('anime');
    if (!calme) {
      void zone.offsetWidth;
      zone.classList.add('anime');
      var scene = document.createElement('div');
      scene.className = 'scene-ouverture';
      scene.setAttribute('aria-hidden', 'true');
      var paquet = document.createElement('div');
      paquet.className = 'paquet';
      var bande = document.createElement('span'); bande.className = 'bande';
      var eclat = document.createElement('span'); eclat.className = 'eclat-paquet';
      paquet.appendChild(bande); paquet.appendChild(eclat); scene.appendChild(paquet);
      zone.appendChild(scene);
      scene.addEventListener('animationend', function (e) { if (e.target === scene && scene.parentNode) { scene.parentNode.removeChild(scene); } });
    }
    var liste = mode === 'pocket' ? D.pocket : D.megaEvolution;
    var compte = {};
    liste.forEach(function (r) { compte[r.id] = 0; });
    var vides = 0, meilleur = 0;

    for (var b = 1; b <= n; b++) {
      var obtenues = [];
      if (mode === 'pocket') {
        obtenues.push(tirerSlot(liste, 'slot4'), tirerSlot(liste, 'slot5'));
      } else {
        liste.forEach(function (r) { if (O.hasard() < 1 / r.unSur) { obtenues.push(r); } });
      }
      obtenues.forEach(function (r) { compte[r.id]++; if (r.niveau > meilleur) { meilleur = r.niveau; } });
      if (mode === 'mega' && obtenues.length === 0) { vides++; continue; }
      var div = document.createElement('div');
      div.className = 'booster';
      var t = document.createElement('div');
      t.className = 'titre';
      t.textContent = 'Booster ' + b;
      div.appendChild(t);
      var c = document.createElement('div');
      c.className = 'cartes';
      if (mode === 'pocket') { c.appendChild(carte('3 × 1 losange', 1)); }
      obtenues.forEach(function (r) { c.appendChild(carte(r.nom, r.niveau)); });
      div.appendChild(c);
      zone.appendChild(div);
    }

    liste.forEach(function (r) {
      var attendu = mode === 'pocket' ? n * (r.slot4 + r.slot5) / 100 : n / r.unSur;
      ligneRecap(corps, r.nom, compte[r.id], attendu);
    });
    var resume = n + ' booster' + (n > 1 ? 's' : '') + ' ouvert' + (n > 1 ? 's' : '') + '. ';
    if (mode === 'mega') {
      resume += vides + ' sans carte Double Rare ou mieux (non affichés). ';
      resume += compte.sir + compte.mhr > 0 ? 'Bravo, au moins une Illustration Spéciale Rare ou mieux !' : 'Pas d’Illustration Spéciale Rare cette fois.';
    } else {
      resume += (compte.e2 + compte.e3 + compte.cr) > 0 ? 'Au moins une carte 2 étoiles ou mieux !' : 'Pas de carte 2 étoiles ou mieux cette fois.';
    }
    O.texte('rResume', resume);
  }

  document.getElementById('lancer').addEventListener('click', lancer);
}());
