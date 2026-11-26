/* Morse, braille et codes secrets : logique pure (aucun accès à la page, aucun envoi).
   Navigateur : window.CO ; Node : module.exports (tests\test_logique.py). Sources : sources_2026-11-26.md.
   Toutes les entrées sont bornées (borne()) : aucune boucle ne dépend d'un nombre saisi sans plafond. */
(function (racine, fabrique) {
  'use strict';
  var CO = fabrique();
  if (typeof module === 'object' && module.exports) { module.exports = CO; } else { racine.CO = CO; }
}(this, function () {
  'use strict';

  var LIMITE = 100000;
  function borne(s, max) {
    s = String(s == null ? '' : s);
    max = Math.min(max || LIMITE, LIMITE);
    return s.length > max ? s.slice(0, max) : s;
  }
  function unique(liste) {
    var vus = {}, r = [];
    liste.forEach(function (x) { if (!vus[x]) { vus[x] = 1; r.push(x); } });
    return r;
  }
  var LIGATURES = { 'œ': 'oe', 'Œ': 'OE', 'æ': 'ae', 'Æ': 'AE', 'ß': 'ss' };
  function sansAccents(s) {
    return String(s).replace(/[œŒæÆß]/g, function (x) { return LIGATURES[x]; })
      .normalize('NFD').replace(/[̀-ͯ]/g, '').normalize('NFC');
  }
  function estLettre(c) { return c.toLowerCase() !== c.toUpperCase(); }
  function estMaj(c) { return estLettre(c) && c === c.toUpperCase() && c !== c.toLowerCase(); }

  // ------------------------------------------------------------------ MORSE (UIT-R M.1677-1, 2009)
  var MORSE = {
    a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', 'é': '..-..', f: '..-.', g: '--.', h: '....', i: '..', j: '.---',
    k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-',
    v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..',
    1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.', 0: '-----',
    '.': '.-.-.-', ',': '--..--', ':': '---...', '?': '..--..', "'": '.----.', '-': '-....-', '/': '-..-.',
    '(': '-.--.', ')': '-.--.-', '"': '.-..-.', '=': '-...-', '+': '.-.-.', '×': '-..-', '@': '.--.-.'
  };
  // Équivalents typographiques ramenés au signe de la norme.
  var EQUIV_MORSE = { '«': '"', '»': '"', '“': '"', '”': '"', '„': '"', '’': "'", '‘': "'", '´': "'", '–': '-', '—': '-', '−': '-', '‐': '-' };
  var SIGNAUX = { '...-.': '[compris]', '........': '[erreur]', '.-...': '[attendez]', '...-.-': '[fin de travail]', '-.-.-': '[début de transmission]' };
  var INVERSE_MORSE = {};
  Object.keys(MORSE).forEach(function (k) { if (!INVERSE_MORSE[MORSE[k]]) { INVERSE_MORSE[MORSE[k]] = k; } });
  Object.keys(SIGNAUX).forEach(function (k) { if (!INVERSE_MORSE[k]) { INVERSE_MORSE[k] = SIGNAUX[k]; } });

  function texteVersMorse(texte) {
    var t = borne(texte, 2000)
      .replace(/(\d)\s?%/g, '$1-0/0').replace(/(\d)\s?‰/g, '$1-0/00')   // UIT § 3.3 : 2 % -> 2-0/0
      .replace(/%/g, '0/0').replace(/‰/g, '0/00').replace(/…/g, '...');
    var mots = [], lettres = [], inconnus = [], sansAccent = [];
    Array.from(t).forEach(function (c) {
      if (/\s/.test(c)) {
        if (lettres.length) { mots.push(lettres.join(' ')); lettres = []; }
        return;
      }
      var bas = c.toLowerCase();
      if (MORSE[bas]) { lettres.push(MORSE[bas]); return; }
      if (EQUIV_MORSE[c]) { lettres.push(MORSE[EQUIV_MORSE[c]]); return; }
      var base = sansAccents(bas);
      if (base !== bas && /^[a-z]+$/.test(base)) {
        Array.from(base).forEach(function (x) { lettres.push(MORSE[x]); });
        sansAccent.push(c);
        return;
      }
      inconnus.push(c);
    });
    if (lettres.length) { mots.push(lettres.join(' ')); }
    return { morse: mots.join(' / '), inconnus: unique(inconnus), sansAccent: unique(sansAccent) };
  }

  function normaliserMorse(m) {
    return borne(m, 20000).replace(/[·•∙⋅]/g, '.').replace(/[−–—_‒]/g, '-');
  }
  function motsMorse(m) {
    return normaliserMorse(m).split(/\s*[\/|\r\n]+\s*|\s{3,}/).map(function (w) {
      return w.split(/\s+/).filter(function (x) { return x !== ''; });
    }).filter(function (w) { return w.length; });
  }

  function morseVersTexte(morse) {
    var inconnus = 0;
    var texte = motsMorse(morse).map(function (mot) {
      return mot.map(function (code) {
        var c = /^[.-]+$/.test(code) ? INVERSE_MORSE[code] : null;
        if (!c) { inconnus += 1; return '□'; }
        return c.charAt(0) === '[' ? c : c.toUpperCase();
      }).join('');
    }).join(' ');
    return { texte: texte, inconnus: inconnus };
  }

  // Minutage (UIT § 2) : point 1, trait 3, espace dans la lettre 1, entre lettres 3, entre mots 7 (en unités).
  function planMorse(morse, allonge) {
    var gL = allonge ? 6 : 3, gM = allonge ? 14 : 7;
    var sons = [], t = 0, ecart = -1;   // -1 : aucun son encore
    motsMorse(morse).forEach(function (mot) {
      mot.forEach(function (code) {
        if (!/^[.-]+$/.test(code)) { return; }
        Array.from(code).forEach(function (s, iSigne) {
          if (ecart >= 0) { t += iSigne > 0 ? 1 : ecart; }
          var d = s === '.' ? 1 : 3;
          sons.push([t, d]);
          t += d;
          ecart = gL;
        });
      });
      if (ecart >= 0) { ecart = gM; }
    });
    return { sons: sons, total: t };
  }
  // Durée d'un message suivi de l'espace de fin de mot (7 unités) : PARIS = 50 unités.
  function dureeUnites(morse) {
    var p = planMorse(morse, false);
    return p.sons.length ? p.total + 7 : 0;
  }
  function vitesseBornee(mpm) {
    var v = Math.round(Number(mpm));
    return isFinite(v) ? Math.min(40, Math.max(5, v)) : 15;
  }
  // Durée d'un point en millisecondes : mot étalon PARIS = 50 unités, donc 60 000 / (50 x mpm).
  function dureePoint(mpm) { return 1200 / vitesseBornee(mpm); }

  // ------------------------------------------------------------------ ALPHABET RADIO (DGAC, Radiotéléphonie, 2016)
  var OTAN = {
    a: 'Alfa', b: 'Bravo', c: 'Charlie', d: 'Delta', e: 'Echo', f: 'Foxtrot', g: 'Golf', h: 'Hotel', i: 'India',
    j: 'Juliett', k: 'Kilo', l: 'Lima', m: 'Mike', n: 'November', o: 'Oscar', p: 'Papa', q: 'Quebec', r: 'Romeo',
    s: 'Sierra', t: 'Tango', u: 'Uniform', v: 'Victor', w: 'Whiskey', x: 'X-ray', y: 'Yankee', z: 'Zulu'
  };
  var OTAN_PRON = {
    a: 'al fah', b: 'bra vo', c: 'tchah li ou char li', d: 'del tah', e: 'èk o', f: 'fox trott', g: 'golf', h: 'ho tèll',
    i: 'in di ah', j: 'djou li ètt', k: 'ki lo', l: 'li mah', m: 'maïk', n: 'no vèmm ber', o: 'oss kar', p: 'pah pah',
    q: 'ké bèk', r: 'ro mi o', s: 'si èr rah', t: 'tang go', u: 'you ni form ou ou ni form', v: 'vik tar', w: 'ouiss ki',
    x: 'èkss ré', y: 'yang ki', z: 'zou lou'
  };
  var CHIFFRES_FR = ['zéro', 'unité', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  var CHIFFRES_EN = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  var SIGNES_DITS = {
    '-': 'tiret', '.': 'point', ',': 'virgule', '@': 'arobase', "'": 'apostrophe', '’': 'apostrophe', '/': 'barre oblique',
    '_': 'tiret bas', '&': 'et commercial', '+': 'plus', '?': "point d'interrogation", '!': "point d'exclamation",
    ':': 'deux-points', '#': 'dièse', '*': 'étoile'
  };
  var ACCENTS = { '́': 'accent aigu', '̀': 'accent grave', '̂': 'accent circonflexe', '̈': 'tréma', '̧': 'cédille', '̃': 'tilde' };

  // Renvoie une liste [caractère, mot à dire, genre, précision].
  function epeler(texte, chiffresAnglais) {
    var r = [];
    Array.from(borne(texte, 300)).forEach(function (c) {
      var bas = c.toLowerCase();
      if (/\s/.test(c)) { if (r.length && r[r.length - 1][2] !== 'espace') { r.push([' ', '(espace)', 'espace', '']); } return; }
      if (OTAN[bas]) { r.push([c, OTAN[bas], 'lettre', '']); return; }
      if (/^[0-9]$/.test(c)) { r.push([c, (chiffresAnglais ? CHIFFRES_EN : CHIFFRES_FR)[+c], 'chiffre', '']); return; }
      if (LIGATURES[c]) {
        Array.from(LIGATURES[c].toLowerCase()).forEach(function (x, i) { r.push([i ? '' : c, OTAN[x], 'lettre', i ? '' : 'lettres liées']); });
        return;
      }
      var d = bas.normalize('NFD');
      if (d.length === 2 && OTAN[d.charAt(0)] && ACCENTS[d.charAt(1)]) { r.push([c, OTAN[d.charAt(0)], 'lettre', ACCENTS[d.charAt(1)]]); return; }
      if (SIGNES_DITS[c]) { r.push([c, SIGNES_DITS[c], 'signe', '']); return; }
      r.push([c, c, 'autre', '']);
    });
    while (r.length && r[r.length - 1][2] === 'espace') { r.pop(); }
    return r;
  }

  // ------------------------------------------------------------------ BRAILLE (Code braille français uniformisé, 2e éd. 2008)
  function cel(points) {
    var n = 0;
    String(points).split('').forEach(function (p) { n |= 1 << (Number(p) - 1); });
    return String.fromCharCode(0x2800 + n);
  }
  function cels(liste) { return liste.split(',').map(cel).join(''); }
  function pointsDe(c) {
    var n = c.charCodeAt(0) - 0x2800, p = '';
    for (var i = 0; i < 8; i++) { if (n & (1 << i)) { p += String(i + 1); } }
    return p;
  }
  var LETTRES_BR = {
    a: '1', b: '12', c: '14', d: '145', e: '15', f: '124', g: '1245', h: '125', i: '24', j: '245', k: '13', l: '123',
    m: '134', n: '1345', o: '135', p: '1234', q: '12345', r: '1235', s: '234', t: '2345', u: '136', v: '1236',
    w: '2456', x: '1346', y: '13456', z: '1356',
    'ç': '12346', 'é': '123456', 'à': '12356', 'è': '2346', 'ù': '23456', 'â': '16', 'ê': '126', 'î': '146',
    'ô': '1456', 'û': '156', 'ë': '1246', 'ï': '12456', 'ü': '1256', 'œ': '246'
  };
  var PONCT_BR = {
    ',': '2', ';': '23', ':': '25', '.': '256', '?': '26', '!': '235', '"': '2356', '«': '2356', '»': '2356', '“': '2356',
    '”': '2356', '‘': '2356', '(': '236', ')': '356', "'": '3', '’': '3', '/': '34', '@': '345', '-': '36'
  };
  var CHIFFRES_BR = { 1: '16', 2: '126', 3: '146', 4: '1456', 5: '156', 6: '1246', 7: '12456', 8: '1256', 9: '246', 0: '3456' };
  var MATH_BR = { '+': '235', '−': '36', '×': '35', '÷': '25', '=': '2356' };
  var SUITES_BR = {
    '…': '256,256,256', '–': '36,36', '—': '36,36', '€': '45,15', '¢': '45,14', '£': '45,123', '$': '45,234', '¥': '45,13456',
    '≤': '45,126', '≥': '45,345', '[': '45,236', ']': '356,12', '©': '5,14', '°': '5,135', '§': '5,1234', '®': '5,1235',
    '™': '5,2345', '&': '5,123456', '<': '5,126', '>': '5,345', '~': '5,26', '*': '5,35', '\\': '5,34', '#': '5,3456',
    '%': '5,346', '‰': '5,346,346', '_': '5,36', '{': '6,6,236', '}': '356,3,3', '→': '25,25,135', '←': '246,25,25', '↔': '246,25,135'
  };
  var MAJ = cel('46'), NUM = cel('6'), BASE = cel('56'), MISE = cel('456'), SEP_MILLIERS = cel('3'), PASSAGE = cels('35,46');
  var B = {}, BINV = {}, CHINV = {}, MATHINV = {}, SUITEINV = {};
  Object.keys(LETTRES_BR).forEach(function (k) { B[k] = cel(LETTRES_BR[k]); BINV[B[k]] = k; });
  var PB = {};
  Object.keys(PONCT_BR).forEach(function (k) { PB[k] = cel(PONCT_BR[k]); });
  var PINV = { };
  [',', ';', ':', '.', '?', '!', '"', '(', ')', "'", '/', '@', '-'].forEach(function (k) { PINV[PB[k]] = k; });
  var CB = {};
  Object.keys(CHIFFRES_BR).forEach(function (k) { CB[k] = cel(CHIFFRES_BR[k]); CHINV[CB[k]] = k; });
  var MB = {};
  Object.keys(MATH_BR).forEach(function (k) { MB[k] = cel(MATH_BR[k]); });
  ['+', '×', '÷', '='].forEach(function (k) { MATHINV[MB[k]] = k; });
  MATHINV[cel('36')] = '-';
  var SB = {};
  Object.keys(SUITES_BR).forEach(function (k) { SB[k] = cels(SUITES_BR[k]); if (!SUITEINV[SB[k]]) { SUITEINV[SB[k]] = k; } });
  // En mode chiffres, ces signes se liraient comme des chiffres ou des signes de calcul : on revient d'abord à la valeur de base.
  var CONFLITS_NUM = { 'â': 1, 'ê': 1, 'î': 1, 'ô': 1, 'û': 1, 'ë': 1, 'ï': 1, 'ü': 1, 'œ': 1, '!': 1, ':': 1, '"': 1, '«': 1, '»': 1, '“': 1, '”': 1, '‘': 1, "'": 1, '’': 1 };
  var ESPACES_FINES = '[ \\u00a0\\u202f\\u2009]';

  function motVersBraille(mot, inconnus) {
    var cars = Array.from(mot), sortie = '', num = false;
    var lettres = [];
    cars.forEach(function (c, i) { if (estLettre(c)) { lettres.push(i); } });
    var k = lettres.length - 1, n = 0;
    while (k >= 0 && estMaj(cars[lettres[k]])) { k -= 1; n += 1; }
    var debutGroupe = n >= 2 ? lettres[k + 1] : -1;
    cars.forEach(function (c, i) {
      var bas = c.toLowerCase();
      if (/^[0-9]$/.test(c)) {
        if (!num) { sortie += NUM; num = true; }
        sortie += CB[c];
        return;
      }
      if (c === '\u0001') { sortie += SEP_MILLIERS; return; }
      if (MB[c]) {
        if (!num) { sortie += NUM; num = true; }
        sortie += MB[c];
        return;
      }
      if (num && CONFLITS_NUM[bas]) { sortie += BASE; num = false; }
      if (B[bas]) {
        if (i === debutGroupe) { sortie += MAJ + MAJ; } else if (estMaj(c) && (debutGroupe < 0 || i < debutGroupe)) { sortie += MAJ; }
        sortie += B[bas];
        return;
      }
      if (PB[c]) { sortie += PB[c]; return; }
      if (SB[c]) { sortie += SB[c]; return; }
      inconnus.push(c);
      sortie += c;
    });
    return sortie;
  }

  function texteVersBraille(texte) {
    var t = borne(texte, 5000).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
      .replace(new RegExp(ESPACES_FINES + '+(?=[,;:.?!…»)\\]”])', 'g'), '')        // CBFU 1.5 : ponctuation collée au mot
      .replace(new RegExp('([«(\\[“])' + ESPACES_FINES + '+', 'g'), '$1')
      .replace(/(\d)[   ](?=\d{3}(?!\d))/g, '$1\u0001')              // espace entre groupes de chiffres : point 3
      .replace(/\.\.\./g, '…');
    var inconnus = [];
    var braille = t.split(/(\s+)/).map(function (bout) {
      return /^\s*$/.test(bout) ? bout : motVersBraille(bout, inconnus);
    }).join('');
    return { braille: braille, inconnus: unique(inconnus) };
  }

  function estBraille(c) { var n = c.charCodeAt(0); return n >= 0x2800 && n <= 0x28ff; }

  function brailleVersTexte(braille) {
    var t = borne(braille, 20000).replace(/⠀/g, ' ');
    var guillemet = false, passage = false, inconnus = 0;
    var texte = t.split(/(\s+)/).map(function (mot) {
      if (/^\s*$/.test(mot)) { return mot; }
      var c = Array.from(mot), s = '', num = false, capMot = passage, capSuiv = false, finPassage = false, i = 0;
      if (c.slice(0, 2).join('') === PASSAGE) { passage = true; capMot = true; i = 2; } else if (passage && c[0] === MAJ && c[1] !== MAJ) { finPassage = true; capMot = true; i = 1; }
      while (i < c.length) {
        var x = c[i];
        var trois = c.slice(i, i + 3).join(''), deux = c.slice(i, i + 2).join('');
        if (SUITEINV[trois]) { s += SUITEINV[trois]; i += 3; continue; }
        if (SUITEINV[deux]) { s += SUITEINV[deux]; i += 2; continue; }
        i += 1;
        if (!estBraille(x)) { s += x; continue; }
        if (x === MAJ) { if (c[i] === MAJ) { capMot = true; i += 1; } else { capSuiv = true; } continue; }
        if (x === NUM) { num = true; continue; }
        if (x === BASE) { num = false; continue; }
        if (x === MISE) { continue; }
        if (num) {
          if (CHINV[x]) { s += CHINV[x]; continue; }
          if (MATHINV[x]) { s += MATHINV[x]; continue; }
          if (x === SEP_MILLIERS) { s += ' '; continue; }
        }
        if (BINV[x]) {
          var l = BINV[x];
          s += (capMot || capSuiv) ? l.toUpperCase() : l;
          capSuiv = false;
          continue;
        }
        if (PINV[x]) {
          var p = PINV[x];
          if (p === '"') { s += guillemet ? ' »' : '« '; guillemet = !guillemet; } else if ('!?;:'.indexOf(p) >= 0) { s += ' ' + p; } else { s += p; }
          continue;
        }
        inconnus += 1;
        s += '□';
      }
      if (finPassage) { passage = false; }
      return s;
    }).join('');
    return { texte: texte, inconnus: inconnus };
  }

  // Sens possibles d'une cellule (pour la cellule cliquable de l'alphabet braille).
  var PREFIXES_BR = {
    46: 'signe de majuscule', 6: 'signe des chiffres et du calcul (notation Antoine)', 56: 'retour à la valeur de base',
    456: 'mise en évidence', 4: 'exposant', 45: 'début de certains symboles (€, $, [, ≤…)', 5: 'début de certains symboles (°, %, &, #…)',
    3456: 'signe numérique de Louis Braille'
  };
  function sensCellule(points) {
    var p = String(points).split('').filter(function (x) { return /[1-6]/.test(x); }).sort();
    p = unique(p).join('');
    if (!p) { return []; }
    var c = cel(p), r = [];
    Object.keys(LETTRES_BR).forEach(function (k) { if (B[k] === c) { r.push(['lettre', k]); } });
    Object.keys(CHIFFRES_BR).forEach(function (k) { if (CB[k] === c) { r.push(['chiffre', k]); } });
    Object.keys(PONCT_BR).forEach(function (k) { if (PB[k] === c && "«»“”‘’".indexOf(k) < 0) { r.push(['signe', k === '"' ? '« »' : k]); } });
    Object.keys(MATH_BR).forEach(function (k) { if (MB[k] === c && k !== '−') { r.push(['calcul', k]); } });
    if (PREFIXES_BR[p]) { r.push(['prefixe', PREFIXES_BR[p]]); }
    return r;
  }

  // ------------------------------------------------------------------ CODES SECRETS (jeux : ils ne protègent rien)
  function decalerLettre(c, d) {
    var n = c.charCodeAt(0);
    if (n >= 65 && n <= 90) { return String.fromCharCode((n - 65 + d) % 26 + 65); }
    if (n >= 97 && n <= 122) { return String.fromCharCode((n - 97 + d) % 26 + 97); }
    return c;
  }
  function decalageBorne(d) {
    var n = Math.trunc(Number(d));
    if (!isFinite(n)) { n = 0; }
    return ((n % 26) + 26) % 26;
  }
  function preparer(texte, retirer, max) {
    var t = borne(texte, max || 20000);
    return retirer ? sansAccents(t) : t;
  }
  function cesar(texte, decalage, retirerAccents) {
    var d = decalageBorne(decalage);
    return Array.from(preparer(texte, retirerAccents)).map(function (c) { return decalerLettre(c, d); }).join('');
  }
  function rot13(texte) { return cesar(texte, 13, false); }
  function atbash(texte, retirerAccents) {
    return Array.from(preparer(texte, retirerAccents)).map(function (c) {
      var n = c.charCodeAt(0);
      if (n >= 65 && n <= 90) { return String.fromCharCode(90 - (n - 65)); }
      if (n >= 97 && n <= 122) { return String.fromCharCode(122 - (n - 97)); }
      return c;
    }).join('');
  }
  function cleVigenere(cle) {
    return sansAccents(borne(cle, 200)).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 50);
  }
  function vigenere(texte, cle, dechiffrer, retirerAccents) {
    var k = cleVigenere(cle);
    var t = preparer(texte, retirerAccents);
    if (!k) { return t; }
    var j = 0;
    return Array.from(t).map(function (c) {
      if (!/^[A-Za-z]$/.test(c)) { return c; }
      var d = k.charCodeAt(j % k.length) - 65;
      j += 1;
      return decalerLettre(c, dechiffrer ? (26 - d) % 26 : d);
    }).join('');
  }
  var MOTS_COURANTS = ('le la les de des du un une et est en au aux ce ces cet cette il elle ils elles je tu nous vous on que qui ' +
    'pas ne pour par dans sur avec sans mais ou donc car se sa son ses mon ma mes ton ta tes leur plus tout tous très bien ' +
    'oui non bonjour merci salut message secret code mot rendez vous ici demain soir midi porte clé cle trésor tresor sont ' +
    'avoir être etre fait faire va vais suis es sommes êtes etes ont été ete comme quand alors aussi encore jamais toujours').split(' ');
  var MOTS_SET = {};
  MOTS_COURANTS.forEach(function (m) { MOTS_SET[m] = 1; });
  function scoreFrancais(texte) {
    var mots = sansAccents(borne(texte, 20000)).toLowerCase().split(/[^a-z]+/);
    var s = 0;
    mots.forEach(function (m) { if (m && (MOTS_SET[m] || MOTS_SET[sansAccents(m)])) { s += 1; } });
    return s;
  }
  // Les 25 décalages possibles : [décalage d'origine, texte remis à l'endroit, score en mots français courants].
  function essaisCesar(texte) {
    var r = [];
    for (var d = 1; d <= 25; d++) {
      var essai = cesar(texte, 26 - d, false);
      r.push([d, essai, scoreFrancais(essai)]);
    }
    return r;
  }
  function meilleurEssai(texte) {
    var e = essaisCesar(texte), m = null;
    e.forEach(function (x) { if (x[2] > 0 && (!m || x[2] > m[2])) { m = x; } });
    return m;
  }
  // Alphabet en chiffres (A = 1 … Z = 26).
  function lettresVersNombres(texte) {
    return sansAccents(borne(texte, 5000)).split(/\s+/).filter(function (m) { return m; }).map(function (mot) {
      return Array.from(mot).filter(function (c) { return /[A-Za-z]/.test(c); })
        .map(function (c) { return c.toUpperCase().charCodeAt(0) - 64; }).join('-');
    }).filter(function (m) { return m; }).join(' / ');
  }
  function nombresVersLettres(texte) {
    var mauvais = 0;
    var t = borne(texte, 20000).split(/\s*[\/|\r\n]+\s*|\s{2,}/).map(function (mot) {
      return mot.split(/[^0-9]+/).filter(function (x) { return x !== ''; }).map(function (x) {
        var n = x.length > 3 ? 0 : Number(x);
        if (n >= 1 && n <= 26) { return String.fromCharCode(64 + n); }
        mauvais += 1;
        return '□';
      }).join('');
    }).filter(function (m) { return m; }).join(' ');
    return { texte: t, inconnus: mauvais };
  }

  // ------------------------------------------------------------------ OCTETS : UTF-8 (RFC 3629), binaire, hexadécimal, Base64 (RFC 4648)
  function utf8(texte) {
    var o = [];
    Array.from(borne(texte, 50000)).forEach(function (c) {
      var n = c.codePointAt(0);
      if (n >= 0xd800 && n <= 0xdfff) { n = 0xfffd; }
      if (n < 0x80) { o.push(n); } else if (n < 0x800) { o.push(0xc0 | n >> 6, 0x80 | n & 63); } else if (n < 0x10000) {
        o.push(0xe0 | n >> 12, 0x80 | n >> 6 & 63, 0x80 | n & 63);
      } else { o.push(0xf0 | n >> 18, 0x80 | n >> 12 & 63, 0x80 | n >> 6 & 63, 0x80 | n & 63); }
    });
    return o;
  }
  // Décode une suite d'octets UTF-8 ; erreur = rang (à partir de 1) du premier octet invalide, sinon 0.
  function deUtf8(o) {
    var s = '', i = 0;
    while (i < o.length) {
      var b = o[i], n, k;
      if (b < 0x80) { n = b; k = 0; } else if (b >= 0xc2 && b <= 0xdf) { n = b & 31; k = 1; } else if (b >= 0xe0 && b <= 0xef) { n = b & 15; k = 2; } else if (b >= 0xf0 && b <= 0xf4) { n = b & 7; k = 3; } else { return { texte: s, erreur: i + 1 }; }
      if (i + k >= o.length) { return { texte: s, erreur: i + 1 }; }
      for (var j = 1; j <= k; j++) {
        if ((o[i + j] & 0xc0) !== 0x80) { return { texte: s, erreur: i + 1 }; }
        n = n << 6 | o[i + j] & 63;
      }
      if ((k === 2 && (n < 0x800 || (n >= 0xd800 && n <= 0xdfff))) || (k === 3 && (n < 0x10000 || n > 0x10ffff))) { return { texte: s, erreur: i + 1 }; }
      s += String.fromCodePoint(n);
      i += k + 1;
    }
    return { texte: s, erreur: 0 };
  }
  function pad(s, n) { while (s.length < n) { s = '0' + s; } return s; }
  function texteVersBinaire(texte, sep) {
    return utf8(texte).map(function (b) { return pad(b.toString(2), 8); }).join(sep == null ? ' ' : sep);
  }
  function groupes(s, chiffres, taille) {
    // Renvoie la liste des octets lus, ou un message d'erreur.
    var propre = s.replace(/0x/gi, ' ').replace(/[,;:\-_]/g, ' ').trim();
    if (!propre) { return []; }
    if (!new RegExp('^[' + chiffres + '\\s]+$', 'i').test(propre)) { return 'caractere'; }
    var parts = propre.split(/\s+/);
    if (parts.length === 1 && parts[0].length > taille) {
      if (parts[0].length % taille) { return 'longueur'; }
      var p = [], i;
      for (i = 0; i < parts[0].length; i += taille) { p.push(parts[0].slice(i, i + taille)); }
      parts = p;
    }
    var o = [];
    for (var j = 0; j < parts.length; j++) {
      if (parts[j].length > taille) {
        if (parts[j].length % taille) { return 'longueur'; }
        for (var q = 0; q < parts[j].length; q += taille) { o.push(parseInt(parts[j].slice(q, q + taille), taille === 8 ? 2 : 16)); }
      } else { o.push(parseInt(parts[j], taille === 8 ? 2 : 16)); }
    }
    return o;
  }
  function octetsVersTexte(o) {
    if (typeof o === 'string') { return { texte: '', erreur: o, octets: 0 }; }
    var d = deUtf8(o);
    return { texte: d.texte, erreur: d.erreur ? 'utf8' : '', rang: d.erreur, octets: o.length };
  }
  function binaireVersTexte(s) { return octetsVersTexte(groupes(borne(s, 100000), '01', 8)); }
  function texteVersHex(texte, sep, majuscules) {
    var h = utf8(texte).map(function (b) { return pad(b.toString(16), 2); }).join(sep == null ? ' ' : sep);
    return majuscules ? h.toUpperCase() : h;
  }
  function hexVersTexte(s) { return octetsVersTexte(groupes(borne(s, 100000), '0-9a-f', 2)); }

  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  function base64Encoder(texte, versionUrl) {
    var o = utf8(texte), s = '', i;
    for (i = 0; i < o.length; i += 3) {
      var n = o[i] << 16 | (o[i + 1] || 0) << 8 | (o[i + 2] || 0);
      s += B64[n >> 18 & 63] + B64[n >> 12 & 63] + (i + 1 < o.length ? B64[n >> 6 & 63] : '=') + (i + 2 < o.length ? B64[n & 63] : '=');
    }
    return versionUrl ? s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') : s;
  }
  function base64Decoder(entree) {
    var s = borne(entree, 100000).replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!s) { return { texte: '', erreur: '', octets: 0 }; }
    if (!/^[A-Za-z0-9+\/]*={0,2}$/.test(s)) { return { texte: '', erreur: 'caractere', octets: 0 }; }
    s = s.replace(/=+$/, '');
    if (s.length % 4 === 1) { return { texte: '', erreur: 'longueur', octets: 0 }; }
    var o = [], acc = 0, bits = 0;
    for (var i = 0; i < s.length; i++) {
      acc = (acc << 6 | B64.indexOf(s[i])) & 0xffffff;
      bits += 6;
      if (bits >= 8) { bits -= 8; o.push(acc >> bits & 255); }
    }
    return octetsVersTexte(o);
  }

  // ------------------------------------------------------------------ ASCII (RFC 20) : noms des caractères de commande
  var CONTROLE = [
    ['NUL', 'caractère nul'], ['SOH', "début d'en-tête"], ['STX', 'début de texte'], ['ETX', 'fin de texte'], ['EOT', 'fin de transmission'],
    ['ENQ', 'demande'], ['ACK', 'accusé de réception'], ['BEL', 'sonnerie'], ['BS', 'retour arrière'], ['HT', 'tabulation horizontale'],
    ['LF', 'saut de ligne'], ['VT', 'tabulation verticale'], ['FF', 'saut de page'], ['CR', 'retour chariot'], ['SO', 'hors code'],
    ['SI', 'en code'], ['DLE', 'échappement de transmission'], ['DC1', "commande d'appareil 1"], ['DC2', "commande d'appareil 2"],
    ['DC3', "commande d'appareil 3"], ['DC4', "commande d'appareil 4"], ['NAK', 'accusé de réception négatif'], ['SYN', 'synchronisation'],
    ['ETB', 'fin de bloc de transmission'], ['CAN', 'annulation'], ['EM', 'fin de support'], ['SUB', 'substitution'], ['ESC', 'échappement'],
    ['FS', 'séparateur de fichiers'], ['GS', 'séparateur de groupes'], ['RS', "séparateur d'enregistrements"], ['US', "séparateur d'unités"]
  ];
  function ligneAscii(n) {
    n = Math.trunc(Number(n));
    if (!(n >= 0 && n <= 127)) { return null; }
    var nom = n < 32 ? CONTROLE[n] : n === 127 ? ['DEL', 'suppression'] : n === 32 ? ['SP', 'espace'] : [String.fromCharCode(n), ''];
    return { dec: n, hex: pad(n.toString(16).toUpperCase(), 2), oct: pad(n.toString(8), 3), bin: pad(n.toString(2), 7), car: nom[0], nom: nom[1] };
  }
  function infoCaractere(c) {
    var x = Array.from(String(c || ''))[0];
    if (!x) { return null; }
    var n = x.codePointAt(0);
    return { car: x, point: 'U+' + pad(n.toString(16).toUpperCase(), 4), dec: n, ascii: n < 128, octets: texteVersHex(x, ' ', true) };
  }

  return {
    LIMITE: LIMITE, MORSE: MORSE, SIGNAUX: SIGNAUX, OTAN: OTAN, OTAN_PRON: OTAN_PRON, CHIFFRES_FR: CHIFFRES_FR, CHIFFRES_EN: CHIFFRES_EN,
    LETTRES_BR: LETTRES_BR, PONCT_BR: PONCT_BR, CHIFFRES_BR: CHIFFRES_BR, MATH_BR: MATH_BR, SUITES_BR: SUITES_BR, CONTROLE: CONTROLE,
    sansAccents: sansAccents, texteVersMorse: texteVersMorse, morseVersTexte: morseVersTexte, planMorse: planMorse,
    dureeUnites: dureeUnites, vitesseBornee: vitesseBornee, dureePoint: dureePoint, epeler: epeler,
    cel: cel, cels: cels, pointsDe: pointsDe, texteVersBraille: texteVersBraille, brailleVersTexte: brailleVersTexte, sensCellule: sensCellule,
    cesar: cesar, rot13: rot13, atbash: atbash, cleVigenere: cleVigenere, vigenere: vigenere, scoreFrancais: scoreFrancais,
    essaisCesar: essaisCesar, meilleurEssai: meilleurEssai, lettresVersNombres: lettresVersNombres, nombresVersLettres: nombresVersLettres,
    utf8: utf8, deUtf8: deUtf8, texteVersBinaire: texteVersBinaire, binaireVersTexte: binaireVersTexte, texteVersHex: texteVersHex,
    hexVersTexte: hexVersTexte, base64Encoder: base64Encoder, base64Decoder: base64Decoder, ligneAscii: ligneAscii, infoCaractere: infoCaractere
  };
}));
