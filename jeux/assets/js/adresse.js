/* Yam's, Mölkky, fléchettes (301 / 501 / Cricket) et lancer de dés. Partie gardée dans le navigateur. */
(function () {
  'use strict';
  var app = document.getElementById('app');
  if (!app || !window.J || !window.JL) { return; }
  var E = J.el, jeu = app.getAttribute('data-jeu');
  function copie(x) { return JSON.parse(JSON.stringify(x)); }
  function des(valeurs, garde, clic) {
    return E('div', { class: 'des' }, valeurs.map(function (v, i) {
      return E('button', { type: 'button', class: 'de' + (garde && garde[i] ? ' garde' : ''), text: String(v), attrs: { 'aria-label': 'Dé ' + (i + 1) + ' : ' + v + (garde && garde[i] ? ' (gardé)' : ''), 'aria-pressed': String(!!(garde && garde[i])) },
        on: { click: function () { if (clic) { clic(i); } } } });
    }));
  }

  // ================================================================== YAM'S
  if (jeu === 'yams') {
    var LIB = { as: 'As (1)', deux: 'Deux', trois: 'Trois', quatre: 'Quatre', cinq: 'Cinq', six: 'Six', brelan: 'Brelan', carre: 'Carré', full: 'Full',
      petite: 'Petite suite', grande: 'Grande suite', yams: 'Yam\'s', chance: 'Chance' };
    var Y = J.charger('yams', null);
    function neufY(noms) { return { phase: 'reglage', noms: noms || ['', ''], feuilles: [], regles: Object.assign({}, JL.YAMS_REGLES), desVirtuels: true, d: { v: [1, 2, 3, 4, 5], g: [false, false, false, false, false], lancers: 0, joueur: 0 } }; }
    if (!Y || !Y.noms) { Y = neufY(); }
    function sauverY() { J.sauver('yams', Y); }
    function rendreY() {
      J.vider(app);
      if (Y.phase === 'reglage') {
        var noms = Y.noms.slice(), R = Y.regles;
        app.append(E('h2', { class: 'titre-outil', text: 'Qui joue ? (1 à 6 joueurs)' }), J.listeNoms(noms, 1, 6, function (l) { noms = l; Y.noms = l; sauverY(); }));
        var reg = E('details', { class: 'reglages' }, [E('summary', { text: 'Barème (Yahtzee de Hasbro par défaut) : modifier' })]);
        [['full', 'Full'], ['petite', 'Petite suite'], ['grande', 'Grande suite'], ['yams', 'Yam\'s'], ['seuil', 'Seuil du bonus'], ['bonus', 'Bonus'], ['primeYams', 'Prime par Yam\'s en plus']].forEach(function (c) {
          reg.append(E('label', { class: 'mini-champ' }, [c[1], J.nombre('yr' + c[0], R[c[0]], function (v) { R[c[0]] = J.nb(v); sauverY(); }, { min: '0' })]));
        });
        reg.append(E('p', { class: 'aide', text: 'Brelan, carré et chance valent toujours la somme des 5 dés.' }));
        var chk = E('input', { type: 'checkbox', checked: Y.desVirtuels, on: { change: function () { Y.desVirtuels = this.checked; sauverY(); } } });
        app.append(reg, E('label', { class: 'ligne-case' }, [chk, 'Afficher des dés virtuels (si vous n\'avez pas de dés)']));
        app.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton', text: 'Commencer la partie', on: { click: function () {
          Y.noms = J.nomsPropres(noms); Y.feuilles = Y.noms.map(function () { return { primes: 0 }; }); Y.phase = 'partie'; Y.d.joueur = 0; Y.d.lancers = 0; sauverY(); rendreY();
        } } })]));
        return;
      }
      var tot = Y.feuilles.map(function (f) { return JL.yamsTotaux(f, Y.regles); });
      var plein = Y.feuilles.every(function (f) { return JL.YAMS_CASES.every(function (c) { return f[c] !== undefined && f[c] !== null && f[c] !== ''; }); });
      var rang = JL.classement(tot.map(function (t) { return t.total; }), false);
      var grands = E('div', { class: 'scores-grands', attrs: { 'aria-live': 'polite' } });
      Y.noms.forEach(function (n, i) {
        grands.append(E('div', { class: 'score-joueur' + (rang[i] === 1 ? ' premier' : '') + (plein && rang[i] === 1 ? ' gagnant' : '') }, [E('span', { class: 'nom-joueur', text: n }),
          E('span', { class: 'total', text: String(tot[i].total) }), E('span', { class: 'rang', text: tot[i].bonus ? 'bonus gagné' : 'bonus : il manque ' + tot[i].manque })]));
      });
      app.append(grands);
      if (plein) { app.append(E('p', { class: 'bandeau-fin', text: 'Partie terminée : ' + Y.noms.filter(function (_, i) { return rang[i] === 1; }).join(' et ') + ' gagne' + (rang.filter(function (r) { return r === 1; }).length > 1 ? 'nt (égalité)' : '') + ' !' })); }
      // dés virtuels
      if (Y.desVirtuels && !plein) {
        var D = Y.d, zoneD = E('div', { class: 'saisie' }, [E('h2', { class: 'titre-outil', text: 'Dés virtuels' })]);
        zoneD.append(J.bloc('À qui le tour ?', [J.selecteur('yJoueur', Y.noms.map(function (x, i) { return [i, x]; }), D.joueur, function (v) { D.joueur = +v; D.lancers = 0; D.g = [false, false, false, false, false]; sauverY(); rendreY(); })]));
        if (D.lancers) { zoneD.append(des(D.v, D.g, function (i) { D.g[i] = !D.g[i]; sauverY(); rendreY(); })); zoneD.append(E('p', { class: 'aide', text: 'Touchez un dé pour le garder. Lancer ' + D.lancers + ' sur 3.' })); }
        zoneD.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton', text: D.lancers ? (D.lancers < 3 ? 'Relancer les dés non gardés' : 'Plus de lancer : inscrivez un score') : 'Lancer les 5 dés', disabled: D.lancers >= 3,
          on: { click: function () { for (var i = 0; i < 5; i++) { if (!D.lancers || !D.g[i]) { D.v[i] = JL.hasard(6) + 1; } } D.lancers++; sauverY(); rendreY(); J.annonce('Dés : ' + D.v.join(', ')); } } })]));
        if (D.lancers) {
          var f = Y.feuilles[D.joueur], props = E('div', { class: 'propositions' });
          JL.YAMS_CASES.forEach(function (c) {
            if (f[c] !== undefined && f[c] !== null && f[c] !== '') { return; }
            var val = JL.yamsValeur(c, D.v, Y.regles);
            props.append(E('button', { type: 'button', class: val ? 'mini' : 'mini barre', text: LIB[c] + ' : ' + val, on: { click: function () {
              if (c === 'yams' && false) { return; }
              f[c] = val; D.lancers = 0; D.g = [false, false, false, false, false]; D.joueur = (D.joueur + 1) % Y.noms.length; sauverY(); rendreY();
            } } }));
          });
          var dejaYams = f.yams === Y.regles.yams && JL.yamsValeur('yams', D.v, Y.regles);
          if (dejaYams) { props.append(E('button', { type: 'button', class: 'mini', text: 'Prime Yam\'s +' + Y.regles.primeYams, on: { click: function () { f.primes = (f.primes || 0) + 1; sauverY(); rendreY(); } } })); }
          zoneD.append(E('p', { class: 'etiquette', text: 'Inscrire pour ' + Y.noms[D.joueur] + ' :' }), props);
        }
        app.append(zoneD);
      }
      // la feuille
      var tete = E('tr', {}, [E('th', { text: 'Case' })].concat(Y.noms.map(function (n) { return E('th', { class: 'nombre', text: n }); })));
      var corps = E('tbody');
      function ligneTotal(lib, cle) { corps.append(E('tr', { class: 'total-ligne' }, [E('td', { text: lib })].concat(tot.map(function (t) { return E('td', { class: 'nombre', text: String(t[cle]) }); })))); }
      JL.YAMS_CASES.forEach(function (c, k) {
        var tr = E('tr', {}, [E('td', { text: LIB[c] + (k >= 6 ? ' ' + ({ full: '(' + Y.regles.full + ')', petite: '(' + Y.regles.petite + ')', grande: '(' + Y.regles.grande + ')', yams: '(' + Y.regles.yams + ')' }[c] || '') : '') })]);
        Y.feuilles.forEach(function (f, i) {
          var opts = [['', '·'], [0, '0 (barré)']];
          if (k < 6) { for (var m = 1; m <= 5; m++) { opts.push([m * (k + 1), String(m * (k + 1))]); } }
          else if (c === 'brelan' || c === 'carre' || c === 'chance') { for (var s = 5; s <= 30; s++) { opts.push([s, String(s)]); } }
          else { opts.push([Y.regles[c], String(Y.regles[c])]); }
          var sel = J.selecteur('y' + i + c, opts, f[c] === undefined || f[c] === null ? '' : f[c], function (v) { f[c] = v === '' ? null : +v; sauverY(); rendreY(); });
          sel.setAttribute('aria-label', LIB[c] + ' pour ' + Y.noms[i]);
          tr.append(E('td', { class: 'nombre' }, [sel]));
        });
        corps.append(tr);
        if (k === 5) { ligneTotal('Total du haut', 'haut'); ligneTotal('Bonus (≥ ' + Y.regles.seuil + ')', 'bonus'); }
      });
      var primes = E('tr', {}, [E('td', { text: 'Primes Yam\'s (+' + Y.regles.primeYams + ')' })].concat(Y.feuilles.map(function (f, i) {
        return E('td', { class: 'nombre' }, [E('button', { type: 'button', class: 'mini', text: '−', attrs: { 'aria-label': 'Retirer une prime à ' + Y.noms[i] }, on: { click: function () { f.primes = Math.max(0, (f.primes || 0) - 1); sauverY(); rendreY(); } } }),
          ' ' + (f.primes || 0) + ' ', E('button', { type: 'button', class: 'mini', text: '+', attrs: { 'aria-label': 'Ajouter une prime à ' + Y.noms[i] }, on: { click: function () { f.primes = (f.primes || 0) + 1; sauverY(); rendreY(); } } })]);
      })));
      corps.append(primes);
      ligneTotal('Total du bas', 'bas'); ligneTotal('TOTAL', 'total');
      app.append(E('div', { class: 'tableau-defile' }, [E('table', { class: 'tableau-scores feuille-yams' }, [E('thead', {}, [tete]), corps])]));
      app.append(E('div', { class: 'boutons boutons-partie' }, [E('button', { type: 'button', text: 'Nouvelle partie', on: { click: function () {
        if (!window.confirm('Effacer la feuille et commencer une nouvelle partie ?')) { return; }
        Y = Object.assign(neufY(Y.noms), { regles: Y.regles, desVirtuels: Y.desVirtuels }); sauverY(); rendreY();
      } } })]));
    }
    rendreY();
  }

  // ================================================================== MÖLKKY
  if (jeu === 'molkky') {
    var M = J.charger('molkky', null);
    function neufM(noms) { return { phase: 'reglage', noms: noms || ['', ''], joueurs: [], tour: 0, histo: [], choix: [], journal: [] }; }
    if (!M || !M.noms) { M = neufM(); }
    function sauverM() { J.sauver('molkky', M); }
    function vivants() { return M.joueurs.filter(function (j) { return !j.elimine; }).length; }
    function gagnant() {
      var g = M.joueurs.findIndex(function (j) { return j.score === 50; });
      if (g >= 0) { return g; }
      if (M.joueurs.length > 1 && vivants() === 1) { return M.joueurs.findIndex(function (j) { return !j.elimine; }); }
      return -1;
    }
    function rendreM() {
      J.vider(app);
      if (M.phase === 'reglage') {
        var noms = M.noms.slice();
        app.append(E('h2', { class: 'titre-outil', text: 'Joueurs ou équipes (dans l\'ordre de jeu)' }), J.listeNoms(noms, 1, 12, function (l) { noms = l; M.noms = l; sauverM(); }));
        app.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton', text: 'Commencer la partie', on: { click: function () {
          M.noms = J.nomsPropres(noms); M.joueurs = M.noms.map(function () { return { score: 0, rates: 0, elimine: false }; }); M.phase = 'partie'; M.tour = 0; M.histo = []; M.choix = []; M.journal = []; sauverM(); rendreM();
        } } })]));
        return;
      }
      var g = gagnant();
      var grands = E('div', { class: 'scores-grands', attrs: { 'aria-live': 'polite' } });
      M.joueurs.forEach(function (j, i) {
        grands.append(E('div', { class: 'score-joueur' + (i === M.tour && g < 0 ? ' actif' : '') + (i === g ? ' gagnant' : '') + (j.elimine ? ' elimine' : '') }, [
          E('span', { class: 'nom-joueur', text: M.noms[i] }), E('span', { class: 'total', text: String(j.score) }),
          E('span', { class: 'rang', text: j.elimine ? 'éliminé' : 'il manque ' + (50 - j.score) + ' · ratés ' + '●'.repeat(j.rates) + '○'.repeat(3 - j.rates) })]));
      });
      app.append(grands);
      if (g >= 0) { app.append(E('p', { class: 'bandeau-fin', text: M.noms[g] + ' gagne' + (M.joueurs[g].score === 50 ? ' avec 50 points pile !' : ' : tous les autres sont éliminés.') })); }
      else {
        var j = M.joueurs[M.tour];
        var zone = E('div', { class: 'saisie' }, [E('h2', { class: 'titre-outil', text: 'Au tour de ' + M.noms[M.tour] + ' (' + j.score + ' points)' })]);
        var quilles = E('div', { class: 'quilles', attrs: { role: 'group', 'aria-label': 'Quilles tombées' } });
        [7, 9, 8, 5, 11, 12, 6, 3, 10, 4, 1, 2].forEach(function (q) {
          quilles.append(E('button', { type: 'button', class: 'quille', text: String(q), attrs: { 'aria-pressed': String(M.choix.indexOf(q) >= 0) }, on: { click: function () {
            var k = M.choix.indexOf(q); if (k >= 0) { M.choix.splice(k, 1); } else { M.choix.push(q); } sauverM(); rendreM();
          } } }));
        });
        var pts = M.choix.length === 1 ? M.choix[0] : M.choix.length, apres = j.score + pts;
        zone.append(quilles, E('p', { class: 'apercu', text: M.choix.length ? (M.choix.length === 1 ? 'Une seule quille : ' + pts + ' points' : M.choix.length + ' quilles : ' + pts + ' points') + ' → ' + (apres > 50 ? 'dépasse 50, retour à 25' : apres === 50 ? '50 pile, victoire !' : apres + ' points') : 'Touchez les quilles tombées, puis validez.' }));
        function jouer(liste) {
          M.histo.push(copie({ joueurs: M.joueurs, tour: M.tour, journal: M.journal }));
          var e = JL.molkky(M.joueurs[M.tour], liste);
          M.joueurs[M.tour] = { score: e.score, rates: e.rates, elimine: e.elimine };
          M.journal.push(M.noms[M.tour] + ' : ' + (liste.length ? '+' + e.points + (e.retour25 ? ' → dépasse 50, retour à 25' : ' → ' + e.score) : 'raté' + (e.elimine ? ' (3e de suite : éliminé)' : '')));
          M.choix = [];
          if (gagnant() < 0) { var n = M.joueurs.length; do { M.tour = (M.tour + 1) % n; } while (M.joueurs[M.tour].elimine); }
          sauverM(); rendreM(); J.annonce(M.journal[M.journal.length - 1]);
        }
        zone.append(E('div', { class: 'boutons' }, [
          E('button', { type: 'button', class: 'principal grand-bouton', text: 'Valider le lancer', disabled: !M.choix.length, on: { click: function () { jouer(M.choix.slice()); } } }),
          E('button', { type: 'button', class: 'grand-bouton', text: 'Raté (aucune quille)', on: { click: function () { jouer([]); } } })]));
        app.append(zone);
      }
      app.append(E('div', { class: 'boutons boutons-partie' }, [
        E('button', { type: 'button', text: '↶ Annuler le dernier lancer', disabled: !M.histo.length, on: { click: function () { var h = M.histo.pop(); M.joueurs = h.joueurs; M.tour = h.tour; M.journal = h.journal; M.choix = []; sauverM(); rendreM(); } } }),
        E('button', { type: 'button', text: 'Nouvelle partie', on: { click: function () { if (M.histo.length && !window.confirm('Effacer la partie en cours ?')) { return; } M = neufM(M.noms); sauverM(); rendreM(); } } })]));
      if (M.journal.length) { app.append(E('details', { class: 'historique' }, [E('summary', { text: 'Les ' + M.journal.length + ' derniers lancers' }), E('ol', { class: 'journal', reversed: true }, M.journal.slice().reverse().map(function (l) { return E('li', { text: l }); }))])); }
    }
    rendreM();
  }

  // ================================================================== FLÉCHETTES
  if (jeu === 'flechettes') {
    var F = J.charger('flechettes', null);
    function neufF(noms) { return { phase: 'reglage', noms: noms || ['', ''], mode: 501, double: true, joueurs: [], tour: 0, volee: [], mult: 1, histo: [], journal: [] }; }
    if (!F || !F.noms) { F = neufF(); }
    function sauverF() { J.sauver('flechettes', F); }
    function rendreF() {
      J.vider(app);
      if (F.phase === 'reglage') {
        var noms = F.noms.slice();
        app.append(E('h2', { class: 'titre-outil', text: 'Joueurs' }), J.listeNoms(noms, 1, 6, function (l) { noms = l; F.noms = l; sauverF(); }));
        app.append(J.bloc('Jeu', [J.segments([[301, '301'], [501, '501'], ['cricket', 'Cricket']], F.mode, function (v) { F.mode = v; sauverF(); }, 'Jeu')]));
        app.append(J.bloc('Sortie', [J.segments([[true, 'Double obligatoire'], [false, 'Libre']], F.double, function (v) { F.double = v; sauverF(); }, 'Sortie')], 'Pour 301 et 501 : en sortie double, la dernière fléchette doit tomber dans un double ou dans le centre (50).'));
        app.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton', text: 'Commencer la partie', on: { click: function () {
          F.noms = J.nomsPropres(noms); F.joueurs = F.mode === 'cricket' ? JL.cricketNouveau(F.noms.length) : F.noms.map(function () { return { reste: F.mode }; });
          F.phase = 'partie'; F.tour = 0; F.volee = []; F.histo = []; F.journal = []; F.mult = 1; sauverF(); rendreF();
        } } })]));
        return;
      }
      var cricket = F.mode === 'cricket';
      var g = cricket ? JL.cricketGagnant(F.joueurs) : F.joueurs.findIndex(function (j) { return j.reste === 0; });
      var grands = E('div', { class: 'scores-grands', attrs: { 'aria-live': 'polite' } });
      F.joueurs.forEach(function (j, i) {
        var info = cricket ? JL.CRICKET.map(function (c) { return (c === 25 ? 'C' : c) + ['', '/', '×', '⊗'][j.marques[c]]; }).join(' ') : (j.reste <= 170 && F.double ? (JL.finitions(j.reste, true)[0] || ['pas de finition en 3']).join(' ') : '');
        grands.append(E('div', { class: 'score-joueur' + (i === F.tour && g < 0 ? ' actif' : '') + (i === g ? ' gagnant' : '') }, [E('span', { class: 'nom-joueur', text: F.noms[i] }),
          E('span', { class: 'total', text: String(cricket ? j.points : j.reste) }), E('span', { class: 'rang', text: info || ' ' })]));
      });
      app.append(grands);
      if (g >= 0) { app.append(E('p', { class: 'bandeau-fin', text: F.noms[g] + ' gagne !' })); }
      else {
        var moi = F.joueurs[F.tour];
        var zone = E('div', { class: 'saisie' }, [E('h2', { class: 'titre-outil', text: F.noms[F.tour] + ' : fléchette ' + (F.volee.length + 1) + ' sur 3' })]);
        if (!cricket) {
          var dejaFait = F.volee.reduce(function (s, f) { return s + f.v * f.m; }, 0), reste = moi.reste - dejaFait;
          var fins = reste > 0 && reste <= 170 ? JL.finitions(reste, F.double, 3 - F.volee.length) : [];
          zone.append(E('p', { class: 'apercu', text: 'Reste ' + reste + (fins.length ? ' · finitions : ' + fins.map(function (l) { return l.join(' '); }).join('  ou  ') : reste <= 170 && reste > 1 ? ' · pas de finition avec ' + (3 - F.volee.length) + ' fléchette(s)' : '') }));
        }
        zone.append(J.segments([[1, 'Simple'], [2, 'Double'], [3, 'Triple']], F.mult, function (v) { F.mult = v; sauverF(); }, 'Multiplicateur'));
        var pave = E('div', { class: 'pave' });
        var cibles = cricket ? JL.CRICKET.concat([0]) : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 25, 0];
        cibles.forEach(function (v) {
          pave.append(E('button', { type: 'button', class: 'touche' + (v === 0 ? ' rate' : ''), text: v === 0 ? 'Raté' : v === 25 ? 'Centre' : String(v), on: { click: function () {
            var m = v === 0 ? 0 : (v === 25 && F.mult === 3 ? 2 : F.mult);
            F.histo.push(copie({ joueurs: F.joueurs, tour: F.tour, volee: F.volee, journal: F.journal }));
            F.volee.push({ v: v || 0, m: m }); F.mult = 1;
            if (cricket) {
              if (v) { F.joueurs = JL.cricketTouche(F.joueurs, F.tour, v, m); }
              if (F.volee.length >= 3 || JL.cricketGagnant(F.joueurs) >= 0) { F.journal.push(F.noms[F.tour] + ' : ' + F.volee.map(nomF).join(', ')); F.volee = []; if (JL.cricketGagnant(F.joueurs) < 0) { F.tour = (F.tour + 1) % F.joueurs.length; } }
            } else {
              var r = JL.volee(F.joueurs[F.tour].reste, F.volee, F.double);
              if (r.bust || r.fini || F.volee.length >= 3) {
                F.journal.push(F.noms[F.tour] + ' : ' + F.volee.map(nomF).join(', ') + (r.bust ? ' → dépassement, volée annulée' : r.fini ? ' → terminé !' : ' → reste ' + r.reste));
                F.joueurs[F.tour].reste = r.reste; F.volee = [];
                if (!r.fini) { F.tour = (F.tour + 1) % F.joueurs.length; }
              }
            }
            sauverF(); rendreF(); J.annonce(F.journal.length ? F.journal[F.journal.length - 1] : '');
          } } }));
        });
        zone.append(pave);
        app.append(zone);
      }
      app.append(E('div', { class: 'boutons boutons-partie' }, [
        E('button', { type: 'button', text: '↶ Annuler la dernière fléchette', disabled: !F.histo.length, on: { click: function () { var h = F.histo.pop(); F.joueurs = h.joueurs; F.tour = h.tour; F.volee = h.volee; F.journal = h.journal; sauverF(); rendreF(); } } }),
        E('button', { type: 'button', text: 'Nouvelle partie', on: { click: function () { if (F.histo.length && !window.confirm('Effacer la partie en cours ?')) { return; } var m = F.mode, d = F.double; F = neufF(F.noms); F.mode = m; F.double = d; sauverF(); rendreF(); } } })]));
      if (F.journal.length) { app.append(E('details', { class: 'historique' }, [E('summary', { text: 'Volées jouées' }), E('ol', { class: 'journal', reversed: true }, F.journal.slice().reverse().map(function (l) { return E('li', { text: l }); }))])); }
    }
    function nomF(f) { return f.m === 0 ? 'raté' : f.v === 25 ? (f.m === 2 ? 'centre 50' : '25') : (['', '', 'D', 'T'][f.m] + f.v); }
    rendreF();
  }

  // ================================================================== LANCER DE DÉS
  if (jeu === 'des') {
    var S = J.charger('des', null) || { n: 2, faces: 6, histo: [] };
    function sauverS() { J.sauver('des', S); }
    function rendreS(dernier) {
      J.vider(app);
      var nb = [];
      for (var i = 1; i <= 10; i++) { nb.push([i, String(i)]); }
      app.append(E('div', { class: 'grille-saisie' }, [
        J.bloc('Nombre de dés', [J.selecteur('dN', nb, S.n, function (v) { S.n = +v; sauverS(); })]),
        J.bloc('Type de dé', [J.segments([[4, 'd4'], [6, 'd6'], [8, 'd8'], [10, 'd10'], [12, 'd12'], [20, 'd20'], [100, 'd100']], S.faces, function (v) { S.faces = v; sauverS(); }, 'Type de dé')])]));
      var res = dernier || S.histo[0];
      var zone = E('div', { class: 'resultat-des', attrs: { 'aria-live': 'polite' } });
      if (res) {
        zone.append(des(res.valeurs));
        zone.append(E('p', { class: 'total-des' }, [E('span', { text: 'Total' }), E('strong', { text: String(res.total) })]));
        zone.append(E('p', { class: 'aide', text: res.n + 'd' + res.faces + (res.n > 1 ? ' · plus haut ' + Math.max.apply(null, res.valeurs) + ' · plus bas ' + Math.min.apply(null, res.valeurs) : '') }));
      } else { zone.append(E('p', { class: 'aide', text: 'Choisissez vos dés puis lancez.' })); }
      app.append(E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton tres-grand', text: '🎲 Lancer', on: { click: function () {
        var r = JL.lancerDes(S.n, S.faces); r.n = S.n; r.faces = S.faces;
        S.histo.unshift(r); S.histo = S.histo.slice(0, 20); sauverS(); rendreS(r); J.annonce('Total ' + r.total + ' : ' + r.valeurs.join(', '));
      } } })]), zone);
      if (S.histo.length > 1) {
        app.append(E('details', { class: 'historique' }, [E('summary', { text: 'Les ' + S.histo.length + ' derniers lancers' }), E('ol', { class: 'journal' }, S.histo.map(function (h) { return E('li', { text: h.n + 'd' + h.faces + ' : ' + h.valeurs.join(' + ') + ' = ' + h.total }); })),
          E('button', { type: 'button', class: 'mini', text: 'Effacer l\'historique', on: { click: function () { S.histo = []; sauverS(); rendreS(); } } })]));
      }
    }
    rendreS();
  }
}());
