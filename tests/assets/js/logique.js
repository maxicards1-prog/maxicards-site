/* Tests du PC : logique pure (sans DOM), testée avec Node (tests/test_logique.js). Rien n'est envoyé : tout reste dans le navigateur. */
(function (racine, fab) {
  'use strict';
  var m = fab();
  if (typeof module === 'object' && module.exports) { module.exports = m; } else { racine.TP = m; }
}(this, function () {
  'use strict';
  var TP = {};

  /* ---------- statistiques ---------- */
  TP.moyenne = function (a) {
    if (!a.length) { return NaN; }
    var s = 0; for (var i = 0; i < a.length; i++) { s += a[i]; }
    return s / a.length;
  };
  TP.mediane = function (a) {
    if (!a.length) { return NaN; }
    var b = a.slice().sort(function (x, y) { return x - y; });
    var k = Math.floor(b.length / 2);
    return b.length % 2 ? b[k] : (b[k - 1] + b[k]) / 2;
  };
  TP.stats = function (a) {
    if (!a.length) { return { n: 0, moyenne: NaN, mediane: NaN, min: NaN, max: NaN }; }
    return { n: a.length, moyenne: TP.moyenne(a), mediane: TP.mediane(a), min: Math.min.apply(null, a), max: Math.max.apply(null, a) };
  };

  /* ---------- clics par seconde, frappe ---------- */
  TP.cps = function (clics, secondes) { return secondes > 0 ? clics / secondes : 0; };
  // Convention des tests de frappe : un « mot » = 5 caractères.
  TP.motsParMinute = function (caracteresCorrects, secondes) {
    return secondes > 0 ? (caracteresCorrects / 5) / (secondes / 60) : 0;
  };
  TP.compterCorrects = function (cible, saisi) {
    var n = 0, l = Math.min(cible.length, saisi.length);
    for (var i = 0; i < l; i++) { if (cible.charAt(i) === saisi.charAt(i)) { n++; } }
    return n;
  };
  // Précision : part des frappes qui étaient justes (frappes = caractères tapés, corrections comprises).
  TP.precision = function (justes, frappes) { return frappes > 0 ? Math.max(0, Math.min(100, 100 * justes / frappes)) : 100; };

  /* ---------- souris : clics qui reviennent trop vite (double-clic involontaire) ---------- */
  // evts : [{t: ms, bouton: 0|1|2|3|4}] triés par temps. Deux appuis du même bouton plus proches que seuilMs = suspect.
  TP.detecterRebonds = function (evts, seuilMs) {
    var dernier = {}, suspects = [], plusCourt = {};
    for (var i = 0; i < evts.length; i++) {
      var e = evts[i];
      if (dernier[e.bouton] !== undefined) {
        var dt = e.t - dernier[e.bouton];
        if (plusCourt[e.bouton] === undefined || dt < plusCourt[e.bouton]) { plusCourt[e.bouton] = dt; }
        if (dt >= 0 && dt < seuilMs) { suspects.push({ bouton: e.bouton, dt: dt }); }
      }
      dernier[e.bouton] = e.t;
    }
    return { suspects: suspects, plusCourt: plusCourt };
  };

  /* ---------- manette : zone morte et dérive ---------- */
  TP.rayon = function (x, y) { return Math.sqrt(x * x + y * y); };
  // Zone morte circulaire : sous dz le stick vaut 0 ; au-delà, la valeur repart de 0 (pas de saut).
  TP.zoneMorte = function (x, y, dz) {
    var r = TP.rayon(x, y);
    if (r <= dz || r === 0) { return [0, 0]; }
    var r2 = Math.min(r, 1);
    var k = ((r2 - dz) / (1 - dz)) / r;
    return [x * k, y * k];
  };
  // echantillons : [[x, y], ...] relevés stick lâché. seuil : écart au centre jugé anormal (réglage choisi par nous).
  TP.analyserRepos = function (echantillons, seuil) {
    if (!echantillons.length) { return { n: 0, moyenne: 0, max: 0, mx: 0, my: 0, etat: 'vide' }; }
    var sx = 0, sy = 0, sr = 0, max = 0;
    for (var i = 0; i < echantillons.length; i++) {
      var x = echantillons[i][0], y = echantillons[i][1], r = TP.rayon(x, y);
      sx += x; sy += y; sr += r; if (r > max) { max = r; }
    }
    var n = echantillons.length, moy = sr / n;
    var etat = 'stable';
    if (moy > seuil) { etat = 'derive'; } else if (max > seuil) { etat = 'instable'; }
    return { n: n, moyenne: moy, max: max, mx: sx / n, my: sy / n, etat: etat };
  };
  var FAMILLES = {
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'Vue', 'Menu', 'Stick G (clic)', 'Stick D (clic)', 'Croix haut', 'Croix bas', 'Croix gauche', 'Croix droite', 'Xbox'],
    ps5: ['Croix', 'Rond', 'Carré', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', 'Croix haut', 'Croix bas', 'Croix gauche', 'Croix droite', 'PS', 'Pavé tactile'],
    ps4: ['Croix', 'Rond', 'Carré', 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', 'Croix haut', 'Croix bas', 'Croix gauche', 'Croix droite', 'PS', 'Pavé tactile'],
    // Switch : par position, le bouton du bas porte la lettre B, celui de droite la lettre A (indices 0 à 3 de la disposition standard).
    'switch': ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', 'Stick G (clic)', 'Stick D (clic)', 'Croix haut', 'Croix bas', 'Croix gauche', 'Croix droite', 'Home']
  };
  TP.FAMILLES_MANETTE = FAMILLES;
  TP.libelleBouton = function (famille, i) {
    var t = FAMILLES[famille] || FAMILLES.xbox;
    return t[i] !== undefined ? t[i] : 'Bouton ' + i;
  };
  // Suggestion à partir de l'identifiant donné par le navigateur (Chrome et Edge écrivent « Vendor: 054c Product: 0ce6 »).
  TP.familleDepuisId = function (id) {
    var s = String(id || '').toLowerCase();
    if (s.indexOf('054c') >= 0) { return s.indexOf('0ce6') >= 0 || s.indexOf('dualsense') >= 0 ? 'ps5' : 'ps4'; }
    if (s.indexOf('057e') >= 0 || s.indexOf('nintendo') >= 0) { return 'switch'; }
    if (s.indexOf('045e') >= 0 || s.indexOf('xbox') >= 0 || s.indexOf('xinput') >= 0) { return 'xbox'; }
    if (s.indexOf('dualsense') >= 0) { return 'ps5'; }
    if (s.indexOf('dualshock') >= 0 || s.indexOf('wireless controller') >= 0) { return 'ps4'; }
    return 'xbox';
  };

  /* ---------- écran ---------- */
  TP.hzDepuisIntervalles = function (deltas) {
    var d = deltas.filter(function (x) { return x > 0; });
    if (d.length < 5) { return NaN; }
    return 1000 / TP.mediane(d);
  };
  var HZ = [24, 30, 50, 60, 75, 90, 100, 120, 144, 165, 180, 240, 280, 360, 500];
  TP.hzStandard = function (hz) {
    if (!isFinite(hz)) { return null; }
    var best = null, bd = Infinity;
    for (var i = 0; i < HZ.length; i++) { var d = Math.abs(hz - HZ[i]) / HZ[i]; if (d < bd) { bd = d; best = HZ[i]; } }
    return bd <= 0.04 ? best : null;
  };
  TP.fpsDepuisImages = function (images, ms) { return ms > 0 ? images * 1000 / ms : 0; };

  /* ---------- micro ---------- */
  TP.dbfs = function (v) { return v > 0 ? 20 * Math.log(v) / Math.LN10 : -Infinity; };
  // Données temporelles (Float32, -1 à 1) -> niveau efficace (rms) et crête.
  TP.niveau = function (donnees) {
    var s = 0, pic = 0, n = donnees.length;
    for (var i = 0; i < n; i++) { var v = donnees[i], a = v < 0 ? -v : v; s += v * v; if (a > pic) { pic = a; } }
    return { rms: n ? Math.sqrt(s / n) : 0, pic: pic };
  };
  // Seuils choisis par nous (indicatifs, pas une norme) : crête sous -50 dBFS = silence, sous -20 dBFS = faible,
  // à partir de -1 dBFS (0,99) ou 2 images saturées = saturation.
  TP.SEUILS_MICRO = { silence: 0.003, faible: 0.1, fort: 0.9, sature: 0.99 };
  TP.diagnosticMicro = function (r) {
    var S = TP.SEUILS_MICRO;
    if (!r || r.images < 1 || r.pic < S.silence) { return { etat: 'aucun', ok: false }; }
    if (r.saturees >= 2 || r.pic >= S.sature) { return { etat: 'sature', ok: false }; }
    if (r.pic < S.faible) { return { etat: 'faible', ok: false }; }
    if (r.pic >= S.fort) { return { etat: 'fort', ok: true }; }
    return { etat: 'bon', ok: true };
  };

  // Luminance moyenne (0 à 255) de pixels RGBA : sert à repérer une image noire (cache fermé, caméra masquée).
  TP.luminanceMoyenne = function (rgba) {
    var n = rgba.length / 4, s = 0;
    if (!n) { return 0; }
    for (var i = 0; i < rgba.length; i += 4) { s += 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]; }
    return s / n;
  };
  // Images par seconde sur une fenêtre glissante : instants (ms) des dernières images.
  TP.fpsFenetre = function (instants, fenetreMs) {
    if (instants.length < 2) { return 0; }
    var fin = instants[instants.length - 1], i = instants.length - 1;
    while (i > 0 && fin - instants[i - 1] <= fenetreMs) { i--; }
    var duree = fin - instants[i];
    return duree > 0 ? (instants.length - 1 - i) * 1000 / duree : 0;
  };

  /* ---------- son ---------- */
  TP.freqBalayage = function (t, duree, f0, f1) {
    var x = Math.max(0, Math.min(1, t / duree));
    return f0 * Math.pow(f1 / f0, x);
  };
  // Curseur 0-100 -> gain 0 à 0,5 (courbe au carré : le bas du curseur reste très doux ; jamais plus de 0,5).
  TP.gainDepuisCurseur = function (v) {
    var x = Math.max(0, Math.min(100, Number(v) || 0)) / 100;
    return 0.5 * x * x;
  };

  /* ---------- clavier ---------- */
  TP.creerSuiviTouches = function () {
    var presses = {}, enfoncees = {}, nbEnf = 0, max = 0, total = 0;
    return {
      appui: function (code) {
        if (enfoncees[code]) { return; }   // répétition automatique : on ne recompte pas
        enfoncees[code] = true; nbEnf++; total++;
        if (nbEnf > max) { max = nbEnf; }
        presses[code] = (presses[code] || 0) + 1;
      },
      relache: function (code) { if (enfoncees[code]) { delete enfoncees[code]; nbEnf--; } },
      toutRelacher: function () { enfoncees = {}; nbEnf = 0; },
      raz: function () { presses = {}; enfoncees = {}; nbEnf = 0; max = 0; total = 0; },
      estPresse: function (code) { return !!presses[code]; },
      estEnfoncee: function (code) { return !!enfoncees[code]; },
      etat: function () { return { enfoncees: nbEnf, max: max, total: total, distinctes: Object.keys(presses).length }; }
    };
  };
  // Disposition : {c: code, w: largeur, e: étiquette QWERTY, f: étiquette AZERTY}. Les codes sont ceux de la POSITION physique
  // (KeyboardEvent.code) : sur un clavier français, la touche « A » renvoie le code KeyQ.
  function T(c, w, e, f) { return { c: c, w: w, e: e, f: f === undefined ? e : f }; }
  function esp(w) { return { espace: w }; }
  var AZ = { KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ',' };
  function L(l) { var c = 'Key' + l; return T(c, 1, l, AZ[c] || l); }
  function Fk(n) { return T('F' + n, 1, 'F' + n); }
  function rang(chaine) { return chaine.split('').map(L); }
  TP.CLAVIER = {
    principal: [
      [T('Escape', 1, 'Échap'), esp(1), Fk(1), Fk(2), Fk(3), Fk(4), esp(0.5), Fk(5), Fk(6), Fk(7), Fk(8), esp(0.5), Fk(9), Fk(10), Fk(11), Fk(12)],
      [T('Backquote', 1, '`', '²'), T('Digit1', 1, '1', '&'), T('Digit2', 1, '2', 'é'), T('Digit3', 1, '3', '"'), T('Digit4', 1, '4', "'"), T('Digit5', 1, '5', '('),
        T('Digit6', 1, '6', '-'), T('Digit7', 1, '7', 'è'), T('Digit8', 1, '8', '_'), T('Digit9', 1, '9', 'ç'), T('Digit0', 1, '0', 'à'),
        T('Minus', 1, '-', ')'), T('Equal', 1, '=', '='), T('Backspace', 2, '⌫')],
      [T('Tab', 1.5, 'Tab')].concat(rang('QWERTYUIOP'), [T('BracketLeft', 1, '[', '^'), T('BracketRight', 1, ']', '$')]),
      [T('CapsLock', 1.75, 'Verr. Maj')].concat(rang('ASDFGHJKL'), [T('Semicolon', 1, ';', 'M'), T('Quote', 1, "'", 'ù'), T('Backslash', 1, '#', '*'), T('Enter', 1.25, 'Entrée')]),
      [T('ShiftLeft', 1.25, '⇧'), T('IntlBackslash', 1, '<', '<')].concat(rang('ZXCVBNM'), [T('Comma', 1, ',', ';'), T('Period', 1, '.', ':'), T('Slash', 1, '/', '!'), T('ShiftRight', 2.75, '⇧')]),
      [T('ControlLeft', 1.25, 'Ctrl'), T('MetaLeft', 1.25, 'Win'), T('AltLeft', 1.25, 'Alt'), T('Space', 6.25, 'Espace'), T('AltRight', 1.25, 'Alt Gr'),
        T('MetaRight', 1.25, 'Win'), T('ContextMenu', 1.25, '☰'), T('ControlRight', 1.25, 'Ctrl')]
    ],
    navigation: [
      [T('PrintScreen', 1, 'Impr'), T('ScrollLock', 1, 'Arrêt déf.'), T('Pause', 1, 'Pause')],
      [T('Insert', 1, 'Inser'), T('Home', 1, 'Début'), T('PageUp', 1, 'Pg ↑')],
      [T('Delete', 1, 'Suppr'), T('End', 1, 'Fin'), T('PageDown', 1, 'Pg ↓')],
      [esp(3)],
      [esp(1), T('ArrowUp', 1, '↑'), esp(1)],
      [T('ArrowLeft', 1, '←'), T('ArrowDown', 1, '↓'), T('ArrowRight', 1, '→')]
    ],
    pave: [
      [T('NumLock', 1, 'Verr. Num'), T('NumpadDivide', 1, '/'), T('NumpadMultiply', 1, '*'), T('NumpadSubtract', 1, '-')],
      [T('Numpad7', 1, '7'), T('Numpad8', 1, '8'), T('Numpad9', 1, '9'), T('NumpadAdd', 1, '+')],
      [T('Numpad4', 1, '4'), T('Numpad5', 1, '5'), T('Numpad6', 1, '6'), esp(1)],
      [T('Numpad1', 1, '1'), T('Numpad2', 1, '2'), T('Numpad3', 1, '3'), T('NumpadEnter', 1, 'Entrée')],
      [T('Numpad0', 2, '0'), T('NumpadDecimal', 1, '.', ','), esp(1)]
    ]
  };
  TP.codesClavier = function () {
    var out = [], K = TP.CLAVIER;
    ['principal', 'navigation', 'pave'].forEach(function (z) {
      K[z].forEach(function (r) { r.forEach(function (t) { if (t.c) { out.push(t.c); } }); });
    });
    return out;
  };

  /* ---------- tactile ---------- */
  TP.creerSuiviPoints = function () {
    var actifs = {}, n = 0, max = 0;
    return {
      pose: function (id) { if (!actifs[id]) { actifs[id] = true; n++; if (n > max) { max = n; } } },
      leve: function (id) { if (actifs[id]) { delete actifs[id]; n--; } },
      raz: function () { actifs = {}; n = 0; max = 0; },
      etat: function () { return { actifs: n, max: max }; }
    };
  };

  /* ---------- erreurs micro / caméra (getUserMedia) ---------- */
  var AIDE = '/depannage/';
  TP.erreurMedia = function (err, type) {
    var nom = err && err.name ? err.name : '';
    var cible = type === 'camera' ? 'la caméra' : (type === 'micro' ? 'le micro' : 'le micro ou la caméra');
    var Cible = cible.charAt(0).toUpperCase() + cible.slice(1);
    var lienAutoriser = type === 'camera' ? AIDE + 'autoriser-la-camera-dans-le-navigateur/' : AIDE + 'autoriser-le-micro-dans-chrome-edge-firefox/';
    var lienAbsent = type === 'camera' ? AIDE + 'webcam-non-detectee/' : AIDE + 'micro-ne-fonctionne-pas-windows-11/';
    if (nom === 'NotAllowedError' || nom === 'SecurityError' || nom === 'PermissionDeniedError') {
      return { code: 'refuse', titre: 'Accès refusé', texte: 'Le navigateur ou le système a refusé l’accès à ' + cible + '. Autorisez-le pour ce site, puis cliquez de nouveau sur « Démarrer ».', lien: lienAutoriser, lienTexte: 'Comment autoriser l’accès' };
    }
    if (nom === 'NotFoundError' || nom === 'DevicesNotFoundError' || nom === 'OverconstrainedError') {
      return { code: 'absent', titre: 'Aucun appareil trouvé', texte: Cible + ' est introuvable. Vérifiez le branchement, le choix de l’appareil dans la liste et les réglages de confidentialité du système.', lien: lienAbsent, lienTexte: 'Que faire si l’appareil n’est pas détecté' };
    }
    if (nom === 'NotReadableError' || nom === 'TrackStartError' || nom === 'AbortError') {
      return { code: 'occupe', titre: 'Appareil déjà utilisé ou bloqué', texte: Cible + ' est peut-être utilisé par une autre application (visio, enregistreur, autre onglet) ou bloqué par le système. Fermez les autres applications qui l’utilisent, puis réessayez.', lien: lienAbsent, lienTexte: 'Que faire si l’appareil est occupé' };
    }
    if (nom === 'NoApiError') {
      return { code: 'api', titre: 'Navigateur non compatible', texte: 'Ce navigateur ou cette page ne permet pas d’accéder à ' + cible + ' (il faut une page sécurisée en https et un navigateur récent).', lien: lienAutoriser, lienTexte: 'Aide' };
    }
    return { code: 'autre', titre: 'Erreur inattendue', texte: 'Impossible d’ouvrir ' + cible + (nom ? ' (' + nom + ')' : '') + '. Rechargez la page, vérifiez l’appareil et réessayez.', lien: lienAbsent, lienTexte: 'Aide' };
  };

  /* ---------- temps de réaction ---------- */
  // Attente avant le vert : entre mini et maxi ms ; alea = nombre dans [0, 1[.
  TP.attenteReaction = function (alea, mini, maxi) { return mini + alea * (maxi - mini); };

  return TP;
}));
