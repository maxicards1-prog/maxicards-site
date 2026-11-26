/* Outils du musicien : logique pure (sans DOM), testée avec Node (tests/test_logique.js).
   Rien n'est envoyé : tout reste dans le navigateur. */
(function (racine, fab) {
  'use strict';
  var m = fab();
  if (typeof module === 'object' && module.exports) { module.exports = m; } else { racine.MU = m; }
}(this, function () {
  'use strict';
  var MU = {};

  /* ---------- bornes (toute valeur saisie ou lue dans l'adresse passe par ici) ---------- */
  function nombre(v) {
    if (typeof v === 'number') { return v; }
    if (typeof v !== 'string' || v.length > 32) { return NaN; }
    var s = v.trim().replace(',', '.');
    return s === '' ? NaN : Number(s);
  }
  MU.borner = function (v, mini, maxi, defaut) {
    var x = nombre(v);
    if (!isFinite(x)) { return defaut; }
    return Math.min(maxi, Math.max(mini, x));
  };
  MU.bornerLa = function (v) { return Math.round(MU.borner(v, 410, 470, 440) * 10) / 10; };
  MU.bornerBpm = function (v) { return Math.round(MU.borner(v, 20, 300, 100)); };
  MU.bornerFreq = function (v) { return MU.borner(v, 20, 20000, 440); };
  MU.bornerVolume = function (v) { return MU.borner(v, 0, 1, 0.3); };
  MU.bornerOctave = function (v) { return Math.round(MU.borner(v, 1, 7, 4)); };
  // ?bpm=… : nombre borné (20-300) ou null si absent ou illisible.
  MU.lireBpmAdresse = function (recherche) {
    if (typeof recherche !== 'string' || recherche.length > 300) { return null; }
    var r = /[?&]bpm=([^&#]{1,20})/.exec(recherche);
    if (!r) { return null; }
    var x = nombre(r[1]);
    return isFinite(x) ? MU.bornerBpm(x) : null;
  };
  // data-cordes="40 45 50 55 59 64" -> entiers 0-127, 8 cordes au plus.
  MU.lireCordes = function (texte) {
    if (typeof texte !== 'string') { return []; }
    var morceaux = texte.slice(0, 64).split(/\s+/), r = [];
    for (var i = 0; i < morceaux.length && r.length < 8; i++) {
      if (/^\d{1,3}$/.test(morceaux[i])) { r.push(Math.min(127, Math.max(0, parseInt(morceaux[i], 10)))); }
    }
    return r;
  };
  // data-noms="Mi La Ré" -> textes courts (8 au plus, 8 caractères chacun).
  MU.lireNoms = function (texte) {
    if (typeof texte !== 'string') { return []; }
    return texte.slice(0, 120).split(/\s+/).filter(Boolean).slice(0, 8).map(function (s) { return s.slice(0, 8); });
  };

  /* ---------- notes ---------- */
  MU.NOTES_FR = ['Do', 'Do♯', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'La♭', 'La', 'Si♭', 'Si'];
  MU.NOTES_EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'A♭', 'A', 'B♭', 'B'];
  MU.freqDeMidi = function (midi, la) { return (la || 440) * Math.pow(2, (midi - 69) / 12); };
  MU.midiDeFreq = function (f, la) { return 69 + 12 * Math.log(f / (la || 440)) / Math.LN2; };
  MU.cents = function (f, ref) { return 1200 * Math.log(f / ref) / Math.LN2; };
  // Octave internationale : La4 = 440 Hz (en France, on dit souvent La3 pour ce même la).
  MU.nomNote = function (midi) {
    var pc = ((midi % 12) + 12) % 12;
    var oct = Math.floor(midi / 12) - 1;
    return { fr: MU.NOTES_FR[pc], en: MU.NOTES_EN[pc], octave: oct };
  };
  MU.noteProche = function (f, la) {
    if (!(f > 0)) { return null; }
    la = la || 440;
    var midi = Math.round(MU.midiDeFreq(f, la));
    var cible = MU.freqDeMidi(midi, la), n = MU.nomNote(midi);
    return { midi: midi, cents: MU.cents(f, cible), cible: cible, fr: n.fr, en: n.en, octave: n.octave };
  };
  // Corde la plus proche (en cents) parmi cordes (numéros midi).
  MU.cordeProche = function (f, cordes, la) {
    if (!(f > 0) || !cordes || !cordes.length) { return null; }
    var best = null;
    for (var i = 0; i < cordes.length && i < 8; i++) {
      var cible = MU.freqDeMidi(cordes[i], la || 440), c = MU.cents(f, cible);
      if (!best || Math.abs(c) < Math.abs(best.cents)) { best = { index: i, cents: c, cible: cible, midi: cordes[i] }; }
    }
    return best;
  };
  /* Mode Auto : un micro de téléphone capte mal le fondamental grave (Mi de basse, 41 Hz) et entend l'octave au-dessus.
     Si la note est à plus d'un demi-ton de toute corde mais qu'à une octave près elle tombe à 50 cents au plus d'une corde,
     on retient cette octave. Renvoie la fréquence à utiliser. */
  MU.corrigerOctave = function (f, cordes, la) {
    var p = MU.cordeProche(f, cordes, la);
    if (!p || Math.abs(p.cents) <= 100) { return f; }
    var bas = MU.cordeProche(f / 2, cordes, la), haut = MU.cordeProche(f * 2, cordes, la);
    // L'octave du dessous d'abord : entendre l'octave au-dessus est l'erreur courante. Sur une guitare, Mi E3 est à une
    // octave du Mi grave ET du Mi aigu : c'est le Mi grave (banc du 26/11, « Mi E4 » affiché à tort).
    if (bas && Math.abs(bas.cents) <= 50) { return f / 2; }
    if (haut && Math.abs(haut.cents) <= 50) { return f * 2; }
    return f;
  };
  // Seuil « juste » : 5 cents (choisi par ce site, indicatif).
  MU.SEUIL_JUSTE = 5;
  MU.etatJustesse = function (cents) {
    if (!isFinite(cents)) { return 'aucun'; }
    if (Math.abs(cents) <= MU.SEUIL_JUSTE) { return 'juste'; }
    return cents < 0 ? 'bas' : 'haut';
  };
  MU.MESSAGES_JUSTESSE = { bas: 'Trop bas : tendez un peu la corde', haut: 'Trop haut : détendez un peu la corde', juste: 'Juste !' };

  /* ---------- analyse du son ---------- */
  MU.rms = function (buf) {
    var s = 0, n = buf.length;
    if (!n) { return 0; }
    for (var i = 0; i < n; i++) { s += buf[i] * buf[i]; }
    return Math.sqrt(s / n);
  };
  MU.mediane = function (a) {
    if (!a || !a.length) { return NaN; }
    var b = a.slice().sort(function (x, y) { return x - y; });
    var k = Math.floor(b.length / 2);
    return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2;
  };

  /* YIN (de Cheveigné et Kawahara, 2002) : fonction de différence, normalisation cumulative, premier creux sous le seuil,
     interpolation parabolique. Affinage : le creux est recherché aussi à 2, 4, 8… périodes (l'erreur d'interpolation
     est divisée d'autant), ce qui donne moins d'un cent sur un son pur.
     o : {fmin, fmax, seuil (0,15), seuilMax (0,4 : au-delà, pas de note)}. Renvoie {freq, clarte} ou null. */
  MU.yin = function (buf, sr, o) {
    o = o || {};
    var n = buf ? buf.length : 0;
    if (n < 256 || !(sr >= 8000 && sr <= 384000)) { return null; }
    var fmin = MU.borner(o.fmin, 10, sr / 8, 27), fmax = MU.borner(o.fmax, fmin * 1.5, sr / 4, 2000);
    var seuil = MU.borner(o.seuil, 0.01, 0.5, 0.15), seuilMax = MU.borner(o.seuilMax, seuil, 0.9, 0.4);
    var tauMax = Math.min(Math.ceil(sr / fmin) + 2, Math.floor(n / 2));
    var tauMin = Math.max(2, Math.floor(sr / fmax));
    var W = n - tauMax;
    if (tauMax < tauMin + 4) { return null; }
    var energie = 0, i, j;
    for (i = 0; i < n; i++) { energie += buf[i] * buf[i]; }
    if (Math.sqrt(energie / n) < 1e-4) { return null; }

    var d = new Float64Array(tauMax + 2), cm = new Float64Array(tauMax + 2);
    var cumul = 0, trouve = -1, minVal = Infinity, minTau = -1, calcules = 0, creux = [];
    cm[0] = 1;
    for (var tau = 1; tau <= tauMax; tau++) {
      var s = 0;
      for (j = 0; j < W; j++) { var x = buf[j] - buf[j + tau]; s += x * x; }
      d[tau] = s; cumul += s; calcules = tau;
      cm[tau] = cumul > 0 ? s * tau / cumul : 1;
      var p = tau - 1;
      if (p >= tauMin && p >= 2 && cm[p] <= cm[p - 1] && cm[p] <= cm[tau]) {
        creux.push(p);
        if (cm[p] < minVal) { minVal = cm[p]; minTau = p; }
        if (cm[p] < seuil) { trouve = p; break; }
      }
    }
    if (trouve < 0) {
      if (minTau < 0 || minVal > seuilMax) { return null; }
      /* Sans creux franc (fin de note, bruit), les creux à 1, 2, 3… périodes se valent et le plus profond tombe au hasard
         sur un multiple (banc du 26/11 : Mi aigu du violon affiché « Sol, −300 cents »). On garde le premier creux presque
         aussi profond, si ses multiples (2, 3, 4 fois) sont aussi des creux : sinon ce serait une octave trop haute. */
      var tol = minVal + Math.max(0.05, 0.25 * minVal);
      var multiples = function (q) {
        for (var m = 2; m <= 4 && m * q + 3 <= tauMax; m++) {
          var c = m * q, r = Math.max(2, Math.ceil(0.01 * c)), lo = Infinity;
          for (var u = c - r; u <= c + r && u <= tauMax; u++) { if (cm[u] < lo) { lo = cm[u]; } }
          if (lo > tol) { return false; }
        }
        return true;
      };
      for (var ci = 0; ci < creux.length && creux[ci] <= minTau; ci++) {
        if (cm[creux[ci]] <= tol && multiples(creux[ci])) { trouve = creux[ci]; break; }
      }
      if (trouve < 0) { trouve = minTau; }
      if (trouve >= tauMax - 1) { return null; }
    } else if (2 * trouve + 3 <= tauMax) {
      /* Creux franc trouvé : est-ce l'octave d'une corde grave dont le fondamental est faible (petit micro, fin de note) ?
         Si le creux à 2 périodes est bien plus profond (moins de la moitié, et 0,05 de moins), la vraie période est le double
         (banc du 26/11 : Mi grave de guitare lu « Mi E3 » au bout de 2 s). */
      for (var t2 = calcules + 1; t2 <= 2 * trouve + 3; t2++) {   // retards pas encore calculés (la boucle s'est arrêtée tôt)
        var s2 = 0;
        for (j = 0; j < W; j++) { var x2 = buf[j] - buf[j + t2]; s2 += x2 * x2; }
        d[t2] = s2; cumul += s2; cm[t2] = cumul > 0 ? s2 * t2 / cumul : 1; calcules = t2;
      }
      var lo2 = Infinity, t2m = -1;
      for (var u2 = 2 * trouve - 2; u2 <= 2 * trouve + 2; u2++) { if (cm[u2] < lo2) { lo2 = cm[u2]; t2m = u2; } }
      if (lo2 < 0.5 * cm[trouve] && lo2 < cm[trouve] - 0.05 && cm[t2m] <= cm[t2m - 1] && cm[t2m] <= cm[t2m + 1]) { trouve = t2m; }
    }
    function dA(t) {   // différence au retard t (calculée à la demande au-delà de ce qui est déjà fait)
      if (t <= calcules) { return d[t]; }
      var s2 = 0;
      for (var k = 0; k < W; k++) { var y = buf[k] - buf[k + t]; s2 += y * y; }
      return s2;
    }
    function parabole(t, a, b, c) {
      var den = a - 2 * b + c;
      if (!(den > 0)) { return t; }
      var dl = 0.5 * (a - c) / den;
      return t + Math.max(-1, Math.min(1, dl));
    }
    var T = parabole(trouve, dA(trouve - 1), dA(trouve), dA(trouve + 1));
    // Affinage sur plusieurs périodes (au plus 10 doublements, retards toujours <= tauMax).
    var mult = 1;
    for (var it = 0; it < 10 && 2 * mult * T + 4 <= tauMax; it++) {
      var m2 = 2 * mult, c0 = Math.round(m2 * T), bt = c0, bv = dA(c0);
      for (var e = 1; e <= 2; e++) {
        var v1 = dA(c0 - e), v2 = dA(c0 + e);
        if (v1 < bv) { bv = v1; bt = c0 - e; }
        if (v2 < bv) { bv = v2; bt = c0 + e; }
      }
      if (bt + 1 > tauMax || bt - 1 < 1) { break; }
      var tm = parabole(bt, dA(bt - 1), bv, dA(bt + 1));
      if (Math.abs(tm / m2 - T) > 0.5) { break; }   // creux incohérent : on garde l'estimation précédente
      T = tm / m2; mult = m2;
    }
    // Dernier affinage : mêmes 3 retards, mais sur la plus longue fenêtre possible (moins sensible au bruit).
    var cF = Math.round(mult * T);
    if (cF - 1 >= 1 && cF + 1 < n - 64) {
      var W2 = n - (cF + 1), dl3 = [0, 0, 0];
      for (var q = 0; q < 3; q++) {
        var s3 = 0, t3 = cF - 1 + q;
        for (var k3 = 0; k3 < W2; k3++) { var z = buf[k3] - buf[k3 + t3]; s3 += z * z; }
        dl3[q] = s3;
      }
      if (dl3[1] <= dl3[0] && dl3[1] <= dl3[2]) {
        var tf = parabole(cF, dl3[0], dl3[1], dl3[2]);
        if (Math.abs(tf / mult - T) < 0.5) { T = tf / mult; }
      }
    }
    var f = sr / T;
    if (!(f > 0) || f < fmin * 0.97 || f > fmax * 1.03) { return null; }
    return { freq: f, clarte: Math.max(0, Math.min(1, 1 - cm[trouve])) };
  };

  // Réglages de l'accordeur (partagés avec tests/simuler_accordeur.js, qui rejoue la même chaîne sur des WAV).
  // TAILLE : son gardé (341 ms à 48 kHz) pour l'affinage long ; FENETRE : derniers échantillons lus par YIN (85 ms).
  // SEUIL_CLARTE 0,85 = seuil de YIN lui-même : sous 0,85, la mesure est souvent fausse de 5 à 50 cents (banc du 26/11 :
  // corde qui résonne, jeu très doux) ; on n'affiche alors rien plutôt qu'une valeur fausse. ATTENTE_MS : une nouvelle note
  // s'affiche après 100 ms de mesures nettes (juste après l'attaque, la mesure est souvent fausse de 5 à 20 cents).
  MU.REGLAGES_ACCORDEUR = { SEUIL_RMS: 0.004, SEUIL_CLARTE: 0.85, SILENCE_MS: 700, ATTENTE_MS: 100, PERIODE_MS: 50, TAILLE: 16384, FENETRE: 4096, HISTOIRE: 5 };
  // Filtre passe-bas (biquad RBJ, Q = 0,7071), parti « au repos » sur la première valeur du tampon.
  MU.passeBas = function (buf, sr, fc) {
    var w = 2 * Math.PI * fc / sr, cs = Math.cos(w), al = Math.sin(w) / (2 * Math.SQRT1_2), a0 = 1 + al;
    var b0 = (1 - cs) / 2 / a0, b1 = (1 - cs) / a0, a1 = -2 * cs / a0, a2 = (1 - al) / a0;
    var y = new Float64Array(buf.length), x1 = buf[0], x2 = buf[0], y1 = buf[0], y2 = buf[0];
    for (var i = 0; i < buf.length; i++) {
      var v = b0 * buf[i] + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
      x2 = x1; x1 = buf[i]; y2 = y1; y1 = v; y[i] = v;
    }
    return y;
  };
  /* Affinage sur le fondamental (banc du 26/11). Sur une vraie corde, les harmoniques aigus sont un peu plus hauts que
     k × f (inharmonicité) et la fonction de différence leur donne d'autant plus de poids qu'ils sont aigus : la mesure
     montait jusqu'à +15 cents sur un Mi de basse. On refait donc le creux sur le signal passé dans un passe-bas réglé sur
     la note trouvée (il ne reste que le fondamental et un peu d'octave), à m périodes, m choisi pour que le retard fasse
     environ la moitié du tampon (meilleur compromis entre la longueur du retard et celle de la fenêtre) : l'erreur de
     lecture du creux, et l'effet d'une autre corde qui résonne encore, sont divisés par m.
     Le creux est cherché à ±3 % (+2 échantillons) de m fois la période donnée par YIN, jamais à plus de 0,4 période :
     on ne peut pas tomber sur le creux voisin. Renvoie la fréquence affinée, ou f si aucun creux net n'est trouvé. */
  MU.affinerFondamental = function (buf, sr, f) {
    var n0 = buf ? buf.length : 0;
    if (!(f > 0) || n0 < 512 || !(sr > 0)) { return f; }
    var y = MU.passeBas(buf, sr, Math.min(f, sr / 8));
    var debut = Math.ceil(1.35 * sr / f);   // ~6 constantes de temps : le départ du filtre est oublié
    var n = n0 - debut, T = sr / f, garde = Math.max(T, 128);
    var m = Math.min(64, Math.max(1, Math.floor(0.5 * n / T)), Math.floor((n - garde - 4) / (1.02 * T)));
    if (m < 1) { return f; }
    var c0 = Math.round(m * T), r = Math.min(Math.ceil(0.4 * T), Math.ceil(0.03 * m * T) + 2), W = n - (c0 + r + 1);
    if (W < garde || c0 - r < 2) { return f; }
    function dif(t) {
      var s = 0;
      for (var k = debut; k < debut + W; k++) { var z = y[k] - y[k + t]; s += z * z; }
      return s;
    }
    var bt = c0, bv = dif(c0);
    for (var e = 1; e <= r; e++) {
      var v1 = dif(c0 - e), v2 = dif(c0 + e);
      if (v1 < bv) { bv = v1; bt = c0 - e; }
      if (v2 < bv) { bv = v2; bt = c0 + e; }
    }
    if (Math.abs(bt - c0) === r) { return f; }   // creux au bord de la zone : pas de creux net
    var a = dif(bt - 1), c = dif(bt + 1), den = a - 2 * bv + c;
    var tm = den > 0 ? bt + Math.max(-1, Math.min(1, 0.5 * (a - c) / den)) : bt;
    return sr * m / tm;
  };
  /* Creux de la fonction de différence de y (fenêtre [debut, debut + W[) entre c0 - r et c0 + r, cherché du gros au fin
     (pas de r/4, puis divisé par 4) : sur un signal passé au passe-bas, le creux est seul sur ±0,4 période.
     Renvoie la position affinée par une parabole, ou null si le creux est au bord de la zone (pas de creux net). */
  function creuxPres(y, debut, W, c0, r) {
    function dif(t) {
      var s = 0;
      for (var k = debut; k < debut + W; k++) { var z = y[k] - y[k + t]; s += z * z; }
      return s;
    }
    var lo = c0 - r, hi = c0 + r, bt = c0, bv = dif(c0), pas = Math.max(1, Math.ceil(r / 4));
    for (var tour = 0; tour < 12; tour++) {
      var centre = bt;
      for (var k = -4; k <= 4; k++) {
        var t = centre + k * pas;
        if (k === 0 || t < lo || t > hi) { continue; }
        var v = dif(t);
        if (v < bv) { bv = v; bt = t; }
      }
      if (pas === 1) { break; }
      pas = Math.max(1, Math.ceil(pas / 4));
    }
    if (bt <= lo || bt >= hi) { return null; }
    var a = dif(bt - 1), c = dif(bt + 1), den = a - 2 * bv + c;
    return den > 0 ? bt + Math.max(-1, Math.min(1, 0.5 * (a - c) / den)) : bt;
  }
  /* Affinage long (banc du 26/11) : même méthode que affinerFondamental, sur tout le son de la note en cours (jusqu'à
     341 ms au lieu de 85). Le retard passe de ~5 à ~25 périodes : l'effet d'une autre corde qui résonne encore (jusqu'à
     14 cents) et celui du bruit tombent sous 2 cents. Deux étapes (32 périodes au plus, puis le maximum) pour que l'écart
     de départ reste bien plus petit qu'une demi-période. Renvoie f1 si aucun creux net n'est trouvé. */
  MU.affinerLong = function (seg, sr, f1) {
    var n0 = seg ? seg.length : 0;
    if (!(f1 > 0) || !(sr > 0) || n0 < 6144) { return f1; }
    var y = MU.passeBas(seg, sr, Math.min(f1, sr / 8));
    var debut = Math.ceil(1.35 * sr / f1), n = n0 - debut, garde = Math.max(sr / f1, 128), f = f1;
    var mMax = Math.floor(Math.min(0.5 * n, n - garde - 4) * f1 / (1.02 * sr));
    var etapes = mMax > 32 ? [32, mMax] : [mMax];
    for (var i = 0; i < etapes.length; i++) {
      var m = etapes[i], T = sr / f;
      if (m < 2) { return f1; }
      var c0 = Math.round(m * T), r = Math.min(Math.floor(0.4 * T), Math.ceil(0.01 * m * T) + 2), W = n - (c0 + r + 1);
      if (W < garde) { return f1; }
      var tm = creuxPres(y, debut, W, c0, r);
      if (tm === null) { return f1; }
      f = sr * m / tm;
    }
    return f;
  };
  /* Une mesure de l'accordeur : YIN sur les FENETRE derniers échantillons, puis affinage sur le fondamental. {freq, clarte}
     ou null. L'affinage n'est fait que si YIN a trouvé un creux franc (sous son seuil de 0,15) : quand deux cordes sonnent
     ensemble, YIN peut donner une période double et le filtre réglé dessus effacerait la vraie note.
     suivi (facultatif, tenu par MU.suivreNote) : si la même note sonne depuis assez longtemps, affinage long sur tout ce son. */
  MU.mesurer = function (buf, sr, o, suivi, t) {
    var N = MU.REGLAGES_ACCORDEUR.FENETRE, nb = buf ? buf.length : 0;
    var court = nb > N ? (buf.subarray ? buf.subarray(nb - N) : buf.slice(nb - N)) : buf;
    var h = court ? court.length >> 1 : 0, e1 = 0, e2 = 0, i;
    for (i = 0; i < h; i++) { e1 += court[i] * court[i]; }
    for (i = h; i < 2 * h; i++) { e2 += court[i] * court[i]; }
    if (e2 > 4 * e1) { return null; }   // attaque dans la fenêtre (volume doublé) : mesure faussée de 5 à 20 cents, on attend
    var r = MU.yin(court, sr, o);
    if (!r || r.clarte < 0.85) { return r; }
    var f = MU.affinerFondamental(court, sr, r.freq);
    if (Math.abs(MU.cents(f, r.freq)) > 50) { return r; }
    var L = suivi && suivi.f > 0 && Math.abs(MU.cents(f, suivi.f)) <= 30 ? Math.min(nb, Math.floor((t - suivi.t0) * sr / 1000)) : 0;
    if (L >= 1.5 * N) {
      var g = MU.affinerLong(buf.subarray ? buf.subarray(nb - L) : buf.slice(nb - L), sr, f);
      if (Math.abs(MU.cents(g, f)) <= 20) { f = g; }
    }
    return { freq: f, clarte: r.clarte };
  };
  /* Suivi de la note tenue, à appeler après chaque mesure (r : résultat de MU.mesurer ou null ; v : volume RMS des FENETRE
     derniers échantillons ; t : temps en ms). s = {f, t0, tok, v} : fréquence de la note en cours (0 = aucune), début,
     dernière mesure nette, volume. La note continue tant que les mesures nettes restent à 30 cents près ; une mesure
     floue isolée ne la coupe pas. Elle s'arrête sur une nouvelle attaque (volume doublé d'une mesure à l'autre), un
     silence ou 0,7 s sans mesure nette. Seul le son reçu depuis la première mesure nette sert à l'affinage long. */
  MU.suivreNote = function (s, r, v, t) {
    var R = MU.REGLAGES_ACCORDEUR, ok = r && r.clarte >= R.SEUIL_CLARTE;
    if ((s.v > 0 && v > 2 * s.v) || v < R.SEUIL_RMS || t - s.tok > R.SILENCE_MS) { s.f = 0; }
    if (ok) {
      if (!(s.f > 0 && Math.abs(MU.cents(r.freq, s.f)) <= 30)) { s.t0 = t; }
      s.f = r.freq; s.tok = t;
    }
    s.v = v;
    return s;
  };

  // Harmoniques du son de corde pincée (pincée vers 1/5,5 de la longueur) : amplitude |sin(kπp)| / k.
  MU.harmoniquesCorde = function (nb) {
    nb = Math.round(MU.borner(nb, 1, 64, 24));
    var p = 0.18, r = [];
    for (var k = 1; k <= nb; k++) { r.push(Math.abs(Math.sin(k * Math.PI * p)) / k); }
    return r;
  };

  /* ---------- erreurs du micro ---------- */
  MU.LIEN_AIDE_MICRO = '/questions/accordeur-micro-ne-marche-pas/';
  MU.erreurMicro = function (err) {
    var nom = err && typeof err.name === 'string' ? err.name : '';
    if (nom === 'NotAllowedError' || nom === 'SecurityError' || nom === 'PermissionDeniedError') {
      return { titre: 'Accès au micro refusé', texte: 'Le navigateur ou le système bloque le micro pour ce site. Autorisez le micro (icône à gauche de l’adresse), puis cliquez de nouveau sur « Démarrer l’accordeur ».' };
    }
    if (nom === 'NotFoundError' || nom === 'OverconstrainedError' || nom === 'DevicesNotFoundError') {
      return { titre: 'Aucun micro trouvé', texte: 'Aucun micro n’est branché ou activé. Branchez un micro (ou utilisez celui du téléphone), puis réessayez.' };
    }
    if (nom === 'NotReadableError' || nom === 'TrackStartError' || nom === 'AbortError') {
      return { titre: 'Micro déjà utilisé', texte: 'Une autre application (visio, enregistreur) tient le micro. Fermez-la, puis réessayez.' };
    }
    if (nom === 'NoApiError') {
      return { titre: 'Navigateur non compatible', texte: 'Ce navigateur ne donne pas accès au micro (ou la page n’est pas en https). Essayez avec Chrome, Edge, Firefox ou Safari à jour.' };
    }
    return { titre: 'Micro impossible à ouvrir', texte: 'Rechargez la page, vérifiez le micro et réessayez.' };
  };

  /* ---------- métronome ---------- */
  // Niveaux : 3 = premier temps (accent), 2 = appui secondaire (4e croche du 6/8), 1 = temps, 0 = subdivision.
  MU.MESURES = {
    '2/4': { temps: 2, accents: [3, 1] },
    '3/4': { temps: 3, accents: [3, 1, 1] },
    '4/4': { temps: 4, accents: [3, 1, 1, 1] },
    '6/8': { temps: 6, accents: [3, 1, 1, 2, 1, 1] }   // chaque clic est une croche
  };
  MU.SUBDIVISIONS = { 1: 'aucune', 2: 'croches', 3: 'triolets', 4: 'doubles croches' };
  MU.niveauClic = function (mesure, temps, sub, accent) {
    if (sub > 0) { return 0; }
    var m = MU.MESURES[mesure] || MU.MESURES['4/4'];
    var n = m.accents[temps % m.temps];
    return accent === false ? Math.min(1, n) : n;
  };
  /* Fonction pure : clics à programmer avant l'instant horizon (secondes, horloge de l'AudioContext).
     etat : {prochain, temps, sub, bpm, mesure, subdiv, accent}. Renvoie {clics: [{t, niveau, temps, sub}], etat}. */
  MU.prochainsClics = function (etat, horizon) {
    var e = {
      prochain: etat.prochain, temps: etat.temps | 0, sub: etat.sub | 0, bpm: MU.bornerBpm(etat.bpm),
      mesure: MU.MESURES[etat.mesure] ? etat.mesure : '4/4', subdiv: [1, 2, 3, 4].indexOf(etat.subdiv) >= 0 ? etat.subdiv : 1,
      accent: etat.accent !== false
    };
    var m = MU.MESURES[e.mesure], clics = [];
    if (e.temps >= m.temps || e.temps < 0) { e.temps = 0; }
    if (e.sub >= e.subdiv || e.sub < 0) { e.sub = 0; }
    var pas = 60 / e.bpm / e.subdiv;
    for (var i = 0; i < 64 && e.prochain < horizon; i++) {
      clics.push({ t: e.prochain, niveau: MU.niveauClic(e.mesure, e.temps, e.sub, e.accent), temps: e.temps, sub: e.sub });
      e.prochain += pas;
      e.sub++;
      if (e.sub >= e.subdiv) { e.sub = 0; e.temps = (e.temps + 1) % m.temps; }
    }
    return { clics: clics, etat: e };
  };
  // Terme italien indicatif (les plages varient selon les sources).
  MU.TERMES = [
    [40, 'Grave', 'très lent, solennel'], [60, 'Largo', 'large, lent'], [66, 'Larghetto', 'assez lent'],
    [76, 'Adagio', 'lent, à l’aise'], [108, 'Andante', 'allant, au pas'], [120, 'Moderato', 'modéré'],
    [156, 'Allegro', 'rapide, joyeux'], [176, 'Vivace', 'vif'], [200, 'Presto', 'très rapide'], [Infinity, 'Prestissimo', 'le plus vite possible']
  ];
  MU.termeTempo = function (bpm) {
    var b = MU.bornerBpm(bpm);
    for (var i = 0; i < MU.TERMES.length; i++) { if (b < MU.TERMES[i][0]) { return { terme: MU.TERMES[i][1], sens: MU.TERMES[i][2] }; } }
    return null;
  };

  /* ---------- tap tempo ---------- */
  MU.TAP_PAUSE = 2000;
  MU.TAP_MAX = 12;
  // liste : instants en ms. Renvoie une nouvelle liste (remise à zéro après 2 s sans frappe, 12 dernières frappes).
  MU.ajouterTap = function (liste, t) {
    if (!isFinite(t)) { return (liste || []).slice(); }
    var l = (liste || []).slice(-MU.TAP_MAX);
    var der = l.length ? l[l.length - 1] : null;
    if (der !== null && (t - der > MU.TAP_PAUSE || t < der)) { l = []; }
    if (der !== null && t === der) { return l; }
    l.push(t);
    return l.slice(-MU.TAP_MAX);
  };
  MU.bpmDeTaps = function (liste) {
    if (!liste || liste.length < 2) { return null; }
    var n = liste.length, ecart = (liste[n - 1] - liste[0]) / (n - 1);
    if (!(ecart > 0)) { return null; }
    var bpm = 60000 / ecart;
    return { bpm: bpm, arrondi: Math.round(bpm), frappes: n };
  };

  /* ---------- durées des notes ---------- */
  MU.NOTES_DUREES = [
    ['ronde', 'Ronde', 4], ['blanche', 'Blanche', 2], ['noire', 'Noire', 1], ['croche', 'Croche', 0.5],
    ['double', 'Double croche', 0.25], ['triple', 'Triple croche', 0.125]
  ];
  // En ms : normale, pointée (× 1,5), triolet (× 2/3). La noire vaut 60000 / bpm.
  MU.dureesNotes = function (bpm) {
    var b = MU.borner(bpm, 20, 300, 120), noire = 60000 / b;
    return MU.NOTES_DUREES.map(function (x) {
      var n = noire * x[2];
      return { id: x[0], nom: x[1], normale: n, pointee: n * 1.5, triolet: n * 2 / 3 };
    });
  };
  // Durée en ms d'une note valant `noires` noires -> bpm.
  MU.bpmDeMs = function (ms, noires) {
    var d = MU.borner(ms, 1, 600000, NaN), k = MU.borner(noires, 0.01, 8, 1);
    return isFinite(d) ? 60000 * k / d : NaN;
  };
  MU.hzDeMs = function (ms) { return ms > 0 ? 1000 / ms : NaN; };

  return MU;
}));
