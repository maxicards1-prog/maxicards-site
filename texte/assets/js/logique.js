/* Caractères spéciaux et texte : logique pure (aucun accès à la page), testée sous Node (tests\test_logique.py).
   Rien n'est envoyé ni gardé : ces fonctions transforment un texte et rendent un résultat.
   Le hasard vient TOUJOURS de l'extérieur (fonction rnd(n) fabriquée avec crypto.getRandomValues), jamais de Math.random. */
(function (racine) {
  'use strict';
  var MAX_TEXTE = 200000;   // au-delà, le texte est coupé (garde-fou : l'onglet ne doit jamais se figer)

  function borne(v, min, max, defaut) {
    v = Number(v);
    if (!isFinite(v)) { return defaut; }
    return Math.max(min, Math.min(max, Math.round(v)));
  }
  function couper(t) { t = String(t == null ? '' : t); return t.length > MAX_TEXTE ? t.slice(0, MAX_TEXTE) : t; }
  function sansMarques(t) { return t.normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  // ------------------------------------------------------------------ hasard sûr
  // Fabrique rnd(n) -> entier uniforme dans [0, n) à partir de getRandomValues (rejet : aucun biais de modulo).
  function fabriqueHasard(getRandomValues) {
    var tampon = new Uint32Array(1);
    return function (n) {
      n = Math.floor(n);
      if (!(n >= 1 && n <= 4294967296)) { throw new Error('n hors bornes'); }
      if (n === 1) { return 0; }
      var limite = Math.floor(4294967296 / n) * n;
      for (var essai = 0; essai < 1000; essai++) {
        getRandomValues(tampon);
        if (tampon[0] < limite) { return tampon[0] % n; }
      }
      throw new Error('hasard indisponible');
    };
  }
  function melanger(tab, rnd) {           // Fisher-Yates
    for (var i = tab.length - 1; i > 0; i--) {
      var j = rnd(i + 1), x = tab[i];
      tab[i] = tab[j]; tab[j] = x;
    }
    return tab;
  }

  // ------------------------------------------------------------------ majuscules et minuscules
  // Début de phrase : au début du texte, après un retour à la ligne, ou après . ! ? … suivi d'au moins un blanc ;
  // les blancs, guillemets et parenthèses ouvrants sont sautés. Parcours linéaire, caractère par caractère : une
  // expression régulière à blancs imbriqués pouvait figer l'onglet sur un long texte collé (relecture du 26/11/2026).
  var FIN_PHRASE = '.!?…', OUVRANTS = '«"“([';
  function majusculesDePhrase(t) {
    var car = Array.from(t), etat = 2;   // 0 : dans la phrase ; 1 : juste après . ! ? … ; 2 : début de phrase
    for (var i = 0; i < car.length; i++) {
      var c = car[i];
      if (c === '\n') { etat = 2; continue; }
      if (FIN_PHRASE.indexOf(c) >= 0) { etat = 1; continue; }
      if (/\s/.test(c)) { if (etat === 1) { etat = 2; } continue; }
      if (etat === 2) {
        if (OUVRANTS.indexOf(c) >= 0) { continue; }
        if (/\p{L}/u.test(c)) { car[i] = c.toLocaleUpperCase('fr-FR'); }
      }
      etat = 0;
    }
    return car.join('');
  }
  function casse(texte, mode) {
    var t = couper(texte);
    switch (mode) {
      case 'majuscules': return t.toLocaleUpperCase('fr-FR');
      case 'minuscules': return t.toLocaleLowerCase('fr-FR');
      case 'phrase':
        return majusculesDePhrase(t.toLocaleLowerCase('fr-FR'));
      case 'titre':
        return t.toLocaleLowerCase('fr-FR').replace(/(^|[\s\-–—«"“(\[\/])(\p{L})/gu, function (m, a, c) { return a + c.toLocaleUpperCase('fr-FR'); });
      case 'sansAccents':
        return sansMarques(t).replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE').replace(/ß/g, 'ss');
      case 'inverse':
        return Array.from(t).map(function (c) {
          var b = c.toLocaleLowerCase('fr-FR');
          return c === b ? c.toLocaleUpperCase('fr-FR') : b;
        }).join('');
      case 'alterne':
        var n = 0;
        return Array.from(t.toLocaleLowerCase('fr-FR')).map(function (c) {
          if (!/\p{L}/u.test(c)) { return c; }
          return (n++ % 2) ? c.toLocaleUpperCase('fr-FR') : c;
        }).join('');
      default: return t;
    }
  }

  // ------------------------------------------------------------------ compteur
  function graphemes(t) {
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      var n = 0, it = new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(t)[Symbol.iterator]();
      while (!it.next().done) { n++; }
      return n;
    }
    return Array.from(t).length;
  }
  function compter(texte, motsParMinute, motsParMinuteOral) {
    var t = couper(texte);
    var jetons = t.split(/\s+/).filter(function (x) { return /[\p{L}\p{N}]/u.test(x); });
    var mots = jetons.length;
    var car = graphemes(t);
    var espaces = (t.match(/\s/g) || []).length;
    var phrases = t.split(/[.!?…]+(?=[\s»"”)]|$)/).filter(function (x) { return /[\p{L}\p{N}]/u.test(x); }).length;
    var paragraphes = t.split(/\n/).filter(function (x) { return /[\p{L}\p{N}]/u.test(x); }).length;
    var vl = borne(motsParMinute, 50, 1000, 214), vo = borne(motsParMinuteOral, 50, 400, 180);   // Brysbaert 2019, français
    return {
      mots: mots, caracteres: car, sansEspaces: car - espaces, phrases: phrases, paragraphes: paragraphes,
      lectureSec: Math.round(mots / vl * 60), paroleSec: Math.round(mots / vo * 60),
      motsMoyensParPhrase: phrases ? mots / phrases : 0
    };
  }
  // 75 s -> « 1 min 15 s » ; 0 -> « 0 s »
  function duree(sec) {
    sec = Math.max(0, Math.round(sec));
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (h) { return h + ' h ' + (m < 10 ? '0' : '') + m + ' min'; }
    if (m) { return m + ' min' + (s ? ' ' + s + ' s' : ''); }
    return s + ' s';
  }
  // SMS : 160 caractères en alphabet GSM 7 bits, 70 dès qu'un caractère hors de cet alphabet apparaît (153 / 67 par morceau au-delà).
  var GSM = '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';
  var GSM_EXT = '^{}\\[~]|€';
  function sms(texte) {
    var t = couper(texte), unites = 0, gsm = true, cps = Array.from(t);
    for (var i = 0; i < cps.length; i++) {
      if (GSM.indexOf(cps[i]) >= 0) { unites += 1; } else if (GSM_EXT.indexOf(cps[i]) >= 0) { unites += 2; } else { gsm = false; break; }
    }
    if (!gsm) {
      unites = 0;
      for (var k = 0; k < t.length; k++) { unites += 1; }   // UCS-2 : une unité par unité de code UTF-16
    }
    var seul = gsm ? 160 : 70, morceau = gsm ? 153 : 67;
    var parties = unites === 0 ? 0 : (unites <= seul ? 1 : Math.ceil(unites / morceau));
    return { gsm: gsm, unites: unites, parties: parties, limite: seul };
  }

  // Poids d'un texte sur X (calcul approché, d'après docs.x.com « Counting characters ») : 1 pour les caractères des plages
  // latines et de ponctuation courantes, 2 pour les autres (emojis, lettres stylées, idéogrammes). Les liens ne sont pas traités.
  var PLAGES_X = [[0, 4351], [8192, 8205], [8208, 8223], [8242, 8247]];
  function poidsX(texte) {
    var t = couper(texte), n = 0, liste;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      liste = [];
      var it = new Intl.Segmenter('fr', { granularity: 'grapheme' }).segment(t)[Symbol.iterator](), x;
      while (!(x = it.next()).done) { liste.push(x.value.segment); }
    } else {
      liste = Array.from(t);
    }
    for (var i = 0; i < liste.length; i++) {
      var cp = liste[i].codePointAt(0), un = false;
      for (var k = 0; k < PLAGES_X.length; k++) { if (cp >= PLAGES_X[k][0] && cp <= PLAGES_X[k][1]) { un = true; break; } }
      n += un ? 1 : 2;
    }
    return n;
  }

  // ------------------------------------------------------------------ chiffres romains
  var ROM = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  function versRomain(n) {
    n = Number(n);
    if (!(Math.floor(n) === n && n >= 1 && n <= 3999)) { return ''; }
    var r = '';
    for (var i = 0; i < ROM.length; i++) { while (n >= ROM[i][0]) { r += ROM[i][1]; n -= ROM[i][0]; } }
    return r;
  }
  // Décomposition : 2026 -> [["MM", 2000], ["XX", 20], ["VI", 6]]
  function decomposer(n) {
    if (!versRomain(n)) { return []; }
    var parts = [], p = 1000;
    while (p >= 1) {
      var v = Math.floor(n / p) % 10 * p;
      if (v) { parts.push([versRomain(v), v]); }
      p /= 10;
    }
    return parts;
  }
  var VAL = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  // Lit un nombre romain ; NaN s'il est mal écrit (seule l'écriture classique, de I à MMMCMXCIX, est acceptée).
  function depuisRomain(s) {
    s = String(s == null ? '' : s).trim().toUpperCase();
    if (!/^[IVXLCDM]{1,15}$/.test(s)) { return NaN; }
    var total = 0;
    for (var i = 0; i < s.length; i++) {
      var v = VAL[s[i]], suivant = i + 1 < s.length ? VAL[s[i + 1]] : 0;
      total += v < suivant ? -v : v;
    }
    return versRomain(total) === s ? total : NaN;
  }
  // Explique pourquoi une écriture est refusée et propose la bonne.
  function diagnosticRomain(s) {
    var t = String(s == null ? '' : s).trim().toUpperCase();
    if (!t) { return { ok: false, raison: 'vide' }; }
    if (!/^[IVXLCDM]+$/.test(t)) { return { ok: false, raison: 'lettres' }; }
    if (t.length > 15) { return { ok: false, raison: 'long' }; }
    var n = depuisRomain(t);
    if (isFinite(n)) { return { ok: true, valeur: n }; }
    var total = 0;
    for (var i = 0; i < t.length; i++) {
      var v = VAL[t[i]], suivant = i + 1 < t.length ? VAL[t[i + 1]] : 0;
      total += v < suivant ? -v : v;
    }
    return { ok: false, raison: 'forme', lecture: total, correct: versRomain(total) };
  }

  // ------------------------------------------------------------------ écriture stylée (lettres Unicode)
  function bloc(maj, min, chiffres, exceptions) { return { A: maj, a: min, d: chiffres || 0, x: exceptions || {} }; }
  var STYLES = {
    gras: bloc(0x1D400, 0x1D41A, 0x1D7CE),
    italique: bloc(0x1D434, 0x1D44E, 0, { h: 'ℎ' }),
    grasItalique: bloc(0x1D468, 0x1D482),
    cursive: bloc(0x1D49C, 0x1D4B6, 0, { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' }),
    cursiveGrasse: bloc(0x1D4D0, 0x1D4EA),
    gothique: bloc(0x1D504, 0x1D51E, 0, { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' }),
    gothiqueGras: bloc(0x1D56C, 0x1D586),
    doubleBarre: bloc(0x1D538, 0x1D552, 0x1D7D8, { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' }),
    sansGras: bloc(0x1D5D4, 0x1D5EE, 0x1D7EC),
    sansItalique: bloc(0x1D608, 0x1D622),
    sansGrasItalique: bloc(0x1D63C, 0x1D656),
    machine: bloc(0x1D670, 0x1D68A, 0x1D7F6),
    pleineChasse: bloc(0xFF21, 0xFF41, 0xFF10)
  };
  var PETITES_CAPS = 'ᴀʙᴄᴅᴇꜰɢʜɪᴊᴋʟᴍɴᴏᴘǫʀꜱᴛᴜᴠᴡxʏᴢ';
  var BULLES_CHIFFRES = '⓪①②③④⑤⑥⑦⑧⑨', BULLES_NOIRES_CHIFFRES = '⓿➊➋➌➍➎➏➐➑➒';
  var ENVERS = { a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ', j: 'ɾ', k: 'ʞ', l: 'l', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ', s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
    '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6', '0': '0',
    '.': '˙', ',': '\'', '\'': ',', '?': '¿', '!': '¡', '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<', '_': '‾', '&': '⅋', '"': '„' };
  // Liste affichée par l'outil (ordre = ordre à l'écran).
  var LISTE_STYLES = [
    ['gras', 'Gras'], ['italique', 'Italique'], ['grasItalique', 'Gras italique'], ['cursive', 'Cursive'],
    ['cursiveGrasse', 'Cursive grasse'], ['gothique', 'Gothique'], ['gothiqueGras', 'Gothique gras'], ['doubleBarre', 'Double barre'],
    ['sansGras', 'Gras moderne'], ['sansItalique', 'Italique moderne'], ['sansGrasItalique', 'Gras italique moderne'],
    ['machine', 'Machine à écrire'], ['bulles', 'Bulles'], ['bullesNoires', 'Bulles noires'], ['carres', 'Carrés'],
    ['carresNoirs', 'Carrés noirs'], ['petitesCapitales', 'Petites capitales'], ['pleineChasse', 'Pleine chasse'],
    ['barre', 'Barré'], ['souligne', 'Souligné'], ['envers', 'À l\'envers']
  ];

  function lettreStylee(c, style) {
    var code = c.charCodeAt(0), maj = code >= 65 && code <= 90, min = code >= 97 && code <= 122, chif = code >= 48 && code <= 57;
    var s = STYLES[style];
    if (s) {
      if (s.x[c]) { return s.x[c]; }
      if (maj) { return String.fromCodePoint(s.A + code - 65); }
      if (min) { return String.fromCodePoint(s.a + code - 97); }
      if (chif && s.d) { return String.fromCodePoint(s.d + code - 48); }
      return c;
    }
    switch (style) {
      case 'bulles':
        if (maj) { return String.fromCodePoint(0x24B6 + code - 65); }
        if (min) { return String.fromCodePoint(0x24D0 + code - 97); }
        if (chif) { return BULLES_CHIFFRES[code - 48]; }
        return c;
      case 'bullesNoires':
        if (maj || min) { return String.fromCodePoint(0x1F150 + (maj ? code - 65 : code - 97)); }
        if (chif) { return BULLES_NOIRES_CHIFFRES[code - 48]; }
        return c;
      case 'carres':
        if (maj || min) { return String.fromCodePoint(0x1F130 + (maj ? code - 65 : code - 97)); }
        return c;
      case 'carresNoirs':
        if (maj || min) { return String.fromCodePoint(0x1F170 + (maj ? code - 65 : code - 97)); }
        return c;
      case 'petitesCapitales':
        if (maj || min) { return PETITES_CAPS[maj ? code - 65 : code - 97]; }
        return c;
      default: return c;
    }
  }
  function styliser(texte, style) {
    var t = couper(texte);
    if (t.length > 5000) { t = t.slice(0, 5000); }    // une bio, un pseudo : 5 000 signes suffisent largement
    if (style === 'barre' || style === 'souligne') {
      var marque = style === 'barre' ? '̶' : '̲';
      return Array.from(t).map(function (c) { return /\s/.test(c) ? c : c + marque; }).join('');
    }
    if (style === 'envers') {
      return Array.from(sansMarques(t).toLowerCase()).map(function (c) { return ENVERS[c] || c; }).reverse().join('');
    }
    // Les accents sont gardés : la lettre de base est stylée, l'accent (caractère combinant) la suit.
    var decompose = t.normalize('NFD'), out = '';
    for (var i = 0; i < decompose.length; i++) {
      var c = decompose[i];
      out += /[A-Za-z0-9]/.test(c) ? lettreStylee(c, style) : c;
    }
    return out;
  }
  // Le texte contient-il des lettres stylées (bloc mathématique, bulles, carrés, pleine chasse) ?
  function contientStyle(t) {
    return /[\u{1D400}-\u{1D7FF}\u{1F130}-\u{1F189}Ⓐ-ⓩＡ-ｚ]/u.test(String(t || ''));
  }

  // ------------------------------------------------------------------ pseudo stylé : décorations autour du pseudo
  var CADRES = [['꧁', '꧂'], ['༺', '༻'], ['『', '』'], ['【', '】'], ['〖', '〗'], ['★', '★'], ['✦ ', ' ✦'], ['♡ ', ' ♡'],
    ['☾ ', ' ☽'], ['⟦', '⟧'], ['⫷ ', ' ⫸'], ['ˏˋ', 'ˎˊ'], ['亗 ', ' 亗'], ['×', '×'], ['• ', ' •'], ['彡', '彡'],
    ['ツ ', ''], ['', ' ツ'], ['⚡', '⚡'], ['❀ ', ' ❀'], ['✧ ', ' ✧'], ['xX ', ' Xx'], ['〈', '〉'], ['☆ ', ' ☆']];
  function pseudoStyle(pseudo, style, cadre) {
    var p = String(pseudo == null ? '' : pseudo).replace(/\s+/g, ' ').trim().slice(0, 40);
    var c = CADRES[borne(cadre, 0, CADRES.length - 1, 0)];
    var corps = style && style !== 'normal' ? styliser(p, style) : p;
    return c[0] + corps + c[1];
  }

  // ------------------------------------------------------------------ générateur de pseudo
  // listes = { theme: { adj: [...], noms: [...] } } (pseudos.json, écrit par nous) ; options : theme, forme, chiffres, mot, longueurMax
  function capitaliser(m) { return m ? m.charAt(0).toLocaleUpperCase('fr-FR') + m.slice(1) : m; }
  function nettoyerMot(m) {
    return sansMarques(String(m == null ? '' : m)).replace(/[^A-Za-z0-9]/g, '').slice(0, 14);
  }
  function unPseudo(listes, o, rnd) {
    var th = listes[o.theme] || listes[Object.keys(listes)[0]];
    var adj = nettoyerMot(th.adj[rnd(th.adj.length)]), nom = nettoyerMot(th.noms[rnd(th.noms.length)]);
    var mot = nettoyerMot(o.mot);
    var morceaux;
    var ordre = rnd(3);
    if (mot) { morceaux = ordre === 0 ? [adj, mot] : ordre === 1 ? [mot, nom] : [nom, mot]; } else { morceaux = rnd(4) === 0 ? [nom, adj] : [adj, nom]; }
    var pseudo;
    switch (o.forme) {
      case 'souligne': pseudo = morceaux.map(capitaliser).join('_'); break;
      case 'minuscules': pseudo = morceaux.join('').toLowerCase(); break;
      case 'xx': pseudo = 'xX_' + morceaux.map(capitaliser).join('') + '_Xx'; break;
      case 'point': pseudo = morceaux.join('.').toLowerCase(); break;
      default: pseudo = morceaux.map(capitaliser).join('');
    }
    if (o.chiffres) { pseudo += String(rnd(90) + 10); }
    return pseudo;
  }
  function pseudos(listes, options, rnd, combien) {
    var o = options || {}, n = borne(combien, 1, 50, 10), max = borne(o.longueurMax, 6, 30, 20);
    var vus = {}, res = [];
    for (var essai = 0; essai < n * 30 && res.length < n; essai++) {
      var p = unPseudo(listes, o, rnd);
      if (p.length <= max && !vus[p]) { vus[p] = 1; res.push(p); }
    }
    return res;
  }

  // ------------------------------------------------------------------ mot de passe
  var JEUX = {
    minuscules: 'abcdefghijklmnopqrstuvwxyz',
    majuscules: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    chiffres: '0123456789',
    symboles: '!#$%&()*+,-./:;<=>?@[]^_{|}~'
  };
  var AMBIGUS = 'Il1O0o|';
  function jeuxChoisis(o) {
    var jeux = [];
    ['minuscules', 'majuscules', 'chiffres', 'symboles'].forEach(function (k) {
      if (o[k]) {
        var j = JEUX[k];
        if (o.sansAmbigus) { j = j.split('').filter(function (c) { return AMBIGUS.indexOf(c) < 0; }).join(''); }
        if (j) { jeux.push(j); }
      }
    });
    return jeux;
  }
  // Mot de passe : au moins un caractère de chaque famille cochée, le reste tiré dans l'ensemble, puis mélangé.
  function motDePasse(options, rnd) {
    var o = options || {}, L = borne(o.longueur, 4, 64, 16), jeux = jeuxChoisis(o);
    if (!jeux.length) { return ''; }
    var tous = jeux.join(''), car = [];
    jeux.forEach(function (j) { car.push(j[rnd(j.length)]); });
    while (car.length < L) { car.push(tous[rnd(tous.length)]); }
    return melanger(car, rnd).slice(0, L).join('');
  }
  // Entropie (bits) du tirage ci-dessus : log2 du nombre de mots de passe possibles (inclusion-exclusion sur les familles).
  function entropie(options) {
    var o = options || {}, L = borne(o.longueur, 4, 64, 16), jeux = jeuxChoisis(o);
    if (!jeux.length) { return 0; }
    var tailles = jeux.map(function (j) { return j.length; }), N = tailles.reduce(function (a, b) { return a + b; }, 0);
    var somme = 0, k = tailles.length;
    for (var masque = 0; masque < (1 << k); masque++) {
      var retire = 0, nb = 0;
      for (var i = 0; i < k; i++) { if (masque & (1 << i)) { retire += tailles[i]; nb++; } }
      somme += (nb % 2 ? -1 : 1) * Math.pow((N - retire) / N, L);
    }
    return L * Math.log2(N) + Math.log2(somme);
  }
  // Note : 0 faible (< 50 bits), 1 moyen (CNIL : 50 bits si le service bloque les essais), 2 solide (CNIL : 80 bits
  // pour un mot de passe seul), 3 très solide (ANSSI : « fort à très fort » à partir de 100 bits). Voir reglages.json.
  function niveau(bits) { return bits < 50 ? 0 : bits < 80 ? 1 : bits < 100 ? 2 : 3; }

  var TX = {
    MAX_TEXTE: MAX_TEXTE, fabriqueHasard: fabriqueHasard, melanger: melanger,
    casse: casse, compter: compter, duree: duree, sms: sms, poidsX: poidsX,
    versRomain: versRomain, depuisRomain: depuisRomain, decomposer: decomposer, diagnosticRomain: diagnosticRomain,
    STYLES_LISTE: LISTE_STYLES, styliser: styliser, contientStyle: contientStyle, CADRES: CADRES, pseudoStyle: pseudoStyle,
    pseudos: pseudos, nettoyerMot: nettoyerMot,
    JEUX: JEUX, motDePasse: motDePasse, entropie: entropie, niveau: niveau
  };
  if (typeof module !== 'undefined' && module.exports) { module.exports = TX; } else { racine.TX = TX; }
}(typeof window !== 'undefined' ? window : this));
