/* Tailles : pointures et tailles de vêtements. Logique pure (aucun accès à la page) : testée sous Node, copiée dans public/assets/js/. */
(function (racine) {
  'use strict';
  function fabriquer(D) {
    var C = D.chaussures;
    var TL = { D: D };
    var PI = Math.PI;

    function demi(v) { return Math.round(v * 2) / 2; }
    TL.demi = demi;
    function dans(v, a, b) { return typeof v === 'number' && isFinite(v) && v >= a && v <= b; }

    // ---------- pointures ----------
    // longueur du pied (cm) = pointure x 2/3 - marge ; marge d'aisance de 1 cm par défaut
    TL.piedDepuisEU = function (eu, marge) { return eu * C.point_paris_cm - (typeof marge === 'number' ? marge : C.marge); };
    TL.euDepuisPied = function (pied, marge) { return (pied + (typeof marge === 'number' ? marge : C.marge)) / C.point_paris_cm; };
    // longueur de la forme en pouces
    function formePouces(eu) { return eu * C.point_paris_cm / C.pouce_cm; }
    function euDepuisForme(L) { return L * C.pouce_cm / C.point_paris_cm; }
    // adulte (EU >= 33) : UK = 3L - 25 ; US homme = 3L - 24 ; US femme = 3L - 23
    TL.ukAdulte = function (eu) { return demi(3 * formePouces(eu) - 25); };
    TL.usHomme = function (eu) { return demi(3 * formePouces(eu) - 24); };
    TL.usFemme = function (eu) { return demi(3 * formePouces(eu) - 23); };
    // enfant (EU < 33) : UK enfant = 3L - 12 ; US enfant = 3L - 11,75
    TL.ukEnfant = function (eu) { return demi(3 * formePouces(eu) - 12); };
    TL.usEnfant = function (eu) { return demi(3 * formePouces(eu) - 11.75); };
    TL.euDepuisUK = function (uk) { return euDepuisForme((uk + 25) / 3); };
    TL.euDepuisUSH = function (us) { return euDepuisForme((us + 24) / 3); };
    TL.euDepuisUSF = function (us) { return euDepuisForme((us + 23) / 3); };
    // systèmes de départ du convertisseur ; NaN si la valeur sort de la plage plausible (EU 33 à 52)
    TL.versEU = function (systeme, v) {
      var eu;
      if (!dans(v, 0, 100)) { return NaN; }
      if (systeme === 'eu') { eu = v; }
      else if (systeme === 'uk') { eu = TL.euDepuisUK(v); }
      else if (systeme === 'ush') { eu = TL.euDepuisUSH(v); }
      else if (systeme === 'usf') { eu = TL.euDepuisUSF(v); }
      else if (systeme === 'pied' || systeme === 'mondo' || systeme === 'jp') { eu = TL.euDepuisPied(v); }
      else { return NaN; }
      return dans(eu, C.eu_min, C.eu_max) ? eu : NaN;
    };
    // toutes les valeurs pour une pointure EU (nombre quelconque dans la plage)
    TL.chaussure = function (eu) {
      var pied = TL.piedDepuisEU(eu);
      return { eu: eu, pied: pied, uk: TL.ukAdulte(eu), ush: TL.usHomme(eu), usf: TL.usFemme(eu), mondo: demi(pied), jp: demi(pied) };
    };
    // pied (cm) -> pointure : valeur exacte, pointure au demi-point le plus proche, et pointure entière au-dessus
    TL.pointureDepuisPied = function (pied, marge) {
      var m = typeof marge === 'number' ? marge : C.marge;
      if (!dans(pied, C.pied_min, C.pied_max) || !dans(m, 0, 3)) { return null; }
      var exact = TL.euDepuisPied(pied, m);
      return { exact: exact, proche: demi(exact), dessus: Math.ceil(exact - 1e-9) };
    };
    TL.pointureEnfantDepuisPied = function (pied, marge) {
      var p = TL.pointureDepuisPied(pied, marge);
      if (!p || p.exact > 33) { return null; }
      p.ukE = TL.ukEnfant(p.proche); p.usE = TL.usEnfant(p.proche);
      return p;
    };
    TL.enfantPointureAge = function (mois) {
      if (!dans(mois, 0, 156)) { return null; }
      var L = D.enfant_pointure;
      for (var i = 0; i < L.length; i++) { if (mois >= L[i].m0 && mois < L[i].m1) { return L[i]; } }
      return L[L.length - 1];
    };

    // ---------- vêtements ----------
    function plusProche(liste, cle, v) {
      var meilleur = null, ecart = Infinity;
      liste.forEach(function (x) { if (x[cle] === null || x[cle] === undefined) { return; } var e = Math.abs(x[cle] - v); if (e < ecart) { ecart = e; meilleur = x; } });
      return meilleur;
    }
    // mesures en cm (NaN ou null = non saisie) ; renvoie la taille conseillée = la plus grande des tailles trouvées
    TL.femmeDepuisMesures = function (poitrine, taille, hanches) {
      var vals = [[poitrine, 'poitrine', 'tour de poitrine', 60, 160], [taille, 'taille', 'tour de taille', 45, 150], [hanches, 'hanches', 'tour de hanches', 70, 170]];
      var trouves = [];
      for (var i = 0; i < vals.length; i++) {
        var v = vals[i];
        if (typeof v[0] === 'number' && isFinite(v[0])) {
          if (!dans(v[0], v[3], v[4])) { return { erreur: v[2] }; }
          trouves.push({ mesure: v[1], nom: v[2], taille: plusProche(D.femme, v[1], v[0]) });
        }
      }
      if (!trouves.length) { return null; }
      var grande = trouves.reduce(function (a, b) { return b.taille.fr > a.taille.fr ? b : a; });
      var mini = trouves.reduce(function (a, b) { return b.taille.fr < a.taille.fr ? b : a; });
      return { taille: grande.taille, detail: trouves, ecart: (grande.taille.fr - mini.taille.fr) / 2 };
    };
    TL.hommeDepuisPoitrine = function (poitrine) {
      if (!dans(poitrine, 70, 160)) { return null; }
      return plusProche(D.homme, 'poitrine', poitrine);
    };
    // jean : tour de taille (cm) -> W en pouces ; W -> centimètres
    TL.wDepuisTaille = function (cm) { return dans(cm, 55, 160) ? Math.round(cm / C.pouce_cm) : NaN; };
    TL.cmDepuisPouces = function (p) { return dans(p, 20, 70) ? p * C.pouce_cm : NaN; };
    TL.jeanHommeFR = function (w) {
      if (!dans(w, 28, 44)) { return null; }
      var L = D.jean_homme, r = L[0];
      for (var i = 0; i < L.length; i++) { if (w >= L[i].w) { r = L[i]; } }
      return r.fr;
    };
    TL.chemiseDepuisCou = function (cm) {
      if (!dans(cm, 30, 52)) { return null; }
      return plusProche(D.chemise, 'cm', cm);
    };
    // taille de vêtement enfant : la taille dont la plage contient la stature
    TL.vetementEnfantDepuisStature = function (cm) {
      if (!dans(cm, 40, 190)) { return null; }
      var L = D.enfant_vetement, r = L[0];
      for (var i = 0; i < L.length; i++) { if (cm >= L[i].taille) { r = L[i]; } }
      return r;
    };
    TL.vetementEnfantDepuisAge = function (mois) {
      if (!dans(mois, 0, 192)) { return null; }
      var L = D.enfant_vetement, r = L[1];
      for (var i = 1; i < L.length; i++) { if (mois >= L[i].mois) { r = L[i]; } }
      return r;
    };

    // ---------- soutien-gorge ----------
    // dessous de poitrine -> bande EU (multiple de 5) ; FR = EU + 15 ; UK/US : 70 EU = 32, +5 EU = +2
    TL.soutienGorge = function (dessous, poitrine) {
      if (!dans(dessous, 55, 130) || !dans(poitrine, 60, 170)) { return null; }
      var bande = Math.round(dessous / 5) * 5;
      var ecart = poitrine - dessous;
      if (ecart < 0) { return { erreur: 'poitrine' }; }
      var res = { bandeEU: bande, bandeFR: bande + 15, bandeUK: 32 + (bande - 70) * 2 / 5, ecart: ecart, bonnet: null, petit: false, grand: false };
      if (ecart < 10) { res.petit = true; return res; }
      var b = D.bonnets;
      for (var i = 0; i < b.length; i++) { if (ecart >= b[i].min && ecart < b[i].max) { res.bonnet = b[i]; break; } }
      if (!res.bonnet) { res.grand = true; }
      return res;
    };

    // ---------- bagues ----------
    // ISO 8653 : taille = tour de doigt intérieur en mm (France comprise). US : (C - 36,5) / 2,55. UK : lettre = (C - 40) / 1,25 + 3 (A = 1), au demi-point.
    TL.bague = function (circ) {
      if (!dans(circ, 40, 76)) { return null; }
      var n = demi((circ - 40) / 1.25 + 3);
      var uk = null;
      if (n >= 1 && n <= 26.5) { uk = String.fromCharCode(64 + Math.floor(n)) + (n % 1 ? '½' : ''); }
      return { circ: circ, diam: circ / PI, fr: Math.round(circ), us: demi((circ - 36.5) / 2.55), uk: uk };
    };
    TL.bagueDepuis = function (systeme, v) {
      var c;
      if (!dans(v, 0, 100)) { return null; }
      if (systeme === 'circ' || systeme === 'fr') { c = v; }
      else if (systeme === 'diam') { c = v * PI; }
      else if (systeme === 'us') { c = 2.55 * v + 36.5; }
      else { return null; }
      return TL.bague(c);
    };
    return TL;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = fabriquer; }
  else { racine.TL = fabriquer(racine.TL_DATA); }
}(typeof window !== 'undefined' ? window : this));
