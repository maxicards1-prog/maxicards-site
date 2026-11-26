/* Jeux de lettres : interface des six outils (anagrammes, mots croisés, mots de N lettres, Sutom / Wordle,
   points au Scrabble, vérifier un mot). Le texte saisi n'est jamais inséré comme HTML (textContent seulement). */
(function () {
  'use strict';
  var MC = window.MC;
  var ML = window.ML;
  var section = document.querySelector('[data-outil]');
  if (!section || !MC || !ML) { return; }
  var outil = section.getAttribute('data-outil');
  var cheminWorker = section.getAttribute('data-worker') || '';
  var worker = null;
  var numero = 0;
  var groupes = [];
  var enCours = null;
  var minuterie = null;

  function etat(t) { MC.texte('etat', t); }

  function demander(type, params, surMessage) {
    if (!worker) {
      var adresse = null;
      try { adresse = new URL(cheminWorker, window.location.href); } catch (e) { adresse = null; }
      // Le worker ne vient que de ce site (chemin écrit par build.py, vérifié quand même : même origine, même dossier).
      if (typeof Worker === 'undefined' || !adresse || adresse.origin !== window.location.origin ||
          adresse.pathname.indexOf('/mots/assets/js/worker.js') !== 0) {
        etat('Votre navigateur ne permet pas cette recherche.');
        return;
      }
      worker = new Worker(adresse.href);
      worker.onmessage = function (ev) {
        var d = ev.data || {};
        if (enCours && d.id === enCours.id) { enCours.f(d); }
      };
      worker.onerror = function () { etat('La recherche a échoué. Rechargez la page puis réessayez.'); };
    }
    numero += 1;
    enCours = { id: numero, f: surMessage };
    worker.postMessage({ id: numero, type: type, params: params });
  }

  // ---------- affichage des listes de mots ----------
  function puce(e, avecPoints) {
    var li = MC.cree('li', 'mot');
    if (e.j && e.j.length) {
      // Mot fait avec un joker : on montre les lettres du jeu, celles du joker en couleur.
      for (var i = 0; i < e.k.length; i++) {
        li.appendChild(MC.cree('span', e.j.indexOf(i) !== -1 ? 'jk' : '', e.k.charAt(i)));
      }
      li.title = e.f.join(' / ') + ' (lettre en couleur : joker)';
    } else {
      li.appendChild(document.createTextNode(e.f[0]));
      if (e.f.length > 1) { li.title = e.f.join(' / '); }
    }
    if (avecPoints) { li.appendChild(MC.cree('small', 'pts', e.p + ' pt' + (e.p > 1 ? 's' : ''))); }
    return li;
  }

  function dessiner() {
    var zone = MC.el('groupes');
    if (!zone) { return; }
    var tri = MC.el('tri') ? MC.el('tri').value : 'freq';
    var avecPoints = outil === 'anagramme';
    MC.vider(zone);
    groupes.forEach(function (g) {
      if (!g.total) { return; }
      var bloc = MC.cree('section', 'groupe');
      var titre = MC.cree('h3', '', g.longueur + ' lettres · ' + MC.nombre(g.total) + ' mot' + (g.total > 1 ? 's' : ''));
      if (g.total > g.mots.length) { titre.appendChild(MC.cree('small', '', ' (les ' + g.mots.length + ' plus courants : précisez la recherche)')); }
      bloc.appendChild(titre);
      var ul = MC.cree('ul', 'mots');
      ML.trier(g.mots, tri).forEach(function (e) { ul.appendChild(puce(e, avecPoints)); });
      bloc.appendChild(ul);
      zone.appendChild(bloc);
    });
  }

  function lancer(type, params, vide) {
    groupes = [];
    dessiner();
    if (vide) { etat(vide); enCours = null; return; }
    etat('Recherche dans le dictionnaire…');
    demander(type, params, function (d) {
      if (d.type === 'groupe') {
        groupes.push(d);
        dessiner();
        etat('Recherche… ' + MC.nombre(total()) + ' mots pour l\'instant');
      } else if (d.type === 'fin') {
        var t = total();
        etat(t ? MC.nombre(t) + ' mot' + (t > 1 ? 's' : '') + ' trouvé' + (t > 1 ? 's' : '') + ' dans notre dictionnaire libre.'
          : 'Aucun mot de notre dictionnaire libre ne correspond. Vérifiez les lettres ou retirez une contrainte.');
      } else if (d.type === 'erreur') {
        etat(d.message || 'Recherche impossible.');
      }
    });
  }

  function total() { return groupes.reduce(function (s, g) { return s + g.total; }, 0); }

  function plusTard(fn) {
    clearTimeout(minuterie);
    minuterie = setTimeout(fn, 250);
  }

  // ---------- anagrammes ----------
  function anagramme() {
    var brut = ML.lettres(MC.el('lettres').value, true, ML.MAX_LETTRES);
    var jokers = (brut.match(/\?/g) || []).length;
    MC.texte('compteLettres', brut.length + ' / ' + ML.MAX_LETTRES + ' lettres' + (jokers ? ' dont ' + Math.min(jokers, ML.MAX_JOKERS) + ' joker' + (jokers > 1 ? 's' : '') : ''));
    lancer('anagramme', { lettres: brut, courts: MC.el('courts').checked },
      brut.replace(/\?/g, '').length + Math.min(jokers, ML.MAX_JOKERS) < 2 ? 'Tapez au moins 2 lettres : les mots s\'affichent ici.' : '');
  }

  // ---------- mots croisés et fléchés ----------
  function croises() {
    var m = ML.motif(MC.el('motif').value);
    MC.texte('compteLettres', m.length + ' case' + (m.length > 1 ? 's' : '') + ' · ' + (m.replace(/\?/g, '').length) + ' lettre(s) connue(s)');
    lancer('motif', { motif: m, sans: MC.el('sans').value },
      m.length < 2 ? 'Tapez le mot avec un ? pour chaque lettre inconnue, par exemple P?R?S.' : '');
  }

  // ---------- mots de N lettres ----------
  function nlettres() {
    lancer('lettres', { longueur: MC.el('longueur').value, debut: MC.el('debut').value, fin: MC.el('fin').value,
      contient: MC.el('contient').value, sans: MC.el('sans').value }, '');
  }

  // ---------- Sutom / Wordle ----------
  var casesBien = [], casesMal = [];
  function grilleSutom() {
    var n = Math.max(4, Math.min(12, parseInt(MC.el('longueur').value, 10) || 6));
    var bien = String(MC.el('bienTxt').value || '').slice(0, 12);
    var mal = String(MC.el('malTxt').value || '').slice(0, 120).split(',');
    var zoneB = MC.el('rangBien');
    var zoneM = MC.el('rangMal');
    MC.vider(zoneB);
    MC.vider(zoneM);
    zoneB.style.setProperty('--n', String(n));
    zoneM.style.setProperty('--n', String(n));
    casesBien = [];
    casesMal = [];
    for (var i = 0; i < n; i++) {
      var b = MC.cree('input', 'case-bien');
      b.type = 'text';
      b.maxLength = 1;
      b.autocomplete = 'off';
      b.setAttribute('autocapitalize', 'characters');
      b.setAttribute('aria-label', 'Lettre bien placée, case ' + (i + 1));
      b.value = ML.lettres(bien.charAt(i), false, 1);
      zoneB.appendChild(b);
      casesBien.push(b);
      var m = MC.cree('input', 'case-mal');
      m.type = 'text';
      m.maxLength = 8;
      m.autocomplete = 'off';
      m.setAttribute('autocapitalize', 'characters');
      m.setAttribute('aria-label', 'Lettres présentes mais pas à la case ' + (i + 1));
      m.value = ML.lettres(mal[i] || '', false, 8);
      zoneM.appendChild(m);
      casesMal.push(m);
    }
    casesBien.forEach(function (el, i) {
      el.addEventListener('input', function () {
        el.value = ML.lettres(el.value, false, 1);
        if (el.value && casesBien[i + 1]) { casesBien[i + 1].focus(); }
        sutom();
      });
    });
    casesMal.forEach(function (el) {
      el.addEventListener('input', function () { el.value = ML.lettres(el.value, false, 8); sutom(); });
    });
  }
  function sutom() {
    MC.el('bienTxt').value = casesBien.map(function (c) { return c.value || '.'; }).join('');
    MC.el('malTxt').value = casesMal.map(function (c) { return c.value; }).join(',').replace(/,+$/, '');
    var bien = casesBien.map(function (c) { return c.value; });
    var mal = casesMal.map(function (c) { return c.value; });
    var abs = ML.lettres(MC.el('absentes').value, false, 26);
    var rien = !bien.join('') && !mal.join('') && !abs;
    lancer('sutom', { longueur: MC.el('longueur').value, bien: bien, mal: mal, absentes: abs },
      rien ? 'Remplissez vos essais : les mots possibles s\'affichent ici.' : '');
  }

  // ---------- points au Scrabble ----------
  var NOMS_ETAT = ['', 'lettre compte double', 'lettre compte triple', 'joker (0 point)'];
  var CLASSES_ETAT = ['', 'ld', 'lt', 'jk'];
  var etats = [];
  function scrabble(verifierAussi) {
    var mot = ML.lettres(MC.el('mot').value, false, ML.MAX_LETTRES);
    var enregistre = String(MC.el('etatTuiles').value || '').replace(/[^0-3]/g, '');
    if (etats.length !== mot.length) {
      etats = [];
      for (var i = 0; i < mot.length; i++) { etats.push(parseInt(enregistre.charAt(i) || '0', 10)); }
    }
    var zone = MC.el('tuiles');
    MC.vider(zone);
    etats.forEach(function (e, i) {
      var c = mot.charAt(i);
      var b = MC.cree('button', 'tuile-lettre ' + CLASSES_ETAT[e]);
      b.type = 'button';
      b.appendChild(MC.cree('span', 'l', c));
      b.appendChild(MC.cree('span', 'v', e === 3 ? 0 : ML.VALEURS[c]));
      if (e) { b.appendChild(MC.cree('span', 'case', ['', 'LD', 'LT', 'joker'][e])); }
      b.setAttribute('aria-label', c + ', ' + (e === 3 ? 0 : ML.VALEURS[c]) + ' point(s)' + (e ? ', ' + NOMS_ETAT[e] : '') + '. Toucher pour changer la case.');
      b.addEventListener('click', function () {
        etats[i] = (etats[i] + 1) % 4;
        scrabble(false);
      });
      zone.appendChild(b);
    });
    MC.el('etatTuiles').value = etats.join('');
    var cases = etats.map(function (e, i) { return { l: mot.charAt(i), m: e === 1 ? 2 : e === 2 ? 3 : 1, joker: e === 3 }; });
    var r = ML.scoreScrabble(cases, MC.el('md').value, MC.el('mt').value, MC.el('sept').checked);
    MC.texte('total', mot ? MC.nombre(r.total) + ' point' + (r.total > 1 ? 's' : '') : '–');
    MC.texte('detail', mot ? 'Lettres : ' + r.detail.join(' + ') + ' = ' + r.lettres + (r.multiplicateur > 1 ? ' ; × ' + r.multiplicateur + ' (mot) = ' + r.mot : '') + (r.prime ? ' ; + 50 (prime des 7 lettres)' : '') : 'Tapez un mot pour voir ses points.');
    if (verifierAussi !== false) {
      plusTard(function () {
        if (mot.length < 2) { MC.texte('dicoEtat', ''); return; }
        demander('verifier', { mot: MC.el('mot').value }, function (d) {
          if (d.type === 'verdict') {
            MC.texte('dicoEtat', d.formes.length ? '« ' + d.formes[0] + ' » est présent dans notre dictionnaire libre.' : 'Ce mot n\'est pas dans notre dictionnaire libre.');
          }
        });
      });
    }
  }

  // ---------- vérifier un mot ----------
  function verifier() {
    var saisie = String(MC.el('mot').value || '').slice(0, 40);
    var k = ML.lettres(saisie, false, 26);
    MC.vider(MC.el('anagrammes'));
    if (k.length < 2) { MC.texte('verdict', 'Tapez un mot de 2 lettres ou plus.'); MC.texte('formes', ''); return; }
    MC.texte('verdict', 'Recherche…');
    demander('verifier', { mot: saisie }, function (d) {
      if (d.type === 'erreur') { MC.texte('verdict', d.message); return; }
      if (d.type !== 'verdict') { return; }
      var v = MC.el('verdict');
      v.className = 'verdict ' + (d.formes.length ? 'oui' : 'non');
      if (d.formes.length) {
        v.textContent = d.exact ? 'Oui : « ' + d.saisie + ' » est dans notre dictionnaire libre.' : 'Oui, écrit « ' + d.formes.join(' » ou « ') + ' ».';
        MC.texte('formes', d.cle + ' · ' + d.cle.length + ' lettres · ' + d.points + ' point' + (d.points > 1 ? 's' : '') + ' au Scrabble sans case bonus.');
      } else {
        v.textContent = 'Non : « ' + d.saisie + ' » n\'est pas dans notre dictionnaire libre.';
        MC.texte('formes', 'Un mot absent ici peut exister ailleurs (nom propre, mot très récent, liste officielle d\'un jeu).');
      }
      var ul = MC.el('anagrammes');
      (d.anagrammes || []).forEach(function (e) { ul.appendChild(puce(e, false)); });
      MC.texte('titreAnagrammes', (d.anagrammes || []).length ? 'Avec les mêmes lettres :' : '');
    });
  }

  // ---------- démarrage ----------
  MC.lireAdresse();
  MC.initLien();
  var surTout = function (fn) {
    return function () { plusTard(fn); };
  };
  if (outil === 'anagramme') {
    MC.surChangement(['lettres', 'courts'], surTout(anagramme));
    anagramme();
  } else if (outil === 'croises') {
    MC.surChangement(['motif', 'sans'], surTout(croises));
    croises();
  } else if (outil === 'lettres') {
    MC.surChangement(['longueur', 'debut', 'fin', 'contient', 'sans'], surTout(nlettres));
    nlettres();
  } else if (outil === 'sutom') {
    MC.el('longueur').addEventListener('change', function () { grilleSutom(); sutom(); });
    MC.surChangement(['absentes'], function () { plusTard(sutom); });
    grilleSutom();
    sutom();
    MC.el('effacer').addEventListener('click', function () {
      MC.el('bienTxt').value = '';
      MC.el('malTxt').value = '';
      MC.el('absentes').value = '';
      grilleSutom();
      sutom();
    });
  } else if (outil === 'scrabble') {
    MC.el('mot').addEventListener('input', function () { etats = []; MC.el('etatTuiles').value = ''; scrabble(true); });
    MC.surChangement(['md', 'mt', 'sept'], function () { scrabble(false); });
    scrabble(true);
  } else if (outil === 'verifier') {
    MC.surChangement(['mot'], surTout(verifier));
    verifier();
  }
  var tri = MC.el('tri');
  if (tri) { tri.addEventListener('change', dessiner); }
}());
