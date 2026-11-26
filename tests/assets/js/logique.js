/* Tests du PC : logique pure (sans DOM), testée avec Node (tests/test_logique.js). Rien n'est envoyé : tout reste dans le navigateur. */
(function (racine, fab) {
  'use strict';
  var m = fab();
  if (typeof module === 'object' && module.exports) { module.exports = m; } else { racine.TP = m; }
}(this, function () {
  'use strict';
  var TP = {};

  /* ---------- langue (26/11/2026) ---------- */
  // Dictionnaire de la page : null en français ; les pages anglaises chargent assets/js/en/textes.js juste après ce fichier.
  // TP.t('Texte français exact {marqueur}', {marqueur: valeur}) : la clé est le texte français, renvoyé tel quel sans dictionnaire.
  TP.DICO = null;
  var aCle = Object.prototype.hasOwnProperty;
  TP.t = function (s, v) {
    var d = TP.DICO, r = (d && aCle.call(d, s) && typeof d[s] === 'string') ? d[s] : s;
    if (v) { r = r.replace(/\{(\w+)\}/g, function (m, k) { return aCle.call(v, k) ? String(v[k]) : m; }); }
    return r;
  };

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
    xbox: ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', TP.t('Vue'), 'Menu', TP.t('Stick G (clic)'), TP.t('Stick D (clic)'), TP.t('Croix haut'), TP.t('Croix bas'), TP.t('Croix gauche'), TP.t('Croix droite'), 'Xbox'],
    ps5: [TP.t('Croix'), TP.t('Rond'), TP.t('Carré'), 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Create', 'Options', 'L3', 'R3', TP.t('Croix haut'), TP.t('Croix bas'), TP.t('Croix gauche'), TP.t('Croix droite'), 'PS', TP.t('Pavé tactile')],
    ps4: [TP.t('Croix'), TP.t('Rond'), TP.t('Carré'), 'Triangle', 'L1', 'R1', 'L2', 'R2', 'Share', 'Options', 'L3', 'R3', TP.t('Croix haut'), TP.t('Croix bas'), TP.t('Croix gauche'), TP.t('Croix droite'), 'PS', TP.t('Pavé tactile')],
    // Switch : par position, le bouton du bas porte la lettre B, celui de droite la lettre A (indices 0 à 3 de la disposition standard).
    'switch': ['B', 'A', 'Y', 'X', 'L', 'R', 'ZL', 'ZR', '−', '+', TP.t('Stick G (clic)'), TP.t('Stick D (clic)'), TP.t('Croix haut'), TP.t('Croix bas'), TP.t('Croix gauche'), TP.t('Croix droite'), 'Home']
  };
  TP.FAMILLES_MANETTE = FAMILLES;
  TP.libelleBouton = function (famille, i) {
    var t = FAMILLES[famille] || FAMILLES.xbox;
    return t[i] !== undefined ? TP.t(t[i]) : TP.t('Bouton {n}', { n: i });
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
  function Tc(c, w, e, f) { return { c: c, w: w, e: e, f: f === undefined ? e : f }; }
  function esp(w) { return { espace: w }; }
  var AZ = { KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ',' };
  function L(l) { var c = 'Key' + l; return Tc(c, 1, l, AZ[c] || l); }
  function Fk(n) { return Tc('F' + n, 1, 'F' + n); }
  function rang(chaine) { return chaine.split('').map(L); }
  TP.CLAVIER = {
    principal: [
      [Tc('Escape', 1, TP.t('Échap')), esp(1), Fk(1), Fk(2), Fk(3), Fk(4), esp(0.5), Fk(5), Fk(6), Fk(7), Fk(8), esp(0.5), Fk(9), Fk(10), Fk(11), Fk(12)],
      [Tc('Backquote', 1, '`', '²'), Tc('Digit1', 1, '1', '&'), Tc('Digit2', 1, '2', 'é'), Tc('Digit3', 1, '3', '"'), Tc('Digit4', 1, '4', "'"), Tc('Digit5', 1, '5', '('),
        Tc('Digit6', 1, '6', '-'), Tc('Digit7', 1, '7', 'è'), Tc('Digit8', 1, '8', '_'), Tc('Digit9', 1, '9', 'ç'), Tc('Digit0', 1, '0', 'à'),
        Tc('Minus', 1, '-', ')'), Tc('Equal', 1, '=', '='), Tc('Backspace', 2, '⌫')],
      [Tc('Tab', 1.5, 'Tab')].concat(rang('QWERTYUIOP'), [Tc('BracketLeft', 1, '[', '^'), Tc('BracketRight', 1, ']', '$')]),
      [Tc('CapsLock', 1.75, TP.t('Verr. Maj'))].concat(rang('ASDFGHJKL'), [Tc('Semicolon', 1, ';', 'M'), Tc('Quote', 1, "'", 'ù'), Tc('Backslash', 1, '#', '*'), Tc('Enter', 1.25, TP.t('Entrée'))]),
      [Tc('ShiftLeft', 1.25, '⇧'), Tc('IntlBackslash', 1, '<', '<')].concat(rang('ZXCVBNM'), [Tc('Comma', 1, ',', ';'), Tc('Period', 1, '.', ':'), Tc('Slash', 1, '/', '!'), Tc('ShiftRight', 2.75, '⇧')]),
      [Tc('ControlLeft', 1.25, 'Ctrl'), Tc('MetaLeft', 1.25, 'Win'), Tc('AltLeft', 1.25, 'Alt'), Tc('Space', 6.25, TP.t('Espace')), Tc('AltRight', 1.25, 'Alt Gr'),
        Tc('MetaRight', 1.25, 'Win'), Tc('ContextMenu', 1.25, '☰'), Tc('ControlRight', 1.25, 'Ctrl')]
    ],
    navigation: [
      [Tc('PrintScreen', 1, TP.t('Impr')), Tc('ScrollLock', 1, TP.t('Arrêt déf.')), Tc('Pause', 1, 'Pause')],
      [Tc('Insert', 1, TP.t('Inser')), Tc('Home', 1, TP.t('Début')), Tc('PageUp', 1, TP.t('Pg ↑'))],
      [Tc('Delete', 1, TP.t('Suppr')), Tc('End', 1, TP.t('Fin')), Tc('PageDown', 1, TP.t('Pg ↓'))],
      [esp(3)],
      [esp(1), Tc('ArrowUp', 1, '↑'), esp(1)],
      [Tc('ArrowLeft', 1, '←'), Tc('ArrowDown', 1, '↓'), Tc('ArrowRight', 1, '→')]
    ],
    pave: [
      [Tc('NumLock', 1, TP.t('Verr. Num')), Tc('NumpadDivide', 1, '/'), Tc('NumpadMultiply', 1, '*'), Tc('NumpadSubtract', 1, '-')],
      [Tc('Numpad7', 1, '7'), Tc('Numpad8', 1, '8'), Tc('Numpad9', 1, '9'), Tc('NumpadAdd', 1, '+')],
      [Tc('Numpad4', 1, '4'), Tc('Numpad5', 1, '5'), Tc('Numpad6', 1, '6'), esp(1)],
      [Tc('Numpad1', 1, '1'), Tc('Numpad2', 1, '2'), Tc('Numpad3', 1, '3'), Tc('NumpadEnter', 1, TP.t('Entrée'))],
      [Tc('Numpad0', 2, '0'), Tc('NumpadDecimal', 1, '.', ','), esp(1)]
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
  // type : 'micro' | 'camera' | autre valeur = les deux. Textes traduits par TP.t ; le lien reste l'adresse française
  // (TP.verdict le passe par TP.t). Phrases complètes par type (26/11 : corrige « l’accès à le micro »).
  TP.erreurMedia = function (err, type) {
    var nom = err && err.name ? err.name : '';
    var k = type === 'micro' ? 0 : (type === 'camera' ? 1 : 2);
    var X = function (micro, camera, deux) { return k === 0 ? micro : (k === 1 ? camera : deux); };
    var lienAutoriser = type === 'camera' ? '/depannage/autoriser-la-camera-dans-le-navigateur/' : '/depannage/autoriser-le-micro-dans-chrome-edge-firefox/';
    var lienAbsent = type === 'camera' ? '/depannage/webcam-non-detectee/' : '/depannage/micro-ne-fonctionne-pas-windows-11/';
    if (nom === 'NotAllowedError' || nom === 'SecurityError' || nom === 'PermissionDeniedError') {
      return { code: 'refuse', titre: TP.t('Accès refusé'), texte: X(
        TP.t('Le navigateur ou le système a refusé l’accès au micro. Autorisez-le pour ce site, puis cliquez de nouveau sur « Démarrer ».'),
        TP.t('Le navigateur ou le système a refusé l’accès à la caméra. Autorisez-le pour ce site, puis cliquez de nouveau sur « Démarrer ».'),
        TP.t('Le navigateur ou le système a refusé l’accès au micro ou à la caméra. Autorisez-le pour ce site, puis cliquez de nouveau sur « Démarrer ».')),
        lien: lienAutoriser, lienTexte: TP.t('Comment autoriser l’accès') };
    }
    if (nom === 'NotFoundError' || nom === 'DevicesNotFoundError' || nom === 'OverconstrainedError') {
      return { code: 'absent', titre: TP.t('Aucun appareil trouvé'), texte: X(
        TP.t('Le micro est introuvable. Vérifiez le branchement, le choix de l’appareil dans la liste et les réglages de confidentialité du système.'),
        TP.t('La caméra est introuvable. Vérifiez le branchement, le choix de l’appareil dans la liste et les réglages de confidentialité du système.'),
        TP.t('Le micro ou la caméra est introuvable. Vérifiez le branchement, le choix de l’appareil dans la liste et les réglages de confidentialité du système.')),
        lien: lienAbsent, lienTexte: TP.t('Que faire si l’appareil n’est pas détecté') };
    }
    if (nom === 'NotReadableError' || nom === 'TrackStartError' || nom === 'AbortError') {
      return { code: 'occupe', titre: TP.t('Appareil déjà utilisé ou bloqué'), texte: X(
        TP.t('Le micro est peut-être utilisé par une autre application (visio, enregistreur, autre onglet) ou bloqué par le système. Fermez les autres applications qui l’utilisent, puis réessayez.'),
        TP.t('La caméra est peut-être utilisée par une autre application (visio, enregistreur, autre onglet) ou bloquée par le système. Fermez les autres applications qui l’utilisent, puis réessayez.'),
        TP.t('Le micro ou la caméra est peut-être utilisé par une autre application (visio, enregistreur, autre onglet) ou bloqué par le système. Fermez les autres applications qui l’utilisent, puis réessayez.')),
        lien: lienAbsent, lienTexte: TP.t('Que faire si l’appareil est occupé') };
    }
    if (nom === 'NoApiError') {
      return { code: 'api', titre: TP.t('Navigateur non compatible'), texte: X(
        TP.t('Ce navigateur ou cette page ne permet pas d’accéder au micro (il faut une page sécurisée en https et un navigateur récent).'),
        TP.t('Ce navigateur ou cette page ne permet pas d’accéder à la caméra (il faut une page sécurisée en https et un navigateur récent).'),
        TP.t('Ce navigateur ou cette page ne permet pas d’accéder au micro ou à la caméra (il faut une page sécurisée en https et un navigateur récent).')),
        lien: lienAutoriser, lienTexte: TP.t('Aide') };
    }
    var v = { nom: nom ? ' (' + nom + ')' : '' };
    return { code: 'autre', titre: TP.t('Erreur inattendue'), texte: X(
      TP.t('Impossible d’ouvrir le micro{nom}. Rechargez la page, vérifiez l’appareil et réessayez.', v),
      TP.t('Impossible d’ouvrir la caméra{nom}. Rechargez la page, vérifiez l’appareil et réessayez.', v),
      TP.t('Impossible d’ouvrir le micro ou la caméra{nom}. Rechargez la page, vérifiez l’appareil et réessayez.', v)),
      lien: lienAbsent, lienTexte: TP.t('Aide') };
  };

  /* ---------- temps de réaction ---------- */
  // Attente avant le vert : entre mini et maxi ms ; alea = nombre dans [0, 1[.
  TP.attenteReaction = function (alea, mini, maxi) { return mini + alea * (maxi - mini); };

  return TP;
}));
