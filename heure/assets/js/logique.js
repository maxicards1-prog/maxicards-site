/* Heure : monde, soleil et lune — calculs purs (navigateur et Node). Rien n'est envoyé : tout est calculé ici.
   Fuseaux : API Intl (base IANA du navigateur). Soleil : équations de la NOAA (d'après J. Meeus, Astronomical Algorithms).
   Lune : Meeus chapitre 49 (phases vraies) et 48 (fraction éclairée, formule abrégée). Saisons : Meeus chapitre 27. */
(function (racine) {
  'use strict';
  var RAD = Math.PI / 180, DEG = 180 / Math.PI, JOUR = 86400000;
  function sin(x) { return Math.sin(x * RAD); }
  function cos(x) { return Math.cos(x * RAD); }
  function tan(x) { return Math.tan(x * RAD); }
  function n360(x) { x = x % 360; return x < 0 ? x + 360 : x; }
  function jdDeMs(ms) { return ms / JOUR + 2440587.5; }
  function msDeJd(jd) { return (jd - 2440587.5) * JOUR; }

  // ΔT = TT − UT en secondes (polynômes d'Espenak et Meeus), pour passer du temps dynamique au temps universel.
  function deltaT(a) {
    var t;
    if (a >= 2005 && a < 2050) { t = a - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
    if (a >= 1986 && a < 2005) {
      t = a - 2000;
      return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * Math.pow(t, 3) + 0.000651814 * Math.pow(t, 4) + 0.00002373599 * Math.pow(t, 5);
    }
    if (a >= 1961 && a < 1986) { t = a - 1975; return 45.45 + 1.067 * t - t * t / 260 - t * t * t / 718; }
    if (a >= 1941 && a < 1961) { t = a - 1950; return 29.07 + 0.407 * t - t * t / 233 + t * t * t / 2547; }
    if (a >= 2050 && a < 2150) { return -20 + 32 * Math.pow((a - 1820) / 100, 2) - 0.5628 * (2150 - a); }
    t = (a - 1820) / 100;
    return -20 + 32 * t * t;
  }
  function ttVersUt(jde, annee) { return jde - deltaT(annee) / 86400; }

  // ------------------------------------------------------------------ fuseaux horaires (Intl)
  var formats = {};
  function formatZone(zone) {
    if (!formats[zone]) {
      formats[zone] = new Intl.DateTimeFormat('en-US', {
        timeZone: zone, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric'
      });
    }
    return formats[zone];
  }
  function zoneValide(zone) {
    try { formatZone(zone); return true; } catch (e) { return false; }
  }
  // Date et heure murales dans un fuseau : {a, mo (1-12), j, h, mi, s, js (0 = dimanche)}.
  function parties(zone, ms) {
    var o = {};
    formatZone(zone).formatToParts(new Date(ms)).forEach(function (x) { if (x.type !== 'literal') { o[x.type] = +x.value; } });
    if (o.hour === 24) { o.hour = 0; }
    var js = new Date(Date.UTC(o.year, o.month - 1, o.day)).getUTCDay();
    return { a: o.year, mo: o.month, j: o.day, h: o.hour, mi: o.minute, s: o.second, js: js };
  }
  // Décalage du fuseau sur UTC, en minutes (Paris en hiver : 60).
  function decalage(zone, ms) {
    var base = Math.floor(ms / 1000) * 1000;
    var p = parties(zone, base);
    return Math.round((Date.UTC(p.a, p.mo - 1, p.j, p.h, p.mi, p.s) - base) / 60000);
  }
  // Heure murale d'un fuseau -> instant (ms). ok = false si l'heure n'existe pas (heure sautée au printemps).
  function versInstant(zone, a, mo, j, h, mi) {
    var murale = Date.UTC(a, mo - 1, j, h, mi);
    var d1 = decalage(zone, murale);
    var t = murale - d1 * 60000;
    var d2 = decalage(zone, t);
    if (d2 !== d1) { t = murale - d2 * 60000; }
    var p = parties(zone, t);
    var ok = p.a === a && p.mo === mo && p.j === j && p.h === h && p.mi === mi;
    return { ms: t, ok: ok };
  }
  // Changements d'heure d'une année : [{ms, avant, apres}] (décalages en minutes), à la minute près.
  function transitions(zone, annee) {
    var res = [];
    var t = Date.UTC(annee, 0, 1) - 14 * 3600000, fin = Date.UTC(annee + 1, 0, 1) + 14 * 3600000;
    var prec = decalage(zone, t), pas = 6 * 3600000;
    for (var u = t + pas; u <= fin; u += pas) {
      var d = decalage(zone, u);
      if (d !== prec) {
        var lo = u - pas, hi = u;
        while (hi - lo > 60000) {
          var mid = lo + Math.floor((hi - lo) / 120000) * 60000;
          if (mid <= lo) { mid = lo + 60000; }
          if (decalage(zone, mid) === prec) { lo = mid; } else { hi = mid; }
        }
        var p = parties(zone, hi);
        if (p.a === annee) { res.push({ ms: hi, avant: prec, apres: d }); }
        prec = d;
      }
    }
    return res;
  }
  // Décalage d'hiver et d'été d'un fuseau (janvier et juillet de l'année).
  function decalagesAnnee(zone, annee) {
    var jan = decalage(zone, Date.UTC(annee, 0, 15, 12)), jui = decalage(zone, Date.UTC(annee, 6, 15, 12));
    return { janvier: jan, juillet: jui, change: transitions(zone, annee).length > 0 };
  }
  // Écart entre deux fuseaux en minutes (positif : B est en avance sur A).
  function ecartZones(zoneA, zoneB, ms) { return decalage(zoneB, ms) - decalage(zoneA, ms); }
  // Périodes de l'année où l'écart A -> B est constant : [{debut, fin, ecart}].
  function periodesEcart(zoneA, zoneB, annee) {
    var marques = transitions(zoneA, annee).concat(transitions(zoneB, annee)).map(function (x) { return x.ms; });
    marques.sort(function (x, y) { return x - y; });
    var bornes = [Date.UTC(annee, 0, 1)].concat(marques, [Date.UTC(annee + 1, 0, 1)]);
    var res = [];
    for (var i = 0; i < bornes.length - 1; i++) {
      if (bornes[i + 1] <= bornes[i]) { continue; }
      var e = ecartZones(zoneA, zoneB, bornes[i] + 60000);
      if (res.length && res[res.length - 1].ecart === e) { res[res.length - 1].fin = bornes[i + 1]; } else { res.push({ debut: bornes[i], fin: bornes[i + 1], ecart: e }); }
    }
    return res;
  }
  // Dernier dimanche d'un mois (mo 1-12) : numéro du jour.
  function dernierDimanche(annee, mo) {
    var dernier = new Date(Date.UTC(annee, mo, 0));
    return dernier.getUTCDate() - dernier.getUTCDay();
  }
  // Changement d'heure en France (règle européenne : dernier dimanche de mars et d'octobre à 1 h UTC).
  function changementsFrance(annee) {
    var m = dernierDimanche(annee, 3), o = dernierDimanche(annee, 10);
    return { ete: { jour: m, ms: Date.UTC(annee, 2, m, 1) }, hiver: { jour: o, ms: Date.UTC(annee, 9, o, 1) } };
  }

  // ------------------------------------------------------------------ soleil (NOAA)
  function posSoleil(jd) {
    var T = (jd - 2451545) / 36525;
    var L0 = n360(280.46646 + T * (36000.76983 + T * 0.0003032));
    var M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
    var e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
    var C = sin(M) * (1.914602 - T * (0.004817 + 0.000014 * T)) + sin(2 * M) * (0.019993 - 0.000101 * T) + sin(3 * M) * 0.000289;
    var om = 125.04 - 1934.136 * T;
    var lambda = L0 + C - 0.00569 - 0.00478 * sin(om);
    var eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
    var eps = eps0 + 0.00256 * cos(om);
    var decl = Math.asin(sin(eps) * sin(lambda)) * DEG;
    var y = Math.pow(tan(eps / 2), 2);
    var eot = 4 * DEG * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) + 4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) -
      0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
    return { decl: decl, eot: eot };
  }
  // Angle horaire (degrés) pour une distance zénithale ; +Infinity : le soleil reste au-dessus ; -Infinity : il reste dessous.
  function angleHoraire(lat, decl, zenith) {
    var c = cos(zenith) / (cos(lat) * cos(decl)) - tan(lat) * tan(decl);
    if (c > 1) { return -Infinity; }
    if (c < -1) { return Infinity; }
    return Math.acos(c) * DEG;
  }
  // Instant d'un événement solaire du jour (a, mo, j : date locale du lieu ; lon positive à l'est).
  // sens : 0 midi solaire, -1 matin, +1 soir. Retour : ms, ou null (+ cause) si l'événement n'a pas lieu.
  function instantSoleil(a, mo, j, lat, lon, zenith, sens) {
    var jd0 = jdDeMs(Date.UTC(a, mo - 1, j));
    var t = 720 - 4 * lon, H = 0;
    for (var i = 0; i < 4; i++) {
      var p = posSoleil(jd0 + t / 1440);
      var midi = 720 - 4 * lon - p.eot;
      if (sens === 0) { t = midi; continue; }
      H = angleHoraire(lat, p.decl, zenith);
      if (!isFinite(H)) { return { ms: null, cause: H > 0 ? 'jour' : 'nuit' }; }
      t = midi + sens * 4 * H;
    }
    return { ms: msDeJd(jd0 + t / 1440), cause: '' };
  }
  var ANGLES = { lever: 90.833, civil: 96, nautique: 102, astro: 108, doree: 84 };
  // Tous les événements du jour : {midi, lever, coucher, civilDebut, civilFin, nautiqueDebut, nautiqueFin, astroDebut,
  // astroFin, doreeMatin, doreeSoir (fin et début de l'heure dorée), duree (minutes de jour), etat ('', 'jour', 'nuit')}.
  function soleil(a, mo, j, lat, lon) {
    var r = { midi: instantSoleil(a, mo, j, lat, lon, 90, 0).ms };
    var ev = [['lever', 'coucher', 'lever'], ['civilDebut', 'civilFin', 'civil'], ['nautiqueDebut', 'nautiqueFin', 'nautique'],
      ['astroDebut', 'astroFin', 'astro'], ['doreeMatin', 'doreeSoir', 'doree']];
    r.etat = '';
    ev.forEach(function (e) {
      var m = instantSoleil(a, mo, j, lat, lon, ANGLES[e[2]], -1), s = instantSoleil(a, mo, j, lat, lon, ANGLES[e[2]], 1);
      r[e[0]] = m.ms; r[e[1]] = s.ms;
      if (e[2] === 'lever') { r.etat = m.cause || s.cause; }
    });
    r.duree = r.lever !== null && r.coucher !== null ? (r.coucher - r.lever) / 60000 : (r.etat === 'jour' ? 1440 : 0);
    return r;
  }
  // Hauteur du soleil (degrés au-dessus de l'horizon, sans réfraction) à un instant.
  function hauteurSoleil(ms, lat, lon) {
    var jd = jdDeMs(ms), p = posSoleil(jd);
    var minutesUTC = ((ms % JOUR) + JOUR) % JOUR / 60000;
    var tst = minutesUTC + p.eot + 4 * lon;
    var ha = tst / 4 - 180;
    var cz = sin(lat) * sin(p.decl) + cos(lat) * cos(p.decl) * cos(ha);
    return 90 - Math.acos(Math.max(-1, Math.min(1, cz))) * DEG;
  }

  // ------------------------------------------------------------------ lune (Meeus 49 et 48)
  var PL = [[0.000325, 299.77, 0.107408], [0.000165, 251.88, 0.016321], [0.000164, 251.83, 26.651886], [0.000126, 349.42, 36.412478],
    [0.000110, 84.66, 18.206239], [0.000062, 141.74, 53.303771], [0.000060, 207.14, 2.453732], [0.000056, 154.84, 7.306860],
    [0.000047, 34.52, 27.261239], [0.000042, 207.19, 0.121824], [0.000040, 291.34, 1.844379], [0.000037, 161.72, 24.198154],
    [0.000035, 239.56, 25.513099], [0.000023, 331.55, 3.592518]];
  // JDE (temps dynamique) de la phase k (entier : nouvelle lune ; .25 premier quartier ; .5 pleine ; .75 dernier quartier).
  function jdePhase(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T, T4 = T3 * T;
    var jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T2 - 0.000000150 * T3 + 0.00000000073 * T4;
    var E = 1 - 0.002516 * T - 0.0000074 * T2;
    var M = 2.5534 + 29.10535670 * k - 0.0000014 * T2 - 0.00000011 * T3;
    var Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T2 + 0.00001238 * T3 - 0.000000058 * T4;
    var F = 160.7108 + 390.67050284 * k - 0.0016118 * T2 - 0.00000227 * T3 + 0.000000011 * T4;
    var O = 124.7746 - 1.56375588 * k + 0.0020672 * T2 + 0.00000215 * T3;
    var f = Math.round((k - Math.floor(k)) * 4) % 4, c;
    if (f === 0 || f === 2) {
      var nl = f === 0;
      c = (nl ? -0.40720 : -0.40614) * sin(Mp) + (nl ? 0.17241 : 0.17302) * E * sin(M) + (nl ? 0.01608 : 0.01614) * sin(2 * Mp) +
        (nl ? 0.01039 : 0.01043) * sin(2 * F) + (nl ? 0.00739 : 0.00734) * E * sin(Mp - M) - (nl ? 0.00514 : 0.00515) * E * sin(Mp + M) +
        (nl ? 0.00208 : 0.00209) * E * E * sin(2 * M) - 0.00111 * sin(Mp - 2 * F) - 0.00057 * sin(Mp + 2 * F) +
        0.00056 * E * sin(2 * Mp + M) - 0.00042 * sin(3 * Mp) + 0.00042 * E * sin(M + 2 * F) + 0.00038 * E * sin(M - 2 * F) -
        0.00024 * E * sin(2 * Mp - M) - 0.00017 * sin(O) - 0.00007 * sin(Mp + 2 * M) + 0.00004 * sin(2 * Mp - 2 * F) +
        0.00004 * sin(3 * M) + 0.00003 * sin(Mp + M - 2 * F) + 0.00003 * sin(2 * Mp + 2 * F) - 0.00003 * sin(Mp + M + 2 * F) +
        0.00003 * sin(Mp - M + 2 * F) - 0.00002 * sin(Mp - M - 2 * F) - 0.00002 * sin(3 * Mp + M) + 0.00002 * sin(4 * Mp);
    } else {
      c = -0.62801 * sin(Mp) + 0.17172 * E * sin(M) - 0.01183 * E * sin(Mp + M) + 0.00862 * sin(2 * Mp) + 0.00804 * sin(2 * F) +
        0.00454 * E * sin(Mp - M) + 0.00204 * E * E * sin(2 * M) - 0.00180 * sin(Mp - 2 * F) - 0.00070 * sin(Mp + 2 * F) -
        0.00040 * sin(3 * Mp) - 0.00034 * E * sin(2 * Mp - M) + 0.00032 * E * sin(M + 2 * F) + 0.00032 * E * sin(M - 2 * F) -
        0.00028 * E * E * sin(Mp + 2 * M) + 0.00027 * E * sin(2 * Mp + M) - 0.00017 * sin(O) - 0.00005 * sin(Mp - M - 2 * F) +
        0.00004 * sin(2 * Mp + 2 * F) - 0.00004 * sin(Mp + M + 2 * F) + 0.00004 * sin(Mp - 2 * M) + 0.00003 * sin(Mp + M - 2 * F) +
        0.00003 * sin(3 * M) + 0.00002 * sin(2 * Mp - 2 * F) + 0.00002 * sin(Mp - M + 2 * F) - 0.00002 * sin(3 * Mp + M);
      var W = 0.00306 - 0.00038 * E * cos(M) + 0.00026 * cos(Mp) - 0.00002 * cos(Mp - M) + 0.00002 * cos(Mp + M) + 0.00002 * cos(2 * F);
      c += f === 1 ? W : -W;
    }
    var A1 = 299.77 + 0.107408 * k - 0.009173 * T2;
    var p = 0.000325 * sin(A1);
    for (var i = 1; i < PL.length; i++) { p += PL[i][0] * sin(PL[i][1] + PL[i][2] * k); }
    return jde + c + p;
  }
  // Phases principales entre deux instants (ms) : [{type: 0 nouvelle, 1 premier quartier, 2 pleine, 3 dernier quartier, ms}].
  function phasesEntre(debut, fin) {
    var res = [];
    if (!(fin > debut) || fin - debut > 400 * 366 * JOUR) { return res; }
    var an = 1970 + debut / (365.2425 * JOUR);
    var k = Math.floor((an - 2000) * 12.3685) - 2;
    for (var n = 0; n < 6000; n++, k += 0.25) {
      var jde = jdePhase(k);
      var ms = msDeJd(ttVersUt(jde, 2000 + k / 12.3685));
      if (ms > fin) { break; }
      if (ms >= debut) { res.push({ type: Math.round((k - Math.floor(k)) * 4) % 4, ms: ms }); }
    }
    return res;
  }
  var NOMS_PHASES = ['Nouvelle lune', 'Premier quartier', 'Pleine lune', 'Dernier quartier'];
  var NOMS_ENTRE = ['Premier croissant', 'Gibbeuse croissante', 'Gibbeuse décroissante', 'Dernier croissant'];
  // Fraction éclairée (0 à 1), d'après l'angle de phase approché (Meeus 48.4).
  function fractionEclairee(ms) {
    var jd = jdDeMs(ms) + deltaT(1970 + ms / (365.2425 * JOUR)) / 86400;
    var T = (jd - 2451545) / 36525;
    var D = n360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000);
    var M = n360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000);
    var Mp = n360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000);
    var i = 180 - D - 6.289 * sin(Mp) + 2.100 * sin(M) - 1.274 * sin(2 * D - Mp) - 0.658 * sin(2 * D) - 0.214 * sin(2 * Mp) - 0.110 * sin(D);
    return (1 + cos(i)) / 2;
  }
  // État de la Lune à un instant : {fraction, croissante, age (jours depuis la nouvelle lune), quartier (0-3), precedente, suivante}.
  function lune(ms) {
    var ph = phasesEntre(ms - 40 * JOUR, ms + 40 * JOUR);
    var prec = null, suiv = null, nlPrec = null;
    ph.forEach(function (p) {
      if (p.ms <= ms) { prec = p; if (p.type === 0) { nlPrec = p; } } else if (!suiv) { suiv = p; }
    });
    var quartier = prec ? prec.type : 0;
    return {
      fraction: fractionEclairee(ms), croissante: quartier === 0 || quartier === 1, quartier: quartier,
      age: nlPrec ? (ms - nlPrec.ms) / JOUR : NaN, precedente: prec, suivante: suiv
    };
  }
  // Nom de la phase d'un jour : si une phase principale tombe ce jour-là (entre debut et fin, en ms), son nom ; sinon la phase en cours.
  function nomPhaseJour(debut, fin) {
    var ph = phasesEntre(debut, fin);
    if (ph.length) { return { nom: NOMS_PHASES[ph[0].type], principale: ph[0].type, ms: ph[0].ms }; }
    var l = lune((debut + fin) / 2);
    return { nom: NOMS_ENTRE[l.quartier], principale: -1, ms: null };
  }

  // ------------------------------------------------------------------ saisons (Meeus 27, années 1000 à 3000)
  var S27 = [[485, 324.96, 1934.136], [203, 337.23, 32964.467], [199, 342.08, 20.186], [182, 27.85, 445267.112], [156, 73.14, 45036.886],
    [136, 171.52, 22518.443], [77, 222.54, 65928.934], [74, 296.72, 3034.906], [70, 243.58, 9037.513], [58, 119.81, 33718.147],
    [52, 297.17, 150.678], [50, 21.02, 2281.226], [45, 247.54, 29929.562], [44, 325.15, 31555.956], [29, 60.93, 4443.417],
    [18, 155.12, 67555.328], [17, 288.79, 4562.452], [16, 198.04, 62894.029], [14, 199.76, 31436.921], [12, 95.39, 14577.848],
    [12, 287.11, 31931.756], [12, 320.81, 34777.259], [9, 227.73, 1222.114], [8, 15.45, 16859.074]];
  // JDE de la saison (0 équinoxe de mars, 1 solstice de juin, 2 équinoxe de septembre, 3 solstice de décembre).
  function jdeSaison(annee, s) {
    var Y = (annee - 2000) / 1000, Y2 = Y * Y, Y3 = Y2 * Y, Y4 = Y3 * Y;
    var j0 = [2451623.80984 + 365242.37404 * Y + 0.05169 * Y2 - 0.00411 * Y3 - 0.00057 * Y4,
      2451716.56767 + 365241.62603 * Y + 0.00325 * Y2 + 0.00888 * Y3 - 0.00030 * Y4,
      2451810.21715 + 365242.01767 * Y - 0.11575 * Y2 + 0.00337 * Y3 + 0.00078 * Y4,
      2451900.05952 + 365242.74049 * Y - 0.06223 * Y2 - 0.00823 * Y3 + 0.00032 * Y4][s];
    var T = (j0 - 2451545) / 36525, W = 35999.373 * T - 2.47;
    var dl = 1 + 0.0334 * cos(W) + 0.0007 * cos(2 * W), S = 0;
    for (var i = 0; i < S27.length; i++) { S += S27[i][0] * cos(S27[i][1] + S27[i][2] * T); }
    return j0 + 0.00001 * S / dl;
  }
  function saisons(annee) {
    return [0, 1, 2, 3].map(function (s) { return msDeJd(ttVersUt(jdeSaison(annee, s), annee)); });
  }

  // ------------------------------------------------------------------ comptes à rebours
  // Écart entre deux instants : {total (ms), j, h, mi, s, passe}.
  function ecart(de, a) {
    var d = a - de, passe = d < 0;
    d = Math.abs(d);
    var s = Math.floor(d / 1000);
    return { total: a - de, j: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), mi: Math.floor(s % 3600 / 60), s: s % 60, passe: passe };
  }
  // Prochaine occurrence d'une date annuelle (mois 1-12, jour) à partir d'une date (a, mo, j) : année, et aujourdhui = true le jour même.
  function prochaineAnnuelle(a, mo, j, moC, jC) {
    if (mo < moC || (mo === moC && j < jC)) { return { annee: a, aujourdhui: false }; }
    if (mo === moC && j === jC) { return { annee: a, aujourdhui: true }; }
    return { annee: a + 1, aujourdhui: false };
  }

  // ------------------------------------------------------------------ textes
  function deux(n) { return (n < 10 ? '0' : '') + n; }
  // 330 -> "UTC+5:30" ; 60 -> "UTC+1" ; 0 -> "UTC".
  function texteUTC(min) {
    if (min === 0) { return 'UTC'; }
    var s = min < 0 ? '−' : '+', a = Math.abs(min);
    return 'UTC' + s + Math.floor(a / 60) + (a % 60 ? ':' + deux(a % 60) : '');
  }
  // 330 -> "5 h 30" ; 60 -> "1 h" ; 45 -> "45 min".
  function texteDuree(min) {
    var a = Math.abs(Math.round(min)), h = Math.floor(a / 60), m = a % 60;
    if (!h) { return m + ' min'; }
    return h + ' h' + (m ? ' ' + deux(m) : '');
  }
  // Écart B par rapport à A : "6 h de moins", "1 h de plus", "même heure".
  function texteEcart(min) {
    if (min === 0) { return 'même heure'; }
    return texteDuree(min) + (min > 0 ? ' de plus' : ' de moins');
  }

  var HE = {
    JOUR: JOUR, deltaT: deltaT, jdDeMs: jdDeMs, msDeJd: msDeJd,
    zoneValide: zoneValide, parties: parties, decalage: decalage, versInstant: versInstant, transitions: transitions,
    decalagesAnnee: decalagesAnnee, ecartZones: ecartZones, periodesEcart: periodesEcart, dernierDimanche: dernierDimanche,
    changementsFrance: changementsFrance,
    soleil: soleil, instantSoleil: instantSoleil, hauteurSoleil: hauteurSoleil,
    jdePhase: jdePhase, phasesEntre: phasesEntre, fractionEclairee: fractionEclairee, lune: lune, nomPhaseJour: nomPhaseJour,
    NOMS_PHASES: NOMS_PHASES, NOMS_ENTRE: NOMS_ENTRE,
    jdeSaison: jdeSaison, saisons: saisons, ecart: ecart, prochaineAnnuelle: prochaineAnnuelle,
    texteUTC: texteUTC, texteDuree: texteDuree, texteEcart: texteEcart, deux: deux
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = HE; } else { racine.HE = HE; }
}(typeof window !== 'undefined' ? window : this));
