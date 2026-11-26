/* Outils web (maxicards.net/web) : encodeur de QR code, 100 % dans le navigateur (aucun accès au DOM, rien n'est envoyé).
 *
 * Écrit pour ce site d'après la norme ISO/IEC 18004 : modes numérique, alphanumérique et octets (UTF-8), versions 1 à 40
 * (la plus petite qui tient), niveaux de correction L, M, Q, H, Reed-Solomon, entrelacement des blocs, motifs de
 * repérage, de synchronisation, d'alignement, de format et de version, choix du masque par les pénalités.
 *
 * Méthode suivie : celle de la bibliothèque « QR Code generator » de Project Nayuki
 * (https://www.nayuki.io/page/qr-code-generator-library), réécrite et adaptée ici (tables, Reed-Solomon,
 * entrelacement, placement des modules, motifs). Licence de cette bibliothèque :
 *
 *   Copyright (c) Project Nayuki. (MIT License)
 *
 *   Permission is hereby granted, free of charge, to any person obtaining a copy of
 *   this software and associated documentation files (the "Software"), to deal in
 *   the Software without restriction, including without limitation the rights to
 *   use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 *   the Software, and to permit persons to whom the Software is furnished to do so,
 *   subject to the following conditions:
 *   - The above copyright notice and this permission notice shall be included in
 *     all copies or substantial portions of the Software.
 *   - The Software is provided "as is", without warranty of any kind, express or
 *     implied, including but not limited to the warranties of merchantability,
 *     fitness for a particular purpose and noninfringement. In no event shall the
 *     authors or copyright holders be liable for any claim, damages or other
 *     liability, whether in an action of contract, tort or otherwise, arising from,
 *     out of or in connection with the Software or the use or other dealings in the
 *     Software.
 *
 * « QR Code » est une marque déposée de DENSO WAVE INCORPORATED.
 */
