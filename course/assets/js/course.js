/* Outils Course (maxicards.net/course) : tous les calculs se font dans le navigateur, aucun appel réseau.
   Formules : voir formules_sources_2026-11-23.md et les pages « Sources » du site.
   Aucune saisie n'est jamais insérée comme HTML : tout passe par textContent. */
(function (global) {
  'use strict';

  /* Langue de la page (<html lang>) : "en" = anglais, tout le reste = français (comportement d'origine). */
  var EN = false;
  function x(fr, en) { return EN ? en : fr; }

  var MILE = 1.609344;
  var DISTANCES = [
    { n: '5 km', km: 5 }, { n: '10 km', km: 10 },
    { n: 'Semi-marathon', km: 21.0975 }, { n: 'Marathon', km: 42.195 }
  ];

  /* ---------- calculs (aussi testés avec node) ---------- */
  function nombre(v) {
    if (typeof v === 'number') return v;
    var x = parseFloat(EN ? String(v == null ? '' : v).replace(/,/g, '') : String(v == null ? '' : v).replace(',', '.'));
    return isFinite(x) ? x : NaN;
  }
  function arrondi(n, d) { var p = Math.pow(10, d); return Math.round(n * p) / p; }
  function dec(n, d) { return arrondi(n, d).toFixed(d).replace('.', EN ? '.' : ','); }
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
  EN = String(document.documentElement.getAttribute('lang') || 'fr').slice(0, 2).toLowerCase() === 'en';

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
    var bouton = el('button', { type: 'button', 'class': 'principal', texte: x('Calculer', 'Calculate') });
    var grille = el('div', { 'class': 'grille' }, champs.map(function (c) { return c.racine; }));
    racine.appendChild(grille);
    racine.appendChild(el('div', { 'class': 'boutons' }, bouton));
    racine.appendChild(msg);
    racine.appendChild(res);
    function lancer() {
      vider(res); msg.textContent = '';
      try { calculer(res, msg); } catch (e) { msg.textContent = x('Vérifiez les valeurs saisies.', 'Check the values you entered.'); }
    }
    bouton.addEventListener('click', lancer);
    champs.forEach(function (c) { ecoute(c.inputs || [c.input], lancer); });
    lancer();
    return { res: res, msg: msg, lancer: lancer };
  }

  /* ---------- outils ---------- */
  var OUTILS = {};

  /* Anglais (<html lang="en">) : distances en km OU en miles, allures en min/km ET min/mile, vitesses en km/h ET mph.
     Les formules sont les mêmes (1 mile = 1,609344 km) ; le français garde exactement son comportement. */
  var DIST_EN = [{ n: '5K', km: 5 }, { n: '10K', km: 10 }, { n: 'Half marathon', km: 21.0975 }, { n: 'Marathon', km: 42.195 }];
  function dists() { return EN ? DIST_EN : DISTANCES; }
  function court(n) { return dec(n, 3).replace(new RegExp(EN ? '\\.?0+$' : ',?0+$'), ''); }
  function nbr(n) { return String(n).replace('.', EN ? '.' : ','); }
  function selectChamp(id, libelle, options) {
    var s = el('select', { id: id, 'aria-label': libelle }, options.map(function (o) { return el('option', { value: o[0], texte: o[1] }); }));
    return { racine: el('div', { 'class': 'champ' }, el('label', { 'for': id, texte: libelle }), s), input: s };
  }
  /* champ « distance » : en anglais, un menu km / miles ; les boutons rapides gardent la distance officielle exacte */
  function champDistance(libelle, defKm) {
    var o = { exact: null, u: 1 };
    var f = champ(libelle, { value: nbr(defKm) });
    var sel = EN ? selectChamp('unite-dist', 'Distance unit', [['km', 'Kilometers'], ['mi', 'Miles']]) : null;
    o.champs = sel ? [f, sel] : [f];
    o.unite = function () { return sel && sel.input.value === 'mi' ? MILE : 1; };
    o.km = function () { return o.exact !== null ? o.exact : nombre(f.input.value) * o.unite(); };
    o.affiche = function (km) { f.input.value = nbr(arrondi(km / o.unite(), 4)); };
    o.fixe = function (km) { o.exact = km; o.affiche(km); };
    o.libelleKm = function (km) { return o.unite() === MILE ? court(km / MILE) + ' miles' : court(km) + ' km'; };
    f.input.addEventListener('input', function () { o.exact = null; });
    if (sel) {
      o.u = o.unite();
      sel.input.addEventListener('change', function () {
        var km = o.exact !== null ? o.exact : nombre(f.input.value) * o.u;
        o.u = o.unite();
        if (isFinite(km) && km > 0) o.affiche(km);
      });
    }
    return o;
  }
  function boutonsRapides(rapide, lancer, appliquer) {
    dists().forEach(function (d) {
      var b = el('button', { type: 'button', 'class': 'mini', texte: d.n });
      b.addEventListener('click', function () { appliquer(d.km); lancer(); });
      rapide.appendChild(b);
    });
  }
  var ARIA_RAPIDE = function () { return x('Distances courantes', 'Common distances'); };
  var A = x(' à ', ' to '), PC = x(' %', '%');

  OUTILS['calcul-allure'] = function (racine) {
    var dc = champDistance(x('Distance (km)', 'Distance'), 10), t = champTemps(x('Temps', 'Time'), [0, 50, 0]);
    var rapide = el('div', { 'class': 'rapide', role: 'group', 'aria-label': ARIA_RAPIDE() });
    racine.appendChild(rapide);
    var c = cadre(racine, dc.champs.concat([t]), function (res, msg) {
      var km = dc.km(), s = t.valeur();
      if (!(km > 0) || !(s > 0)) { msg.textContent = x('Indiquez une distance et un temps supérieurs à zéro.', 'Enter a distance and a time greater than zero.'); return; }
      var sk = allureSecKm(s, km);
      if (EN) {
        res.appendChild(tuile(allureTxt(sk) + ' /km', 'Pace per kilometer', true));
        res.appendChild(tuile(allureTxt(secMileDepuisSecKm(sk)) + ' /mile', 'Pace per mile'));
        res.appendChild(tuile(dec(vitesseKmh(s, km), 2) + ' km/h', 'Average speed (km/h)'));
        res.appendChild(tuile(dec(vitesseKmh(s, km) / MILE, 2) + ' mph', 'Average speed (mph)'));
        res.appendChild(tuile(temps(s), 'Time for ' + dc.libelleKm(km)));
        return;
      }
      res.appendChild(tuile(allureTxt(sk) + ' /km', 'Allure en minutes par km', true));
      res.appendChild(tuile(dec(vitesseKmh(s, km), 2) + ' km/h', 'Vitesse moyenne'));
      res.appendChild(tuile(allureTxt(secMileDepuisSecKm(sk)) + ' /mile', 'Allure en minutes par mile'));
      res.appendChild(tuile(temps(s), 'Temps pour ' + court(km) + ' km'));
    });
    boutonsRapides(rapide, c.lancer, dc.fixe);
  };

  OUTILS['calcul-temps-course'] = function (racine) {
    var dc = champDistance(x('Distance (km)', 'Distance'), 10);
    var pm = champ(x('Allure : minutes par km', 'Pace: minutes'), { value: '5', inputmode: 'numeric' });
    var ps = champ(x('Allure : secondes', 'Pace: seconds'), { value: '0', inputmode: 'numeric' });
    var pu = EN ? selectChamp('unite-allure', 'Pace unit', [['km', 'Per kilometer'], ['mi', 'Per mile']]) : null;
    var pas = el('select', { id: 'pas', 'aria-label': x('Intervalle des temps de passage', 'Split interval') },
                 el('option', { value: '1', texte: x('Tous les km', 'Every km') }), el('option', { value: '5', texte: x('Tous les 5 km', 'Every 5 km') }));
    var cp = { racine: el('div', { 'class': 'champ' }, el('label', { 'for': 'pas', texte: x('Temps de passage', 'Splits') }), pas), input: pas };
    if (pu) pu.input.addEventListener('change', function () {
      var m = pu.input.value === 'mi';
      pas.options[0].textContent = m ? 'Every mile' : 'Every km';
      pas.options[1].textContent = m ? 'Every 5 miles' : 'Every 5 km';
    });
    var rapide = el('div', { 'class': 'rapide', role: 'group', 'aria-label': ARIA_RAPIDE() });
    racine.appendChild(rapide);
    var champs = dc.champs.concat([pm, ps]);
    if (pu) champs.push(pu);
    champs.push(cp);
    var c = cadre(racine, champs, function (res, msg) {
      var km = dc.km(), pace = nombre(pm.input.value) * 60 + nombre(ps.input.value);
      var mi = !!pu && pu.input.value === 'mi', u = mi ? MILE : 1, sk = pace / u;
      var p = nombre(pas.value);
      if (!(km > 0) || !(sk > 0)) { msg.textContent = x('Indiquez une distance et une allure supérieures à zéro.', 'Enter a distance and a pace greater than zero.'); return; }
      if (km > 500) { msg.textContent = x('Distance trop grande pour ce calcul.', 'Distance too large for this calculation.'); return; }
      var tot = sk * km;
      res.appendChild(tuile(temps(tot), x('Temps final', 'Finish time'), true));
      if (EN) {
        res.appendChild(tuile(dec(kmhDepuisSecKm(sk), 2) + ' km/h', 'Average speed (km/h)'));
        res.appendChild(tuile(dec(kmhDepuisSecKm(sk) / MILE, 2) + ' mph', 'Average speed (mph)'));
        res.appendChild(tuile(allureTxt(mi ? sk : secMileDepuisSecKm(sk)) + (mi ? ' /km' : ' /mile'), mi ? 'Pace per kilometer' : 'Pace per mile'));
      } else {
        res.appendChild(tuile(dec(kmhDepuisSecKm(sk), 2) + ' km/h', 'Vitesse moyenne'));
        res.appendChild(tuile(allureTxt(secMileDepuisSecKm(sk)) + ' /mile', 'Allure par mile'));
      }
      var lignes = [], dU = km / u, lab = mi ? ' mi' : ' km', d = p;
      while (d < dU - 1e-9) { lignes.push([dec(d, 0) + lab, temps(pace * d)]); d += p; }
      lignes.push([court(dU) + (EN ? lab + ' (finish)' : ' km (arrivée)'), temps(tot)]);
      res.parentNode.querySelectorAll('.passages').forEach(function (n) { n.parentNode.removeChild(n); });
      res.parentNode.appendChild(el('div', { 'class': 'passages' }, el('h3', { texte: x('Temps de passage', 'Splits') }),
        tableau([x('Distance', 'Distance'), x('Temps', 'Time')], lignes, ['', 'nombre'])));
    });
    boutonsRapides(rapide, c.lancer, dc.fixe);
  };

  OUTILS['convertisseur-allure-vitesse'] = function (racine) {
    var kmh = champ(x('Vitesse (km/h)', 'Speed (km/h)'), { value: '12' });
    var mph = EN ? champ('Speed (mph)', { value: dec(12 / MILE, 2) }) : null;
    var km1 = champ(x('Min/km : minutes', 'Min/km: minutes'), { value: '5', inputmode: 'numeric' }), km2 = champ(x('secondes', 'seconds'), { value: '0', inputmode: 'numeric' });
    var mi1 = champ(x('Min/mile : minutes', 'Min/mile: minutes'), { value: '8', inputmode: 'numeric' }), mi2 = champ(x('secondes', 'seconds'), { value: '3', inputmode: 'numeric' });
    racine.appendChild(el('div', { 'class': 'grille' }, kmh.racine, mph ? mph.racine : null,
      el('div', { 'class': 'champ-double' }, km1.racine, km2.racine),
      el('div', { 'class': 'champ-double' }, mi1.racine, mi2.racine)));
    var msg = el('p', { 'class': 'message', role: 'status' });
    racine.appendChild(msg);
    function remplir(secKm, sauf) {
      if (sauf !== 'kmh') kmh.input.value = dec(kmhDepuisSecKm(secKm), 2);
      if (mph && sauf !== 'mph') mph.input.value = dec(kmhDepuisSecKm(secKm) / MILE, 2);
      if (sauf !== 'km') { var s = Math.round(secKm); km1.input.value = String(Math.floor(s / 60)); km2.input.value = String(s % 60); }
      if (sauf !== 'mi') { var m = Math.round(secKm * MILE); mi1.input.value = String(Math.floor(m / 60)); mi2.input.value = String(m % 60); }
    }
    function depuis(type) {
      msg.textContent = '';
      var sk;
      if (type === 'kmh') { var v = nombre(kmh.input.value); if (!(v > 0)) { msg.textContent = x('Indiquez une vitesse supérieure à zéro.', 'Enter a speed greater than zero.'); return; } sk = secKmDepuisKmh(v); }
      if (type === 'mph') { var w = nombre(mph.input.value); if (!(w > 0)) { msg.textContent = 'Enter a speed greater than zero.'; return; } sk = secKmDepuisKmh(w * MILE); }
      if (type === 'km') { sk = nombre(km1.input.value || '0') * 60 + nombre(km2.input.value || '0'); }
      if (type === 'mi') { sk = (nombre(mi1.input.value || '0') * 60 + nombre(mi2.input.value || '0')) / MILE; }
      if (!(sk > 0)) { msg.textContent = x('Indiquez une allure supérieure à zéro.', 'Enter a pace greater than zero.'); return; }
      remplir(sk, type);
    }
    ecoute([kmh.input], function () { depuis('kmh'); });
    if (mph) ecoute([mph.input], function () { depuis('mph'); });
    ecoute([km1.input, km2.input], function () { depuis('km'); });
    ecoute([mi1.input, mi2.input], function () { depuis('mi'); });
    racine.appendChild(el('p', { 'class': 'aide', texte: x('Modifiez n\'importe quel champ : les autres se mettent à jour.', 'Change any field: the others update.') }));
  };

  OUTILS['calcul-vma'] = function (racine) {
    var test = el('select', { id: 'test-vma', 'aria-label': x('Type de test', 'Test type') },
      el('option', { value: 'demi', texte: x('Demi-Cooper (6 minutes)', 'Half-Cooper (6 minutes)') }), el('option', { value: 'cooper', texte: x('Cooper (12 minutes)', 'Cooper (12 minutes)') }));
    var ct = { racine: el('div', { 'class': 'champ' }, el('label', { 'for': 'test-vma', texte: x('Test effectué', 'Test you did') }), test), input: test };
    var dist = champ(x('Distance parcourue (mètres)', 'Distance covered'), { value: '1500', inputmode: 'numeric' });
    var us = EN ? selectChamp('unite-vma', 'Distance unit', [['m', 'Meters'], ['mi', 'Miles']]) : null;
    var prec = 1;
    if (us) us.input.addEventListener('change', function () {
      var cur = nombre(dist.input.value), nu = us.input.value === 'mi' ? MILE * 1000 : 1;
      if (isFinite(cur) && cur > 0) dist.input.value = nbr(arrondi(cur * prec / nu, nu > 1 ? 2 : 0));
      prec = nu;
    });
    cadre(racine, us ? [ct, dist, us] : [ct, dist], function (res, msg) {
      var m = nombre(dist.input.value) * (us && us.input.value === 'mi' ? 1609.344 : 1), cooper = test.value === 'cooper';
      if (!(m >= 300) || m > 6000) { msg.textContent = x('Indiquez la distance parcourue en mètres (entre 300 et 6 000).', 'Enter the distance covered (between 300 and 6,000 meters, or 0.19 and 3.7 miles).'); return; }
      var vma = cooper ? vmaCooper12(m) : vmaDemiCooper(m);
      if (EN) {
        res.appendChild(tuile(dec(vma, 1) + ' km/h', 'Estimated MAS', true));
        res.appendChild(tuile(dec(vma / MILE, 1) + ' mph', 'MAS in mph'));
        res.appendChild(tuile(allureTxt(secKmDepuisKmh(vma)) + ' /km', 'Pace at 100% of MAS'));
        res.appendChild(tuile(allureTxt(secMileDepuisSecKm(secKmDepuisKmh(vma))) + ' /mile', 'Pace at 100% of MAS, per mile'));
        res.appendChild(tuile(dec(vo2DepuisVma(vma), 1) + ' ml/kg/min', 'VO2 max ≈ 3.5 × MAS'));
        if (cooper) res.appendChild(tuile(dec(vo2Cooper(m), 1) + ' ml/kg/min', 'VO2 max (Cooper formula)'));
        msg.textContent = 'Estimate: a well-run, motivated track test gives an order of magnitude within about ± 1 km/h.';
        return;
      }
      res.appendChild(tuile(dec(vma, 1) + ' km/h', 'VMA estimée', true));
      res.appendChild(tuile(allureTxt(secKmDepuisKmh(vma)) + ' /km', 'Allure à 100 % de la VMA'));
      res.appendChild(tuile(dec(vo2DepuisVma(vma), 1) + ' ml/kg/min', 'VO2max ≈ 3,5 × VMA'));
      if (cooper) res.appendChild(tuile(dec(vo2Cooper(m), 1) + ' ml/kg/min', 'VO2max selon la formule de Cooper'));
      msg.textContent = 'Estimation : un test sur piste, bien mené et motivé, donne un ordre de grandeur à ± 1 km/h environ.';
    });
  };

  var ZONES_ALLURE = EN ? [
    ['Easy running', 60, 70, 'Easy runs, long runs, warm-up'],
    ['Marathon pace', 70, 80, 'Long race, specific workouts (varies a lot with level)'],
    ['Half marathon pace', 75, 85, 'Specific runs, blocks of 20 to 40 min'],
    ['Threshold', 80, 90, 'Blocks of 8 to 20 min, "comfortably hard"'],
    ['10K pace', 85, 90, '10K-specific workouts'],
    ['Long intervals', 90, 95, 'Repeats of 1,000 to 2,000 m'],
    ['Short intervals (MAS)', 95, 105, 'Repeats of 30 s to 3 min, 30/30']
  ] : [
    ['Endurance fondamentale', 60, 70, 'Séances faciles, sorties longues, échauffement'],
    ['Allure marathon', 70, 80, 'Course longue, séances spécifiques (varie beaucoup selon le niveau)'],
    ['Allure semi-marathon', 75, 85, 'Sorties spécifiques, blocs de 20 à 40 min'],
    ['Seuil', 80, 90, 'Blocs de 8 à 20 min, « confortablement difficile »'],
    ['Allure 10 km', 85, 90, 'Séances spécifiques 10 km'],
    ['Fractionné long', 90, 95, 'Répétitions de 1 000 à 2 000 m'],
    ['Fractionné court (VMA)', 95, 105, 'Répétitions de 30 s à 3 min, 30/30']
  ];
  OUTILS['allures-entrainement-vma'] = function (racine) {
    var vma = champ(x('Votre VMA (km/h)', 'Your MAS'), { value: '15' }, x('Pas de VMA ? Faites d\'abord le calcul de VMA.', 'No MAS yet? Do the VO2 max test first.'));
    var us = EN ? selectChamp('unite-mas', 'MAS unit', [['kmh', 'km/h'], ['mph', 'mph']]) : null;
    var prev = 1;
    if (us) us.input.addEventListener('change', function () {
      var cur = nombre(vma.input.value), f = us.input.value === 'mph' ? 1 / MILE : 1;
      if (isFinite(cur) && cur > 0) vma.input.value = nbr(arrondi(cur * prev * f, 2));
      prev = 1 / f;
    });
    var c = cadre(racine, us ? [vma, us] : [vma], function (res, msg) {
      var v = nombre(vma.input.value) * (us && us.input.value === 'mph' ? MILE : 1);
      if (!(v >= 6) || v > 26) { msg.textContent = x('Indiquez une VMA réaliste, entre 6 et 26 km/h.', 'Enter a realistic MAS, between 6 and 26 km/h (3.7 to 16.2 mph).'); return; }
      var lignes = ZONES_ALLURE.map(function (z) {
        if (EN) {
          return [z[0], z[1] + ' to ' + z[2] + '%',
                  allureTxt(secKmPourcentVma(v, z[1])) + ' to ' + allureTxt(secKmPourcentVma(v, z[2])),
                  allureTxt(secKmPourcentVma(v, z[1]) * MILE) + ' to ' + allureTxt(secKmPourcentVma(v, z[2]) * MILE),
                  dec(v * z[1] / 100, 1) + ' to ' + dec(v * z[2] / 100, 1),
                  dec(v * z[1] / 100 / MILE, 1) + ' to ' + dec(v * z[2] / 100 / MILE, 1), z[3]];
        }
        return [z[0], z[1] + ' à ' + z[2] + ' %',
                allureTxt(secKmPourcentVma(v, z[1])) + ' à ' + allureTxt(secKmPourcentVma(v, z[2])) + ' /km',
                dec(v * z[1] / 100, 1) + ' à ' + dec(v * z[2] / 100, 1) + ' km/h', z[3]];
      });
      res.parentNode.querySelectorAll('.tab-allures').forEach(function (n) { n.parentNode.removeChild(n); });
      var t = EN
        ? tableau(['Type of pace', '% of MAS', 'Pace (min/km)', 'Pace (min/mile)', 'Speed (km/h)', 'Speed (mph)', 'What it is for'], lignes, ['', '', 'nombre', 'nombre', 'nombre', 'nombre', ''])
        : tableau(['Type d\'allure', '% de la VMA', 'Allure', 'Vitesse', 'Pour quoi faire'], lignes, ['', '', 'nombre', 'nombre', '']);
      t.className += ' tab-allures';
      res.parentNode.appendChild(t);
      res.appendChild(tuile(allureTxt(secKmDepuisKmh(v)) + ' /km', x('Allure à 100 % de la VMA', 'Pace at 100% of MAS'), true));
      if (EN) res.appendChild(tuile(allureTxt(secMileDepuisSecKm(secKmDepuisKmh(v))) + ' /mile', 'Pace at 100% of MAS, per mile'));
    });
  };

  var ZONES_FC = EN ? [
    ['Zone 1', 50, 60, 'Very easy: recovery, warm-up'],
    ['Zone 2', 60, 70, 'Easy aerobic running: you can talk'],
    ['Zone 3', 70, 80, 'Steady pace, marathon pace'],
    ['Zone 4', 80, 90, 'Threshold: hard effort, a few words'],
    ['Zone 5', 90, 100, 'Maximal effort, in short intervals']
  ] : [
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
      vals[i].textContent = Math.round(lo) + A + Math.round(hi) + ' bpm';
    });
    if (cree) {
      if (global.requestAnimationFrame) global.requestAnimationFrame(function () { global.requestAnimationFrame(function () { b.className += ' plein'; }); });
      else b.className += ' plein';
    }
  }
  OUTILS['zones-cardiaques'] = function (racine) {
    var age = champ(x('Âge (ans)', 'Age (years)'), { value: '35', inputmode: 'numeric' });
    var mes = champ(x('FC max mesurée (facultatif, bpm)', 'Measured max HR (optional, bpm)'), { value: '', inputmode: 'numeric' }, x('Si vous l\'avez mesurée sur un effort maximal, elle remplace la formule.', 'If you measured it in a maximal effort, it replaces the formula.'));
    var rep = champ(x('FC de repos (facultatif, bpm)', 'Resting HR (optional, bpm)'), { value: '', inputmode: 'numeric' }, x('Au réveil, allongé. Elle active la méthode Karvonen.', 'On waking, lying down. It turns on the Karvonen method.'));
    cadre(racine, [age, mes, rep], function (res, msg) {
      var a = nombre(age.input.value), m = nombre(mes.input.value), r = nombre(rep.input.value);
      var haveM = mes.input.value.trim() !== '', haveR = rep.input.value.trim() !== '';
      if (!haveM && !(a >= 10 && a <= 100)) { msg.textContent = x('Indiquez un âge entre 10 et 100 ans, ou votre FC max mesurée.', 'Enter an age between 10 and 100, or your measured max HR.'); return; }
      if (haveM && !(m >= 120 && m <= 230)) { msg.textContent = x('La FC max mesurée doit être comprise entre 120 et 230 bpm.', 'Measured max HR must be between 120 and 230 bpm.'); return; }
      var fcmax = haveM ? m : fcMaxTanaka(a);
      var fox = (a >= 10 && a <= 100) ? fcMaxFox(a) : NaN;
      if (haveR && !(r >= 30 && r < fcmax - 20)) { msg.textContent = x('La FC de repos doit être comprise entre 30 bpm et votre FC max moins 20.', 'Resting HR must be between 30 bpm and your max HR minus 20.'); return; }
      res.appendChild(tuile(Math.round(fcmax) + ' bpm', haveM ? x('FC max mesurée', 'Measured max HR') : x('FC max estimée (Tanaka 2001)', 'Estimated max HR (Tanaka 2001)'), true));
      if (!haveM && isFinite(fox)) res.appendChild(tuile(Math.round(fox) + ' bpm', x('Avec 220 − âge (moins précis)', 'With 220 − age (less accurate)')));
      if (haveR) res.appendChild(tuile(Math.round(fcmax - r) + ' bpm', x('Réserve cardiaque (FC max − repos)', 'Heart rate reserve (max HR − resting)')));
      res.parentNode.querySelectorAll('.tab-zones').forEach(function (n) { n.parentNode.removeChild(n); });
      barresZones(res.parentNode, fcmax, haveR ? r : null);
      var ent = EN
        ? (haveR ? ['Zone', '% max HR', 'HR (% max HR)', 'HR Karvonen (reserve)', 'Feel'] : ['Zone', '% max HR', 'HR in bpm', 'Feel'])
        : (haveR ? ['Zone', '% FC max', 'FC (% FC max)', 'FC Karvonen (réserve)', 'Ressenti'] : ['Zone', '% FC max', 'FC en bpm', 'Ressenti']);
      var lignes = ZONES_FC.map(function (z) {
        var l = [z[0], z[1] + A + z[2] + PC, Math.round(fcmax * z[1] / 100) + A + Math.round(fcmax * z[2] / 100)];
        if (haveR) l.push(Math.round(karvonen(fcmax, r, z[1] / 100)) + A + Math.round(karvonen(fcmax, r, z[2] / 100)));
        l.push(z[3]); return l;
      });
      var t = tableau(ent, lignes, haveR ? ['', '', 'nombre', 'nombre', ''] : ['', '', 'nombre', '']);
      t.className += ' tab-zones';
      res.parentNode.appendChild(t);
      msg.textContent = x('Estimation : l\'écart réel avec votre FC max peut dépasser 10 bpm. Ces zones n\'ont pas de valeur médicale.', 'Estimate: the real gap with your max HR can exceed 10 bpm. These zones have no medical value.');
    });
  };

  OUTILS['predicteur-temps-course'] = function (racine) {
    var dc = champDistance(x('Distance de référence (km)', 'Reference distance'), 10), t = champTemps(x('Temps réalisé', 'Time achieved'), [0, 50, 0]);
    var expo = champ(x('Exposant de Riegel', 'Riegel exponent'), { value: x('1,06', '1.06') }, x('Valeur d\'origine : 1,06. Plus il est grand, plus le temps s\'allonge vite avec la distance.', 'Original value: 1.06. The higher it is, the faster the time grows with distance.'));
    var rapide = el('div', { 'class': 'rapide', role: 'group', 'aria-label': ARIA_RAPIDE() });
    racine.appendChild(rapide);
    var c = cadre(racine, dc.champs.concat([t, expo]), function (res, msg) {
      var d1 = dc.km(), s = t.valeur(), e = nombre(expo.input.value);
      if (!(d1 > 0) || !(s > 0)) { msg.textContent = x('Indiquez la distance et le temps d\'une course ou d\'un test récents.', 'Enter the distance and time of a recent race or test.'); return; }
      if (!(e >= 1 && e <= 1.2)) { msg.textContent = x('L\'exposant doit rester entre 1,00 et 1,20.', 'The exponent must stay between 1.00 and 1.20.'); return; }
      var lignes = dists().map(function (d) {
        var p = riegel(s, d1, d.km, e);
        if (EN) return [d.n, temps(p), allureTxt(p / d.km) + ' /km', allureTxt(p / d.km * MILE) + ' /mile', dec(vitesseKmh(p, d.km), 1) + ' km/h', dec(vitesseKmh(p, d.km) / MILE, 1) + ' mph'];
        return [d.n, temps(p), allureTxt(p / d.km) + ' /km', dec(vitesseKmh(p, d.km), 1) + ' km/h'];
      });
      res.parentNode.querySelectorAll('.tab-pred').forEach(function (n) { n.parentNode.removeChild(n); });
      var tb = EN
        ? tableau(['Distance', 'Predicted time', 'Pace (min/km)', 'Pace (min/mile)', 'Speed (km/h)', 'Speed (mph)'], lignes, ['', 'nombre', 'nombre', 'nombre', 'nombre', 'nombre'])
        : tableau(['Distance', 'Temps prévu', 'Allure', 'Vitesse'], lignes, ['', 'nombre', 'nombre', 'nombre']);
      tb.className += ' tab-pred';
      res.parentNode.appendChild(tb);
      msg.textContent = x('Plus la distance visée est éloignée de la référence, moins la prévision est fiable. Au-delà du semi-marathon, elle est souvent trop optimiste.', 'The further the target distance is from the reference, the less reliable the prediction. Beyond the half marathon, it is often too optimistic.');
    });
    boutonsRapides(rapide, c.lancer, dc.fixe);
  };

  /* Plans : le champ VMA remplace chaque {a-b} (span.allure) par une fourchette d'allures */
  OUTILS['plan'] = function (racine) {
    var vma = champ(x('Votre VMA (km/h) : facultatif', 'Your MAS: optional'), { value: '' }, x('Les allures de chaque séance se calculent toutes seules. Sans VMA, les pourcentages restent affichés.', 'The paces of each workout are calculated for you. Without MAS, the percentages stay displayed.'));
    var us = EN ? selectChamp('unite-mas', 'MAS unit', [['kmh', 'km/h'], ['mph', 'mph']]) : null;
    var prev = 1;
    if (us) us.input.addEventListener('change', function () {
      var cur = nombre(vma.input.value), f = us.input.value === 'mph' ? 1 / MILE : 1;
      if (isFinite(cur) && cur > 0) vma.input.value = nbr(arrondi(cur * prev * f, 2));
      prev = 1 / f;
    });
    var imp = el('button', { type: 'button', texte: x('Imprimer le plan', 'Print the plan') });
    imp.addEventListener('click', function () { window.print(); });
    racine.appendChild(el('div', { 'class': 'grille' }, vma.racine, us ? us.racine : null));
    racine.appendChild(el('div', { 'class': 'boutons' }, imp));
    var msg = el('p', { 'class': 'message', role: 'status' });
    racine.appendChild(msg);
    var spans = Array.prototype.slice.call(document.querySelectorAll('.allure[data-pmin]'));
    spans.forEach(function (s) { s.setAttribute('data-orig', s.textContent); });
    function maj() {
      var raw = vma.input.value.trim(), v = nombre(raw) * (us && us.input.value === 'mph' ? MILE : 1);
      msg.textContent = '';
      var ok = raw !== '' && v >= 6 && v <= 26;
      if (raw !== '' && !ok) msg.textContent = x('Indiquez une VMA réaliste, entre 6 et 26 km/h.', 'Enter a realistic MAS, between 6 and 26 km/h (3.7 to 16.2 mph).');
      spans.forEach(function (s) {
        if (!ok) { s.textContent = s.getAttribute('data-orig'); return; }
        var a = nombre(s.getAttribute('data-pmin')), b = nombre(s.getAttribute('data-pmax'));
        var sa = secKmPourcentVma(v, a), sb = secKmPourcentVma(v, b);
        s.textContent = EN
          ? allureTxt(sa) + ' to ' + allureTxt(sb) + ' /km (' + allureTxt(sa * MILE) + ' to ' + allureTxt(sb * MILE) + ' /mile)'
          : allureTxt(sa) + ' à ' + allureTxt(sb) + ' /km';
      });
    }
    ecoute([vma.input], maj);
    if (us) ecoute([us.input], maj);
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
