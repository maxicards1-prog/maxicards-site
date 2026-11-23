/* Outils pour joueurs Roblox (maxicards.net/roblox) : aucun appel réseau, aucune bibliothèque.
   Les calculs sont des fonctions pures (testées avec node) ; l'interface est montée seulement dans un navigateur.
   Toute saisie est affichée avec textContent : jamais d'insertion de HTML avec une valeur de l'utilisateur. */
(function () {
  'use strict';

  // ------------------------------------------------------------------ calculs (fonctions pures)
  var MIN_DEVEX = 30000;

  function lireNombre(s) {
    if (typeof s === 'number') return isFinite(s) ? s : null;
    var t = String(s == null ? '' : s).replace(/[\s  ]/g, '').replace(',', '.');
    if (t === '') return null;
    var n = Number(t);
    return isFinite(n) ? n : null;
  }

  // packs : [[robux sur roblox.com, robux de base, prix en centimes d'euro], ...] ; mode : 'web' (0) ou 'base' (1)
  function listePacks(packs, mode) {
    var i = mode === 'base' ? 1 : 0;
    return packs.map(function (p) { return { r: p[i], c: p[2] }; });
  }

  // Robux -> euros : combinaison de packs la moins chère qui donne AU MOINS la cible
  function achatPourRobux(cible, packs, mode) {
    cible = Math.ceil(cible);
    if (!(cible > 0) || cible > 500000) return null;
    var lp = listePacks(packs, mode), dp = new Array(cible + 1), ch = new Array(cible + 1), j, k;
    dp[0] = 0;
    for (j = 1; j <= cible; j++) {
      dp[j] = Infinity;
      for (k = 0; k < lp.length; k++) {
        var c = dp[Math.max(0, j - lp[k].r)] + lp[k].c;
        if (c < dp[j]) { dp[j] = c; ch[j] = k; }
      }
    }
    var lots = lp.map(function () { return 0; }), robux = 0;
    j = cible;
    while (j > 0) { k = ch[j]; lots[k]++; robux += lp[k].r; j = Math.max(0, j - lp[k].r); }
    return { centimes: dp[cible], robux: robux, lots: lots };
  }

  // euros -> Robux : le plus de Robux pour un budget donné (packs entiers seulement)
  function achatPourBudget(centimes, packs, mode) {
    centimes = Math.floor(centimes);
    if (!(centimes > 0) || centimes > 200000) return null;
    var lp = listePacks(packs, mode), dp = new Array(centimes + 1), ch = new Array(centimes + 1), b, k;
    dp[0] = 0; ch[0] = -1;
    for (b = 1; b <= centimes; b++) {
      dp[b] = dp[b - 1]; ch[b] = -1;
      for (k = 0; k < lp.length; k++) {
        if (b >= lp[k].c && dp[b - lp[k].c] + lp[k].r > dp[b]) { dp[b] = dp[b - lp[k].c] + lp[k].r; ch[b] = k; }
      }
    }
    var lots = lp.map(function () { return 0; }), depense = 0;
    b = centimes;
    while (b > 0) {
      if (ch[b] === -1) { b--; continue; }
      k = ch[b]; lots[k]++; depense += lp[k].c; b -= lp[k].c;
    }
    return { robux: dp[centimes], depense: depense, reste: centimes - depense, lots: lots };
  }

  // coût de 100 Robux pour un pack, en euros
  function coutPour100(pack, mode) {
    var r = mode === 'base' ? pack[1] : pack[0];
    return pack[2] / 100 / r * 100;
  }

  // DevEx : Robux gagnés -> dollars -> euros (eurEnDollars = nombre de dollars pour 1 euro)
  function devex(robux, tauxDollar, eurEnDollars) {
    var dollars = robux * tauxDollar;
    return { dollars: dollars, euros: eurEnDollars > 0 ? dollars / eurEnDollars : null,
             manque: Math.max(0, MIN_DEVEX - robux), atteint: robux >= MIN_DEVEX };
  }

  // Vente : part du créateur (0 à 1) sur un prix en Robux
  function gains(prix, part) {
    var cr = prix * part;
    return { createur: cr, roblox: prix - cr };
  }
  function prixPourGagner(cible, part) { return part > 0 ? Math.ceil(cible / part) : null; }

  // ------------------------------------------------------------------ pseudos
  var RE_OK = /^[A-Za-z0-9_]*$/;
  // Règles officielles (aide Roblox, 23/11/2026) : 3 à 20 caractères, lettres et chiffres, au plus un tiret bas,
  // pas au début ni à la fin.
  function verifierPseudo(s) {
    s = String(s == null ? '' : s);
    var res = [], n = s.length, sous = (s.match(/_/g) || []).length;
    res.push({ ok: n >= 3, texte: n >= 3 ? 'Longueur : au moins 3 caractères (' + n + ').' : 'Trop court : il faut au moins 3 caractères (' + n + ').' });
    res.push({ ok: n <= 20, texte: n <= 20 ? 'Longueur : 20 caractères au plus (' + n + ').' : 'Trop long : 20 caractères au plus (' + n + ').' });
    var vide = n === 0;
    var espace = /\s/.test(s);
    var ok = !vide && RE_OK.test(s);
    var mauvais = vide ? [] : s.split('').filter(function (c, i, a) { return !/[A-Za-z0-9_]/.test(c) && a.indexOf(c) === i; });
    res.push({ ok: ok, texte: ok ? 'Caractères : uniquement des lettres (A-Z, sans accent) et des chiffres.' :
      vide ? 'Écrivez un pseudo pour le vérifier.' :
      (espace ? 'Les espaces ne sont pas autorisés. ' : '') + 'Caractères refusés : ' + mauvais.map(function (c) { return /\s/.test(c) ? '« espace »' : '« ' + c + ' »'; }).join(' ') + ' (pas d\'accent ni de symbole).' });
    res.push({ ok: sous <= 1, texte: sous <= 1 ? 'Tiret bas : ' + (sous === 0 ? 'aucun' : 'un seul') + ', c\'est permis.' : 'Un seul tiret bas (_) est autorisé : il y en a ' + sous + '.' });
    var bord = n > 0 && (s.charAt(0) === '_' || s.charAt(n - 1) === '_');
    res.push({ ok: !bord, texte: !bord ? 'Le tiret bas n\'est ni au début ni à la fin.' : 'Le tiret bas ne peut être ni au début ni à la fin.' });
    return res;
  }
  function pseudoValide(s) { return verifierPseudo(s).every(function (r) { return r.ok; }) && String(s).length > 0; }

  var STYLES = {
    mignon: { nom: 'Mignon', pre: ['Petit', 'Mini', 'Doudou', 'Sweet', 'Cute', 'Happy', 'Lovely', 'Choupi'],
              suf: ['Chaton', 'Nuage', 'Bonbon', 'Licorne', 'Etoile', 'Peluche', 'Lapin', 'Panda'] },
    gamer: { nom: 'Gamer', pre: ['Pro', 'Ultra', 'Turbo', 'Super', 'Mega', 'Hyper', 'Epic', 'Alpha'],
             suf: ['Gamer', 'Master', 'Boss', 'Legend', 'Ninja', 'Pixel', 'Speed', 'Hunter'] },
    drole: { nom: 'Drôle', pre: ['Capitaine', 'Super', 'Docteur', 'Monsieur', 'Madame', 'Roi', 'Chef', 'Baron'],
             suf: ['Patate', 'Baguette', 'Crepe', 'Fromage', 'Pingouin', 'Cornichon', 'Banane', 'Nouille'] },
    mystere: { nom: 'Mystère', pre: ['Dark', 'Secret', 'Night', 'Silent', 'Hidden', 'Lost', 'Phantom', 'Mystic'],
               suf: ['Ombre', 'Shadow', 'Brume', 'Enigme', 'Cendre', 'Eclipse', 'Fantome', 'Mirage'] },
    epique: { nom: 'Épique', pre: ['Royal', 'Dragon', 'Titan', 'Sacred', 'Iron', 'Golden', 'Storm', 'Blazing'],
              suf: ['Chevalier', 'Dragon', 'Phenix', 'Guerrier', 'Eclair', 'Titan', 'Faucon', 'Loup'] }
  };

  function nettoyerMot(m) {
    var t = String(m == null ? '' : m);
    try { t = t.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { /* ancien navigateur */ }
    t = t.replace(/[^A-Za-z0-9]/g, '');
    if (t.length > 10) t = t.slice(0, 10);
    return t ? t.charAt(0).toUpperCase() + t.slice(1) : '';
  }

  function rng(graine) {
    var a = graine >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 12 idées respectant les règles de format ; graine fixe -> résultat reproductible (tests)
  function genererPseudos(mot, style, graine, n) {
    n = n || 12;
    var st = STYLES[style] || STYLES.gamer, m = nettoyerMot(mot), r = rng(graine == null ? Math.floor(Math.random() * 4294967296) : graine);
    function pick(l) { return l[Math.floor(r() * l.length)]; }
    function num() { return String(Math.floor(r() * 99) + 1); }
    var modeles = m ? [
      function () { return pick(st.pre) + m; },
      function () { return m + pick(st.suf); },
      function () { return pick(st.pre) + '_' + m; },
      function () { return m + '_' + pick(st.suf); },
      function () { return m + num(); },
      function () { return pick(st.pre) + m + num(); },
      function () { return m + pick(st.suf) + num(); },
      function () { return 'The' + m + pick(st.suf); }
    ] : [
      function () { return pick(st.pre) + pick(st.suf); },
      function () { return pick(st.pre) + '_' + pick(st.suf); },
      function () { return pick(st.pre) + pick(st.suf) + num(); },
      function () { return pick(st.suf) + num(); },
      function () { return pick(st.pre) + pick(st.suf) + pick(st.suf); }
    ];
    var vus = {}, out = [], essais = 0;
    while (out.length < n && essais < 600) {
      essais++;
      var p = modeles[Math.floor(r() * modeles.length)]();
      if (p.length > 20) continue;
      if (!pseudoValide(p) || vus[p.toLowerCase()]) continue;
      vus[p.toLowerCase()] = 1;
      out.push(p);
    }
    return out;
  }

  var API = { MIN_DEVEX: MIN_DEVEX, lireNombre: lireNombre, achatPourRobux: achatPourRobux, achatPourBudget: achatPourBudget,
              coutPour100: coutPour100, devex: devex, gains: gains, prixPourGagner: prixPourGagner,
              verifierPseudo: verifierPseudo, pseudoValide: pseudoValide, genererPseudos: genererPseudos,
              nettoyerMot: nettoyerMot, STYLES: STYLES };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document === 'undefined') { return; }

  // ------------------------------------------------------------------ interface
  var NF0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  var NF1 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 });
  var NF2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var NF4 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 6 });
  function eur(x) { return NF2.format(x) + ' €'; }
  function dol(x) { return NF2.format(x) + ' $'; }
  function rbx(x) { return NF0.format(x) + ' Robux'; }

  function h(tag, props) {
    var e = document.createElement(tag), i, k;
    props = props || {};
    for (k in props) { if (k === 'class') e.className = props[k]; else e.setAttribute(k, props[k]); }
    for (i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c == null) continue;
      e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return e;
  }
  var uid = 0;
  function champ(label, input, aide) {
    var id = 'c' + (++uid);
    input.id = id;
    return h('div', { 'class': 'champ' }, h('label', { 'for': id }, label), input, aide ? h('p', { 'class': 'aide' }, aide) : null);
  }
  function nombre(val, pas, min) {
    var i = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off' });
    i.value = String(val);
    return i;
  }
  function liste(vals) {
    var s = h('select');
    vals.forEach(function (v) { s.appendChild(h('option', { value: v[0] }, v[1])); });
    return s;
  }
  // Compteur animé : le nombre de tête monte (ou descend) jusqu'à sa valeur ; le texte final exact est toujours réécrit à la fin.
  var CALME = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var dernier = {};
  function animer(el, final) {
    if (CALME || !window.requestAnimationFrame) return;
    var m = /^(\d(?:[\d   ]*\d)?)(,(\d+))?/.exec(final);
    if (!m) return;
    var dec = m[3] ? m[3].length : 0;
    var cible = parseFloat(m[1].replace(/[^\d]/g, '') + (dec ? '.' + m[3] : ''));
    if (!isFinite(cible)) return;
    var reste = final.slice(m[0].length);
    var nf = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
    requestAnimationFrame(function () {
      var tu = el.parentNode, sortie = tu && tu.parentNode;
      if (!sortie) return;
      var cle = (sortie.parentNode && sortie.parentNode.getAttribute ? sortie.parentNode.getAttribute('data-outil') : '') + ':' + Array.prototype.indexOf.call(sortie.children, tu);
      var depart = dernier.hasOwnProperty(cle) ? dernier[cle] : 0;
      dernier[cle] = cible;
      if (depart === cible) return;
      sortie.setAttribute('aria-busy', 'true');
      var t0 = null, duree = 450;
      (function image(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - p, 3);
        if (p >= 1 || !el.parentNode) { el.textContent = final; sortie.removeAttribute('aria-busy'); return; }
        el.textContent = nf.format(depart + (cible - depart) * e) + reste;
        requestAnimationFrame(image);
      })(performance.now());
    });
  }
  function tuile(valeur, libelle, forte) {
    var v = h('span', { 'class': 'valeur' }, valeur);
    animer(v, valeur);
    return h('div', { 'class': 'tuile' + (forte ? ' forte' : '') }, v, h('span', { 'class': 'libelle' }, libelle));
  }
  // Action principale : un seul gros bouton (les calculs se font aussi en tapant)
  function action(libelle, fn) {
    var b = h('button', { type: 'button', 'class': 'principal' }, libelle);
    b.addEventListener('click', fn);
    return h('div', { 'class': 'boutons action' }, b);
  }
  function vider(e) { while (e.firstChild) e.removeChild(e.firstChild); }
  function packsDe(racine) { try { return JSON.parse(racine.getAttribute('data-packs') || '[]'); } catch (e) { return []; } }
  function nb(racine, nom, defaut) { var v = lireNombre(racine.getAttribute(nom)); return v == null ? defaut : v; }
  function lienLots(lots, packs, mode) {
    var parts = [];
    lots.forEach(function (n, i) { if (n > 0) parts.push(n + ' × ' + NF0.format(packs[i][mode === 'base' ? 1 : 0]) + ' Robux (' + eur(packs[i][2] / 100) + ')'); });
    return parts.join(' + ');
  }

  var OUTILS = {};

  // ---- Robux <-> euros
  OUTILS['robux-en-euros'] = function (racine) {
    var packs = packsDe(racine);
    var sens = liste([['re', 'Robux vers euros'], ['er', 'Euros vers Robux']]);
    var val = nombre(1000), src = liste([['web', 'Achat sur roblox.com (montant avec bonus)'], ['base', 'Montant de base (barré sur la page)']]);
    var sortie = h('div', { 'class': 'resultats', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    var aide = h('p', { 'class': 'aide' });
    racine.appendChild(h('div', { 'class': 'grille' }, champ('Je veux convertir', sens), champ('Quantité', val, ''), champ('Quels packs ?', src,
      'Le prix en euros est le même ; seule la quantité de Robux change. À vérifier à l\'achat.')));
    racine.appendChild(action('Convertir', function () { calc(); })); racine.appendChild(sortie); racine.appendChild(msg);
    function calc() {
      vider(sortie); vider(msg);
      var v = lireNombre(val.value), mode = src.value;
      if (v == null || v <= 0) { msg.textContent = 'Entrez un nombre positif.'; return; }
      var tauxMeilleur = Math.min.apply(null, packs.map(function (p) { return coutPour100(p, mode); }));
      if (sens.value === 're') {
        var a = achatPourRobux(v, packs, mode);
        if (!a) { msg.textContent = 'Entrez entre 1 et 500 000 Robux.'; return; }
        sortie.appendChild(tuile(eur(a.centimes / 100), 'à payer pour avoir au moins ' + rbx(Math.ceil(v)), true));
        sortie.appendChild(tuile(rbx(a.robux), 'Robux reçus avec cette combinaison'));
        sortie.appendChild(tuile(eur(a.centimes / 100 / a.robux * 100), 'coût de 100 Robux dans ce cas'));
        msg.textContent = 'Combinaison la moins chère : ' + lienLots(a.lots, packs, mode) + '. Le meilleur prix possible est de ' + eur(tauxMeilleur) + ' les 100 Robux avec le plus gros pack.';
      } else {
        var b = achatPourBudget(Math.round(v * 100), packs, mode);
        if (!b) { msg.textContent = 'Entrez un budget entre 0,01 et 2 000 euros.'; return; }
        if (b.robux === 0) { msg.textContent = 'Avec ' + eur(v) + ', on ne peut acheter aucun pack : le plus petit coûte ' + eur(packs[0][2] / 100) + '.'; return; }
        sortie.appendChild(tuile(rbx(b.robux), 'Robux pour un budget de ' + eur(v), true));
        sortie.appendChild(tuile(eur(b.depense / 100), 'réellement dépensé'));
        sortie.appendChild(tuile(eur(b.reste / 100), 'reste non utilisable'));
        msg.textContent = 'Combinaison : ' + lienLots(b.lots, packs, mode) + '.';
      }
    }
    [sens, val, src].forEach(function (e) { e.addEventListener('input', calc); e.addEventListener('change', calc); });
    calc();
  };

  // ---- DevEx
  OUTILS['devex-robux-en-euros'] = function (racine) {
    var val = nombre(30000), taux = nombre(NF4.format(nb(racine, 'data-taux', 0.0038))), chg = nombre(NF4.format(nb(racine, 'data-eur-usd', 1.0939)));
    var sortie = h('div', { 'class': 'resultats', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    racine.appendChild(h('div', { 'class': 'grille' },
      champ('Robux gagnés à retirer', val, 'Seuls les Robux gagnés (ventes dans vos jeux) comptent, pas ceux que vous avez achetés.'),
      champ('Taux DevEx ($ par Robux)', taux, 'Taux standard officiel au 23/11/2026 : 0,0038. Modifiez-le s\'il change ou si vous avez d\'anciens Robux à 0,0035.'),
      champ('Taux de change : 1 € = … $', chg, 'Valeur de la BCE au 23/11/2026 (1,0939). Votre banque applique son propre taux.')));
    racine.appendChild(action('Calculer', function () { calc(); })); racine.appendChild(sortie); racine.appendChild(msg);
    function calc() {
      vider(sortie); vider(msg);
      var r = lireNombre(val.value), t = lireNombre(taux.value), c = lireNombre(chg.value);
      if (r == null || r <= 0 || t == null || t <= 0 || c == null || c <= 0) { msg.textContent = 'Entrez des nombres positifs dans les trois champs.'; return; }
      var d = devex(r, t, c);
      sortie.appendChild(tuile(dol(d.dollars), 'montant DevEx en dollars', true));
      sortie.appendChild(tuile(eur(d.euros), 'équivalent en euros (avant impôts et frais bancaires)'));
      sortie.appendChild(tuile(eur(d.euros / r * 1000), 'valeur de 1 000 Robux gagnés'));
      msg.textContent = d.atteint ? 'Le minimum de ' + rbx(MIN_DEVEX) + ' est atteint : un retrait est possible si les autres conditions sont remplies.'
        : 'Il manque ' + rbx(d.manque) + ' pour atteindre le minimum de ' + rbx(MIN_DEVEX) + ' nécessaire pour retirer.';
    }
    [val, taux, chg].forEach(function (e) { e.addEventListener('input', calc); });
    calc();
  };

  // ---- Gains de vente
  OUTILS['calculateur-gains-vente-roblox'] = function (racine) {
    var prix = nombre(100), type = liste([['70', 'Pass de jeu ou produit développeur (70 %)'], ['30', 'Objet d\'avatar vendu sur la boutique (30 %)'],
      ['70u', 'Objet d\'avatar vendu dans votre propre jeu (70 %)'], ['x', 'Autre part (je saisis)']]);
    var autre = nombre(70), taux = nombre(NF4.format(nb(racine, 'data-taux', 0.0038))), chg = nombre(NF4.format(nb(racine, 'data-eur-usd', 1.0939)));
    var sortie = h('div', { 'class': 'resultats', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    var cAutre = champ('Part du créateur (%)', autre, 'Utilisé seulement avec « Autre part ».');
    cAutre.hidden = true;
    racine.appendChild(h('div', { 'class': 'grille' }, champ('Prix de vente en Robux', prix), champ('Type de vente', type), cAutre,
      champ('Taux DevEx ($ par Robux)', taux), champ('1 € = … $', chg)));
    racine.appendChild(action('Calculer', function () { calc(); })); racine.appendChild(sortie); racine.appendChild(msg);
    function part() {
      var v = type.value;
      if (v === '70' || v === '70u') return 0.7;
      if (v === '30') return 0.3;
      var a = lireNombre(autre.value);
      return a == null || a < 0 || a > 100 ? null : a / 100;
    }
    function calc() {
      vider(sortie); vider(msg);
      cAutre.hidden = type.value !== 'x';
      var p = lireNombre(prix.value), pa = part(), t = lireNombre(taux.value), c = lireNombre(chg.value);
      if (p == null || p <= 0 || pa == null || t == null || t <= 0 || c == null || c <= 0) { msg.textContent = 'Entrez un prix positif, une part entre 0 et 100 et des taux positifs.'; return; }
      var g = gains(p, pa), dol_ = g.createur * t;
      sortie.appendChild(tuile(NF1.format(g.createur) + ' Robux', 'ce que vous touchez par vente', true));
      sortie.appendChild(tuile(NF1.format(g.roblox) + ' Robux', 'part de Roblox (frais et vendeur)'));
      sortie.appendChild(tuile(dol(dol_) + ' ≈ ' + eur(dol_ / c), 'équivalent DevEx par vente'));
      sortie.appendChild(tuile(NF0.format(prixPourGagner(1000, pa)) + ' Robux', 'prix pour toucher environ 1 000 Robux'));
      msg.textContent = 'Roblox arrondit peut-être le résultat : comptez quelques Robux d\'écart. L\'équivalent en euros suppose un retrait DevEx (minimum ' + rbx(MIN_DEVEX) + ').';
    }
    [prix, type, autre, taux, chg].forEach(function (e) { e.addEventListener('input', calc); e.addEventListener('change', calc); });
    calc();
  };

  // ---- Vérifier un pseudo
  OUTILS['verifier-pseudo-roblox'] = function (racine) {
    var champPseudo = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '60' });
    var liste_ = h('ul', { 'class': 'regles', 'aria-live': 'polite' }), bilan = h('div', { 'class': 'message', role: 'status' });
    racine.appendChild(champ('Votre pseudo', champPseudo, 'Le texte reste dans votre navigateur.'));
    racine.appendChild(action('Vérifier', function () { calc(); })); racine.appendChild(bilan); racine.appendChild(liste_);
    racine.appendChild(h('p', { 'class': 'aide' }, 'Cet outil contrôle seulement le format. Il ne sait pas si le pseudo est libre ni s\'il sera accepté par la modération de Roblox.'));
    function calc() {
      vider(liste_); vider(bilan);
      var s = champPseudo.value;
      if (s === '') { bilan.textContent = 'Tapez un pseudo pour le contrôler.'; return; }
      var r = verifierPseudo(s), ko = r.filter(function (x) { return !x.ok; }).length;
      r.forEach(function (x) { liste_.appendChild(h('li', { 'class': x.ok ? 'positif' : 'negatif' }, (x.ok ? '✔ ' : '✘ ') + x.texte)); });
      bilan.textContent = ko === 0 ? 'Le format est valide. Reste à vérifier la disponibilité et la modération dans Roblox.' : ko + ' règle' + (ko > 1 ? 's' : '') + ' non respectée' + (ko > 1 ? 's' : '') + '.';
    }
    champPseudo.addEventListener('input', calc);
    calc();
  };

  // ---- Générateur de pseudos
  OUTILS['generateur-pseudo-roblox'] = function (racine) {
    var mot = h('input', { type: 'text', autocomplete: 'off', maxlength: '20' });
    var st = h('select');
    Object.keys(STYLES).forEach(function (k) { st.appendChild(h('option', { value: k }, STYLES[k].nom)); });
    st.value = 'gamer';
    var zone = h('ul', { 'class': 'pseudos', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    var go = h('button', { type: 'button', 'class': 'principal' }, 'Générer 12 idées');
    racine.appendChild(h('div', { 'class': 'grille' }, champ('Un mot (facultatif)', mot, 'Votre prénom, un surnom, un animal… sans accent ni espace.'), champ('Style', st)));
    racine.appendChild(h('div', { 'class': 'boutons' }, go));
    racine.appendChild(zone); racine.appendChild(msg);
    function generer() {
      vider(zone); vider(msg);
      genererPseudos(mot.value, st.value).forEach(function (p) {
        var b = h('button', { type: 'button', 'class': 'mini', 'aria-label': 'Copier ' + p }, 'Copier');
        b.addEventListener('click', function () {
          var fin = function (ok) { msg.textContent = ok ? '« ' + p + ' » copié.' : 'Copie impossible : sélectionnez le pseudo et copiez-le à la main.'; };
          try { navigator.clipboard.writeText(p).then(function () { fin(true); }, function () { fin(false); }); } catch (e) { fin(false); }
        });
        zone.appendChild(h('li', null, h('span', { 'class': 'nom' }, p), b));
      });
      msg.textContent = 'Ces idées respectent le format de Roblox. Vérifiez qu\'un pseudo est libre en essayant de créer ou de changer votre pseudo sur Roblox.';
    }
    go.addEventListener('click', generer);
    generer();
  };

  function monter() {
    var secs = document.querySelectorAll('section.outil[data-outil]');
    for (var i = 0; i < secs.length; i++) {
      var f = OUTILS[secs[i].getAttribute('data-outil')];
      if (f) { try { f(secs[i]); } catch (e) { secs[i].textContent = 'Cet outil n\'a pas pu démarrer sur ce navigateur.'; } }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter); else monter();
})();
