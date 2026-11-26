/* Jeux de société : briques d'interface communes (création d'éléments sans innerHTML, partie gardée dans le
   navigateur, feuille de marque par manches). Aucune donnée n'est envoyée. */
(function () {
  'use strict';
  var J = window.J = {};

  // ------------------------------------------------------------------ éléments (textContent seulement, jamais innerHTML)
  J.el = function (tag, props, enfants) {
    var e = document.createElement(tag), k;
    props = props || {};
    for (k in props) {
      if (!Object.prototype.hasOwnProperty.call(props, k)) { continue; }
      var v = props[k];
      if (k === 'class') { e.className = v; }
      else if (k === 'text') { e.textContent = v; }
      else if (k === 'on') { for (var ev in v) { e.addEventListener(ev, v[ev]); } }
      else if (k === 'attrs') { for (var a in v) { e.setAttribute(a, v[a]); } }
      else { e[k] = v; }
    }
    (enfants || []).forEach(function (c) { if (c !== null && c !== undefined && c !== false) { e.append(c); } });
    return e;
  };
  J.vider = function (n) { while (n.firstChild) { n.removeChild(n.firstChild); } return n; };
  J.nb = function (v) { var x = Number(String(v).replace(',', '.').replace(/\s/g, '')); return isFinite(x) ? x : 0; };
  J.signe = function (x) { return (x > 0 ? '+' : '') + String(x).replace('.', ','); };
  J.fmt = function (x) { return String(x).replace('.', ',').replace('-', '−'); };

  // ------------------------------------------------------------------ partie gardée (localStorage, jamais envoyée)
  J.charger = function (cle, def) {
    try { var t = window.localStorage.getItem('jeux:' + cle); return t ? JSON.parse(t) : def; } catch (e) { return def; }
  };
  J.sauver = function (cle, v) { try { window.localStorage.setItem('jeux:' + cle, JSON.stringify(v)); } catch (e) { /* stockage bloqué : la partie reste en mémoire */ } };

  // ------------------------------------------------------------------ petits composants
  J.annonce = function (texte) { var z = document.getElementById('annonce'); if (z) { z.textContent = texte; } };
  J.segments = function (options, valeur, change, libelle) {
    var g = J.el('div', { class: 'segments', attrs: { role: 'group', 'aria-label': libelle || '' } });
    options.forEach(function (o) {
      g.append(J.el('button', { type: 'button', text: o[1], attrs: { 'aria-pressed': String(o[0] === valeur) },
        on: { click: function () {
          Array.prototype.forEach.call(g.children, function (b) { b.setAttribute('aria-pressed', 'false'); });
          this.setAttribute('aria-pressed', 'true'); change(o[0]);
        } } }));
    });
    return g;
  };
  J.bloc = function (titre, contenu, aide) {
    return J.el('div', { class: 'bloc-saisie' }, [J.el('span', { class: 'etiquette', text: titre })].concat(contenu, aide ? [J.el('p', { class: 'aide', text: aide })] : []));
  };
  J.selecteur = function (id, options, valeur, change) {
    var s = J.el('select', { id: id, on: { change: function () { change(this.value); } } });
    options.forEach(function (o) { s.append(J.el('option', { value: String(o[0]), text: o[1], selected: String(o[0]) === String(valeur) })); });
    return s;
  };
  J.nombre = function (id, valeur, change, attrs) {
    return J.el('input', { id: id, type: 'number', value: valeur === undefined ? '' : String(valeur), attrs: Object.assign({ inputmode: 'numeric', autocomplete: 'off' }, attrs || {}),
      on: { input: function () { change(this.value); } } });
  };
  J.bip = function () {
    try {
      var C = window.AudioContext || window.webkitAudioContext, ctx = new C(), t = ctx.currentTime;
      [0, 0.35, 0.7].forEach(function (d) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.4, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.28); o.start(t + d); o.stop(t + d + 0.3);
      });
      if (navigator.vibrate) { navigator.vibrate([200, 100, 200]); }
    } catch (e) { /* pas de son possible */ }
  };
  var verrou = null;
  J.ecranAllume = function (oui) {
    try {
      if (oui && navigator.wakeLock && !verrou) { navigator.wakeLock.request('screen').then(function (v) { verrou = v; }).catch(function () {}); }
      if (!oui && verrou) { verrou.release(); verrou = null; }
    } catch (e) { /* non pris en charge */ }
  };

  /* Liste de noms modifiable (min..max). change(noms) à chaque modification. */
  J.listeNoms = function (noms, min, max, change, prefixe) {
    var box = J.el('div', { class: 'liste-noms' });
    function rendre() {
      J.vider(box);
      noms.forEach(function (n, i) {
        var champ = J.el('input', { type: 'text', value: n, maxLength: 24, attrs: { 'aria-label': (prefixe || 'Joueur') + ' ' + (i + 1), autocomplete: 'off' },
          on: { input: function () { noms[i] = this.value; change(noms); } } });
        var suppr = J.el('button', { type: 'button', class: 'mini', text: '✕', disabled: noms.length <= min,
          attrs: { 'aria-label': 'Retirer ' + (n || (prefixe || 'joueur') + ' ' + (i + 1)) },
          on: { click: function () { noms.splice(i, 1); change(noms); rendre(); } } });
        box.append(J.el('div', { class: 'ligne-nom' }, [J.el('span', { class: 'rang-nom', text: String(i + 1) }), champ, suppr]));
      });
      if (noms.length < max) {
        box.append(J.el('button', { type: 'button', class: 'ajout', text: '+ Ajouter ' + (prefixe ? prefixe.toLowerCase() : 'un joueur'),
          on: { click: function () { noms.push(''); change(noms); rendre(); var c = box.querySelectorAll('input'); if (c.length) { c[c.length - 1].focus(); } } } }));
      }
    }
    rendre();
    return box;
  };
  J.nomsPropres = function (noms, prefixe) {
    return noms.map(function (n, i) { n = String(n || '').trim().slice(0, 24); return n || (prefixe || 'Joueur') + ' ' + (i + 1); });
  };

  /* ------------------------------------------------------------------ feuille de marque par manches (moteur commun)
     cfg = { cle, noms: [..], min, max, prefixe, plusBas, options: {}, reglages(opt, zone, etat), saisie(etat, zone, valider, totaux),
             fin(totaux, etat) -> { fini, gagnants, texte }, info(i, totaux, etat) -> texte, motManche } */
  J.feuille = function (cfg) {
    var app = document.getElementById('app');
    if (!app) { return; }
    var mot = cfg.motManche || 'Manche';
    function neuf(noms) { return { phase: 'reglage', noms: noms || cfg.noms.slice(), manches: [], opt: Object.assign({}, cfg.options || {}), v: 1 }; }
    var etat = J.charger(cfg.cle, null);
    if (!etat || !etat.noms || !etat.manches) { etat = neuf(); }
    etat.opt = Object.assign({}, cfg.options || {}, etat.opt || {});
    function sauver() { J.sauver(cfg.cle, etat); }
    function totaux() { return JL.totaux(etat.noms.length, etat.manches.map(function (m) { return m.s; })); }

    function reglage() {
      var noms = etat.noms.slice();
      app.append(J.el('h2', { class: 'titre-outil', text: cfg.titreReglage || 'Qui joue ?' }));
      app.append(J.listeNoms(noms, cfg.min, cfg.max, function (l) { noms = l; etat.noms = l; sauver(); }, cfg.prefixe));
      if (cfg.reglages) {
        var z = J.el('div', { class: 'reglages' });
        cfg.reglages(etat.opt, z, etat, sauver);
        app.append(z);
      }
      app.append(J.el('div', { class: 'boutons' }, [J.el('button', { type: 'button', class: 'principal grand-bouton', text: 'Commencer la partie',
        on: { click: function () {
          etat.noms = J.nomsPropres(noms, cfg.prefixe); etat.phase = 'partie'; etat.manches = []; sauver(); rendre();
          J.annonce('Partie commencée');
        } } })]));
    }

    function partie() {
      var t = totaux(), rang = JL.classement(t, !!(cfg.plusBas || etat.opt.plusBas || etat.opt.mode === 'mains')), fin = cfg.fin ? cfg.fin(t, etat) : { fini: false };
      var grands = J.el('div', { class: 'scores-grands', attrs: { 'aria-live': 'polite' } });
      etat.noms.forEach(function (n, i) {
        var gagne = fin.fini && fin.gagnants && fin.gagnants.indexOf(i) >= 0;
        var info = cfg.info ? cfg.info(i, t, etat) : '';
        grands.append(J.el('div', { class: 'score-joueur' + (rang[i] === 1 && etat.manches.length ? ' premier' : '') + (gagne ? ' gagnant' : '') }, [
          J.el('span', { class: 'nom-joueur', text: n }),
          J.el('span', { class: 'total', text: J.fmt(t[i]) }),
          J.el('span', { class: 'rang', text: etat.manches.length ? (rang[i] === 1 ? '1er' : rang[i] + 'e') + (info ? ' · ' + info : '') : (info || ' ') })
        ]));
      });
      app.append(grands);
      if (fin.fini) {
        app.append(J.el('p', { class: 'bandeau-fin', text: fin.texte || ('Partie terminée : ' + fin.gagnants.map(function (g) { return etat.noms[g]; }).join(' et ') + (fin.gagnants.length > 1 ? ' gagnent !' : ' gagne !')) }));
      } else {
        var zone = J.el('div', { class: 'saisie' }, [J.el('h2', { class: 'titre-outil', text: mot + ' ' + (etat.manches.length + 1) })]);
        cfg.saisie(etat, zone, function (scores, note, extra) {
          etat.manches.push({ s: scores, n: note || '', x: extra || null }); sauver(); rendre();
          J.annonce(mot + ' ' + etat.manches.length + ' enregistrée');
          var g = app.querySelector('.scores-grands'); if (g && g.scrollIntoView && window.scrollY > g.getBoundingClientRect().top + window.scrollY) { g.scrollIntoView({ block: 'start' }); }
        }, t);
        app.append(zone);
      }
      app.append(J.el('div', { class: 'boutons boutons-partie' }, [
        J.el('button', { type: 'button', text: '↶ Annuler la dernière ' + mot.toLowerCase(), disabled: !etat.manches.length,
          on: { click: function () { etat.manches.pop(); sauver(); rendre(); J.annonce('Dernière ' + mot.toLowerCase() + ' annulée'); } } }),
        J.el('button', { type: 'button', text: 'Nouvelle partie',
          on: { click: function () {
            if (etat.manches.length && !window.confirm('Effacer la partie en cours et en commencer une nouvelle ?')) { return; }
            etat = neuf(etat.noms); sauver(); rendre();
          } } })
      ]));
      if (etat.manches.length) {
        var tete = J.el('tr', {}, [J.el('th', { text: '#' })].concat(etat.noms.map(function (n) { return J.el('th', { class: 'nombre', text: n }); })));
        var corps = J.el('tbody');
        etat.manches.forEach(function (m, k) {
          corps.append(J.el('tr', {}, [J.el('td', { text: String(k + 1) })].concat(m.s.map(function (x) { return J.el('td', { class: 'nombre', text: J.fmt(x) }); }))));
          if (m.n) { corps.append(J.el('tr', { class: 'note-manche' }, [J.el('td', { colSpan: etat.noms.length + 1, text: m.n })])); }
        });
        var pied = J.el('tr', { class: 'total-ligne' }, [J.el('td', { text: 'Total' })].concat(t.map(function (x) { return J.el('td', { class: 'nombre', text: J.fmt(x) }); })));
        app.append(J.el('details', { class: 'historique', open: etat.manches.length <= 12 }, [J.el('summary', { text: 'Détail des ' + etat.manches.length + ' ' + mot.toLowerCase() + (etat.manches.length > 1 ? 's' : '') }),
          J.el('div', { class: 'tableau-defile' }, [J.el('table', { class: 'tableau-scores' }, [J.el('thead', {}, [tete]), corps, J.el('tfoot', {}, [pied])])])]));
      }
    }

    function rendre() { J.vider(app); if (etat.phase === 'reglage') { reglage(); } else { partie(); } }
    rendre();
  };
}());
