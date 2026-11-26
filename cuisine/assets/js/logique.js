/* Cuisine : conversions et cuissons. Logique pure (aucun accès à la page) : testée sous Node, copiée dans public/assets/js/. */
(function (racine) {
  'use strict';
  function fabriquer(D) {
    var M = D.mesures;
    var CU = { D: D };

    function arrondi(v, pas) { return Math.round(v / pas) * pas; }
    CU.arrondi = arrondi;
    function ing(id) {
      for (var i = 0; i < D.ingredients.length; i++) { if (D.ingredients[i].id === id) { return D.ingredients[i]; } }
      return null;
    }
    CU.ing = ing;

    // ---------- cuillères <-> grammes ----------
    // mesure : 'cs' | 'cc' ; rase : true = rase, false = bombée (solides seulement)
    CU.gramParCuillere = function (id, mesure, rase) {
      var a = ing(id); if (!a) { return NaN; }
      var ml = mesure === 'cs' ? M.cs_ml : M.cc_ml;
      var g = ml * a.d;
      if (a.solide && rase === false) { g *= M.bombee; }
      return g;
    };
    CU.cuilleresVersG = function (id, n, mesure, rase) { return n * CU.gramParCuillere(id, mesure, rase); };
    CU.gVersCuilleres = function (id, g, mesure, rase) { return g / CU.gramParCuillere(id, mesure, rase); };

    // ---------- grammes <-> millilitres ----------
    CU.mlVersG = function (id, ml) { var a = ing(id); return a ? ml * a.d : NaN; };
    CU.gVersMl = function (id, g) { var a = ing(id); return a ? g / a.d : NaN; };

    // ---------- unités américaines ----------
    var VOL = { cup: M.cup_ml, tbsp: M.tbsp_ml, tsp: M.tsp_ml, floz: M.floz_ml, ml: 1, cl: 10, l: 1000 };
    var POIDS = { oz: M.oz_g, lb: M.lb_g, g: 1, kg: 1000 };
    CU.uniteVolume = function (u) { return Object.prototype.hasOwnProperty.call(VOL, u); };
    // renvoie {ml, g} (g si l'ingrédient est connu), depuis une quantité dans une unité de volume ou de poids
    CU.convertirUS = function (id, q, unite) {
      var a = ing(id), ml, g;
      if (CU.uniteVolume(unite)) { ml = q * VOL[unite]; g = a ? ml * a.d : NaN; }
      else if (Object.prototype.hasOwnProperty.call(POIDS, unite)) { g = q * POIDS[unite]; ml = a ? g / a.d : NaN; }
      else { return { ml: NaN, g: NaN }; }
      return { ml: ml, g: g };
    };
    CU.depuisG = function (g) { return { oz: g / M.oz_g, lb: g / M.lb_g }; };
    CU.depuisMl = function (ml) { return { cup: ml / M.cup_ml, tbsp: ml / M.tbsp_ml, tsp: ml / M.tsp_ml, floz: ml / M.floz_ml }; };

    // ---------- thermostat ----------
    CU.thermostatVersC = function (th) { return th * 30; };
    CU.cVersThermostat = function (c) { return c / 30; };
    CU.cVersF = function (c) { return c * 9 / 5 + 32; };
    CU.fVersC = function (f) { return (f - 32) * 5 / 9; };
    CU.tournante = function (c) { return c - D.tournante_moins; };
    CU.thermostatLePlusProche = function (c) { return Math.max(1, Math.min(10, Math.round(c / 30))); };

    // ---------- recette pour N personnes ----------
    var FRAC = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
    var RE_QTE = /^(\s*)(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½¼¾⅓⅔])(?:\s*)(.*)$/;
    function lireQuantite(t) {
      t = String(t).trim();
      if (FRAC[t] !== undefined) { return FRAC[t]; }
      var m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(t);
      if (m) { return +m[1] + (+m[2]) / (+m[3]); }
      m = /^(\d+)\/(\d+)$/.exec(t);
      if (m) { return (+m[1]) / (+m[2]); }
      return Number(t.replace(',', '.'));
    }
    function formaterQuantite(v) {
      if (v >= 100) { return String(Math.round(v / 5) * 5); }
      if (v >= 10) { return String(Math.round(v)); }
      var r = Math.round(v * 100) / 100;
      return String(r).replace('.', ',');
    }
    // lignes : tableau de textes. Renvoie [{avant, apres, note}]
    CU.adapterRecette = function (lignes, de, vers) {
      var k = vers / de;
      return lignes.map(function (ligne) {
        var m = RE_QTE.exec(ligne);
        if (!m || !isFinite(k) || k <= 0) { return { avant: ligne, apres: ligne, note: m ? '' : 'pas de quantité au début de la ligne : recopiée telle quelle' }; }
        var q = lireQuantite(m[2]);
        if (!isFinite(q)) { return { avant: ligne, apres: ligne, note: 'quantité non lue' }; }
        var nv = q * k, reste = m[3], note = '';
        if (/^(œuf|oeuf)/i.test(reste) && Math.abs(nv - Math.round(nv)) > 0.01) {
          note = 'œufs : arrondissez, ou battez un œuf et prenez-en une partie';
        }
        if (/^(g|kg|ml|cl|l)\b/i.test(reste) && /^(g)\b/i.test(reste) && q === 0) { note = ''; }
        return { avant: ligne, apres: formaterQuantite(nv) + (/^[a-zA-Zéèêàùœ]/.test(reste) && !/^(g|kg|ml|cl|l|dl|mg)\b/i.test(reste) ? ' ' : (reste ? ' ' : '')) + reste, note: note };
      });
    };
    CU.coefficientPersonnes = function (de, vers) { return vers / de; };

    // ---------- moules ----------
    // forme : 'rond' (d), 'carre' (c), 'rect' (l, L)
    CU.surface = function (forme, a, b) {
      if (forme === 'rond') { return Math.PI * Math.pow(a / 2, 2); }
      if (forme === 'carre') { return a * a; }
      return a * b;
    };
    CU.moule = function (s1, s2, tempsMin) {
      var ratio = s2 / s1;
      var facteur = Math.max(0.6, Math.min(1.6, Math.pow(ratio, -0.5)));
      return { ratio: ratio, facteur: facteur, temps: tempsMin * facteur, epaisseur: 1 / ratio };
    };

    // ---------- dinde ----------
    CU.dinde = function (kg, farcie) {
      var lb = kg / D.dinde.lb_kg, rows = D.dinde.rows, cle = farcie ? 'f' : 'nf';
      var pts = rows.map(function (r) {
        return { w: (r.lb[0] + r.lb[1]) / 2, lo: r[cle][0], hi: r[cle][1] };
      });
      function interp(champ) {
        if (lb < rows[0].lb[0]) { return rows[0][cle][champ === 'lo' ? 0 : 1] * lb / rows[0].lb[0]; }
        if (lb <= pts[0].w) { return pts[0][champ]; }
        for (var i = 0; i < pts.length - 1; i++) {
          if (lb <= pts[i + 1].w) {
            var f = (lb - pts[i].w) / (pts[i + 1].w - pts[i].w);
            return pts[i][champ] + f * (pts[i + 1][champ] - pts[i][champ]);
          }
        }
        var a = pts[pts.length - 2], b = pts[pts.length - 1];
        return b[champ] + (b[champ] - a[champ]) / (b.w - a.w) * (lb - b.w);
      }
      var lo = interp('lo'), hi = interp('hi');
      var dansTable = lb >= rows[0].lb[0] && lb <= rows[rows.length - 1].lb[1];
      return { lo: arrondi(lo, 5), hi: arrondi(Math.max(hi, lo + 10), 5), dansTable: dansTable, lb: lb };
    };

    // ---------- volailles ----------
    CU.volaille = function (id, kg, farcie) {
      var v = null;
      D.volailles.forEach(function (x) { if (x.id === id) { v = x; } });
      if (!v) { return null; }
      var plus = farcie ? v.farci_plus : 0;
      return { lo: arrondi(kg * v.mkg[0] + plus, 5), hi: arrondi(kg * v.mkg[1] + plus, 5), v: v,
        horsPlage: kg < v.kg[0] || kg > v.kg[1] };
    };

    // ---------- rôtis ----------
    CU.roti = function (id, niveau, kg) {
      var r = null, n = null;
      D.rotis.forEach(function (x) { if (x.id === id) { r = x; } });
      if (!r) { return null; }
      r.niveaux.forEach(function (x) { if (x.id === niveau) { n = x; } });
      if (!n) { return null; }
      return { lo: arrondi(kg * n.mkg[0], 5), hi: arrondi(kg * n.mkg[1], 5), r: r, n: n,
        horsPlage: kg < r.kg[0] || kg > r.kg[1] };
    };

    // ---------- œufs ----------
    CU.oeuf = function (id, froid) {
      var o = null;
      D.oeufs.forEach(function (x) { if (x.id === id) { o = x; } });
      if (!o) { return null; }
      var s = o.min * 60;
      if (froid && (id === 'coque' || id === 'mollet' || id === 'dur')) { s += 30; }
      return { secondes: s, o: o };
    };

    // ---------- féculents ----------
    CU.feculent = function (id, personnes, role) {
      var f = null;
      D.feculents.forEach(function (x) { if (x.id === id) { f = x; } });
      if (!f) { return null; }
      var g = personnes * (role === 'accompagnement' ? f.pers[1] : f.pers[0]);
      var r = { f: f, g: g };
      if (f.mode === 'eau') { r.eauL = g / 100 * f.litre_100g; r.selG = r.eauL * f.sel_l; }
      else { r.eauMl = (g / f.d) * f.vol; r.volMl = g / f.d; }
      return r;
    };

    // ---------- levures ----------
    // unite : 'fraiche' | 'seche' | 'instantanee' ; renvoie grammes des trois
    CU.levure = function (g, unite) {
      var k = D.levure.fraiche_sur_seche, fraiche;
      if (unite === 'fraiche') { fraiche = g; } else { fraiche = g * k; }
      return { fraiche: fraiche, seche: fraiche / k, instantanee: fraiche / k };
    };
    CU.levureChimique = function (farineG) { return farineG / 500 * D.levure.chimique_par_500g_farine; };

    // ---------- gélatine ----------
    CU.gelatine = function (valeur, unite) {
      var f = D.gelatine.feuille_g, a = D.gelatine.agar_pour_gelatine, g;
      if (unite === 'feuilles') { g = valeur * f; } else if (unite === 'poudre') { g = valeur; } else { g = valeur * a; }
      return { feuilles: g / f, poudre: g, agar: g / a };
    };

    // ---------- pizza ----------
    CU.pizza = function (n, poids, hydratation, selPct, levurePct) {
      var total = n * poids, farine = total / (1 + hydratation + selPct + levurePct);
      return { total: total, farine: farine, eau: farine * hydratation, sel: farine * selPct, levure: farine * levurePct };
    };

    // ---------- planning du repas ----------
    // t : minutes depuis minuit du jour du repas ; plats : [{nom, prep, cuisson, repos, four, temp}]
    // Le plat est servi à t : repos juste avant, cuisson avant le repos, préparation avant la cuisson.
    CU.planning = function (t, plats) {
      var etapes = [], intervalles = [];
      plats.forEach(function (p, i) {
        var finRepos = t, finCuisson = t - (p.repos || 0), debutCuisson = finCuisson - (p.cuisson || 0),
          debutPrep = debutCuisson - (p.prep || 0);
        if (p.prep > 0) { etapes.push({ t: debutPrep, nom: p.nom, action: 'Commencer la préparation', plat: i }); }
        if (p.cuisson > 0) {
          etapes.push({ t: debutCuisson, nom: p.nom, action: p.four ? 'Enfourner' + (p.temp ? ' à ' + p.temp + ' °C' : '') : 'Lancer la cuisson', plat: i });
          etapes.push({ t: finCuisson, nom: p.nom, action: p.four ? 'Sortir du four' : 'Fin de cuisson', plat: i });
        }
        if (p.repos > 0) { etapes.push({ t: finCuisson, nom: p.nom, action: 'Laisser reposer (couvert)', plat: i, repos: true }); }
        etapes.push({ t: finRepos, nom: p.nom, action: 'À table', plat: i, service: true });
        if (p.four && p.cuisson > 0) { intervalles.push({ i: i, nom: p.nom, debut: debutCuisson, fin: finCuisson, temp: p.temp || 0 }); }
      });
      etapes.sort(function (a, b) { return a.t - b.t || (a.service ? 1 : 0) - (b.service ? 1 : 0); });
      var conflits = [];
      for (var a = 0; a < intervalles.length; a++) {
        for (var b = a + 1; b < intervalles.length; b++) {
          var x = intervalles[a], y = intervalles[b];
          var debut = Math.max(x.debut, y.debut), fin = Math.min(x.fin, y.fin);
          if (fin > debut && x.temp !== y.temp) {
            var premier = x.debut <= y.debut ? x : y, second = premier === x ? y : x;
            conflits.push({ a: premier.nom, b: second.nom, tempA: premier.temp, tempB: second.temp, debut: debut, fin: fin,
              chevauchement: fin - debut, finPremier: premier.fin });
          }
        }
      }
      return { etapes: etapes, conflits: conflits };
    };
    CU.heure = function (min) {
      var jour = Math.floor(min / 1440), r = min - jour * 1440, h = Math.floor(r / 60), m = Math.round(r % 60);
      if (m === 60) { h += 1; m = 0; }
      var s = (h < 10 ? '0' : '') + h + ' h ' + (m < 10 ? '0' : '') + m;
      if (jour < 0) { s += ' (la veille' + (jour < -1 ? ', ' + (-jour) + ' jours avant' : '') + ')'; }
      return s;
    };
    return CU;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = fabriquer; }
  else { racine.CU = fabriquer(racine.CU_DATA); }
}(typeof window !== 'undefined' ? window : this));
