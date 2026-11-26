/* Feuilles de marque : tarot, belote, coinche, Skyjo, Uno et feuille universelle (moteur J.feuille de jeux.js). */
(function () {
  'use strict';
  var app = document.getElementById('app');
  if (!app || !window.J || !window.JL) { return; }
  var E = J.el, jeu = app.getAttribute('data-jeu');

  function apercu() { return E('p', { class: 'apercu', attrs: { 'aria-live': 'polite' } }); }
  function valider(texte, fn) { return E('div', { class: 'boutons' }, [E('button', { type: 'button', class: 'principal grand-bouton', text: texte, on: { click: fn } })]); }
  function equipesOptions(etat) { return [[0, etat.noms[0]], [1, etat.noms[1]]]; }

  // ================================================================== TAROT
  if (jeu === 'tarot') {
    J.feuille({
      cle: 'tarot', noms: ['', '', '', ''], min: 3, max: 5, motManche: 'Donne',
      titreReglage: 'Qui joue ? (3, 4 ou 5 joueurs)',
      info: function (i, t, etat) { return ''; },
      saisie: function (etat, zone, ok) {
        var n = etat.noms.length;
        var d = { joueurs: n, preneur: 0, appele: n === 5 ? 1 : -1, contrat: 'garde', bouts: 1, points: '', petit: 'aucun', poigneeAttaque: 0, poigneeDefense: 0, chelem: 'aucun' };
        var sortie = apercu(), bouton;
        var noms = etat.noms.map(function (x, i) { return [i, x]; });
        var nbAtouts = JL.TAROT_POIGNEES[n];
        var poignees = [[0, 'Aucune'], [1, 'Simple (' + nbAtouts[0] + ')'], [2, 'Double (' + nbAtouts[1] + ')'], [3, 'Triple (' + nbAtouts[2] + ')']];
        function maj() {
          var p = J.nb(d.points);
          if (d.points === '' || p < 0 || p > 91) { sortie.textContent = 'Tapez les points faits par le camp du preneur (0 à 91).'; bouton.disabled = true; return null; }
          var r = JL.tarot(Object.assign({}, d, { points: p }));
          var qui = etat.noms[d.preneur];
          sortie.textContent = (r.gagne ? 'Gagnée de ' : 'Chutée de ') + r.ecart + ' (il fallait ' + r.seuil + ') · donne : ' + J.signe(r.valeur) +
            ' · ' + qui + ' ' + J.signe(r.scores[d.preneur]) + (n === 5 && d.appele >= 0 && d.appele !== d.preneur ? ' · ' + etat.noms[d.appele] + ' ' + J.signe(r.scores[d.appele]) : '') +
            ' · défenseurs ' + J.signe(-r.valeur) + ' chacun';
          bouton.disabled = false;
          return r;
        }
        zone.append(E('div', { class: 'grille-saisie' }, [
          J.bloc('Preneur', [J.selecteur('tPreneur', noms, 0, function (v) { d.preneur = +v; maj(); })]),
          n === 5 ? J.bloc('Roi appelé chez', [J.selecteur('tAppele', noms.concat([[-1, 'Personne (roi au chien)']]), 1, function (v) { d.appele = +v; maj(); })], 'Choisissez le preneur s\'il s\'est appelé lui-même : il joue seul.') : null,
          J.bloc('Contrat', [J.segments([['prise', 'Prise'], ['garde', 'Garde'], ['garde_sans', 'Garde sans'], ['garde_contre', 'Garde contre']], 'garde', function (v) { d.contrat = v; maj(); }, 'Contrat')]),
          J.bloc('Bouts du preneur', [J.segments([[0, '0'], [1, '1'], [2, '2'], [3, '3']], 1, function (v) { d.bouts = v; maj(); }, 'Nombre de bouts')], 'Il faut 56, 51, 41 ou 36 points avec 0, 1, 2 ou 3 bouts.'),
          J.bloc('Points faits par le preneur', [J.nombre('tPoints', '', function (v) { d.points = v; maj(); }, { inputmode: 'decimal', step: '0.5', min: '0', max: '91' })], 'Au demi-point près : la défense a 91 moins ce nombre.'),
          J.bloc('Petit au bout', [J.segments([['aucun', 'Non'], ['attaque', 'Attaque'], ['defense', 'Défense']], 'aucun', function (v) { d.petit = v; maj(); }, 'Petit au bout')]),
          J.bloc('Poignée de l\'attaque', [J.selecteur('tPa', poignees, 0, function (v) { d.poigneeAttaque = +v; maj(); })]),
          J.bloc('Poignée de la défense', [J.selecteur('tPd', poignees, 0, function (v) { d.poigneeDefense = +v; maj(); })], 'Les primes de poignée vont toujours au camp qui gagne la donne.'),
          J.bloc('Chelem', [J.selecteur('tChelem', [['aucun', 'Aucun'], ['annonce_reussi', 'Annoncé et réussi (+400)'], ['non_annonce', 'Non annoncé, réussi (+200)'], ['annonce_chute', 'Annoncé, raté (−200)'], ['defense', 'Réalisé par la défense (+200 défense)']], 'aucun', function (v) { d.chelem = v; maj(); })])
        ]));
        zone.append(sortie);
        var v = valider('Valider la donne', function () {
          var r = maj(); if (!r) { return; }
          var c = { prise: 'Prise', garde: 'Garde', garde_sans: 'Garde sans', garde_contre: 'Garde contre' }[d.contrat];
          ok(r.scores, c + ' de ' + etat.noms[d.preneur] + ', ' + d.bouts + ' bout' + (d.bouts > 1 ? 's' : '') + ', ' + J.fmt(J.nb(d.points)) + ' pts : ' +
            (r.gagne ? 'gagnée de ' : 'chutée de ') + r.ecart + ' (' + J.signe(r.valeur) + ')');
        });
        bouton = v.querySelector('button');
        zone.append(v);
        maj();
      }
    });
  }

  // ================================================================== BELOTE
  if (jeu === 'belote') {
    J.feuille({
      cle: 'belote', noms: ['Nous', 'Eux'], min: 2, max: 2, prefixe: 'Équipe', motManche: 'Donne', options: { cible: 1000 },
      titreReglage: 'Les deux équipes',
      reglages: function (opt, z, etat, sauver) {
        z.append(J.bloc('La partie se joue en', [J.segments([[501, '501 points'], [1000, '1 000 points']], opt.cible, function (v) { opt.cible = v; sauver(); }, 'Score à atteindre')]));
      },
      info: function (i, t, etat) { return 'reste ' + Math.max(0, etat.opt.cible - t[i]); },
      fin: function (t, etat) {
        var max = Math.max(t[0], t[1]);
        if (max < etat.opt.cible || t[0] === t[1]) { return { fini: false }; }
        return { fini: true, gagnants: [t[0] > t[1] ? 0 : 1] };
      },
      saisie: function (etat, zone, ok) {
        var der = etat.manches.length ? etat.manches[etat.manches.length - 1].x : null, litige = der && der.litige ? der.litige : 0;
        var d = { preneur: 0, points: '', belote: -1, capot: -1, annonces: [0, 0], litige: litige };
        var sortie = apercu(), bouton, eq = equipesOptions(etat);
        function maj() {
          var p = J.nb(d.points);
          if (d.capot < 0 && (d.points === '' || p < 0 || p > 162)) { sortie.textContent = 'Tapez les points de cartes du preneur (0 à 162, dix de der compris).'; bouton.disabled = true; return null; }
          var r = JL.belote(Object.assign({}, d, { points: d.capot >= 0 ? 162 : p }));
          var txt = { fait: 'Contrat fait', dedans: 'Dedans : la défense marque tout', litige: 'Litige : les points du preneur sont mis en attente', capot: 'Capot !' }[r.statut];
          sortie.textContent = txt + ' · ' + etat.noms[0] + ' ' + J.signe(r.scores[0]) + ' · ' + etat.noms[1] + ' ' + J.signe(r.scores[1]) + (r.litige ? ' · ' + r.litige + ' en litige' : '');
          bouton.disabled = false;
          return r;
        }
        if (litige) { zone.append(E('p', { class: 'encadre', text: litige + ' points sont en litige : ils iront à l\'équipe qui gagne cette donne.' })); }
        zone.append(E('div', { class: 'grille-saisie' }, [
          J.bloc('Équipe qui a pris', [J.segments(eq, 0, function (v) { d.preneur = v; maj(); }, 'Preneur')]),
          J.bloc('Points de cartes du preneur', [J.nombre('bPoints', '', function (v) { d.points = v; maj(); }, { min: '0', max: '162' })], 'Dix de der compris, sans la belote ni les annonces. La défense a 162 moins ce nombre.'),
          J.bloc('Belote-rebelote (20)', [J.segments([[-1, 'Personne']].concat(eq), -1, function (v) { d.belote = v; maj(); }, 'Belote')]),
          J.bloc('Annonces de ' + etat.noms[0], [J.nombre('bA0', 0, function (v) { d.annonces[0] = J.nb(v); maj(); }, { min: '0' })], 'Tierce 20, cinquante 50, cent 100, carrés… si vous les jouez.'),
          J.bloc('Annonces de ' + etat.noms[1], [J.nombre('bA1', 0, function (v) { d.annonces[1] = J.nb(v); maj(); }, { min: '0' })]),
          J.bloc('Capot (tous les plis)', [J.segments([[-1, 'Non']].concat(eq), -1, function (v) { d.capot = v; maj(); }, 'Capot')], 'Le capot vaut 252 points.')
        ]));
        zone.append(sortie);
        var v = valider('Valider la donne', function () {
          var r = maj(); if (!r) { return; }
          ok(r.scores, etat.noms[d.preneur] + ' prend : ' + { fait: 'fait', dedans: 'dedans', litige: 'litige', capot: 'capot' }[r.statut] + (d.litige && r.statut !== 'litige' ? ' (+' + d.litige + ' du litige)' : ''), { litige: r.litige });
        });
        bouton = v.querySelector('button');
        zone.append(v);
        maj();
      }
    });
  }

  // ================================================================== COINCHE
  if (jeu === 'coinche') {
    J.feuille({
      cle: 'coinche', noms: ['Nous', 'Eux'], min: 2, max: 2, prefixe: 'Équipe', motManche: 'Donne',
      options: { cible: 2000, mode: 'faits', arrondi: true, capot: 250, generale: 500 },
      titreReglage: 'Les deux équipes',
      reglages: function (opt, z, etat, sauver) {
        var expl = E('p', { class: 'aide' });
        function texte() {
          expl.textContent = opt.mode === 'faits'
            ? 'Points faits : si le contrat passe, le preneur marque ses points de cartes + le contrat, la défense marque ses points ; s\'il chute, la défense marque 160 + le contrat. Coinché : le gagnant marque le double, l\'autre rien.'
            : 'Contrat seulement : seul le contrat compte. S\'il passe, le preneur marque sa valeur ; s\'il chute, la défense marque cette valeur. Coinche ×2, surcoinche ×4.';
        }
        texte();
        z.append(J.bloc('Partie en', [J.selecteur('cCible', [[501, '501'], [701, '701'], [1000, '1 000'], [1500, '1 500'], [2000, '2 000']], opt.cible, function (v) { opt.cible = +v; sauver(); })]));
        z.append(J.bloc('Décompte (il en existe plusieurs : mettez-vous d\'accord)', [J.segments([['faits', 'Points faits + contrat'], ['annonces', 'Contrat seulement']], opt.mode, function (v) { opt.mode = v; texte(); sauver(); }, 'Décompte'), expl]));
        z.append(J.bloc('Arrondi des points de cartes', [J.segments([[true, 'À la dizaine'], [false, 'Points exacts']], opt.arrondi, function (v) { opt.arrondi = v; sauver(); }, 'Arrondi')], '84 → 80, 85 → 90.'));
        z.append(J.bloc('Valeur du capot', [J.nombre('cCapot', opt.capot, function (v) { opt.capot = J.nb(v) || 250; sauver(); })]));
        z.append(J.bloc('Valeur de la générale', [J.nombre('cGen', opt.generale, function (v) { opt.generale = J.nb(v) || 500; sauver(); })], 'Générale : un seul joueur fait tous les plis.'));
      },
      info: function (i, t, etat) { return 'reste ' + Math.max(0, etat.opt.cible - t[i]); },
      fin: function (t, etat) {
        if (Math.max(t[0], t[1]) < etat.opt.cible || t[0] === t[1]) { return { fini: false }; }
        return { fini: true, gagnants: [t[0] > t[1] ? 0 : 1] };
      },
      saisie: function (etat, zone, ok) {
        var o = etat.opt, eq = equipesOptions(etat);
        var d = { preneur: 0, contrat: 80, multiplicateur: 1, points: '', tousLesPlis: false, belote: -1 };
        var sortie = apercu(), bouton;
        var contrats = [];
        for (var c = 80; c <= 160; c += 10) { contrats.push([c, String(c)]); }
        contrats.push(['capot', 'Capot (' + o.capot + ')'], ['generale', 'Générale (' + o.generale + ')']);
        function maj() {
          var p = J.nb(d.points), special = d.contrat === 'capot' || d.contrat === 'generale';
          if (!d.tousLesPlis && (d.points === '' || p < 0 || p > 162)) { sortie.textContent = special ? 'Cochez « tous les plis » si le contrat est réussi, ou tapez les points du preneur.' : 'Tapez les points de cartes du preneur (0 à 162).'; bouton.disabled = true; return null; }
          var r = JL.coinche({ preneur: d.preneur, contrat: d.contrat, multiplicateur: d.multiplicateur, points: d.tousLesPlis ? 162 : p, tousLesPlis: d.tousLesPlis,
            belote: d.belote, mode: o.mode, arrondi: o.arrondi, valeurCapot: o.capot, valeurGenerale: o.generale });
          sortie.textContent = (r.reussi ? 'Contrat réussi' : 'Contrat chuté') + ' · ' + etat.noms[0] + ' ' + J.signe(r.scores[0]) + ' · ' + etat.noms[1] + ' ' + J.signe(r.scores[1]);
          bouton.disabled = false;
          return r;
        }
        var plis = E('input', { type: 'checkbox', id: 'cPlis', on: { change: function () { d.tousLesPlis = this.checked; maj(); } } });
        zone.append(E('div', { class: 'grille-saisie' }, [
          J.bloc('Équipe qui a pris', [J.segments(eq, 0, function (v) { d.preneur = v; maj(); }, 'Preneur')]),
          J.bloc('Contrat', [J.selecteur('cContrat', contrats, 80, function (v) { d.contrat = /^\d+$/.test(v) ? +v : v; maj(); })]),
          J.bloc('Coinche', [J.segments([[1, 'Non'], [2, 'Coinché ×2'], [4, 'Surcoinché ×4']], 1, function (v) { d.multiplicateur = v; maj(); }, 'Coinche')]),
          J.bloc('Points de cartes du preneur', [J.nombre('cPoints', '', function (v) { d.points = v; maj(); }, { min: '0', max: '162' })], 'Dix de der compris, sans la belote.'),
          J.bloc('Tous les plis', [E('label', { class: 'ligne-case' }, [plis, 'Le preneur a fait tous les plis (capot)'])]),
          J.bloc('Belote-rebelote (20)', [J.segments([[-1, 'Personne']].concat(eq), -1, function (v) { d.belote = v; maj(); }, 'Belote')], 'Elle aide le preneur à faire son contrat.')
        ]));
        zone.append(sortie);
        var v = valider('Valider la donne', function () {
          var r = maj(); if (!r) { return; }
          ok(r.scores, etat.noms[d.preneur] + ' : ' + (typeof d.contrat === 'number' ? d.contrat : d.contrat === 'capot' ? 'capot' : 'générale') +
            (d.multiplicateur === 2 ? ' coinché' : d.multiplicateur === 4 ? ' surcoinché' : '') + (r.reussi ? ', réussi' : ', chuté'));
        });
        bouton = v.querySelector('button');
        zone.append(v);
        maj();
      }
    });
  }

  // ================================================================== SKYJO
  if (jeu === 'skyjo') {
    J.feuille({
      cle: 'skyjo', noms: ['', '', ''], min: 2, max: 8, plusBas: true, options: { limite: 100 },
      info: function (i, t, etat) { return t[i] >= etat.opt.limite ? 'a atteint ' + etat.opt.limite : 'encore ' + (etat.opt.limite - t[i]) + ' avant ' + etat.opt.limite; },
      fin: function (t, etat) { return JL.skyjoFin(t, etat.opt.limite); },
      saisie: function (etat, zone, ok) {
        var n = etat.noms.length, scores = etat.noms.map(function () { return ''; }), finisseur = 0, sortie = apercu(), bouton;
        function maj() {
          if (scores.some(function (s) { return s === ''; })) { sortie.textContent = 'Tapez le total de chaque joueur (de −24 à 144).'; bouton.disabled = true; return null; }
          var b = scores.map(J.nb), r = JL.skyjoManche(b, finisseur);
          sortie.textContent = r[finisseur] !== b[finisseur]
            ? etat.noms[finisseur] + ' a fini la manche sans avoir strictement le plus petit score : ' + b[finisseur] + ' doublé = ' + r[finisseur] + '.'
            : etat.noms[finisseur] + ' a fini la manche : pas de doublement' + (b[finisseur] <= 0 ? ' (score nul ou négatif).' : ' (il a strictement le plus petit score).');
          bouton.disabled = false;
          return r;
        }
        var g = E('div', { class: 'grille-saisie' });
        etat.noms.forEach(function (nom, i) { g.append(J.bloc(nom, [J.nombre('sk' + i, '', function (v) { scores[i] = v.trim(); maj(); }, { inputmode: 'text', min: '-24', max: '144' })])); });
        g.append(J.bloc('Qui a retourné toutes ses cartes en premier ?', [J.selecteur('skFin', etat.noms.map(function (x, i) { return [i, x]; }), 0, function (v) { finisseur = +v; maj(); })]));
        zone.append(g, sortie);
        var v = valider('Valider la manche', function () {
          var r = maj(); if (!r) { return; }
          ok(r, 'Fin de manche : ' + etat.noms[finisseur] + (r[finisseur] !== J.nb(scores[finisseur]) ? ' (doublé)' : ''));
        });
        bouton = v.querySelector('button');
        zone.append(v);
        maj();
        if (n) { /* champs créés */ }
      }
    });
  }

  // ================================================================== UNO
  if (jeu === 'uno') {
    J.feuille({
      cle: 'uno', noms: ['', '', ''], min: 2, max: 10, options: { mode: 'gagnant', cible: 500 },
      reglages: function (opt, z, etat, sauver) {
        z.append(J.bloc('Façon de compter', [J.segments([['gagnant', 'Le gagnant marque les cartes des autres'], ['mains', 'Chacun marque ses cartes']], opt.mode, function (v) { opt.mode = v; sauver(); }, 'Façon de compter')],
          'La fiche officielle propose les deux : le premier à 500 gagne, ou, en comptant ses propres cartes, le plus bas gagne quand quelqu\'un atteint 500.'));
        z.append(J.bloc('Partie en', [J.selecteur('uCible', [[250, '250'], [500, '500'], [1000, '1 000']], opt.cible, function (v) { opt.cible = +v; sauver(); })]));
      },
      plusBas: false,
      info: function (i, t, etat) { return etat.opt.mode === 'mains' ? 'reste ' + Math.max(0, etat.opt.cible - t[i]) + ' avant la fin' : 'reste ' + Math.max(0, etat.opt.cible - t[i]); },
      fin: function (t, etat) {
        if (Math.max.apply(null, t) < etat.opt.cible) { return { fini: false }; }
        var cible = etat.opt.mode === 'mains' ? Math.min.apply(null, t) : Math.max.apply(null, t);
        return { fini: true, gagnants: t.map(function (x, i) { return x === cible ? i : -1; }).filter(function (i) { return i >= 0; }) };
      },
      saisie: function (etat, zone, ok) {
        var mains = etat.noms.map(function () { return ''; }), gagnant = 0, sortie = apercu(), bouton, champs = [];
        function maj() {
          var v = mains.map(function (x, i) { return i === gagnant ? 0 : J.nb(x); });
          var r = JL.unoManche(v, gagnant, etat.opt.mode);
          sortie.textContent = etat.opt.mode === 'mains' ? 'Chacun ajoute ses cartes : ' + etat.noms.map(function (n, i) { return n + ' ' + J.signe(r[i]); }).join(' · ')
            : etat.noms[gagnant] + ' marque ' + r[gagnant] + ' points.';
          bouton.disabled = false;
          return r;
        }
        var g = E('div', { class: 'grille-saisie' });
        g.append(J.bloc('Qui a posé sa dernière carte ?', [J.selecteur('uGagnant', etat.noms.map(function (x, i) { return [i, x]; }), 0, function (v) {
          gagnant = +v; champs.forEach(function (c, i) { c.parentNode.style.opacity = i === gagnant ? '.45' : ''; c.disabled = i === gagnant; }); maj(); })]));
        etat.noms.forEach(function (nom, i) {
          var champ = J.nombre('u' + i, '', function (v) { mains[i] = v; maj(); }, { min: '0' });
          champs.push(champ);
          var aide = E('details', { class: 'aide-compte' }, [E('summary', { text: 'Compter ses cartes' })]);
          var m = { chiffres: 0, plus2: 0, inversion: 0, passe: 0, joker: 0, plus4: 0 };
          [['chiffres', 'Total des chiffres'], ['plus2', 'Nombre de +2'], ['inversion', 'Inversions'], ['passe', 'Passe ton tour'], ['joker', 'Jokers'], ['plus4', 'Jokers +4']].forEach(function (c) {
            aide.append(E('label', { class: 'mini-champ' }, [c[1], J.nombre('u' + i + c[0], '', function (v) { m[c[0]] = J.nb(v); champ.value = String(JL.unoMain(m)); mains[i] = champ.value; maj(); }, { min: '0' })]));
          });
          g.append(J.bloc(nom + ' : points en main', [champ, aide]));
        });
        champs[0].disabled = true; champs[0].parentNode.style.opacity = '.45';
        zone.append(g, sortie);
        var v = valider('Valider la manche', function () { var r = maj(); ok(r, 'Manche gagnée par ' + etat.noms[gagnant]); });
        bouton = v.querySelector('button');
        zone.append(v);
        maj();
      }
    });
  }

  // ================================================================== FEUILLE UNIVERSELLE
  if (jeu === 'feuille') {
    J.feuille({
      cle: 'feuille', noms: ['', ''], min: 1, max: 12, options: { plusBas: false, limite: 0 },
      reglages: function (opt, z, etat, sauver) {
        z.append(J.bloc('Qui gagne ?', [J.segments([[false, 'Le plus haut score'], [true, 'Le plus bas score']], opt.plusBas, function (v) { opt.plusBas = v; sauver(); }, 'Qui gagne')]));
        z.append(J.bloc('Fin de partie à (facultatif)', [J.nombre('fLimite', opt.limite || '', function (v) { opt.limite = J.nb(v); sauver(); }, { min: '0' })], 'Laissez vide pour jouer sans limite : vous arrêtez quand vous voulez.'));
      },
      info: function (i, t, etat) { return etat.opt.limite ? (t[i] >= etat.opt.limite ? 'limite atteinte' : 'reste ' + (etat.opt.limite - t[i])) : ''; },
      fin: function (t, etat) {
        if (!etat.opt.limite || Math.max.apply(null, t) < etat.opt.limite) { return { fini: false }; }
        var c = etat.opt.plusBas ? Math.min.apply(null, t) : Math.max.apply(null, t);
        return { fini: true, gagnants: t.map(function (x, i) { return x === c ? i : -1; }).filter(function (i) { return i >= 0; }) };
      },
      saisie: function (etat, zone, ok) {
        var s = etat.noms.map(function () { return ''; }), g = E('div', { class: 'grille-saisie' });
        etat.noms.forEach(function (nom, i) { g.append(J.bloc(nom, [J.nombre('f' + i, '', function (v) { s[i] = v; }, { inputmode: 'text' })])); });
        zone.append(g, valider('Valider la manche', function () { ok(s.map(J.nb)); }));
      }
    });
    // le classement suit le réglage « plus bas gagne »
  }
}());
