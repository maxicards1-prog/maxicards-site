/* Outils Course (maxicards.net/course) : tous les calculs se font dans le navigateur, aucun appel réseau.
   Formules : voir formules_sources_2026-11-23.md et les pages « Sources » du site.
   Aucune saisie n'est jamais insérée comme HTML : tout passe par textContent. */
(function (global) {
  'use strict';

  var MILE = 1.609344;
  var DISTANCES = [
    { n: '5 km', km: 5 }, { n: '10 km', km: 10 },
    { n: 'Semi-marathon', km: 21.0975 }, { n: 'Marathon', km: 42.195 }
  ];

  /* ---------- calculs (aussi testés avec node) ---------- */
  function nombre(v) {
    if (typeof v === 'number') return v;
    var x = parseFloat(String(v == null ? '' : v).replace(',', '.'));
    return isFinite(x) ? x : NaN;
  }
  function arrondi(n, d) { var p = Math.pow(10, d); return Math.round(n * p) / p; }
  function dec(n, d) { return arrondi(n, d).toFixed(d).replace('.', ','); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  /* secondes -> "h:mm:ss" ou "m:ss" */
  function temps(sec) {
    var s = Math.round(sec), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    return h > 0 ? h + ':' + pad(m) + ':' + pad(r) : m + ':' + pad(r);
  }
  /* secondes par km -> "m:ss" (les secondes sont arrondies avant la découpe, 4:59,7 donne 5:00) */
  function allureTxt(secKm) { var s = Math.round(secKm); return Math.floor(s / 60) + ':' + pad(s % 60); }
  function allureSecKm(tSec, km) { return tSec / km; }
  function vitesseKmh(tSec, km) { return km / (tSec / 3600); }
  function secKmDepuisKmh(v) { return 3600 / v; }
  function kmhDepuisSecKm(s) { return 3600 / s; }
  function secMileDepuisSecKm(s) { return s * MILE; }
  function riegel(t1, d1, d2, expo) { return t1 * Math.pow(d2 / d1, expo); }
  function vmaDemiCooper(metres) { return metres / 100; }
  function vmaCooper12(metres) { return metres / 200; }
  function vo2Cooper(metres) { return (metres - 504.9) / 44.73; }
  function vo2DepuisVma(vma) { return 3.5 * vma; }
  function fcMaxTanaka(age) { return 208 - 0.7 * age; }
  function fcMaxFox(age) { return 220 - age; }
  function karvonen(fcMax, fcRepos, pct) { return (fcMax - fcRepos) * pct + fcRepos; }
  function secKmPourcentVma(vma, pct) { return 3600 / (vma * pct / 100); }

  var Course = {
    MILE: MILE, DISTANCES: DISTANCES, nombre: nombre, arrondi: arrondi, dec: dec, temps: temps, allureTxt: allureTxt,
    allureSecKm: allureSecKm, vitesseKmh: vitesseKmh, secKmDepuisKmh: secKmDepuisKmh, kmhDepuisSecKm: kmhDepuisSecKm,
    secMileDepuisSecKm: secMileDepuisSecKm, riegel: riegel, vmaDemiCooper: vmaDemiCooper, vmaCooper12: vmaCooper12,
    vo2Cooper: vo2Cooper, vo2DepuisVma: vo2DepuisVma, fcMaxTanaka: fcMaxTanaka, fcMaxFox: fcMaxFox,
    karvonen: karvonen, secKmPourcentVma: secKmPourcentVma
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Course;
  global.Course = Course;
  if (typeof document === 'undefined') return;

  /* ---------- aides d'interface ---------- */
  function el(tag, attrs) {
    var e = document.createElement(tag), i, k;
    if (attrs) for (k in attrs) if (Object.prototype.hasOwnProperty.call(attrs, k)) {
      if (k === 'texte') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    }
    function ajoute(c) {
      if (c == null) return;
      if (Array.isArray(c)) { c.forEach(ajoute); return; }
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    for (i = 2; i < arguments.length; i++) ajoute(arguments[i]);
    return e;
  }
  var uid = 0;
  function champ(libelle, attrs, aide) {
    var id = 'c' + (++uid);
    var a = { id: id, type: 'text', inputmode: 'decimal', autocomplete: 'off' };
    for (var k in attrs) a[k] = attrs[k];
    var inp = el('input', a);
    return { racine: el('div', { 'class': 'champ' }, el('label', { 'for': id, texte: libelle }), inp,
                        aide ? el('p', { 'class': 'aide', texte: aide }) : null), input: inp };
  }
  /* saisie d'un temps : heures, minutes, secondes (3 petits champs numériques) */
  function champTemps(libelle, def) {
    var groupe = el('div', { 'class': 'temps', role: 'group', 'aria-label': libelle });
    var noms = ['h', 'min', 's'], ins = [];
    noms.forEach(function (n, i) {
      var inp = el('input', { type: 'text', inputmode: 'numeric', pattern: '[0-9]*', autocomplete: 'off',
                              'aria-label': libelle + ' (' + n + ')', maxlength: '3', value: String(def ? def[i] : '') });
      ins.push(inp);
      groupe.appendChild(el('label', { 'class': 'unite' }, inp, el('span', { texte: n })));
    });
    return {
      racine: el('div', { 'class': 'champ' }, el('span', { 'class': 'etiquette', texte: libelle }), groupe),
      inputs: ins,
      valeur: function () {
        var v = ins.map(function (i) { return i.value.trim() === '' ? 0 : nombre(i.value); });
        if (v.some(function (x) { return !isFinite(x) || x < 0; })) return NaN;
        return v[0] * 3600 + v[1] * 60 + v[2];
      }
    };
  }
  /* ---------- micro-interactions ---------- */
  var REDUIT = !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var PREV = {};
  /* Les chiffres défilent vers la valeur finale. Le vrai texte reste dans la page (lecteurs d'écran, copier-coller) :
     seul un calque visible (data-v, affiché par le CSS) change à chaque image. */
  function animer(noeud, final, avant) {
    var cibles = final.match(/\d+/g);
    if (REDUIT || !cibles || !global.requestAnimationFrame) return;
    var anciens = avant ? avant.match(/\d+/g) : null;
    if (!anciens || anciens.length !== cibles.length) anciens = cibles.map(function () { return '0'; });
    var duree = avant === undefined ? 650 : 420, t0 = null;
    function texte(p) {
      var i = 0;
      return final.replace(/\d+/g, function (m) {
        var a = +anciens[i], b = +m, v = String(Math.round(a + (b - a) * p));
        var tour = i++;
        if (tour > 0 || m.charAt(0) === '0') while (v.length < m.length) v = '0' + v;
        return v;
      });
    }
    noeud.className += ' anime';
    noeud.setAttribute('data-v', texte(0));
    function image(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - p, 3);
      if (p >= 1) { noeud.className = noeud.className.replace(' anime', ''); noeud.removeAttribute('data-v'); return; }
      noeud.setAttribute('data-v', texte(e));
      global.requestAnimationFrame(image);
    }
    global.requestAnimationFrame(image);
  }
  function tuile(valeur, libelle, forte) {
    var v = el('span', { 'class': 'valeur', texte: valeur });
    var t = el('div', { 'class': 'tuile' + (forte ? ' forte' : '') }, v, el('span', { 'class': 'libelle', texte: libelle }));
    var avant = PREV[libelle];
    PREV[libelle] = valeur;
    /* Premier affichage : valeur finale tout de suite (rapide, compté par Google comme 1er gros élément) ;
       l'animation ne joue qu'aux changements faits par le visiteur. */
    if (avant !== undefined && avant !== valeur) {
      animer(v, valeur, avant);
      if (!REDUIT) t.className += ' flash';
    }
    return t;
  }
  function vider(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function tableau(entetes, lignes, classes) {
    var thead = el('thead', null, el('tr', null, entetes.map(function (t, i) {
      return el('th', { 'class': (classes && classes[i]) || '', texte: t });
    })));
    var tbody = el('tbody', null, lignes.map(function (l) {
      return el('tr', null, l.map(function (t, i) { return el('td', { 'class': (classes && classes[i]) || '', texte: t }); }));
    }));
    return el('div', { 'class': 'tableau-defile' }, el('table', null, thead, tbody));
  }
  function ecoute(noeuds, f) {
    noeuds.forEach(function (n) { n.addEventListener('input', f); n.addEventListener('change', f); });
  }
  /* squelette commun : champs, boutons, zone de résultats, message */
  function cadre(racine, champs, calculer) {
    var res = el('div', { 'class': 'resultats', 'aria-live': 'polite' });
    var msg = el('p', { 'class': 'message', role: 'status' });
    var bouton = el('button', { type: 'button', 'class': 'principal', texte: 'Calculer' });
    var grille = el('div', { 'class': 'grille' }, champs.map(function (c) { return c.racine; }));
    racine.appendChild(grille);
    racine.appendChild(el('div', { 'class': 'boutons' }, bouton));
    racine.appendChild(msg);
    racine.appendChild(res);
    function lancer() {
      vider(res); msg.textContent = '';
      try { calculer(res, msg); } catch (e) { msg.textContent = 'Vérifiez les valeurs saisies.'; }
    }
    bouton.addEventListener('click', lancer);
    champs.forEach(function (c) { ecoute(c.inputs || [c.input], lancer); });
    lancer();
    return { res: res, msg: msg, lancer: lancer };
  }

  /* ---------- outils ---------- */
  var OUTILS = {};

  OUTILS['calcul-allure'] = function (racine) {
    var dist = champ('Distance (km)', { value: '10' }), t = champTemps('Temps', [0, 50, 0]);
    var rapide = el('div', { 'class': 'rapide', role: 'group', 'aria-label': 'Distances courantes' });
    racine.appendChild(rapide);
    var c = cadre(racine, [dist, t], function (res, msg) {
      var km = nombre(dist.input.value), s = t.valeur();
      if (!(km > 0) || !(s > 0)) { msg.textContent = 'Indiquez une distance et un temps supérieurs à zéro.'; return; }
      var sk = allureSecKm(s, km);
      res.appendChild(tuile(allureTxt(sk) + ' /km', 'Allure en minutes par km', true));
      res.appendChild(tuile(dec(vitesseKmh(s, km), 2) + ' km/h', 'Vitesse moyenne'));
      res.appendChild(tuile(allureTxt(secMileDepuisSecKm(sk)) + ' /mile', 'Allure en minutes par mile'));
      res.appendChild(tuile(temps(s), 'Temps pour ' + dec(km, 3).replace(/,?0+$/, '') + ' km'));
    });
    DISTANCES.forEach(function (d) {
      var b = el('button', { type: 'button', 'class': 'mini', texte: d.n });
      b.addEventListener('click', function () { dist.input.value = String(d.km).replace('.', ','); c.lancer(); });
      rapide.appendChild(b);
    });
  };

  OUTILS['calcul-temps-course'] = function (racine) {
    var dist = champ('Distance (km)', { value: '10' });
    var pm = champ('Allure : minutes par km', { value: '5', inputmode: 'numeric' });
    var ps = champ('Allure : secondes', { value: '0', inputmode: 'numeric' });
    var pas = el('select', { id: 'pas', 'aria-label': 'Intervalle des temps de passage' },
                 el('option', { value: '1', texte: 'Tous les km' }), el('option', { value: '5', texte: 'Tous les 5 km' }));
    var cp = { racine: el('div', { 'class': 'champ' }, el('label', { 'for': 'pas', texte: 'Temps de passage' }), pas), input: pas };
    var rapide = el('div', { 'class': 'rapide', role: 'group', 'aria-label': 'Distances courantes' });
    racine.appendChild(rapide);
    var c = cadre(racine, [dist, pm, ps, cp], function (res, msg) {
      var km = nombre(dist.input.value), sk = nombre(pm.input.value) * 60 + nombre(ps.input.value);
      var p = nombre(pas.value);
      if (!(km > 0) || !(sk > 0)) { msg.textContent = 'Indiquez une distance et une allure supérieures à zéro.'; return; }
      if (km > 500) { msg.textContent = 'Distance trop grande pour ce calcul.'; return; }
      var tot = sk * km;
      res.appendChild(tuile(temps(tot), 'Temps final', true));
      res.appendChild(tuile(dec(kmhDepuisSecKm(sk), 2) + ' km/h', 'Vitesse moyenne'));
      res.appendChild(tuile(allureTxt(secMileDepuisSecKm(sk)) + ' /mile', 'Allure par mile'));
      var lignes = [], d = p;
      while (d < km - 1e-9) { lignes.push([dec(d, 0) + ' km', temps(sk * d)]); d += p; }
      lignes.push([dec(km, 3).replace(/,?0+$/, '') + ' km (arrivée)', temps(tot)]);
      res.parentNode.querySelectorAll('.passages').forEach(function (n) { n.parentNode.removeChild(n); });
      res.parentNode.appendChild(el('div', { 'class': 'passages' }, el('h3', { texte: 'Temps de passage' }),
        tableau(['Distance', 'Temps'], lignes, ['', 'nombre'])));
    });
    DISTANCES.forEach(function (x) {
      var b = el('button', { type: 'button', 'class': 'mini', texte: x.n });
      b.addEventListener('click', function () { dist.input.value = String(x.km).replace('.', ','); c.lancer(); });
      rapide.appendChild(b);
    });
  };

  OUTILS['convertisseur-allure-vitesse'] = function (racine) {
    var kmh = champ('Vitesse (km/h)', { value: '12' });
    var km1 = champ('Min/km : minutes', { value: '5', inputmode: 'numeric' }), km2 = champ('secondes', { value: '0', inputmode: 'numeric' });
    var mi1 = champ('Min/mile : minutes', { value: '8', inputmode: 'numeric' }), mi2 = champ('secondes', { value: '3', inputmode: 'numeric' });
    racine.appendChild(el('div', { 'class': 'grille' }, kmh.racine,
      el('div', { 'class': 'champ-double' }, km1.racine, km2.racine),
      el('div', { 'class': 'champ-double' }, mi1.racine, mi2.racine)));
    var msg = el('p', { 'class': 'message', role: 'status' });
    racine.appendChild(msg);
    function remplir(secKm, sauf) {
      if (sauf !== 'kmh') kmh.input.value = dec(kmhDepuisSecKm(secKm), 2);
      if (sauf !== 'km') { var s = Math.round(secKm); km1.input.value = String(Math.floor(s / 60)); km2.input.value = String(s % 60); }
      if (sauf !== 'mi') { var m = Math.round(secKm * MILE); mi1.input.value = String(Math.floor(m / 60)); mi2.input.value = String(m % 60); }
    }
    function depuis(type) {
      msg.textContent = '';
      var sk;
      if (type === 'kmh') { var v = nombre(kmh.input.value); if (!(v > 0)) { msg.textContent = 'Indiquez une vitesse supérieure à zéro.'; return; } sk = secKmDepuisKmh(v); }
      if (type === 'km') { sk = nombre(km1.input.value || '0') * 60 + nombre(km2.input.value || '0'); }
      if (type === 'mi') { sk = (nombre(mi1.input.value || '0') * 60 + nombre(mi2.input.value || '0')) / MILE; }
      if (!(sk > 0)) { msg.textContent = 'Indiquez une allure supérieure à zéro.'; return; }
      remplir(sk, type);
    }
    ecoute([kmh.input], function () { depuis('kmh'); });
    ecoute([km1.input, km2.input], function () { depuis('km'); });
    ecoute([mi1.input, mi2.input], function () { depuis('mi'); });
    racine.appendChild(el('p', { 'class': 'aide', texte: 'Modifiez n\'importe quel champ : les autres se mettent à jour.' }));
  };

  OUTILS['calcul-vma'] = function (racine) {
    var test = el('select', { id: 'test-vma', 'aria-label': 'Type de test' },
      el('option', { value: 'demi', texte: 'Demi-Cooper (6 minutes)' }), el('option', { value: 'cooper', texte: 'Cooper (12 minutes)' }));
    var ct = { racine: el('div', { 'class': 'champ' }, el('label', { 'for': 'test-vma', texte: 'Test effectué' }), test), input: test };
    var dist = champ('Distance parcourue (mètres)', { value: '1500', inputmode: 'numeric' });
    cadre(racine, [ct, dist], function (res, msg) {
      var m = nombre(dist.input.value), cooper = test.value === 'cooper';
      if (!(m >= 300) || m > 6000) { msg.textContent = 'Indiquez la distance parcourue en mètres (entre 300 et 6 000).'; return; }
      var vma = cooper ? vmaCooper12(m) : vmaDemiCooper(m);
      res.appendChild(tuile(dec(vma, 1) + ' km/h', 'VMA estimée', true));
      res.appendChild(tuile(allureTxt(secKmDepuisKmh(vma)) + ' /km', 'Allure à 100 % de la VMA'));
      res.appendChild(tuile(dec(vo2DepuisVma(vma), 1) + ' ml/kg/min', 'VO2max ≈ 3,5 × VMA'));
      if (cooper) res.appendChild(tuile(dec(vo2Cooper(m), 1) + ' ml/kg/min', 'VO2max selon la formule de Cooper'));
      msg.textContent = 'Estimation : un test sur piste, bien mené et motivé, donne un ordre de grandeur à ± 1 km/h environ.';
    });
  };

  var ZONES_ALLURE = [
    ['Endurance fondamentale', 60, 70, 'Séances faciles, sorties longues, échauffement'],
    ['Allure marathon', 70, 80, 'Course longue, séances spécifiques (varie beaucoup selon le niveau)'],
    ['Allure semi-marathon', 75, 85, 'Sorties spécifiques, blocs de 20 à 40 min'],
    ['Seuil', 80, 90, 'Blocs de 8 à 20 min, « confortablement difficile »'],
    ['Allure 10 km', 85, 90, 'Séances spécifiques 10 km'],
    ['Fractionné long', 90, 95, 'Répétitions de 1 000 à 2 000 m'],
    ['Fractionné court (VMA)', 95, 105, 'Répétitions de 30 s à 3 min, 30/30']
  ];
  OUTILS['allures-entrainement-vma'] = function (racine) {
    var vma = champ('Votre VMA (km/h)', { value: '15' }, 'Pas de VMA ? Faites d\'abord le calcul de VMA.');
    var c = cadre(racine, [vma], function (res, msg) {
      var v = nombre(vma.input.value);
      if (!(v >= 6) || v > 26) { msg.textContent = 'Indiquez une VMA réaliste, entre 6 et 26 km/h.'; return; }
      var lignes = ZONES_ALLURE.map(function (z) {
        return [z[0], z[1] + ' à ' + z[2] + ' %',
                allureTxt(secKmPourcentVma(v, z[1])) + ' à ' + allureTxt(secKmPourcentVma(v, z[2])) + ' /km',
                dec(v * z[1] / 100, 1) + ' à ' + dec(v * z[2] / 100, 1) + ' km/h', z[3]];
      });
      res.parentNode.querySelectorAll('.tab-allures').forEach(function (n) { n.parentNode.removeChild(n); });
      var t = tableau(['Type d\'allure', '% de la VMA', 'Allure', 'Vitesse', 'Pour quoi faire'], lignes, ['', '', 'nombre', 'nombre', '']);
      t.className += ' tab-allures';
      res.parentNode.appendChild(t);
      res.appendChild(tuile(allureTxt(secKmDepuisKmh(v)) + ' /km', 'Allure à 100 % de la VMA', true));
    });
  };

  var ZONES_FC = [
    ['Zone 1', 50, 60, 'Très facile : récupération, échauffement'],
    ['Zone 2', 60, 70, 'Endurance fondamentale : on peut parler'],
    ['Zone 3', 70, 80, 'Allure soutenue, allure marathon'],
    ['Zone 4', 80, 90, 'Seuil : effort difficile, quelques mots'],
    ['Zone 5', 90, 100, 'Effort maximal, par intervalles courts']
  ];
  /* Barres des zones : créées une fois (elles se remplissent), puis seules les valeurs changent */
  function barresZones(parent, fcmax, repos) {
    var b = parent.querySelector('.barres-zones'), cree = !b;
    if (cree) {
      b = el('div', { 'class': 'barres-zones', 'aria-hidden': 'true' });
      ZONES_FC.forEach(function (z, i) {
        var f = el('i', { 'class': 'zb-fill z' + (i + 1) });
        f.style.left = ((z[1] - 50) * 2) + '%';
        f.style.width = ((z[2] - z[1]) * 2) + '%';
        f.style.transitionDelay = (i * 90) + 'ms';
        b.appendChild(el('div', { 'class': 'zb' }, el('span', { 'class': 'zb-nom', texte: z[0] }),
          el('span', { 'class': 'zb-piste' }, f), el('span', { 'class': 'zb-val' })));
      });
      parent.appendChild(b);
    }
    var vals = b.querySelectorAll('.zb-val');
    ZONES_FC.forEach(function (z, i) {
      var lo = repos === null ? fcmax * z[1] / 100 : karvonen(fcmax, repos, z[1] / 100);
      var hi = repos === null ? fcmax * z[2] / 100 : karvonen(fcmax, repos, z[2] / 100);
      vals[i].textContent = Math.round(lo) + ' à ' + Math.round(hi) + ' bpm';
    });
    if (cree) {
      if (global.requestAnimationFrame) global.requestAnimationFrame(function () { global.requestAnimationFrame(function () { b.className += ' plein'; }); });
      else b.className += ' plein';
    }
  }
  OUTILS['zones-cardiaques'] = function (racine) {
    var age = champ('Âge (ans)', { value: '35', inputmode: 'numeric' });
    var mes = champ('FC max mesurée (facultatif, bpm)', { value: '', inputmode: 'numeric' }, 'Si vous l\'avez mesurée sur un effort maximal, elle remplace la formule.');
    var rep = champ('FC de repos (facultatif, bpm)', { value: '', inputmode: 'numeric' }, 'Au réveil, allongé. Elle active la méthode Karvonen.');
    cadre(racine, [age, mes, rep], function (res, msg) {
      var a = nombre(age.input.value), m = nombre(mes.input.value), r = nombre(rep.input.value);
      var haveM = mes.input.value.trim() !== '', haveR = rep.input.value.trim() !== '';
      if (!haveM && !(a >= 10 && a <= 100)) { msg.textContent = 'Indiquez un âge entre 10 et 100 ans, ou votre FC max mesurée.'; return; }
      if (haveM && !(m >= 120 && m <= 230)) { msg.textContent = 'La FC max mesurée doit être comprise entre 120 et 230 bpm.'; return; }
      var fcmax = haveM ? m : fcMaxTanaka(a);
      var fox = (a >= 10 && a <= 100) ? fcMaxFox(a) : NaN;
      if (haveR && !(r >= 30 && r < fcmax - 20)) { msg.textContent = 'La FC de repos doit être comprise entre 30 bpm et votre FC max moins 20.'; return; }
      res.appendChild(tuile(Math.round(fcmax) + ' bpm', haveM ? 'FC max mesurée' : 'FC max estimée (Tanaka 2001)', true));
      if (!haveM && isFinite(fox)) res.appendChild(tuile(Math.round(fox) + ' bpm', 'Avec 220 − âge (moins précis)'));
      if (haveR) res.appendChild(tuile(Math.round(fcmax - r) + ' bpm', 'Réserve cardiaque (FC max − repos)'));
      res.parentNode.querySelectorAll('.tab-zones').forEach(function (n) { n.parentNode.removeChild(n); });
      barresZones(res.parentNode, fcmax, haveR ? r : null);
      var ent = haveR ? ['Zone', '% FC max', 'FC (% FC max)', 'FC Karvonen (réserve)', 'Ressenti'] : ['Zone', '% FC max', 'FC en bpm', 'Ressenti'];
      var lignes = ZONES_FC.map(function (z) {
        var l = [z[0], z[1] + ' à ' + z[2] + ' %', Math.round(fcmax * z[1] / 100) + ' à ' + Math.round(fcmax * z[2] / 100)];
        if (haveR) l.push(Math.round(karvonen(fcmax, r, z[1] / 100)) + ' à ' + Math.round(karvonen(fcmax, r, z[2] / 100)));
        l.push(z[3]); return l;
      });
      var t = tableau(ent, lignes, haveR ? ['', '', 'nombre', 'nombre', ''] : ['', '', 'nombre', '']);
      t.className += ' tab-zones';
      res.parentNode.appendChild(t);
      msg.textContent = 'Estimation : l\'écart réel avec votre FC max peut dépasser 10 bpm. Ces zones n\'ont pas de valeur médicale.';
    });
  };

  OUTILS['predicteur-temps-course'] = function (racine) {
    var dist = champ('Distance de référence (km)', { value: '10' }), t = champTemps('Temps réalisé', [0, 50, 0]);
    var expo = champ('Exposant de Riegel', { value: '1,06' }, 'Valeur d\'origine : 1,06. Plus il est grand, plus le temps s\'allonge vite avec la distance.');
    var rapide = el('div', { 'class': 'rapide', role: 'group', 'aria-label': 'Distances courantes' });
    racine.appendChild(rapide);
    var c = cadre(racine, [dist, t, expo], function (res, msg) {
      var d1 = nombre(dist.input.value), s = t.valeur(), e = nombre(expo.input.value);
      if (!(d1 > 0) || !(s > 0)) { msg.textContent = 'Indiquez la distance et le temps d\'une course ou d\'un test récents.'; return; }
      if (!(e >= 1 && e <= 1.2)) { msg.textContent = 'L\'exposant doit rester entre 1,00 et 1,20.'; return; }
      var lignes = DISTANCES.map(function (d) {
        var p = riegel(s, d1, d.km, e);
        return [d.n, temps(p), allureTxt(p / d.km) + ' /km', dec(vitesseKmh(p, d.km), 1) + ' km/h'];
      });
      res.parentNode.querySelectorAll('.tab-pred').forEach(function (n) { n.parentNode.removeChild(n); });
      var tb = tableau(['Distance', 'Temps prévu', 'Allure', 'Vitesse'], lignes, ['', 'nombre', 'nombre', 'nombre']);
      tb.className += ' tab-pred';
      res.parentNode.appendChild(tb);
      msg.textContent = 'Plus la distance visée est éloignée de la référence, moins la prévision est fiable. Au-delà du semi-marathon, elle est souvent trop optimiste.';
    });
    DISTANCES.forEach(function (x) {
      var b = el('button', { type: 'button', 'class': 'mini', texte: x.n });
      b.addEventListener('click', function () { dist.input.value = String(x.km).replace('.', ','); c.lancer(); });
      rapide.appendChild(b);
    });
  };

  /* Plans : le champ VMA remplace chaque {a-b} (span.allure) par une fourchette d'allures */
  OUTILS['plan'] = function (racine) {
    var vma = champ('Votre VMA (km/h) : facultatif', { value: '' }, 'Les allures de chaque séance se calculent toutes seules. Sans VMA, les pourcentages restent affichés.');
    var imp = el('button', { type: 'button', texte: 'Imprimer le plan' });
    imp.addEventListener('click', function () { window.print(); });
    racine.appendChild(el('div', { 'class': 'grille' }, vma.racine));
    racine.appendChild(el('div', { 'class': 'boutons' }, imp));
    var msg = el('p', { 'class': 'message', role: 'status' });
    racine.appendChild(msg);
    var spans = Array.prototype.slice.call(document.querySelectorAll('.allure[data-pmin]'));
    spans.forEach(function (s) { s.setAttribute('data-orig', s.textContent); });
    function maj() {
      var raw = vma.input.value.trim(), v = nombre(raw);
      msg.textContent = '';
      var ok = raw !== '' && v >= 6 && v <= 26;
      if (raw !== '' && !ok) msg.textContent = 'Indiquez une VMA réaliste, entre 6 et 26 km/h.';
      spans.forEach(function (s) {
        if (!ok) { s.textContent = s.getAttribute('data-orig'); return; }
        var a = nombre(s.getAttribute('data-pmin')), b = nombre(s.getAttribute('data-pmax'));
        s.textContent = allureTxt(secKmPourcentVma(v, a)) + ' à ' + allureTxt(secKmPourcentVma(v, b)) + ' /km';
      });
    }
    ecoute([vma.input], maj);
  };

  /* Apparition au défilement : seuls les blocs encore hors écran sont masqués puis révélés */
  function apparitions() {
    if (REDUIT || !global.IntersectionObserver) return;
    var cibles = document.querySelectorAll('.categorie, .liste-outils li, .liste-guides li, .plan-sem, details.faq, .pace-coach, .encadre-outil, .tableau-defile');
    var bas = global.innerHeight || 700;
    var io = new global.IntersectionObserver(function (liste) {
      liste.forEach(function (e) {
        if (e.isIntersecting) { e.target.className += ' vu'; io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    Array.prototype.forEach.call(cibles, function (n) {
      if (n.getBoundingClientRect().top < bas) return;
      n.className += ' js-rev';
      io.observe(n);
    });
  }

  /* Hero : le coureur fait le tour de la piste (arrêté si mouvement réduit ou onglet masqué) */
  function piste() {
    var svg = document.querySelector('[data-piste]');
    if (!svg) return;
    var trace = svg.querySelector('#piste-trace'), pt = svg.querySelector('.pt-coureur'), halo = svg.querySelector('.pt-halo');
    if (REDUIT || !trace || !trace.getTotalLength || !global.requestAnimationFrame) return;
    var len = trace.getTotalLength(), tour = 9000, t0 = null, visible = true;
    function place(f) {
      var q = trace.getPointAtLength(((f % 1) + 1) % 1 * len);
      pt.setAttribute('cx', q.x); pt.setAttribute('cy', q.y);
      halo.setAttribute('cx', q.x); halo.setAttribute('cy', q.y);
    }
    function image(t) {
      if (t0 === null) t0 = t;
      if (visible && !document.hidden) place((t - t0) / tour);
      global.requestAnimationFrame(image);
    }
    if (global.IntersectionObserver) {
      new global.IntersectionObserver(function (l) { visible = l[0].isIntersecting; }).observe(svg);
    }
    global.setTimeout(function () { global.requestAnimationFrame(image); }, 1400);
  }

  /* Polices Google : chargées après l'affichage (display=swap, repli aux mêmes proportions), pour ne pas bloquer le rendu */
  function polices() {
    var l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = document.documentElement.getAttribute('data-polices');
    if (l.href) document.head.appendChild(l);
  }
  if (document.readyState === 'complete') polices(); else global.addEventListener('load', polices);

  function init() {
    apparitions();
    piste();
    var sections = document.querySelectorAll('[data-outil]');
    Array.prototype.forEach.call(sections, function (s) {
      var f = OUTILS[s.getAttribute('data-outil')];
      if (f) { vider(s); f(s); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