(function (racine) {
  'use strict';

  var MAX_CARACTERES = 8000;   // plafond de saisie avant tout calcul (la capacité réelle est plus basse)
  var NIVEAUX = {               // ordre interne, bits de format (norme)
    L: { ordre: 0, format: 1 },
    M: { ordre: 1, format: 0 },
    Q: { ordre: 2, format: 3 },
    H: { ordre: 3, format: 2 }
  };
  // Octets de correction par bloc [niveau][version] (index 0 inutilisé).
  var CORR_PAR_BLOC = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
  ];
  // Nombre de blocs de correction [niveau][version].
  var NB_BLOCS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
  ];
  var ALPHANUM = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
  var MODES = {
    numerique: { bits: 0x1, compte: [10, 12, 14] },
    alphanumerique: { bits: 0x2, compte: [9, 11, 13] },
    octets: { bits: 0x4, compte: [8, 16, 16] }
  };
  var PEN1 = 3, PEN2 = 3, PEN3 = 40, PEN4 = 10;

  // 2953 -> « 2 953 » (espace fine insécable, comme le reste du site).
  function milliers(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
  }
  function erreur(code, message) {
    var e = new Error(message);
    e.code = code;
    return e;
  }

  // ---------- tailles et capacités ----------
  function modulesDonneesBruts(ver) {
    var r = (16 * ver + 128) * ver + 64;
    if (ver >= 2) {
      var na = Math.floor(ver / 7) + 2;
      r -= (25 * na - 10) * na - 55;
      if (ver >= 7) { r -= 36; }
    }
    return r;
  }
  function octetsDonnees(ver, ordre) {
    return Math.floor(modulesDonneesBruts(ver) / 8) - CORR_PAR_BLOC[ordre][ver] * NB_BLOCS[ordre][ver];
  }
  function bitsCompte(mode, ver) {
    return MODES[mode].compte[ver <= 9 ? 0 : ver <= 26 ? 1 : 2];
  }
  function bitsCharge(mode, n) {
    if (mode === 'numerique') { return Math.floor(n / 3) * 10 + [0, 4, 7][n % 3]; }
    if (mode === 'alphanumerique') { return Math.floor(n / 2) * 11 + (n % 2) * 6; }
    return n * 8;
  }
  // Nombre maximal de caractères (ou d'octets en mode octets) pour un niveau, un mode, une version (40 par défaut).
  function capacite(niveau, mode, version) {
    var nv = NIVEAUX[String(niveau || 'M').toUpperCase()];
    var ver = Math.max(1, Math.min(40, Math.floor(Number(version) || 40)));
    if (!nv || !MODES[mode]) { return 0; }
    var dispo = octetsDonnees(ver, nv.ordre) * 8 - 4 - bitsCompte(mode, ver);
    if (dispo <= 0) { return 0; }
    var n;
    if (mode === 'numerique') {
      n = Math.floor(dispo / 10) * 3;
      var reste = dispo % 10;
      n += reste >= 7 ? 2 : reste >= 4 ? 1 : 0;
    } else if (mode === 'alphanumerique') {
      n = Math.floor(dispo / 11) * 2 + (dispo % 11 >= 6 ? 1 : 0);
    } else {
      n = Math.floor(dispo / 8);
    }
    return Math.min(n, (1 << bitsCompte(mode, ver)) - 1);
  }

  // ---------- texte -> octets UTF-8 (sans dépendre de TextEncoder) ----------
  function utf8(texte) {
    var o = [];
    for (var i = 0; i < texte.length; i++) {
      var c = texte.charCodeAt(i);
      if (c >= 0xD800 && c <= 0xDBFF && i + 1 < texte.length) {
        var d = texte.charCodeAt(i + 1);
        if (d >= 0xDC00 && d <= 0xDFFF) { c = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; }
      }
      if (c >= 0xD800 && c <= 0xDFFF) { c = 0xFFFD; }   // demi-caractère isolé : remplacé
      if (c < 0x80) { o.push(c); }
      else if (c < 0x800) { o.push(0xC0 | (c >> 6), 0x80 | (c & 63)); }
      else if (c < 0x10000) { o.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
      else { o.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); }
    }
    return o;
  }

  function choisirMode(texte) {
    if (texte.length && /^[0-9]*$/.test(texte)) { return 'numerique'; }
    if (texte.length) {
      var ok = true;
      for (var i = 0; i < texte.length; i++) { if (ALPHANUM.indexOf(texte.charAt(i)) < 0) { ok = false; break; } }
      if (ok) { return 'alphanumerique'; }
    }
    return 'octets';
  }

  // Bits de la charge utile (sans l'en-tête mode + compte).
  function chargeUtile(texte, mode, octets) {
    var bits = [];
    function ajouter(val, n) { for (var i = n - 1; i >= 0; i--) { bits.push((val >>> i) & 1); } }
    var i;
    if (mode === 'numerique') {
      for (i = 0; i < texte.length; i += 3) {
        var bloc = texte.substr(i, 3);
        ajouter(parseInt(bloc, 10), bloc.length * 3 + 1);
      }
    } else if (mode === 'alphanumerique') {
      for (i = 0; i + 1 < texte.length; i += 2) {
        ajouter(ALPHANUM.indexOf(texte.charAt(i)) * 45 + ALPHANUM.indexOf(texte.charAt(i + 1)), 11);
      }
      if (texte.length % 2) { ajouter(ALPHANUM.indexOf(texte.charAt(texte.length - 1)), 6); }
    } else {
      for (i = 0; i < octets.length; i++) { ajouter(octets[i], 8); }
    }
    return bits;
  }

  // ---------- Reed-Solomon sur GF(2^8), polynôme 0x11D ----------
  function multGF(x, y) {
    var z = 0;
    for (var i = 7; i >= 0; i--) {
      z = (z << 1) ^ ((z >>> 7) * 0x11D);
      z ^= ((y >>> i) & 1) * x;
    }
    return z;
  }
  var DIVISEURS = {};
  function diviseur(degre) {
    if (DIVISEURS[degre]) { return DIVISEURS[degre]; }
    var r = [];
    for (var i = 0; i < degre - 1; i++) { r.push(0); }
    r.push(1);
    var racineGF = 1;
    for (i = 0; i < degre; i++) {
      for (var j = 0; j < r.length; j++) {
        r[j] = multGF(r[j], racineGF);
        if (j + 1 < r.length) { r[j] ^= r[j + 1]; }
      }
      racineGF = multGF(racineGF, 0x02);
    }
    DIVISEURS[degre] = r;
    return r;
  }
  function reste(donnees, div) {
    var r = div.map(function () { return 0; });
    donnees.forEach(function (b) {
      var f = b ^ r.shift();
      r.push(0);
      for (var i = 0; i < div.length; i++) { r[i] ^= multGF(div[i], f); }
    });
    return r;
  }
  // Découpe en blocs, ajoute la correction, entrelace.
  function correctionEtEntrelacement(donnees, ver, ordre) {
    var nbBlocs = NB_BLOCS[ordre][ver], corr = CORR_PAR_BLOC[ordre][ver];
    var brut = Math.floor(modulesDonneesBruts(ver) / 8);
    var nbCourts = nbBlocs - brut % nbBlocs, lgCourt = Math.floor(brut / nbBlocs);
    var blocs = [], div = diviseur(corr), k = 0;
    for (var i = 0; i < nbBlocs; i++) {
      var d = donnees.slice(k, k + lgCourt - corr + (i < nbCourts ? 0 : 1));
      k += d.length;
      var ec = reste(d, div);
      if (i < nbCourts) { d.push(0); }
      blocs.push(d.concat(ec));
    }
    var res = [];
    for (i = 0; i < blocs[0].length; i++) {
      for (var j = 0; j < blocs.length; j++) {
        if (i !== lgCourt - corr || j >= nbCourts) { res.push(blocs[j][i]); }
      }
    }
    return res;
  }

  // ---------- la matrice ----------
  function positionsAlignement(ver) {
    if (ver === 1) { return []; }
    var n = Math.floor(ver / 7) + 2, taille = ver * 4 + 17;
    var pas = Math.floor((ver * 8 + n * 3 + 5) / (n * 4 - 4)) * 2;
    var r = [6];
    for (var p = taille - 7; r.length < n; p -= pas) { r.splice(1, 0, p); }
    return r;
  }

  function Matrice(ver) {
    this.ver = ver;
    this.taille = ver * 4 + 17;
    this.m = [];
    this.f = [];
    for (var y = 0; y < this.taille; y++) {
      this.m.push(new Array(this.taille).fill(false));
      this.f.push(new Array(this.taille).fill(false));
    }
  }
  Matrice.prototype.fixe = function (x, y, fonce) { this.m[y][x] = fonce; this.f[y][x] = true; };
  Matrice.prototype.reperage = function (x, y) {
    for (var dy = -4; dy <= 4; dy++) {
      for (var dx = -4; dx <= 4; dx++) {
        var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < this.taille && yy >= 0 && yy < this.taille) { this.fixe(xx, yy, d !== 2 && d !== 4); }
      }
    }
  };
  Matrice.prototype.alignement = function (x, y) {
    for (var dy = -2; dy <= 2; dy++) {
      for (var dx = -2; dx <= 2; dx++) { this.fixe(x + dx, y + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1); }
    }
  };
  Matrice.prototype.format = function (bitsNiveau, masque) {
    var d = (bitsNiveau << 3) | masque, r = d, i;
    for (i = 0; i < 10; i++) { r = (r << 1) ^ ((r >>> 9) * 0x537); }
    var b = ((d << 10) | r) ^ 0x5412, t = this.taille;
    function bit(k) { return ((b >>> k) & 1) !== 0; }
    for (i = 0; i <= 5; i++) { this.fixe(8, i, bit(i)); }
    this.fixe(8, 7, bit(6));
    this.fixe(8, 8, bit(7));
    this.fixe(7, 8, bit(8));
    for (i = 9; i < 15; i++) { this.fixe(14 - i, 8, bit(i)); }
    for (i = 0; i < 8; i++) { this.fixe(t - 1 - i, 8, bit(i)); }
    for (i = 8; i < 15; i++) { this.fixe(8, t - 15 + i, bit(i)); }
    this.fixe(8, t - 8, true);   // module toujours foncé
  };
  Matrice.prototype.infoVersion = function () {
    if (this.ver < 7) { return; }
    var r = this.ver, i;
    for (i = 0; i < 12; i++) { r = (r << 1) ^ ((r >>> 11) * 0x1F25); }
    var b = (this.ver << 12) | r;
    for (i = 0; i < 18; i++) {
      var c = ((b >>> i) & 1) !== 0, a = this.taille - 11 + i % 3, z = Math.floor(i / 3);
      this.fixe(a, z, c);
      this.fixe(z, a, c);
    }
  };
  Matrice.prototype.motifs = function (bitsNiveau) {
    var t = this.taille, i, j;
    for (i = 0; i < t; i++) { this.fixe(6, i, i % 2 === 0); this.fixe(i, 6, i % 2 === 0); }
    this.reperage(3, 3);
    this.reperage(t - 4, 3);
    this.reperage(3, t - 4);
    var pos = positionsAlignement(this.ver), n = pos.length;
    for (i = 0; i < n; i++) {
      for (j = 0; j < n; j++) {
        if (!((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0))) { this.alignement(pos[i], pos[j]); }
      }
    }
    this.format(bitsNiveau, 0);   // réserve les zones de format (réécrites après le masque)
    this.infoVersion();
  };
  Matrice.prototype.placer = function (mots) {
    var t = this.taille, i = 0, total = mots.length * 8;
    for (var droite = t - 1; droite >= 1; droite -= 2) {
      if (droite === 6) { droite = 5; }
      for (var v = 0; v < t; v++) {
        for (var j = 0; j < 2; j++) {
          var x = droite - j, monte = ((droite + 1) & 2) === 0, y = monte ? t - 1 - v : v;
          if (!this.f[y][x] && i < total) {
            this.m[y][x] = ((mots[i >>> 3] >>> (7 - (i & 7))) & 1) !== 0;
            i++;
          }
        }
      }
    }
  };
  function condMasque(masque, x, y) {
    switch (masque) {
      case 0: return (x + y) % 2 === 0;
      case 1: return y % 2 === 0;
      case 2: return x % 3 === 0;
      case 3: return (x + y) % 3 === 0;
      case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0;
      case 5: return (x * y) % 2 + (x * y) % 3 === 0;
      case 6: return ((x * y) % 2 + (x * y) % 3) % 2 === 0;
      default: return ((x + y) % 2 + (x * y) % 3) % 2 === 0;
    }
  }
  Matrice.prototype.masquer = function (masque) {
    for (var y = 0; y < this.taille; y++) {
      for (var x = 0; x < this.taille; x++) {
        if (!this.f[y][x] && condMasque(masque, x, y)) { this.m[y][x] = !this.m[y][x]; }
      }
    }
  };
  // Pénalités de la norme (règles 1 à 4) : plus le score est bas, mieux c'est.
  Matrice.prototype.penalite = function () {
    var t = this.taille, m = this.m, score = 0, x, y, fonces = 0;
    function lignes(lire) {
      for (var a = 0; a < t; a++) {
        var serie = 1, avant = lire(a, 0), mot = avant ? 1 : 0;
        for (var b = 1; b < t; b++) {
          var c = lire(a, b);
          if (c === avant) {
            serie++;
          } else {
            if (serie >= 5) { score += PEN1 + serie - 5; }
            serie = 1;
            avant = c;
          }
          mot = ((mot << 1) | (c ? 1 : 0)) & 0x7FF;
          // règle 3 : 1:1:3:1:1 précédé ou suivi de 4 modules clairs
          if (b >= 10 && (mot === 0x5D0 || mot === 0x05D)) { score += PEN3; }
        }
        if (serie >= 5) { score += PEN1 + serie - 5; }
      }
    }
    lignes(function (a, b) { return m[a][b]; });
    lignes(function (a, b) { return m[b][a]; });
    for (y = 0; y < t - 1; y++) {
      for (x = 0; x < t - 1; x++) {
        var c = m[y][x];
        if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) { score += PEN2; }
      }
    }
    for (y = 0; y < t; y++) { for (x = 0; x < t; x++) { if (m[y][x]) { fonces++; } } }
    var total = t * t;
    var k = Math.ceil(Math.abs(fonces * 20 - total * 10) / total) - 1;
    score += Math.max(0, k) * PEN4;
    return score;
  };

  // ---------- l'API ----------
  function encoder(texte, niveau, options) {
    options = options || {};
    texte = texte === undefined || texte === null ? '' : String(texte);
    if (texte.length > MAX_CARACTERES) {
      throw erreur('TROP_LONG', 'Texte trop long : ' + milliers(texte.length) + ' caractères. Un QR code contient au plus 2 953 octets (niveau L).');
    }
    var cle = String(niveau || 'M').toUpperCase();
    var nv = NIVEAUX[cle];
    if (!nv) { throw erreur('NIVEAU', 'Niveau de correction inconnu : choisir L, M, Q ou H.'); }

    var mode = options.mode || choisirMode(texte);
    if (!MODES[mode]) { throw erreur('MODE', 'Mode inconnu : numerique, alphanumerique ou octets.'); }
    if (mode === 'numerique' && !/^[0-9]*$/.test(texte)) { throw erreur('MODE', 'Le mode numérique n\'accepte que des chiffres.'); }
    if (mode === 'alphanumerique') {
      for (var c = 0; c < texte.length; c++) {
        if (ALPHANUM.indexOf(texte.charAt(c)) < 0) { throw erreur('MODE', 'Caractère non permis en mode alphanumérique.'); }
      }
    }
    var octets = utf8(texte);
    var nbCar = mode === 'octets' ? octets.length : texte.length;
    var charge = chargeUtile(texte, mode, octets);

    var verMin = 1, verMax = 40;
    if (options.version !== undefined && options.version !== null) {
      var vf = Math.floor(Number(options.version));
      if (!(vf >= 1 && vf <= 40)) { throw erreur('VERSION', 'Version forcée invalide : 1 à 40.'); }
      verMin = verMax = vf;
    }
    var ver = 0, cap = 0;
    for (var v = verMin; v <= verMax; v++) {
      var cb = bitsCompte(mode, v);
      cap = octetsDonnees(v, nv.ordre) * 8;
      if (nbCar < (1 << cb) && 4 + cb + charge.length <= cap) { ver = v; break; }
    }
    if (!ver) {
      var max = capacite(cle, mode, verMax);
      throw erreur('TROP_LONG', 'Contenu trop long pour un QR code' + (verMin === verMax ? ' de version ' + verMin : '') +
        ' au niveau ' + cle + ' : ' + milliers(nbCar) + (mode === 'octets' ? ' octets' : ' caractères') + ' pour ' + milliers(max) + ' au plus.' +
        (cle !== 'L' ? ' Essayez le niveau L ou raccourcissez le texte.' : ' Raccourcissez le texte.'));
    }

    // Suite de bits : mode, compte, charge, fin, bourrage.
    var bits = [], i;
    function ajouter(val, n) { for (var k = n - 1; k >= 0; k--) { bits.push((val >>> k) & 1); } }
    ajouter(MODES[mode].bits, 4);
    ajouter(nbCar, bitsCompte(mode, ver));
    for (i = 0; i < charge.length; i++) { bits.push(charge[i]); }
    var utilises = bits.length;
    ajouter(0, Math.min(4, cap - bits.length));
    ajouter(0, (8 - bits.length % 8) % 8);
    for (var pad = 0xEC; bits.length < cap; pad ^= 0xEC ^ 0x11) { ajouter(pad, 8); }
    var mots = [];
    for (i = 0; i < bits.length; i += 8) {
      var o = 0;
      for (var b = 0; b < 8; b++) { o = (o << 1) | bits[i + b]; }
      mots.push(o);
    }

    var mat = new Matrice(ver);
    mat.motifs(nv.format);
    mat.placer(correctionEtEntrelacement(mots, ver, nv.ordre));

    var masque = -1;
    if (options.masque !== undefined && options.masque !== null) {
      masque = Math.floor(Number(options.masque));
      if (!(masque >= 0 && masque <= 7)) { throw erreur('MASQUE', 'Masque forcé invalide : 0 à 7.'); }
    } else {
      var meilleur = Infinity;
      for (i = 0; i < 8; i++) {
        mat.masquer(i);
        mat.format(nv.format, i);
        var p = mat.penalite();
        if (p < meilleur) { masque = i; meilleur = p; }
        mat.masquer(i);   // le masque est un OU exclusif : le réappliquer l'annule
      }
    }
    mat.masquer(masque);
    mat.format(nv.format, masque);

    return {
      version: ver,
      taille: mat.taille,
      modules: mat.m,
      niveau: cle,
      masque: masque,
      mode: mode,
      octets: octets.length,
      caracteres: nbCar,
      bits: utilises,
      capaciteBits: cap,
      capacite: capacite(cle, mode, 40)
    };
  }

  // ---------- couleurs ----------
  function couleurValide(c, defaut) {
    return typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c) ? c.toLowerCase() : defaut;
  }
  function luminance(hex) {
    var v = [1, 3, 5].map(function (k) {
      var s = parseInt(hex.substr(k, 2), 16) / 255;
      return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function contraste(a, b) {
    a = couleurValide(a, null);
    b = couleurValide(b, null);
    if (!a || !b) { return NaN; }
    var la = luminance(a), lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  }

  // ---------- SVG : un seul <path> pour les modules foncés ----------
  function entierBorne(v, min, max, defaut) {
    var n = Math.floor(Number(v));
    if (!isFinite(n)) { return defaut; }
    return Math.max(min, Math.min(max, n));
  }
  function svg(res, opts) {
    opts = opts || {};
    var marge = entierBorne(opts.marge === undefined ? 4 : opts.marge, 0, 10, 4);
    var couleur = couleurValide(opts.couleur, '#000000');
    var fond = couleurValide(opts.fond, '#ffffff');
    var n = res.taille, total = n + 2 * marge;
    var px = entierBorne(opts.pixels === undefined ? total * 8 : opts.pixels, 16, 4096, total * 8);
    var d = [];
    for (var y = 0; y < n; y++) {
      var x = 0;
      while (x < n) {
        if (res.modules[y][x]) {
          var debut = x;
          while (x < n && res.modules[y][x]) { x++; }
          var lg = x - debut;
          d.push('M' + (debut + marge) + ' ' + (y + marge) + 'h' + lg + 'v1h-' + lg + 'z');
        } else {
          x++;
        }
      }
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="' + px + '" height="' + px +
      '" viewBox="0 0 ' + total + ' ' + total + '" shape-rendering="crispEdges">' +
      '<rect width="' + total + '" height="' + total + '" fill="' + fond + '"/>' +
      '<path fill="' + couleur + '" d="' + d.join('') + '"/></svg>';
  }

  // ---------- contenus prêts à encoder ----------
  function borne(v, max) {
    return (v === undefined || v === null ? '' : String(v)).slice(0, max);
  }
  function sansControle(v) {
    return v.replace(/[\u0000-\u001F\u007F]/g, '');   // retours à la ligne et tabulations retirés
  }
  // Onglet « Lien » : adresses web seulement (http:// ou https://), 26/11/2026. Sans schéma, https:// est ajouté.
  // Tout autre schéma (javascript:, data:, file:, intent:, mailto:…) est refusé : { lien: '', refus: message }.
  // « exemple.fr:8080/page » ou « localhost:3000 » sont des noms de site avec un port, pas des schémas.
  var REFUS_SCHEMA = 'Seules les adresses web (http:// ou https://) sont acceptées ici. Pour un e-mail, un téléphone ' +
    'ou un réseau Wi-Fi, utilisez l\'onglet prévu.';
  function lienAnalyse(url) {
    var u = sansControle(borne(url, 2000)).trim();
    if (!u) { return { lien: '', refus: '' }; }
    var m = /^([a-z][a-z0-9+.-]*):/i.exec(u);
    if (m) {
      var s = m[1].toLowerCase();
      if (s === 'http' || s === 'https') {
        return /^https?:\/\/[^\/\s?#]/i.test(u) ? { lien: u, refus: '' } :
          { lien: '', refus: 'Adresse incomplète : écrivez-la sous la forme https://exemple.fr.' };
      }
      var hotePort = (s.indexOf('.') >= 0 || s === 'localhost') && /^[a-z0-9.-]+:\d{1,5}(?:[\/?#]|$)/i.test(u);
      if (!hotePort) { return { lien: '', refus: REFUS_SCHEMA }; }
    }
    return { lien: 'https://' + u.replace(/^\/+/, ''), refus: '' };
  }
  function lien(url) {
    return lienAnalyse(url).lien;
  }
  function echapWifi(v) {
    return v.replace(/([\\;,:"])/g, '\\$1');
  }
  function wifi(o) {
    o = o || {};
    var ssid = sansControle(borne(o.ssid, 64));
    var mdp = sansControle(borne(o.motDePasse, 128));
    var secu = { WPA: 'WPA', WEP: 'WEP', nopass: 'nopass' }[o.securite] || 'WPA';
    var t = 'WIFI:T:' + secu + ';S:' + echapWifi(ssid) + ';';
    if (secu !== 'nopass') { t += 'P:' + echapWifi(mdp) + ';'; }
    if (o.cache) { t += 'H:true;'; }
    return t + ';';
  }
  function email(o) {
    o = o || {};
    var adr = sansControle(borne(o.adresse, 254)).replace(/\s+/g, '');
    var sujet = borne(o.sujet, 200), msg = borne(o.message, 1500);
    var p = [];
    if (sujet) { p.push('subject=' + encodeURIComponent(sujet)); }
    if (msg) { p.push('body=' + encodeURIComponent(msg.replace(/\r?\n/g, '\r\n'))); }
    return 'mailto:' + encodeURIComponent(adr).replace(/%40/g, '@') + (p.length ? '?' + p.join('&') : '');
  }
  function tel(numero) {
    var n = sansControle(borne(numero, 40)).replace(/[\s.\-()\/]/g, '').replace(/[^0-9+*#]/g, '');
    return 'tel:' + n;
  }
  // vCard 3.0 (RFC 2426) : barre oblique inverse, virgule et point-virgule échappés, retour à la ligne = \n.
  function echapVcard(v) {
    return v.replace(/\\/g, '\\\\').replace(/,/g, '\\,').replace(/;/g, '\\;').replace(/\r\n|\r|\n/g, '\\n')
      .replace(/[\u0000-\u001F\u007F]/g, '');
  }
  function vcard(o) {
    o = o || {};
    function c(k, max) { return echapVcard(borne(o[k], max || 100).trim()); }
    var prenom = c('prenom'), nom = c('nom'), org = c('organisation'), fonction = c('fonction');
    var telV = c('tel', 40), mail = c('email', 254), site = c('site', 500);
    var adr = c('adresse', 200), ville = c('ville'), cp = c('codePostal', 20), pays = c('pays', 60);
    var fn = (prenom + ' ' + nom).trim() || org || 'Contact';
    var l = ['BEGIN:VCARD', 'VERSION:3.0', 'N:' + nom + ';' + prenom + ';;;', 'FN:' + fn];
    if (org) { l.push('ORG:' + org); }
    if (fonction) { l.push('TITLE:' + fonction); }
    if (telV) { l.push('TEL;TYPE=CELL:' + telV); }
    if (mail) { l.push('EMAIL;TYPE=INTERNET:' + mail); }
    if (site) { l.push('URL:' + site); }
    if (adr || ville || cp || pays) { l.push('ADR;TYPE=WORK:;;' + adr + ';' + ville + ';;' + cp + ';' + pays); }
    l.push('END:VCARD');
    return l.join('\r\n');
  }

  var QR = {
    encoder: encoder,
    svg: svg,
    capacite: capacite,
    contraste: contraste,
    luminance: function (c) { var h = couleurValide(c, null); return h ? luminance(h) : NaN; },
    couleurValide: couleurValide,
    utf8: utf8,
    lien: lien,
    lienAnalyse: lienAnalyse,
    wifi: wifi,
    email: email,
    tel: tel,
    vcard: vcard,
    MAX_CARACTERES: MAX_CARACTERES
  };
  if (typeof module === 'object' && module.exports) { module.exports = QR; } else { racine.QR = QR; }
}(this));
