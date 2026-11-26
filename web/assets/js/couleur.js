/* Couleurs : conversions, contraste WCAG, noms CSS, harmonies. Logique pure (aucun accès au DOM), testée sous Node.
   Tout est borné : aucune boucle ne dépend d'une valeur saisie. */
(function (racine) {
  'use strict';
  var EPS = 1e-9;
  var NOMS_BRUT = 'aliceblue:f0f8ff,antiquewhite:faebd7,aqua:00ffff,aquamarine:7fffd4,azure:f0ffff,beige:f5f5dc,bisque:ffe4c4,black:000000,blanchedalmond:ffebcd,blue:0000ff,blueviolet:8a2be2,brown:a52a2a,burlywood:deb887,cadetblue:5f9ea0,chartreuse:7fff00,chocolate:d2691e,coral:ff7f50,cornflowerblue:6495ed,cornsilk:fff8dc,crimson:dc143c,cyan:00ffff,darkblue:00008b,darkcyan:008b8b,darkgoldenrod:b8860b,darkgray:a9a9a9,darkgreen:006400,darkgrey:a9a9a9,darkkhaki:bdb76b,darkmagenta:8b008b,darkolivegreen:556b2f,darkorange:ff8c00,darkorchid:9932cc,darkred:8b0000,darksalmon:e9967a,darkseagreen:8fbc8f,darkslateblue:483d8b,darkslategray:2f4f4f,darkslategrey:2f4f4f,darkturquoise:00ced1,darkviolet:9400d3,deeppink:ff1493,deepskyblue:00bfff,dimgray:696969,dimgrey:696969,dodgerblue:1e90ff,firebrick:b22222,floralwhite:fffaf0,forestgreen:228b22,fuchsia:ff00ff,gainsboro:dcdcdc,ghostwhite:f8f8ff,gold:ffd700,goldenrod:daa520,gray:808080,green:008000,greenyellow:adff2f,grey:808080,honeydew:f0fff0,hotpink:ff69b4,indianred:cd5c5c,indigo:4b0082,ivory:fffff0,khaki:f0e68c,lavender:e6e6fa,lavenderblush:fff0f5,lawngreen:7cfc00,lemonchiffon:fffacd,lightblue:add8e6,lightcoral:f08080,lightcyan:e0ffff,lightgoldenrodyellow:fafad2,lightgray:d3d3d3,lightgreen:90ee90,lightgrey:d3d3d3,lightpink:ffb6c1,lightsalmon:ffa07a,lightseagreen:20b2aa,lightskyblue:87cefa,lightslategray:778899,lightslategrey:778899,lightsteelblue:b0c4de,lightyellow:ffffe0,lime:00ff00,limegreen:32cd32,linen:faf0e6,magenta:ff00ff,maroon:800000,mediumaquamarine:66cdaa,mediumblue:0000cd,mediumorchid:ba55d3,mediumpurple:9370db,mediumseagreen:3cb371,mediumslateblue:7b68ee,mediumspringgreen:00fa9a,mediumturquoise:48d1cc,mediumvioletred:c71585,midnightblue:191970,mintcream:f5fffa,mistyrose:ffe4e1,moccasin:ffe4b5,navajowhite:ffdead,navy:000080,oldlace:fdf5e6,olive:808000,olivedrab:6b8e23,orange:ffa500,orangered:ff4500,orchid:da70d6,palegoldenrod:eee8aa,palegreen:98fb98,paleturquoise:afeeee,palevioletred:db7093,papayawhip:ffefd5,peachpuff:ffdab9,peru:cd853f,pink:ffc0cb,plum:dda0dd,powderblue:b0e0e6,purple:800080,rebeccapurple:663399,red:ff0000,rosybrown:bc8f8f,royalblue:4169e1,saddlebrown:8b4513,salmon:fa8072,sandybrown:f4a460,seagreen:2e8b57,seashell:fff5ee,sienna:a0522d,silver:c0c0c0,skyblue:87ceeb,slateblue:6a5acd,slategray:708090,slategrey:708090,snow:fffafa,springgreen:00ff7f,steelblue:4682b4,tan:d2b48c,teal:008080,thistle:d8bfd8,tomato:ff6347,turquoise:40e0d0,violet:ee82ee,wheat:f5deb3,white:ffffff,whitesmoke:f5f5f5,yellow:ffff00,yellowgreen:9acd32';
  var NOMS = {};
  var LISTE = [];
  NOMS_BRUT.split(',').forEach(function (p) {
    var a = p.split(':');
    NOMS[a[0]] = a[1];
    LISTE.push(a[0]);
  });

  function borne(v, min, max) {
    v = Number(v);
    if (v !== v) { return min; }
    return Math.min(max, Math.max(min, v));
  }
  function entier(v, min, max) { return Math.floor(borne(v, min, max) + 0.5); }
  function rgb(r, g, b) { return { r: entier(r, 0, 255), g: entier(g, 0, 255), b: entier(b, 0, 255) }; }
  function h2(n) { var s = n.toString(16); return s.length < 2 ? '0' + s : s; }

  function validHex(s) { return typeof s === 'string' && /^[0-9a-f]{6}$/.test(s); }
  function depuisHex(s) {
    if (!validHex(s)) { return null; }
    return { r: parseInt(s.slice(0, 2), 16), g: parseInt(s.slice(2, 4), 16), b: parseInt(s.slice(4, 6), 16) };
  }
  function versHex(c) { return h2(c.r) + h2(c.g) + h2(c.b); }
  function hexAff(c) { return '#' + versHex(c).toUpperCase(); }

  var NB = /^[+-]?(\d+\.?\d*|\.\d+)$/;
  function argumentsDe(s, prefixe) {
    var m = new RegExp('^' + prefixe + 'a?\\(([^()]*)\\)$').exec(s);
    if (!m) { return null; }
    var a = m[1].split(/[\s,\/]+/).filter(function (x) { return x !== ''; });
    if (a.length !== 3 && a.length !== 4) { return null; }
    return a;
  }
  // Nombre suivi d'une unité facultative parmi `unites` ; NaN si invalide.
  function nombreAvecUnite(t, unites) {
    var m = /^(.*?)(%|deg|°)?$/.exec(t);
    if (!m) { return NaN; }
    var u = m[2] || '';
    if (unites.indexOf(u) === -1 || !NB.test(m[1])) { return NaN; }
    return Number(m[1]);
  }

  // Lit une couleur saisie : #rgb, #rrggbb, rrggbb, rgb(), hsl(), nom CSS. Renvoie {r,g,b} ou null.
  function lire(texte) {
    if (typeof texte !== 'string') { return null; }
    var s = texte.trim().toLowerCase().replace(/\s+/g, ' ');
    if (s.length === 0 || s.length > 60) { return null; }
    var nomCle = s.replace(/[ _-]/g, '');
    if (Object.prototype.hasOwnProperty.call(NOMS, nomCle)) { return depuisHex(NOMS[nomCle]); }
    var m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(s);
    if (m) {
      var h = m[1];
      if (h.length === 3) { h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; }
      return depuisHex(h);
    }
    var a = argumentsDe(s, 'rgb');
    if (a) {
      var v = [];
      for (var i = 0; i < 3; i++) {
        var n = nombreAvecUnite(a[i], ['', '%']);
        if (n !== n) { return null; }
        v.push(/%$/.test(a[i]) ? n * 255 / 100 : n);
      }
      if (a.length === 4 && !NB.test(a[3].replace(/%$/, ''))) { return null; }
      return rgb(v[0], v[1], v[2]);
    }
    a = argumentsDe(s, 'hsl');
    if (a) {
      var hh = nombreAvecUnite(a[0], ['', 'deg', '°']);
      var ss = nombreAvecUnite(a[1], ['', '%']);
      var ll = nombreAvecUnite(a[2], ['', '%']);
      if (hh !== hh || ss !== ss || ll !== ll) { return null; }
      if (a.length === 4 && !NB.test(a[3].replace(/%$/, ''))) { return null; }
      return hslVersRgb(hh, borne(ss, 0, 100), borne(ll, 0, 100));
    }
    return null;
  }

  function rgbVersHsl(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn, l = (mx + mn) / 2, h = 0, s = 0;
    if (d > 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (mx === r) { h = ((g - b) / d) % 6; } else if (mx === g) { h = (b - r) / d + 2; } else { h = (r - g) / d + 4; }
      h *= 60;
      if (h < 0) { h += 360; }
    }
    return { h: h, s: s * 100, l: l * 100 };
  }
  function hslVersRgb(h, s, l) {
    h = Number(h);
    if (h !== h || !isFinite(h)) { h = 0; }
    var H = ((h % 360) + 360) % 360;
    var S = borne(s, 0, 100) / 100, L = borne(l, 0, 100) / 100;
    var C = (1 - Math.abs(2 * L - 1)) * S;
    var X = C * (1 - Math.abs((H / 60) % 2 - 1));
    var m = L - C / 2;
    var sect = Math.floor(H / 60) % 6;
    var t = [[C, X, 0], [X, C, 0], [0, C, X], [0, X, C], [X, 0, C], [C, 0, X]][sect];
    return rgb((t[0] + m) * 255, (t[1] + m) * 255, (t[2] + m) * 255);
  }
  // CMJN « naïf » (K = 1 - max(R,G,B)/255), en pourcentages. Le CMJN réel dépend de l'imprimeur.
  function rgbVersCmjn(c) {
    var r = c.r / 255, g = c.g / 255, b = c.b / 255;
    var k = 1 - Math.max(r, g, b);
    if (k >= 1) { return { c: 0, m: 0, j: 0, n: 100 }; }
    return { c: (1 - r - k) / (1 - k) * 100, m: (1 - g - k) / (1 - k) * 100, j: (1 - b - k) / (1 - k) * 100, n: k * 100 };
  }

  function lin(v) {
    var x = v / 255;
    return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  }
  function luminance(c) { return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b); }
  function contraste(a, b) {
    var la = luminance(a), lb = luminance(b);
    var hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }
  // Le ratio affiché est tronqué (jamais arrondi vers le haut) : 4,497 s'affiche 4,49, pas 4,50.
  function ratioTronque(ratio) { return Math.floor(ratio * 100 + EPS) / 100; }
  function verdicts(ratio) {
    var ok = function (seuil) { return ratio + EPS >= seuil; };
    return { normalAA: ok(4.5), normalAAA: ok(7), grandAA: ok(3), grandAAA: ok(4.5), interface: ok(3) };
  }
  var NOIR = { r: 0, g: 0, b: 0 }, BLANC = { r: 255, g: 255, b: 255 };
  // Texte le plus lisible sur un fond : noir ou blanc.
  function texteLisible(fond) {
    var cb = contraste(fond, BLANC), cn = contraste(fond, NOIR);
    return cb > cn ? { couleur: BLANC, nom: 'blanc', ratio: cb } : { couleur: NOIR, nom: 'noir', ratio: cn };
  }

  function versLab(c) {
    var r = lin(c.r), g = lin(c.g), b = lin(c.b);
    var x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
    var y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
    var z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
    var f = function (t) { return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116; };
    var fx = f(x), fy = f(y), fz = f(z);
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
  }
  var LABS = null;
  function labsDesNoms() {
    if (!LABS) { LABS = LISTE.map(function (n) { return versLab(depuisHex(NOMS[n])); }); }
    return LABS;
  }
  // Nom CSS exact ou le plus proche (distance dans l'espace Lab). À égalité : le premier par ordre alphabétique.
  function nomProche(c) {
    var lab = versLab(c), labs = labsDesNoms(), meilleur = -1, dmin = Infinity;
    for (var i = 0; i < LISTE.length; i++) {
      var d = Math.sqrt(Math.pow(lab[0] - labs[i][0], 2) + Math.pow(lab[1] - labs[i][1], 2) + Math.pow(lab[2] - labs[i][2], 2));
      if (d < dmin) { dmin = d; meilleur = i; }
    }
    var nom = LISTE[meilleur], p = depuisHex(NOMS[nom]);
    return { nom: nom, hex: NOMS[nom], exact: p.r === c.r && p.g === c.g && p.b === c.b, distance: dmin };
  }

  function harmonies(c) {
    var hsl = rgbVersHsl(c);
    var rot = function (deg) { return hslVersRgb(hsl.h + deg, hsl.s, hsl.l); };
    return {
      complementaire: [rot(180)],
      analogues: [rot(-30), rot(30)],
      triade: [rot(120), rot(240)],
      adjacentes: [rot(150), rot(210)],
      tetrade: [rot(90), rot(180), rot(270)]
    };
  }
  function melange(c, cible, pct) {
    var f = function (a, b) { return Math.floor((a * (100 - pct) + b * pct + 50) / 100); };
    return { r: f(c.r, cible), g: f(c.g, cible), b: f(c.b, cible) };
  }
  // Teintes plus claires (mélange avec du blanc) et plus foncées (avec du noir), de 20 % à 80 %.
  function nuancier(c) {
    var pas = [20, 40, 60, 80];
    return {
      claires: pas.map(function (p) { return melange(c, 255, p); }),
      foncees: pas.map(function (p) { return melange(c, 0, p); })
    };
  }

  // Couleur de texte la plus proche (même teinte, clarté changée) qui atteint le contraste visé sur le fond.
  // Boucle bornée : 100 pas au plus dans chaque sens.
  function suggerer(texte, fond, cible) {
    cible = borne(cible, 1, 21);
    if (contraste(texte, fond) + EPS >= cible) { return { couleur: texte, deja: true, atteint: true }; }
    var hsl = rgbVersHsl(texte);
    var dist = function (c) { return Math.pow(c.r - texte.r, 2) + Math.pow(c.g - texte.g, 2) + Math.pow(c.b - texte.b, 2); };
    for (var pas = 1; pas <= 100; pas++) {
      var trouves = [];
      [-1, 1].forEach(function (sens) {
        var l = hsl.l + sens * pas;
        if (l < 0 || l > 100) { return; }
        var c = hslVersRgb(hsl.h, hsl.s, l);
        if (contraste(c, fond) + EPS >= cible) { trouves.push(c); }
      });
      if (trouves.length) {
        trouves.sort(function (a, b) { return dist(a) - dist(b); });
        return { couleur: trouves[0], deja: false, atteint: true };
      }
    }
    var cn = contraste(NOIR, fond), cb = contraste(BLANC, fond);
    return { couleur: cb > cn ? BLANC : NOIR, deja: false, atteint: Math.max(cn, cb) + EPS >= cible };
  }

  // Couleurs dominantes d'une image réduite (données RGBA). 512 classes de couleurs, tri par fréquence,
  // en écartant les couleurs trop proches d'une couleur déjà retenue. Plafond : 100 000 pixels.
  function dominantes(donnees, n) {
    n = entier(n, 1, 12);
    var nb = Math.min(Math.floor((donnees && donnees.length ? donnees.length : 0) / 4), 100000);
    var cnt = [], sr = [], sg = [], sb = [], i, total = 0;
    for (i = 0; i < 512; i++) { cnt.push(0); sr.push(0); sg.push(0); sb.push(0); }
    for (i = 0; i < nb; i++) {
      var o = i * 4;
      if (donnees[o + 3] < 128) { continue; }
      var k = ((donnees[o] >> 5) << 6) | ((donnees[o + 1] >> 5) << 3) | (donnees[o + 2] >> 5);
      cnt[k]++; sr[k] += donnees[o]; sg[k] += donnees[o + 1]; sb[k] += donnees[o + 2]; total++;
    }
    if (!total) { return []; }
    var idx = [];
    for (i = 0; i < 512; i++) { if (cnt[i] > 0) { idx.push(i); } }
    idx.sort(function (a, b) { return cnt[b] - cnt[a] || a - b; });
    var res = [];
    for (i = 0; i < idx.length && res.length < n; i++) {
      var q = idx[i];
      var c = rgb(sr[q] / cnt[q], sg[q] / cnt[q], sb[q] / cnt[q]);
      var proche = res.some(function (x) {
        return Math.pow(x.couleur.r - c.r, 2) + Math.pow(x.couleur.g - c.g, 2) + Math.pow(x.couleur.b - c.b, 2) < 48 * 48;
      });
      if (!proche) { res.push({ couleur: c, part: cnt[q] / total }); }
    }
    return res;
  }

  // Textes prêts à afficher.
  function rgbTexte(c) { return 'rgb(' + c.r + ', ' + c.g + ', ' + c.b + ')'; }
  function hslTexte(c) {
    var h = rgbVersHsl(c);
    return 'hsl(' + (Math.round(h.h) % 360) + ', ' + Math.round(h.s) + '%, ' + Math.round(h.l) + '%)';
  }
  function cmjnTexte(c) {
    var k = rgbVersCmjn(c);
    return 'C ' + Math.round(k.c) + ' % · M ' + Math.round(k.m) + ' % · J ' + Math.round(k.j) + ' % · N ' + Math.round(k.n) + ' %';
  }

  var COUL = {
    NOMS: NOMS, LISTE_NOMS: LISTE, validHex: validHex, depuisHex: depuisHex, versHex: versHex, hexAff: hexAff,
    lire: lire, rgbVersHsl: rgbVersHsl, hslVersRgb: hslVersRgb, rgbVersCmjn: rgbVersCmjn,
    luminance: luminance, contraste: contraste, ratioTronque: ratioTronque, verdicts: verdicts, texteLisible: texteLisible,
    versLab: versLab, nomProche: nomProche, harmonies: harmonies, melange: melange, nuancier: nuancier,
    suggerer: suggerer, dominantes: dominantes, rgbTexte: rgbTexte, hslTexte: hslTexte, cmjnTexte: cmjnTexte,
    rgb: rgb, NOIR: NOIR, BLANC: BLANC
  };
  if (typeof module === 'object' && module.exports) { module.exports = COUL; } else { racine.COUL = COUL; }
}(this));
