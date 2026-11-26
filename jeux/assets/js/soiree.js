/* Tirage au sort, Secret Santa (sans serveur), sablier et pendule d'échecs. Rien n'est envoyé. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  if (!app || !window.J || !window.JL) { return; }
  var E = J.el, jeu = app.getAttribute('data-jeu');
  J.vider(app); // retire le message « Chargement… » quel que soit l'outil
  var calme = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function lignes(t) { return t.split(/\r?\n/).map(function (x) { return x.trim().slice(0, 40); }).filter(Boolean).slice(0, 200); }

  // ================================================================== TIRAGE AU SORT
  if (jeu === 'tirage') {
    var T = J.charger('tirage', null) || { texte: '', onglet: 'gagnant', nbEq: 2, niveaux: false, pf: [0, 0] };
    function sauverT() { J.sauver('tirage', T); }
    var resultat = E('div', { class: 'resultat-tirage', attrs: { 'aria-live': 'polite' } });
    function noms() { return lignes(T.texte).map(function (l) { return T.niveaux ? l.split(';')[0].trim() : l; }); }
    function niveaux() { return lignes(T.texte).map(function (l) { var p = l.split(';'); return Math.min(5, Math.max(1, J.nb(p[1] || 3))); }); }
    function rendreT() {
      J.vider(app);
      var zoneTexte = E('textarea', { id: 'tNoms', rows: 6, value: T.texte, attrs: { placeholder: 'Un nom par ligne\nAlice\nBruno\nChloé', 'aria-label': 'Noms, un par ligne' },
        on: { input: function () { T.texte = this.value.slice(0, 6000); sauverT(); } } });
      var onglets = J.segments([['gagnant', 'Un nom au hasard'], ['equipes', 'Équipes'], ['ordre', 'Ordre de passage'], ['roue', 'Roue'], ['piece', 'Pile ou face']], T.onglet, function (v) { T.onglet = v; sauverT(); rendreT(); }, 'Type de tirage');
      onglets.classList.add('onglets-tirage');
      app.append(onglets);
      if (T.onglet !== 'piece') { app.append(J.bloc('Les noms (un par ligne)', [zoneTexte], T.onglet === 'equipes' && T.niveaux ? 'Avec les niveaux : « Alice ; 4 » (de 1 à 5).' : '')); }
      var bouton = E('button', { type: 'button', class: 'principal grand-bouton tres-grand' });
      if (T.onglet === 'equipes') {
        var nbs = []; for (var k = 2; k <= 10; k++) { nbs.push([k, k + ' équipes']); }
        var chk = E('input', { type: 'checkbox', checked: T.niveaux, on: { change: function () { T.niveaux = this.checked; sauverT(); rendreT(); } } });
        app.append(E('div', { class: 'grille-saisie' }, [J.bloc('Nombre d\'équipes', [J.selecteur('tEq', nbs, T.nbEq, function (v) { T.nbEq = +v; sauverT(); })]),
          J.bloc('Équilibrer', [E('label', { class: 'ligne-case' }, [chk, 'Tenir compte du niveau de chacun'])])]));
      }
      var cvs = null;
      if (T.onglet === 'roue') { cvs = E('canvas', { class: 'roue', width: 600, height: 600, attrs: { role: 'img', 'aria-label': 'Roue de tirage' } }); app.append(E('div', { class: 'cadre-roue' }, [cvs, E('span', { class: 'pointeur', attrs: { 'aria-hidden': 'true' } })])); dessiner(cvs, noms(), 0); }
      bouton.textContent = { gagnant: 'Tirer un nom', equipes: 'Faire les équipes', ordre: 'Tirer l\'ordre', roue: 'Faire tourner la roue', piece: 'Lancer la pièce' }[T.onglet];
      bouton.addEventListener('click', function () {
        var l = noms(); J.vider(resultat);
        if (T.onglet === 'piece') {
          var f = JL.hasard(2); T.pf[f]++; sauverT();
          resultat.append(E('p', { class: 'grand-resultat', text: f ? 'Face' : 'Pile' }), E('p', { class: 'aide', text: 'Depuis le début : ' + T.pf[0] + ' pile, ' + T.pf[1] + ' face.' }));
          return;
        }
        if (l.length < 2) { resultat.append(E('p', { class: 'apercu', text: 'Écrivez au moins deux noms.' })); return; }
        if (T.onglet === 'gagnant') { resultat.append(E('p', { class: 'grand-resultat', text: l[JL.hasard(l.length)] })); }
        if (T.onglet === 'ordre') { resultat.append(E('ol', { class: 'liste-resultat' }, JL.melanger(l).map(function (n) { return E('li', { text: n }); }))); }
        if (T.onglet === 'equipes') {
          var eq = JL.equipes(l, T.nbEq, T.niveaux ? niveaux() : null);
          resultat.append(E('div', { class: 'equipes' }, eq.map(function (e, i) {
            return E('div', { class: 'equipe' }, [E('h3', { text: 'Équipe ' + (i + 1) + (T.niveaux ? ' (niveau ' + e.reduce(function (s, x) { return s + niveaux()[x]; }, 0) + ')' : '') }), E('ul', {}, e.map(function (x) { return E('li', { text: l[x] }); }))]);
          })));
        }
        if (T.onglet === 'roue') {
          var g = JL.hasard(l.length), part = 2 * Math.PI / l.length;
          var fin = 6 * Math.PI * 2 + (2 * Math.PI - (g + 0.5) * part) - Math.PI / 2, debut = performance.now(), duree = calme ? 0 : 4200;
          bouton.disabled = true;
          (function anime(t) {
            var x = duree ? Math.min(1, (t - debut) / duree) : 1, e = 1 - Math.pow(1 - x, 3);
            dessiner(cvs, l, fin * e);
            if (x < 1) { requestAnimationFrame(anime); } else { bouton.disabled = false; resultat.append(E('p', { class: 'grand-resultat', text: l[g] })); J.annonce('La roue désigne ' + l[g]); }
          }(debut));
        }
      });
      app.append(E('div', { class: 'boutons' }, [bouton]), resultat);
    }
    function dessiner(c, l, angle) {
      var x = c.getContext('2d'), n = Math.max(l.length, 1), r = 290, part = 2 * Math.PI / n;
      var cols = ['#146b45', '#b3172f', '#2557b8', '#9a5800', '#5140c8', '#0e7c86', '#a8296f', '#4d7c0f'];
      x.clearRect(0, 0, 600, 600);
      for (var i = 0; i < n; i++) {
        x.beginPath(); x.moveTo(300, 300); x.arc(300, 300, r, angle + i * part - Math.PI / 2, angle + (i + 1) * part - Math.PI / 2); x.closePath();
        x.fillStyle = l.length ? cols[i % cols.length] : '#888'; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 3; x.stroke();
        if (l[i]) {
          x.save(); x.translate(300, 300); x.rotate(angle + (i + 0.5) * part - Math.PI / 2); x.textAlign = 'right'; x.fillStyle = '#fff';
          x.font = 'bold ' + (n > 16 ? 18 : 26) + 'px system-ui, sans-serif'; x.fillText(l[i].slice(0, 16), r - 18, 9); x.restore();
        }
      }
      x.beginPath(); x.arc(300, 300, 34, 0, 2 * Math.PI); x.fillStyle = '#fff'; x.fill();
    }
    rendreT();
  }

  // ================================================================== SECRET SANTA
  if (jeu === 'santa') {
    var code = /^#s=([A-Za-z0-9_-]+)$/.exec(window.SANTA_LIEN || window.location.hash || '');  // SANTA_LIEN : voir GARDE_SANTA (build.py)
    if (code) {  // page ouverte depuis un lien personnel
      var x = JL.santaDecoder(code[1]);
      J.vider(app);
      if (!x) { app.append(E('p', { class: 'apercu', text: 'Ce lien est incomplet ou abîmé. Demandez-le à nouveau à l\'organisateur.' })); return; }
      var zone = E('div', { class: 'revele' });
      zone.append(E('p', { class: 'grand-resultat', text: 'Bonjour ' + x.d + ' !' }), E('p', { text: 'Assurez-vous que personne ne regarde votre écran, puis touchez le bouton.' }),
        E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton tres-grand', text: 'Voir à qui j\'offre un cadeau', on: { click: function () {
          J.vider(zone);
          zone.append(E('p', { text: x.d + ', vous offrez un cadeau à :' }), E('p', { class: 'grand-resultat', text: x.r }));
          if (x.b) { zone.append(E('p', { text: 'Budget prévu : ' + x.b })); }
          if (x.j) { var p = x.j.split('-'); zone.append(E('p', { text: 'Échange des cadeaux : le ' + p[2] + '/' + p[1] + '/' + p[0] })); }
          zone.append(E('p', { class: 'aide', text: 'Gardez le secret ! Ce nom n\'est écrit que dans votre lien : rien n\'a été envoyé à un serveur. Pour le revoir plus tard, rouvrez votre lien.' }));
        } } })]));
      app.append(zone);
      app.append(E('p', { class: 'aide', text: 'Vous organisez votre propre tirage ? ' }, [E('a', { href: window.location.pathname, text: 'Faire un Secret Santa' })]));
      return;
    }
    var S = J.charger('santa', null) || { noms: ['', '', ''], exclusions: [], budget: '', date: '', tirage: null, vus: [], mode: 'telephone' };
    function sauverS() { J.sauver('santa', S); }
    function rendreS() {
      J.vider(app);
      if (!S.tirage) {
        app.append(E('h2', { class: 'titre-outil', text: '1. Les participants' }), J.listeNoms(S.noms, 2, 60, function (l) { S.noms = l; sauverS(); }, 'Participant'));
        var noms = J.nomsPropres(S.noms, 'Participant'), opts = noms.map(function (n, i) { return [i, n]; }), a = 0, b = 1;
        var exc = E('div', { class: 'saisie' }, [E('h2', { class: 'titre-outil', text: '2. Les exclusions (facultatif)' }),
          E('p', { class: 'aide', text: 'Deux personnes qui ne doivent pas se tirer l\'une l\'autre : un couple, des frères et sœurs, ceux qui se sont tirés l\'an dernier.' })]);
        exc.append(E('div', { class: 'grille-saisie' }, [J.bloc('Personne', [J.selecteur('sA', opts, 0, function (v) { a = +v; })]), J.bloc('ne tire pas', [J.selecteur('sB', opts, 1, function (v) { b = +v; })])]));
        exc.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', text: '+ Ajouter cette exclusion', on: { click: function () {
          if (a !== b && !S.exclusions.some(function (p) { return (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a); })) { S.exclusions.push([a, b]); sauverS(); rendreS(); }
        } } })]));
        if (S.exclusions.length) {
          exc.append(E('ul', { class: 'liste-exclusions' }, S.exclusions.map(function (p, k) {
            return E('li', {}, [(noms[p[0]] || '?') + ' ↔ ' + (noms[p[1]] || '?') + ' ', E('button', { type: 'button', class: 'mini', text: '✕', attrs: { 'aria-label': 'Retirer cette exclusion' }, on: { click: function () { S.exclusions.splice(k, 1); sauverS(); rendreS(); } } })]);
          })));
        }
        app.append(exc);
        app.append(E('div', { class: 'saisie' }, [E('h2', { class: 'titre-outil', text: '3. Budget et date (facultatif)' }), E('div', { class: 'grille-saisie' }, [
          J.bloc('Budget', [E('input', { type: 'text', maxLength: 20, value: S.budget, attrs: { placeholder: 'ex. 20 €', 'aria-label': 'Budget' }, on: { input: function () { S.budget = this.value; sauverS(); } } })]),
          J.bloc('Date de l\'échange', [E('input', { type: 'date', value: S.date, attrs: { 'aria-label': 'Date de l\'échange' }, on: { input: function () { S.date = this.value; sauverS(); } } })])])]));
        var erreur = E('p', { class: 'apercu', attrs: { 'aria-live': 'polite' } });
        app.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton tres-grand', text: '🎁 Faire le tirage', on: { click: function () {
          var n = J.nomsPropres(S.noms, 'Participant');
          if (new Set(n.map(function (z) { return z.toLowerCase(); })).size !== n.length) { erreur.textContent = 'Deux participants ont le même nom : ajoutez une initiale pour les distinguer.'; return; }
          var ex = S.exclusions.filter(function (p) { return p[0] < n.length && p[1] < n.length; });
          var r = JL.santaTirage(n.length, ex);
          if (!r.ok) { erreur.textContent = r.raison; return; }
          S.noms = n; S.exclusions = ex; S.tirage = r.donneA; S.vus = []; sauverS(); rendreS(); J.annonce('Tirage fait : personne ne connaît le résultat.');
        } } })]), erreur);
        return;
      }
      // tirage fait
      app.append(E('p', { class: 'encadre', text: 'Tirage fait pour ' + S.noms.length + ' participants. Personne ne s\'est tiré lui-même' + (S.exclusions.length ? ' et toutes les exclusions sont respectées' : '') + '. Le résultat reste caché : chacun découvre seulement son nom.' }));
      app.append(J.segments([['telephone', 'On se passe le téléphone'], ['liens', 'Un lien par personne']], S.mode, function (v) { S.mode = v; sauverS(); rendreS(); }, 'Comment révéler'));
      if (S.mode === 'telephone') {
        var zoneT = E('div', { class: 'saisie' }, [E('p', { class: 'aide', text: 'Chacun à son tour prend le téléphone, touche son nom, lit, puis cache avant de passer au suivant.' })]);
        var liste = E('div', { class: 'propositions' });
        S.noms.forEach(function (n, i) {
          liste.append(E('button', { type: 'button', class: 'grand-bouton' + (S.vus.indexOf(i) >= 0 ? ' vu' : ''), text: (S.vus.indexOf(i) >= 0 ? '✓ ' : '') + n, on: { click: function () { reveler(i); } } }));
        });
        zoneT.append(liste);
        app.append(zoneT);
      } else {
        var zoneL = E('div', { class: 'saisie' }, [E('p', { class: 'aide', text: 'Envoyez à chacun SON lien (SMS, messagerie). Le nom du destinataire est caché dans le lien, après le signe #, qui n\'est jamais envoyé à notre serveur.' }),
          E('p', { class: 'aide', text: 'Honnêtement : ce n\'est pas un coffre-fort. Le nom est seulement brouillé pour ne pas se lire d\'un coup d\'œil ; une personne qui s\'y connaît pourrait le décoder, l\'organisateur compris. Pour un secret total, préférez « On se passe le téléphone ».' })]);
        var base = window.location.origin + window.location.pathname;
        S.noms.forEach(function (n, i) {
          var lien = base + '#s=' + JL.santaEncoder({ d: n, r: S.noms[S.tirage[i]], b: S.budget || '', j: S.date || '' });
          var etat = E('span', { class: 'aide', attrs: { 'aria-live': 'polite' } });
          var boutons = [E('button', { type: 'button', class: 'mini', text: 'Copier le lien', on: { click: function () {
            if (navigator.clipboard) { navigator.clipboard.writeText(lien).then(function () { etat.textContent = 'Lien copié.'; }, function () { etat.textContent = lien; }); } else { etat.textContent = lien; }
          } } })];
          if (navigator.share) { boutons.push(E('button', { type: 'button', class: 'mini', text: 'Partager', on: { click: function () { navigator.share({ title: 'Secret Santa', text: n + ', voici ton tirage du Secret Santa :', url: lien }).catch(function () {}); } } })); }
          zoneL.append(E('div', { class: 'ligne-lien' }, [E('strong', { text: n }), E('span', { class: 'boutons-lien' }, boutons), etat]));
        });
        app.append(zoneL);
      }
      app.append(E('div', { class: 'boutons boutons-partie' }, [E('button', { type: 'button', text: 'Modifier et refaire le tirage', on: { click: function () {
        if (!window.confirm('Refaire le tirage ? Les liens déjà envoyés ne seront plus bons.')) { return; }
        S.tirage = null; S.vus = []; sauverS(); rendreS();
      } } })]));
    }
    function reveler(i) {
      J.vider(app);
      var z = E('div', { class: 'revele' }, [E('p', { class: 'grand-resultat', text: S.noms[i] + ' ?' }), E('p', { text: 'Vérifiez que c\'est bien vous et que personne ne regarde.' })]);
      z.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton tres-grand', text: 'Oui, révéler', on: { click: function () {
        J.vider(z);
        z.append(E('p', { text: S.noms[i] + ', vous offrez un cadeau à :' }), E('p', { class: 'grand-resultat', text: S.noms[S.tirage[i]] }));
        if (S.budget) { z.append(E('p', { text: 'Budget : ' + S.budget })); }
        z.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton', text: 'J\'ai retenu : cacher', on: { click: function () {
          if (S.vus.indexOf(i) < 0) { S.vus.push(i); } sauverS(); rendreS();
        } } })]));
      } } }), E('button', { type: 'button', class: 'grand-bouton', text: 'Retour', on: { click: rendreS } })]));
      app.append(z);
    }
    rendreS();
  }

  // ================================================================== SABLIER
  if (jeu === 'sablier') {
    var duree = J.charger('sablier', 60), reste = duree * 1000, fin = 0, minuterie = null;
    var aff = E('p', { class: 'chrono-geant', attrs: { 'aria-live': 'off' } }), barre = E('span', { class: 'barre-temps' });
    var go = E('button', { type: 'button', class: 'principal grand-bouton tres-grand' });
    function montre() {
      aff.textContent = JL.formatTemps(reste); barre.style.width = (100 * reste / (duree * 1000)) + '%';
      go.textContent = minuterie ? 'Pause' : reste <= 0 ? 'Recommencer' : reste < duree * 1000 ? 'Reprendre' : 'Démarrer';
      app.classList.toggle('alerte', reste > 0 && reste <= 5000 && !!minuterie);
    }
    function arret() { clearInterval(minuterie); minuterie = null; J.ecranAllume(false); }
    function tic() {
      reste = Math.max(0, fin - performance.now());
      if (reste <= 0) { arret(); J.bip(); J.annonce('Temps écoulé !'); aff.textContent = 'Temps !'; }
      montre(); if (reste <= 0) { aff.textContent = 'Temps !'; }
    }
    go.addEventListener('click', function () {
      if (minuterie) { arret(); montre(); return; }
      if (reste <= 0) { reste = duree * 1000; }
      fin = performance.now() + reste; minuterie = setInterval(tic, 100); J.ecranAllume(true); montre();
    });
    var choix = J.segments([[30, '30 s'], [45, '45 s'], [60, '1 min'], [90, '1 min 30'], [120, '2 min'], [180, '3 min']], duree, function (v) {
      arret(); duree = v; reste = v * 1000; J.sauver('sablier', v); montre();
    }, 'Durée');
    var perso = J.nombre('sPerso', '', function (v) { var s = Math.round(J.nb(v)); if (s >= 5 && s <= 3600) { arret(); duree = s; reste = s * 1000; J.sauver('sablier', s); montre(); } }, { min: '5', max: '3600', placeholder: 'ex. 75' });
    app.append(choix, E('div', { class: 'cadran' }, [aff, E('span', { class: 'piste-temps' }, [barre])]),
      E('div', { class: 'boutons' }, [go, E('button', { type: 'button', class: 'grand-bouton', text: 'Remettre à zéro', on: { click: function () { arret(); reste = duree * 1000; montre(); } } })]),
      J.bloc('Autre durée, en secondes', [perso], 'Un bip retentit à la fin (montez le son). L\'écran reste allumé pendant le compte à rebours si votre téléphone le permet.'));
    montre();
  }

  // ================================================================== PENDULE D'ÉCHECS
  if (jeu === 'pendule') {
    var P = J.charger('pendule', null) || { min: 5, inc: 3 };
    var r = [0, 0], actif = -1, depart = 0, coups = [0, 0], boucle = null, fini = false;
    var cotes = [0, 1].map(function (i) {
      return E('button', { type: 'button', class: 'cote-pendule' + (i === 0 ? ' retourne' : ''), on: { click: function () { appui(i); } } }, [E('span', { class: 'temps-pendule' }), E('span', { class: 'coups' })]);
    });
    function maintenant() { return performance.now(); }
    function valeurs() { var v = r.slice(); if (actif >= 0) { v[actif] = Math.max(0, v[actif] - (maintenant() - depart)); } return v; }
    function affiche() {
      var v = valeurs();
      cotes.forEach(function (c, i) {
        c.firstChild.textContent = JL.formatTemps(v[i]); c.lastChild.textContent = (i === 0 ? 'Noirs' : 'Blancs') + ' · ' + coups[i] + ' coup' + (coups[i] > 1 ? 's' : '');
        c.classList.toggle('actif', actif === i); c.classList.toggle('tombe', v[i] <= 0);
        c.setAttribute('aria-label', (i === 0 ? 'Noirs' : 'Blancs') + ' : ' + JL.formatTemps(v[i]) + (actif === i ? ', à vous de jouer : touchez après votre coup' : ''));
      });
      if (actif >= 0 && v[actif] <= 0 && !fini) { fini = true; r = v; stop(); J.bip(); J.annonce('Temps écoulé pour les ' + (actif === 0 ? 'noirs' : 'blancs')); }
    }
    function stop() { clearInterval(boucle); boucle = null; J.ecranAllume(false); }
    function appui(i) {
      if (fini) { return; }
      if (actif === -1 && i === 1) { return; }  // au départ, les noirs (en haut) touchent leur côté : la pendule des blancs démarre
      if (actif !== -1 && actif !== i) { return; }
      var t = maintenant();
      if (actif === i) { r = JL.penduleCoup(r, i, t - depart, P.inc * 1000); coups[i]++; }
      actif = 1 - i; depart = t;
      if (!boucle) { boucle = setInterval(affiche, 100); J.ecranAllume(true); }
      affiche();
    }
    function reset() { stop(); r = [P.min * 60000, P.min * 60000]; actif = -1; coups = [0, 0]; fini = false; affiche(); }
    var cad = J.segments([['1+0', '1 min'], ['3+0', '3 min'], ['3+2', '3 + 2'], ['5+0', '5 min'], ['5+3', '5 + 3'], ['10+0', '10 min'], ['10+5', '10 + 5'], ['15+10', '15 + 10'], ['30+0', '30 min'], ['90+30', '90 + 30']],
      P.min + '+' + P.inc, function (v) { var p = v.split('+'); P.min = +p[0]; P.inc = +p[1]; J.sauver('pendule', P); reset(); }, 'Cadence');
    app.append(E('div', { class: 'pendule' }, [cotes[0], E('div', { class: 'milieu-pendule' }, [
      E('button', { type: 'button', class: 'mini', text: '⏸ Pause', on: { click: function () { if (actif >= 0 && !fini) { r = valeurs(); actif = -1 - actif - 2; stop(); affiche(); } else if (actif < -1) { actif = -actif - 3; depart = maintenant(); boucle = setInterval(affiche, 100); affiche(); } } } }),
      E('button', { type: 'button', class: 'mini', text: '↺ Remettre', on: { click: reset } })]), cotes[1]]));
    app.append(J.bloc('Cadence (minutes + secondes ajoutées à chaque coup)', [cad], 'Posez le téléphone entre les joueurs, les blancs côté bas. Pour commencer, les noirs touchent leur côté (en haut) : la pendule des blancs démarre. Ensuite, chacun touche SON côté juste après avoir joué.'));
    reset();
  }
}());
