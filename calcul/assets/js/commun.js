/* Calculs du quotidien : aides communes. Aucune donnée n'est envoyée : tout est calculé dans le navigateur. */
(function () {
  'use strict';
  var formats = {};
  function nf(dec) {
    if (!formats[dec]) {
      formats[dec] = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    }
    return formats[dec];
  }
  var JOUR_MS = 86400000;
  var NOMS_JOURS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  var NOMS_MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre',
    'octobre', 'novembre', 'décembre'];

  var CQ = {
    el: function (id) { return document.getElementById(id); },
    // Lit un nombre ; NaN si vide ou invalide. Accepte la virgule et les espaces.
    nombre: function (id, min, max) {
      var el = document.getElementById(id);
      if (!el) { return NaN; }
      var brut = String(el.value).trim().replace(/[\s  ]/g, '').replace(',', '.');
      if (brut === '') { return NaN; }
      var v = Number(brut);
      if (!isFinite(v)) { return NaN; }
      if (typeof min === 'number' && v < min) { v = min; }
      if (typeof max === 'number' && v > max) { v = max; }
      return v;
    },
    valeur: function (id) { var el = document.getElementById(id); return el ? el.value : ''; },
    coche: function (id) { var el = document.getElementById(id); return !!(el && el.checked); },
    euros: function (v) { return isFinite(v) ? nf(2).format(v) + ' €' : '–'; },
    pourcent: function (v, dec) { return isFinite(v) ? nf(typeof dec === 'number' ? dec : 2).format(v) + ' %' : '–'; },
    entier: function (v) { return isFinite(v) ? nf(0).format(v) : '–'; },
    decimal: function (v, dec) { return isFinite(v) ? nf(dec).format(v) : '–'; },
    // Nombre sans zéros inutiles (jusqu'à dec décimales).
    souple: function (v, dec) {
      if (!isFinite(v)) { return '–'; }
      return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: typeof dec === 'number' ? dec : 4 }).format(v);
    },
    texte: function (id, valeur) { var el = document.getElementById(id); if (el) { el.textContent = valeur; } },
    surChangement: function (ids, fn) {
      ids.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) { el.addEventListener('input', fn); el.addEventListener('change', fn); }
      });
    },
    // Remplace le contenu d'un tbody par des lignes de texte (jamais de HTML).
    lignes: function (id, lignes) {
      var corps = document.getElementById(id);
      if (!corps) { return; }
      while (corps.firstChild) { corps.removeChild(corps.firstChild); }
      lignes.forEach(function (ligne) {
        var tr = document.createElement('tr');
        if (ligne.classe) { tr.className = ligne.classe; }
        ligne.cellules.forEach(function (c, i) {
          var td = document.createElement('td');
          td.textContent = c;
          if (ligne.nombres && ligne.nombres.indexOf(i) !== -1) { td.className = 'nombre'; }
          tr.appendChild(td);
        });
        corps.appendChild(tr);
      });
    },

    // ---------- dates (jours entiers en UTC : aucun piège d'heure d'été) ----------
    // "AAAA-MM-JJ" -> numéro de jour (jours depuis le 01/01/1970), ou NaN.
    jour: function (texte) {
      var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texte || ''));
      if (!m) { return NaN; }
      var a = +m[1], mo = +m[2], j = +m[3];
      var t = Date.UTC(a, mo - 1, j);
      var d = new Date(t);
      if (d.getUTCFullYear() !== a || d.getUTCMonth() !== mo - 1 || d.getUTCDate() !== j) { return NaN; }
      return t / JOUR_MS;
    },
    versDate: function (n) { return new Date(n * JOUR_MS); },
    versTexteIso: function (n) { return new Date(n * JOUR_MS).toISOString().slice(0, 10); },
    aujourdhui: function () {
      var d = new Date();
      return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / JOUR_MS;
    },
    jourSemaine: function (n) { return new Date(n * JOUR_MS).getUTCDay(); },
    dateLongue: function (n) {
      var d = new Date(n * JOUR_MS);
      return NOMS_JOURS[d.getUTCDay()] + ' ' + d.getUTCDate() + (d.getUTCDate() === 1 ? 'er' : '') + ' ' +
        NOMS_MOIS[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
    },
    nomJour: function (n) { return NOMS_JOURS[new Date(n * JOUR_MS).getUTCDay()]; },
    // Dimanche de Pâques (algorithme de Meeus / Jones / Butcher, calendrier grégorien).
    paques: function (a) {
      var b = a % 19, c = Math.floor(a / 100), d = a % 100, e = Math.floor(c / 4), f = c % 4,
        g = Math.floor((c + 8) / 25), h = Math.floor((c - g + 1) / 3), i = (19 * b + c - e - h + 15) % 30,
        k = Math.floor(d / 4), l = d % 4, m = (32 + 2 * f + 2 * k - i - l) % 7,
        n = Math.floor((b + 11 * i + 22 * m) / 451), mois = Math.floor((i + m - 7 * n + 114) / 31),
        jour = ((i + m - 7 * n + 114) % 31) + 1;
      return Date.UTC(a, mois - 1, jour) / JOUR_MS;
    },
    // Jours fériés d'une année : tableau {jour, nom} (11 fêtes légales, + 2 en Alsace-Moselle).
    feries: function (a, alsace) {
      var p = CQ.paques(a);
      var f = function (mo, j) { return Date.UTC(a, mo - 1, j) / JOUR_MS; };
      var liste = [
        { jour: f(1, 1), nom: "Jour de l'An" },
        { jour: p + 1, nom: 'Lundi de Pâques' },
        { jour: f(5, 1), nom: 'Fête du Travail' },
        { jour: f(5, 8), nom: 'Victoire 1945' },
        { jour: p + 39, nom: 'Ascension' },
        { jour: p + 50, nom: 'Lundi de Pentecôte' },
        { jour: f(7, 14), nom: 'Fête nationale' },
        { jour: f(8, 15), nom: 'Assomption' },
        { jour: f(11, 1), nom: 'Toussaint' },
        { jour: f(11, 11), nom: 'Armistice 1918' },
        { jour: f(12, 25), nom: 'Noël' }
      ];
      if (alsace) {
        liste.push({ jour: p - 2, nom: 'Vendredi saint (Alsace-Moselle)' });
        liste.push({ jour: f(12, 26), nom: 'Saint-Étienne (Alsace-Moselle)' });
      }
      return liste.sort(function (x, y) { return x.jour - y.jour; });
    },
    annee: function (n) { return new Date(n * JOUR_MS).getUTCFullYear(); },

    // ---------- heures ----------
    // "HH:MM" -> minutes, ou NaN.
    minutes: function (texte) {
      var m = /^(\d{1,2}):(\d{2})$/.exec(String(texte || '').trim());
      if (!m || +m[2] > 59) { return NaN; }
      return +m[1] * 60 + +m[2];
    },
    // minutes -> "7 h 30" (arrondi à la minute)
    hm: function (min) {
      if (!isFinite(min)) { return '–'; }
      var signe = min < 0 ? '−' : '';
      var t = Math.round(Math.abs(min));
      var h = Math.floor(t / 60), m = t % 60;
      return signe + h + ' h ' + (m < 10 ? '0' : '') + m;
    },

    // ---------- partage : les champs [data-p] sont recopiés dans l'adresse ----------
    initPartage: function (recalcul) {
      var champs = Array.prototype.slice.call(document.querySelectorAll('[data-p]'));
      if (!champs.length) { return; }
      var params;
      try { params = new URLSearchParams(window.location.search); } catch (e) { params = null; }
      if (params) {
        champs.forEach(function (el) {
          var cle = el.getAttribute('data-p');
          if (!params.has(cle)) { return; }
          var v = String(params.get(cle)).slice(0, 200);
          if (el.type === 'checkbox') { el.checked = v === '1'; return; }
          if (el.tagName === 'SELECT') {
            var ok = Array.prototype.some.call(el.options, function (o) { return o.value === v; });
            if (ok) { el.value = v; }
            return;
          }
          el.value = v;
        });
      }
      var minuterie = null;
      var ecrire = function () {
        var q = new URLSearchParams();
        champs.forEach(function (el) {
          var cle = el.getAttribute('data-p');
          if (el.type === 'checkbox') { q.set(cle, el.checked ? '1' : '0'); return; }
          if (String(el.value) !== '') { q.set(cle, el.value); }
        });
        try { window.history.replaceState(null, '', window.location.pathname + '?' + q.toString()); } catch (e) { /* rien */ }
      };
      champs.forEach(function (el) {
        var f = function () { clearTimeout(minuterie); minuterie = setTimeout(ecrire, 400); };
        el.addEventListener('input', f);
        el.addEventListener('change', f);
      });
      var bouton = document.getElementById('copierLien');
      if (bouton) {
        bouton.addEventListener('click', function () {
          ecrire();
          var lien = window.location.href;
          var fini = function (msg) { CQ.texte('etatLien', msg); };
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(lien).then(function () { fini('Lien copié : il rouvre ce calcul tel quel.'); },
              function () { fini('Copiez l\'adresse de la page : elle contient votre calcul.'); });
          } else {
            fini('Copiez l\'adresse de la page : elle contient votre calcul.');
          }
        });
      }
      if (typeof recalcul === 'function') { recalcul(); }
    }
  };
  window.CQ = CQ;
}());
