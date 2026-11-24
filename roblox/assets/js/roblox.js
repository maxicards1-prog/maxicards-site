/* Outils pour joueurs Roblox (maxicards.net/roblox) : aucun appel réseau, aucune bibliothèque.
   Les calculs sont des fonctions pures (testées avec node) ; l'interface est montée seulement dans un navigateur.
   Toute saisie est affichée avec textContent : jamais d'insertion de HTML avec une valeur de l'utilisateur.
   Langues (24/11/2026) : fr (par défaut), en, es, pt d'après <html lang> ; les chiffres restent dans les data-* de la page
   (data-devise = EUR, USD ou BRL ; data-change = reais pour 1 dollar). */
(function () {
  'use strict';

  // ------------------------------------------------------------------ calculs (fonctions pures)
  var MIN_DEVEX = 30000;

  // dec : séparateur décimal de la langue. Absent = français (comme avant) ; '.' = anglais (virgules de milliers retirées) ;
  // ',' = espagnol / portugais (points de milliers retirés : 1.000 -> 1000, mais 1.0939 reste 1.0939).
  function lireNombre(s, dec) {
    if (typeof s === 'number') return isFinite(s) ? s : null;
    var t = String(s == null ? '' : s).replace(/[\s  ]/g, '');
    if (dec === '.') t = t.replace(/,/g, '');
    else if (dec === ',') t = t.replace(/\.(?=\d{3}(?:\D|$))/g, '').replace(',', '.');
    else t = t.replace(',', '.');
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
  // Textes des règles par langue (fr = textes d'origine, inchangés)
  var REGLES = {
    fr: { court: function (n) { return 'Trop court : il faut au moins 3 caractères (' + n + ').'; },
          lgOk: function (n) { return 'Longueur : au moins 3 caractères (' + n + ').'; },
          maxOk: function (n) { return 'Longueur : 20 caractères au plus (' + n + ').'; },
          long: function (n) { return 'Trop long : 20 caractères au plus (' + n + ').'; },
          carOk: 'Caractères : uniquement des lettres (A-Z, sans accent) et des chiffres.', vide: 'Écrivez un pseudo pour le vérifier.',
          espaces: 'Les espaces ne sont pas autorisés. ', refuses: 'Caractères refusés : ', espace: '« espace »',
          car: function (c) { return '« ' + c + ' »'; }, finRefus: ' (pas d\'accent ni de symbole).',
          sousOk: function (s) { return 'Tiret bas : ' + (s === 0 ? 'aucun' : 'un seul') + ', c\'est permis.'; },
          sousKo: function (s) { return 'Un seul tiret bas (_) est autorisé : il y en a ' + s + '.'; },
          bordOk: 'Le tiret bas n\'est ni au début ni à la fin.', bordKo: 'Le tiret bas ne peut être ni au début ni à la fin.' },
    en: { court: function (n) { return 'Too short: at least 3 characters needed (' + n + ').'; },
          lgOk: function (n) { return 'Length: at least 3 characters (' + n + ').'; },
          maxOk: function (n) { return 'Length: 20 characters at most (' + n + ').'; },
          long: function (n) { return 'Too long: 20 characters at most (' + n + ').'; },
          carOk: 'Characters: only letters (A-Z, no accents) and numbers.', vide: 'Type a username to check it.',
          espaces: 'Spaces are not allowed. ', refuses: 'Characters not allowed: ', espace: '"space"',
          car: function (c) { return '"' + c + '"'; }, finRefus: ' (no accents or symbols).',
          sousOk: function (s) { return 'Underscore: ' + (s === 0 ? 'none' : 'just one') + ', that is allowed.'; },
          sousKo: function (s) { return 'Only one underscore (_) is allowed: there are ' + s + '.'; },
          bordOk: 'The underscore is neither at the start nor at the end.', bordKo: 'The underscore cannot be at the start or at the end.' },
    es: { court: function (n) { return 'Demasiado corto: hacen falta al menos 3 caracteres (' + n + ').'; },
          lgOk: function (n) { return 'Longitud: al menos 3 caracteres (' + n + ').'; },
          maxOk: function (n) { return 'Longitud: 20 caracteres como máximo (' + n + ').'; },
          long: function (n) { return 'Demasiado largo: 20 caracteres como máximo (' + n + ').'; },
          carOk: 'Caracteres: solo letras (A-Z, sin tildes ni ñ) y números.', vide: 'Escribe un nombre de usuario para comprobarlo.',
          espaces: 'No se permiten espacios. ', refuses: 'Caracteres no permitidos: ', espace: '«espacio»',
          car: function (c) { return '«' + c + '»'; }, finRefus: ' (sin tildes ni símbolos).',
          sousOk: function (s) { return 'Guion bajo: ' + (s === 0 ? 'ninguno' : 'solo uno') + ', está permitido.'; },
          sousKo: function (s) { return 'Solo se permite un guion bajo (_): hay ' + s + '.'; },
          bordOk: 'El guion bajo no está ni al principio ni al final.', bordKo: 'El guion bajo no puede ir ni al principio ni al final.' },
    pt: { court: function (n) { return 'Curto demais: são necessários pelo menos 3 caracteres (' + n + ').'; },
          lgOk: function (n) { return 'Tamanho: pelo menos 3 caracteres (' + n + ').'; },
          maxOk: function (n) { return 'Tamanho: no máximo 20 caracteres (' + n + ').'; },
          long: function (n) { return 'Longo demais: no máximo 20 caracteres (' + n + ').'; },
          carOk: 'Caracteres: só letras (A-Z, sem acento nem ç) e números.', vide: 'Digite um nome de usuário para verificar.',
          espaces: 'Espaços não são permitidos. ', refuses: 'Caracteres não permitidos: ', espace: '"espaço"',
          car: function (c) { return '"' + c + '"'; }, finRefus: ' (sem acento nem símbolo).',
          sousOk: function (s) { return 'Sublinhado: ' + (s === 0 ? 'nenhum' : 'só um') + ', é permitido.'; },
          sousKo: function (s) { return 'Só um sublinhado (_) é permitido: há ' + s + '.'; },
          bordOk: 'O sublinhado não está nem no início nem no fim.', bordKo: 'O sublinhado não pode ficar nem no início nem no fim.' }
  };
  // Règles officielles (aide Roblox, 23/11/2026) : 3 à 20 caractères, lettres et chiffres, au plus un tiret bas,
  // pas au début ni à la fin.
  function verifierPseudo(s, lang) {
    var R = REGLES[lang] || REGLES.fr;
    s = String(s == null ? '' : s);
    var res = [], n = s.length, sous = (s.match(/_/g) || []).length;
    res.push({ ok: n >= 3, texte: n >= 3 ? R.lgOk(n) : R.court(n) });
    res.push({ ok: n <= 20, texte: n <= 20 ? R.maxOk(n) : R.long(n) });
    var vide = n === 0;
    var espace = /\s/.test(s);
    var ok = !vide && RE_OK.test(s);
    var mauvais = vide ? [] : s.split('').filter(function (c, i, a) { return !/[A-Za-z0-9_]/.test(c) && a.indexOf(c) === i; });
    res.push({ ok: ok, texte: ok ? R.carOk : vide ? R.vide :
      (espace ? R.espaces : '') + R.refuses + mauvais.map(function (c) { return /\s/.test(c) ? R.espace : R.car(c); }).join(' ') + R.finRefus });
    res.push({ ok: sous <= 1, texte: sous <= 1 ? R.sousOk(sous) : R.sousKo(sous) });
    var bord = n > 0 && (s.charAt(0) === '_' || s.charAt(n - 1) === '_');
    res.push({ ok: !bord, texte: !bord ? R.bordOk : R.bordKo });
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
  // Autres langues : mêmes clés ; « Gamer » et les débuts des styles mystère et épique restent en anglais, comme en français.
  function style_(nom, pre, suf) { return { nom: nom, pre: pre, suf: suf }; }
  var STYLES_L = {
    fr: STYLES,
    en: { mignon: style_('Cute', ['Little', 'Mini', 'Sweet', 'Cute', 'Happy', 'Lovely', 'Tiny', 'Fluffy'],
                         ['Kitten', 'Cloud', 'Candy', 'Unicorn', 'Star', 'Teddy', 'Bunny', 'Panda']),
          gamer: STYLES.gamer,
          drole: style_('Funny', ['Captain', 'Super', 'Doctor', 'Mister', 'Lady', 'King', 'Chef', 'Baron'],
                        ['Potato', 'Waffle', 'Pancake', 'Cheese', 'Penguin', 'Pickle', 'Banana', 'Noodle']),
          mystere: style_('Mystery', STYLES.mystere.pre, ['Shade', 'Shadow', 'Mist', 'Enigma', 'Ash', 'Eclipse', 'Ghost', 'Mirage']),
          epique: style_('Epic', STYLES.epique.pre, ['Knight', 'Dragon', 'Phoenix', 'Warrior', 'Thunder', 'Titan', 'Falcon', 'Wolf']) },
    es: { mignon: style_('Tierno', ['Mini', 'Dulce', 'Peque', 'Sweet', 'Cute', 'Happy', 'Lindo', 'Tierno'],
                         ['Gatito', 'Nube', 'Caramelo', 'Unicornio', 'Estrella', 'Peluche', 'Conejo', 'Panda']),
          gamer: STYLES.gamer,
          drole: style_('Gracioso', ['Capitan', 'Super', 'Doctor', 'Senor', 'Profe', 'Rey', 'Chef', 'Baron'],
                        ['Papa', 'Churro', 'Taco', 'Queso', 'Pinguino', 'Pepino', 'Banana', 'Fideo']),
          mystere: style_('Misterio', STYLES.mystere.pre, ['Sombra', 'Shadow', 'Niebla', 'Enigma', 'Ceniza', 'Eclipse', 'Fantasma', 'Espejismo']),
          epique: style_('Épico', STYLES.epique.pre, ['Caballero', 'Dragon', 'Fenix', 'Guerrero', 'Rayo', 'Titan', 'Halcon', 'Lobo']) },
    pt: { mignon: style_('Fofo', ['Mini', 'Doce', 'Fofo', 'Sweet', 'Cute', 'Happy', 'Lindo', 'Tiny'],
                         ['Gatinho', 'Nuvem', 'Docinho', 'Unicornio', 'Estrela', 'Pelucia', 'Coelho', 'Panda']),
          gamer: STYLES.gamer,
          drole: style_('Engraçado', ['Capitao', 'Super', 'Doutor', 'Senhor', 'Dona', 'Rei', 'Chef', 'Barao'],
                        ['Batata', 'Pastel', 'Coxinha', 'Queijo', 'Pinguim', 'Pepino', 'Banana', 'Miojo']),
          mystere: style_('Mistério', STYLES.mystere.pre, ['Sombra', 'Shadow', 'Nevoa', 'Enigma', 'Cinza', 'Eclipse', 'Fantasma', 'Miragem']),
          epique: style_('Épico', STYLES.epique.pre, ['Cavaleiro', 'Dragao', 'Fenix', 'Guerreiro', 'Raio', 'Titan', 'Falcao', 'Lobo']) }
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
  function genererPseudos(mot, style, graine, n, lang) {
    n = n || 12;
    var S = STYLES_L[lang] || STYLES;
    var st = S[style] || S.gamer, m = nettoyerMot(mot), r = rng(graine == null ? Math.floor(Math.random() * 4294967296) : graine);
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
              nettoyerMot: nettoyerMot, STYLES: STYLES, STYLES_L: STYLES_L, REGLES: REGLES };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof document === 'undefined') { return; }

  // ------------------------------------------------------------------ langue de la page
  var LANG = String(document.documentElement.lang || 'fr').slice(0, 2).toLowerCase();
  if (!REGLES[LANG]) LANG = 'fr';
  var LOC = { fr: 'fr-FR', en: 'en-US', es: 'es-ES', pt: 'pt-BR' }[LANG];
  var DEC = { fr: undefined, en: '.', es: ',', pt: ',' }[LANG];
  function lire(s) { return lireNombre(s, DEC); }

  // Libellés de l'interface (fr = textes d'origine)
  var TXT = {
    fr: {
      sens: 'Je veux convertir', re: 'Robux vers euros', er: 'Euros vers Robux', qte: 'Quantité', quels: 'Quels packs ?',
      web: 'Achat sur roblox.com (montant avec bonus)', base: 'Montant de base (barré sur la page)',
      packsAide: 'Le prix en euros est le même ; seule la quantité de Robux change. À vérifier à l\'achat.',
      convertir: 'Convertir', positif: 'Entrez un nombre positif.', borneR: 'Entrez entre 1 et 500 000 Robux.',
      aPayer: function (r) { return 'à payer pour avoir au moins ' + r; }, recus: 'Robux reçus avec cette combinaison',
      cout100: 'coût de 100 Robux dans ce cas',
      combiMin: function (l, m) { return 'Combinaison la moins chère : ' + l + '. Le meilleur prix possible est de ' + m + ' les 100 Robux avec le plus gros pack.'; },
      borneB: 'Entrez un budget entre 0,01 et 2 000 euros.',
      aucun: function (v, p) { return 'Avec ' + v + ', on ne peut acheter aucun pack : le plus petit coûte ' + p + '.'; },
      pourBudget: function (v) { return 'Robux pour un budget de ' + v; }, depense: 'réellement dépensé', reste: 'reste non utilisable',
      combi: function (l) { return 'Combinaison : ' + l + '.'; },
      dxRobux: 'Robux gagnés à retirer', dxRobuxAide: 'Seuls les Robux gagnés (ventes dans vos jeux) comptent, pas ceux que vous avez achetés.',
      dxTaux: 'Taux DevEx ($ par Robux)',
      dxTauxAide: 'Taux standard officiel au 23/11/2026 : 0,0038. Modifiez-le s\'il change ou si vous avez d\'anciens Robux à 0,0035.',
      dxChg: 'Taux de change : 1 € = … $', dxChgAide: 'Valeur de la BCE au 23/11/2026 (1,0939). Votre banque applique son propre taux.',
      calculer: 'Calculer', dxPositif: 'Entrez des nombres positifs dans les trois champs.', dxDol: 'montant DevEx en dollars',
      dxLoc: 'équivalent en euros (avant impôts et frais bancaires)', dx1000: 'valeur de 1 000 Robux gagnés',
      dxOk: function (m) { return 'Le minimum de ' + m + ' est atteint : un retrait est possible si les autres conditions sont remplies.'; },
      dxManque: function (x, m) { return 'Il manque ' + x + ' pour atteindre le minimum de ' + m + ' nécessaire pour retirer.'; },
      gPrix: 'Prix de vente en Robux', gType: 'Type de vente', g70: 'Pass de jeu ou produit développeur (70 %)',
      g30: 'Objet d\'avatar vendu sur la boutique (30 %)', g70u: 'Objet d\'avatar vendu dans votre propre jeu (70 %)', gX: 'Autre part (je saisis)',
      gAutre: 'Part du créateur (%)', gAutreAide: 'Utilisé seulement avec « Autre part ».', gChg: '1 € = … $',
      gPositif: 'Entrez un prix positif, une part entre 0 et 100 et des taux positifs.', gTouche: 'ce que vous touchez par vente',
      gRoblox: 'part de Roblox (frais et vendeur)', gDevex: 'équivalent DevEx par vente', g1000: 'prix pour toucher environ 1 000 Robux',
      gMsg: function (m) { return 'Roblox arrondit peut-être le résultat : comptez quelques Robux d\'écart. L\'équivalent en euros suppose un retrait DevEx (minimum ' + m + ').'; },
      pLabel: 'Votre pseudo', pAide: 'Le texte reste dans votre navigateur.', verifier: 'Vérifier',
      pLimite: 'Cet outil contrôle seulement le format. Il ne sait pas si le pseudo est libre ni s\'il sera accepté par la modération de Roblox.',
      pVide: 'Tapez un pseudo pour le contrôler.', pOk: 'Le format est valide. Reste à vérifier la disponibilité et la modération dans Roblox.',
      pKo: function (k) { return k + ' règle' + (k > 1 ? 's' : '') + ' non respectée' + (k > 1 ? 's' : '') + '.'; },
      genBtn: 'Générer 12 idées', genMot: 'Un mot (facultatif)', genMotAide: 'Votre prénom, un surnom, un animal… sans accent ni espace.',
      genStyle: 'Style', copier: 'Copier', copierAria: function (p) { return 'Copier ' + p; },
      copie: function (p) { return '« ' + p + ' » copié.'; }, copieKo: 'Copie impossible : sélectionnez le pseudo et copiez-le à la main.',
      genMsg: 'Ces idées respectent le format de Roblox. Vérifiez qu\'un pseudo est libre en essayant de créer ou de changer votre pseudo sur Roblox.',
      erreur: 'Cet outil n\'a pas pu démarrer sur ce navigateur.'
    },
    en: {
      sens: 'I want to convert', re: 'Robux to euros', er: 'Euros to Robux', qte: 'Amount', quels: 'Which packs?',
      web: 'Bought on roblox.com (amount with bonus)', base: 'Base amount (crossed out on the page)',
      packsAide: 'The euro price is the same; only the number of Robux changes. Check it when you buy.',
      convertir: 'Convert', positif: 'Enter a positive number.', borneR: 'Enter between 1 and 500,000 Robux.',
      aPayer: function (r) { return 'to pay to get at least ' + r; }, recus: 'Robux received with this combination',
      cout100: 'cost of 100 Robux in this case',
      combiMin: function (l, m) { return 'Cheapest combination: ' + l + '. The best possible price is ' + m + ' per 100 Robux with the biggest pack.'; },
      borneB: 'Enter a budget between 0.01 and 2,000 euros.',
      aucun: function (v, p) { return 'With ' + v + ', no pack can be bought: the smallest one costs ' + p + '.'; },
      pourBudget: function (v) { return 'Robux for a budget of ' + v; }, depense: 'actually spent', reste: 'left over, cannot be used',
      combi: function (l) { return 'Combination: ' + l + '.'; },
      dxRobux: 'Earned Robux to cash out', dxRobuxAide: 'Only earned Robux (sales in your experiences) count, not Robux you bought.',
      dxTaux: 'DevEx rate ($ per Robux)',
      dxTauxAide: 'Official standard rate on November 23, 2026: 0.0038. Change it if Roblox updates it or if you have older Robux at 0.0035.',
      calculer: 'Calculate', dxPositif: 'Enter positive numbers in both fields.', dxDol: 'DevEx amount in US dollars',
      dx1000: 'value of 1,000 earned Robux', dxSeuil: 'what the 30,000 Robux minimum is worth',
      dxOk: function (m) { return 'The ' + m + ' minimum is reached: a cash-out is possible if the other conditions are met.'; },
      dxManque: function (x, m) { return 'You need ' + x + ' more to reach the ' + m + ' minimum required to cash out.'; },
      gPrix: 'Sale price in Robux', gType: 'Type of sale', g70: 'Game pass or developer product (70%)',
      g30: 'Avatar item sold in the Marketplace (30%)', g70u: 'Avatar item sold in your own experience (70%)', gX: 'Other share (I type it)',
      gAutre: 'Creator share (%)', gAutreAide: 'Only used with "Other share".',
      gPositif: 'Enter a positive price, a share between 0 and 100 and a positive rate.', gTouche: 'what you get per sale',
      gRoblox: 'Roblox share (fees and seller)', gDevex: 'DevEx value per sale', g1000: 'price to get about 1,000 Robux',
      gMsg: function (m) { return 'Roblox may round the result: allow a few Robux of difference. The dollar value assumes a DevEx cash-out (minimum ' + m + ').'; },
      pLabel: 'Your username', pAide: 'The text stays in your browser.', verifier: 'Check',
      pLimite: 'This tool only checks the format. It cannot tell whether the username is free or whether Roblox moderation will accept it.',
      pVide: 'Type a username to check it.', pOk: 'The format is valid. You still need to check availability and moderation in Roblox.',
      pKo: function (k) { return k + ' rule' + (k > 1 ? 's' : '') + ' not met.'; },
      genBtn: 'Generate 12 ideas', genMot: 'A word (optional)', genMotAide: 'Your first name, a nickname, an animal… no accents or spaces.',
      genStyle: 'Style', copier: 'Copy', copierAria: function (p) { return 'Copy ' + p; },
      copie: function (p) { return '"' + p + '" copied.'; }, copieKo: 'Copy failed: select the username and copy it by hand.',
      genMsg: 'These ideas follow the Roblox format. Check that a username is free by trying to create or change your username on Roblox.',
      erreur: 'This tool could not start in this browser.'
    },
    es: {
      sens: 'Quiero convertir', re: 'Robux a euros', er: 'Euros a Robux', qte: 'Cantidad', quels: '¿Qué paquetes?',
      web: 'Compra en roblox.com (cantidad con bonificación)', base: 'Cantidad base (tachada en la página)',
      packsAide: 'El precio en euros es el mismo; solo cambia la cantidad de Robux. Compruébalo al comprar.',
      convertir: 'Convertir', positif: 'Escribe un número positivo.', borneR: 'Escribe entre 1 y 500.000 Robux.',
      aPayer: function (r) { return 'a pagar para tener al menos ' + r; }, recus: 'Robux recibidos con esta combinación',
      cout100: 'coste de 100 Robux en este caso',
      combiMin: function (l, m) { return 'Combinación más barata: ' + l + '. El mejor precio posible es ' + m + ' por 100 Robux con el paquete más grande.'; },
      borneB: 'Escribe un presupuesto entre 0,01 y 2.000 euros.',
      aucun: function (v, p) { return 'Con ' + v + ' no se puede comprar ningún paquete: el más pequeño cuesta ' + p + '.'; },
      pourBudget: function (v) { return 'Robux con un presupuesto de ' + v; }, depense: 'gastado de verdad', reste: 'sobrante que no se puede usar',
      combi: function (l) { return 'Combinación: ' + l + '.'; },
      dxRobux: 'Robux ganados para retirar', dxRobuxAide: 'Solo cuentan los Robux ganados (ventas en tus juegos), no los que compraste.',
      dxTaux: 'Tasa DevEx (US$ por Robux)',
      dxTauxAide: 'Tasa estándar oficial el 23/11/2026: 0,0038. Cámbiala si Roblox la modifica o si tienes Robux antiguos a 0,0035.',
      calculer: 'Calcular', dxPositif: 'Escribe números positivos en los dos campos.', dxDol: 'importe DevEx en dólares',
      dx1000: 'valor de 1.000 Robux ganados', dxSeuil: 'lo que vale el mínimo de 30.000 Robux',
      dxOk: function (m) { return 'Se alcanza el mínimo de ' + m + ': puedes retirar si cumples las demás condiciones.'; },
      dxManque: function (x, m) { return 'Faltan ' + x + ' para llegar al mínimo de ' + m + ' necesario para retirar.'; },
      gPrix: 'Precio de venta en Robux', gType: 'Tipo de venta', g70: 'Pase de juego o producto de desarrollador (70 %)',
      g30: 'Objeto de avatar vendido en el Marketplace (30 %)', g70u: 'Objeto de avatar vendido en tu propio juego (70 %)', gX: 'Otra parte (la escribo)',
      gAutre: 'Parte del creador (%)', gAutreAide: 'Solo se usa con «Otra parte».',
      gPositif: 'Escribe un precio positivo, una parte entre 0 y 100 y una tasa positiva.', gTouche: 'lo que cobras por venta',
      gRoblox: 'parte de Roblox (comisiones y vendedor)', gDevex: 'valor DevEx por venta', g1000: 'precio para cobrar unos 1.000 Robux',
      gMsg: function (m) { return 'Roblox puede redondear el resultado: cuenta con unos Robux de diferencia. El valor en dólares supone un retiro DevEx (mínimo ' + m + ').'; },
      pLabel: 'Tu nombre de usuario', pAide: 'El texto se queda en tu navegador.', verifier: 'Comprobar',
      pLimite: 'Esta herramienta solo comprueba el formato. No sabe si el nombre está libre ni si la moderación de Roblox lo aceptará.',
      pVide: 'Escribe un nombre para comprobarlo.', pOk: 'El formato es válido. Falta comprobar la disponibilidad y la moderación en Roblox.',
      pKo: function (k) { return k + ' regla' + (k > 1 ? 's' : '') + ' sin cumplir.'; },
      genBtn: 'Generar 12 ideas', genMot: 'Una palabra (opcional)', genMotAide: 'Tu nombre, un apodo, un animal… sin tildes ni espacios.',
      genStyle: 'Estilo', copier: 'Copiar', copierAria: function (p) { return 'Copiar ' + p; },
      copie: function (p) { return '«' + p + '» copiado.'; }, copieKo: 'No se pudo copiar: selecciona el nombre y cópialo a mano.',
      genMsg: 'Estas ideas respetan el formato de Roblox. Comprueba que un nombre está libre intentando crear o cambiar tu nombre en Roblox.',
      erreur: 'Esta herramienta no ha podido iniciarse en este navegador.'
    },
    pt: {
      sens: 'Quero converter', re: 'Robux para euros', er: 'Euros para Robux', qte: 'Quantidade', quels: 'Quais pacotes?',
      web: 'Compra no roblox.com (quantidade com bônus)', base: 'Quantidade base (riscada na página)',
      packsAide: 'O preço em euros é o mesmo; só muda a quantidade de Robux. Confira na hora da compra.',
      convertir: 'Converter', positif: 'Digite um número positivo.', borneR: 'Digite entre 1 e 500.000 Robux.',
      aPayer: function (r) { return 'a pagar para ter pelo menos ' + r; }, recus: 'Robux recebidos com esta combinação',
      cout100: 'custo de 100 Robux neste caso',
      combiMin: function (l, m) { return 'Combinação mais barata: ' + l + '. O melhor preço possível é ' + m + ' por 100 Robux com o maior pacote.'; },
      borneB: 'Digite um orçamento entre 0,01 e 2.000 euros.',
      aucun: function (v, p) { return 'Com ' + v + ' não dá para comprar nenhum pacote: o menor custa ' + p + '.'; },
      pourBudget: function (v) { return 'Robux com um orçamento de ' + v; }, depense: 'gasto de verdade', reste: 'sobra que não dá para usar',
      combi: function (l) { return 'Combinação: ' + l + '.'; },
      dxRobux: 'Robux ganhos para sacar', dxRobuxAide: 'Só contam os Robux ganhos (vendas nos seus jogos), não os que você comprou.',
      dxTaux: 'Taxa DevEx (US$ por Robux)',
      dxTauxAide: 'Taxa padrão oficial em 23/11/2026: 0,0038. Altere se o Roblox mudar ou se você tiver Robux antigos a 0,0035.',
      dxChg: 'Câmbio: 1 US$ = … R$', dxChgAide: 'Calculado com as taxas do BCE de 23/11/2026 (euro-real ÷ euro-dólar). Seu banco aplica a própria taxa.',
      calculer: 'Calcular', dxPositif: 'Digite números positivos nos três campos.', dxDol: 'valor DevEx em dólares',
      dxLoc: 'equivalente em reais (antes de impostos e tarifas bancárias)', dx1000: 'valor de 1.000 Robux ganhos',
      dxOk: function (m) { return 'O mínimo de ' + m + ' foi atingido: o saque é possível se as outras condições forem cumpridas.'; },
      dxManque: function (x, m) { return 'Faltam ' + x + ' para chegar ao mínimo de ' + m + ' exigido para sacar.'; },
      gPrix: 'Preço de venda em Robux', gType: 'Tipo de venda', g70: 'Passe de jogo ou produto de desenvolvedor (70%)',
      g30: 'Item de avatar vendido no Marketplace (30%)', g70u: 'Item de avatar vendido no seu próprio jogo (70%)', gX: 'Outra parte (eu digito)',
      gAutre: 'Parte do criador (%)', gAutreAide: 'Usado só com "Outra parte".', gChg: '1 US$ = … R$',
      gPositif: 'Digite um preço positivo, uma parte entre 0 e 100 e taxas positivas.', gTouche: 'o que você recebe por venda',
      gRoblox: 'parte do Roblox (taxas e vendedor)', gDevex: 'valor DevEx por venda', g1000: 'preço para receber cerca de 1.000 Robux',
      gMsg: function (m) { return 'O Roblox pode arredondar o resultado: conte com alguns Robux de diferença. O valor em reais supõe um saque DevEx (mínimo ' + m + ').'; },
      pLabel: 'Seu nome de usuário', pAide: 'O texto fica no seu navegador.', verifier: 'Verificar',
      pLimite: 'Esta ferramenta só confere o formato. Ela não sabe se o nome está livre nem se a moderação do Roblox vai aceitá-lo.',
      pVide: 'Digite um nome para conferir.', pOk: 'O formato é válido. Falta conferir a disponibilidade e a moderação no Roblox.',
      pKo: function (k) { return k + ' regra' + (k > 1 ? 's' : '') + ' não cumprida' + (k > 1 ? 's' : '') + '.'; },
      genBtn: 'Gerar 12 ideias', genMot: 'Uma palavra (opcional)', genMotAide: 'Seu nome, um apelido, um animal… sem acento nem espaço.',
      genStyle: 'Estilo', copier: 'Copiar', copierAria: function (p) { return 'Copiar ' + p; },
      copie: function (p) { return '"' + p + '" copiado.'; }, copieKo: 'Não foi possível copiar: selecione o nome e copie à mão.',
      genMsg: 'Estas ideias seguem o formato do Roblox. Confira se um nome está livre tentando criar ou mudar seu nome no Roblox.',
      erreur: 'Esta ferramenta não conseguiu iniciar neste navegador.'
    }
  };
  var T = TXT[LANG];

  // ------------------------------------------------------------------ interface
  var NF0 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 0 });
  var NF1 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 1 });
  var NF2 = new Intl.NumberFormat(LOC, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var NF4 = new Intl.NumberFormat(LOC, { maximumFractionDigits: 6 });
  function monnaie(code) {
    var f = new Intl.NumberFormat(LOC, { style: 'currency', currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return function (x) { return f.format(x); };
  }
  // français : affichage d'origine (« 11,99 € », « 114,00 $ ») ; autres langues : format monétaire de la langue
  var eur = LANG === 'fr' ? function (x) { return NF2.format(x) + ' €'; } : monnaie('EUR');
  var dol = LANG === 'fr' ? function (x) { return NF2.format(x) + ' $'; } : monnaie('USD');
  var brl = monnaie('BRL');
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
  function nombre(val) {
    var i = h('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off' });
    i.value = String(val);
    return i;
  }
  function liste(vals) {
    var s = h('select');
    vals.forEach(function (v) { s.appendChild(h('option', { value: v[0] }, v[1])); });
    return s;
  }
  // Compteur animé : le nombre monte (ou descend) jusqu'à sa valeur ; le texte final exact est toujours réécrit à la fin.
  // On anime le NOMBRE (n) avec sa fonction d'affichage (f) : marche dans toutes les langues et monnaies.
  var CALME = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var dernier = {};
  function animer(el, cible, f) {
    if (CALME || !window.requestAnimationFrame || !isFinite(cible)) return;
    var final = f(cible);
    requestAnimationFrame(function () {
      var tu = el.parentNode, sortie = tu && tu.parentNode;
      if (!sortie) return;
      var cle = (sortie.parentNode && sortie.parentNode.getAttribute ? sortie.parentNode.getAttribute('data-outil') : '') + ':' + Array.prototype.indexOf.call(sortie.children, tu);
      // Premier affichage : valeur finale tout de suite (rapide) ; l'animation ne joue qu'aux changements du visiteur.
      if (!dernier.hasOwnProperty(cle)) { dernier[cle] = cible; return; }
      var depart = dernier[cle];
      dernier[cle] = cible;
      if (depart === cible) return;
      sortie.setAttribute('aria-busy', 'true');
      var t0 = null, duree = 450;
      (function image(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / duree), e = 1 - Math.pow(1 - p, 3);
        if (p >= 1 || !el.parentNode) { el.textContent = final; sortie.removeAttribute('aria-busy'); return; }
        el.textContent = f(depart + (cible - depart) * e);
        requestAnimationFrame(image);
      })(performance.now());
    });
  }
  // tuile(nombre, fonction d'affichage, libellé, forte)
  function tuile(n, f, libelle, forte) {
    var v = h('span', { 'class': 'valeur' }, f(n));
    animer(v, n, f);
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
  // attributs data-* : toujours au format JavaScript (point décimal)
  function nb(racine, nom, defaut) { var v = lireNombre(racine.getAttribute(nom), '.'); return v == null ? defaut : v; }
  function devise(racine) { return racine.getAttribute('data-devise') || 'EUR'; }
  function lienLots(lots, packs, mode) {
    var parts = [];
    lots.forEach(function (n, i) { if (n > 0) parts.push(n + ' × ' + NF0.format(packs[i][mode === 'base' ? 1 : 0]) + ' Robux (' + eur(packs[i][2] / 100) + ')'); });
    return parts.join(' + ');
  }
  function rbx1(x) { return NF1.format(x) + ' Robux'; }

  var OUTILS = {};

  // ---- Robux <-> euros (les packs sont en euros dans toutes les langues : prix vérifiés sur la page française de Roblox)
  OUTILS['robux-en-euros'] = function (racine) {
    var packs = packsDe(racine);
    var sens = liste([['re', T.re], ['er', T.er]]);
    var val = nombre(1000), src = liste([['web', T.web], ['base', T.base]]);
    var sortie = h('div', { 'class': 'resultats', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    racine.appendChild(h('div', { 'class': 'grille' }, champ(T.sens, sens), champ(T.qte, val, ''), champ(T.quels, src, T.packsAide)));
    racine.appendChild(action(T.convertir, function () { calc(); })); racine.appendChild(sortie); racine.appendChild(msg);
    function calc() {
      vider(sortie); vider(msg);
      var v = lire(val.value), mode = src.value;
      if (v == null || v <= 0) { msg.textContent = T.positif; return; }
      var tauxMeilleur = Math.min.apply(null, packs.map(function (p) { return coutPour100(p, mode); }));
      if (sens.value === 're') {
        var a = achatPourRobux(v, packs, mode);
        if (!a) { msg.textContent = T.borneR; return; }
        sortie.appendChild(tuile(a.centimes / 100, eur, T.aPayer(rbx(Math.ceil(v))), true));
        sortie.appendChild(tuile(a.robux, rbx, T.recus));
        sortie.appendChild(tuile(a.centimes / 100 / a.robux * 100, eur, T.cout100));
        msg.textContent = T.combiMin(lienLots(a.lots, packs, mode), eur(tauxMeilleur));
      } else {
        var b = achatPourBudget(Math.round(v * 100), packs, mode);
        if (!b) { msg.textContent = T.borneB; return; }
        if (b.robux === 0) { msg.textContent = T.aucun(eur(v), eur(packs[0][2] / 100)); return; }
        sortie.appendChild(tuile(b.robux, rbx, T.pourBudget(eur(v)), true));
        sortie.appendChild(tuile(b.depense / 100, eur, T.depense));
        sortie.appendChild(tuile(b.reste / 100, eur, T.reste));
        msg.textContent = T.combi(lienLots(b.lots, packs, mode));
      }
    }
    [sens, val, src].forEach(function (e) { e.addEventListener('input', calc); e.addEventListener('change', calc); });
    calc();
  };

  // ---- DevEx : EUR (fr, 1 € = … $), USD (en, es : pas de change), BRL (pt, 1 US$ = … R$)
  OUTILS['devex-robux-en-euros'] = function (racine) {
    var dev = devise(racine);
    var val = nombre(30000), taux = nombre(NF4.format(nb(racine, 'data-taux', 0.0038)));
    var chg = dev === 'EUR' ? nombre(NF4.format(nb(racine, 'data-eur-usd', 1.0939)))
      : dev === 'BRL' ? nombre(NF4.format(nb(racine, 'data-change', 0))) : null;
    var sortie = h('div', { 'class': 'resultats', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    racine.appendChild(h('div', { 'class': 'grille' }, champ(T.dxRobux, val, T.dxRobuxAide), champ(T.dxTaux, taux, T.dxTauxAide),
      chg ? champ(T.dxChg, chg, T.dxChgAide) : null));
    racine.appendChild(action(T.calculer, function () { calc(); })); racine.appendChild(sortie); racine.appendChild(msg);
    function calc() {
      vider(sortie); vider(msg);
      var r = lire(val.value), t = lire(taux.value), c = chg ? lire(chg.value) : 1;
      if (r == null || r <= 0 || t == null || t <= 0 || c == null || c <= 0) { msg.textContent = T.dxPositif; return; }
      var d = devex(r, t, c);
      sortie.appendChild(tuile(d.dollars, dol, T.dxDol, true));
      if (dev === 'EUR') {
        sortie.appendChild(tuile(d.euros, eur, T.dxLoc));
        sortie.appendChild(tuile(d.euros / r * 1000, eur, T.dx1000));
      } else if (dev === 'BRL') {
        sortie.appendChild(tuile(d.dollars * c, brl, T.dxLoc));
        sortie.appendChild(tuile(d.dollars * c / r * 1000, brl, T.dx1000));
      } else {
        sortie.appendChild(tuile(t * 1000, dol, T.dx1000));
        sortie.appendChild(tuile(t * MIN_DEVEX, dol, T.dxSeuil));
      }
      msg.textContent = d.atteint ? T.dxOk(rbx(MIN_DEVEX)) : T.dxManque(rbx(d.manque), rbx(MIN_DEVEX));
    }
    [val, taux, chg].forEach(function (e) { if (e) e.addEventListener('input', calc); });
    calc();
  };

  // ---- Gains de vente
  OUTILS['calculateur-gains-vente-roblox'] = function (racine) {
    var dev = devise(racine);
    var prix = nombre(100), type = liste([['70', T.g70], ['30', T.g30], ['70u', T.g70u], ['x', T.gX]]);
    var autre = nombre(70), taux = nombre(NF4.format(nb(racine, 'data-taux', 0.0038)));
    var chg = dev === 'EUR' ? nombre(NF4.format(nb(racine, 'data-eur-usd', 1.0939)))
      : dev === 'BRL' ? nombre(NF4.format(nb(racine, 'data-change', 0))) : null;
    var sortie = h('div', { 'class': 'resultats', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    var cAutre = champ(T.gAutre, autre, T.gAutreAide);
    cAutre.hidden = true;
    racine.appendChild(h('div', { 'class': 'grille' }, champ(T.gPrix, prix), champ(T.gType, type), cAutre,
      champ(T.dxTaux, taux), chg ? champ(T.gChg, chg) : null));
    racine.appendChild(action(T.calculer, function () { calc(); })); racine.appendChild(sortie); racine.appendChild(msg);
    function part() {
      var v = type.value;
      if (v === '70' || v === '70u') return 0.7;
      if (v === '30') return 0.3;
      var a = lire(autre.value);
      return a == null || a < 0 || a > 100 ? null : a / 100;
    }
    function calc() {
      vider(sortie); vider(msg);
      cAutre.hidden = type.value !== 'x';
      var p = lire(prix.value), pa = part(), t = lire(taux.value), c = chg ? lire(chg.value) : 1;
      if (p == null || p <= 0 || pa == null || t == null || t <= 0 || c == null || c <= 0) { msg.textContent = T.gPositif; return; }
      var g = gains(p, pa), dol_ = g.createur * t;
      sortie.appendChild(tuile(g.createur, rbx1, T.gTouche, true));
      sortie.appendChild(tuile(g.roblox, rbx1, T.gRoblox));
      var fv = dev === 'EUR' ? function (x) { return dol(x) + ' ≈ ' + eur(x / c); }
        : dev === 'BRL' ? function (x) { return dol(x) + ' ≈ ' + brl(x * c); } : dol;
      sortie.appendChild(tuile(dol_, fv, T.gDevex));
      sortie.appendChild(tuile(prixPourGagner(1000, pa), rbx, T.g1000));
      msg.textContent = T.gMsg(rbx(MIN_DEVEX));
    }
    [prix, type, autre, taux, chg].forEach(function (e) { if (e) { e.addEventListener('input', calc); e.addEventListener('change', calc); } });
    calc();
  };

  // ---- Vérifier un pseudo
  OUTILS['verifier-pseudo-roblox'] = function (racine) {
    var champPseudo = h('input', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', maxlength: '60' });
    var liste_ = h('ul', { 'class': 'regles', 'aria-live': 'polite' }), bilan = h('div', { 'class': 'message', role: 'status' });
    racine.appendChild(champ(T.pLabel, champPseudo, T.pAide));
    racine.appendChild(action(T.verifier, function () { calc(); })); racine.appendChild(bilan); racine.appendChild(liste_);
    racine.appendChild(h('p', { 'class': 'aide' }, T.pLimite));
    function calc() {
      vider(liste_); vider(bilan);
      var s = champPseudo.value;
      if (s === '') { bilan.textContent = T.pVide; return; }
      var r = verifierPseudo(s, LANG), ko = r.filter(function (x) { return !x.ok; }).length;
      r.forEach(function (x) { liste_.appendChild(h('li', { 'class': x.ok ? 'positif' : 'negatif' }, (x.ok ? '✔ ' : '✘ ') + x.texte)); });
      bilan.textContent = ko === 0 ? T.pOk : T.pKo(ko);
    }
    champPseudo.addEventListener('input', calc);
    calc();
  };

  // ---- Générateur de pseudos
  OUTILS['generateur-pseudo-roblox'] = function (racine) {
    var S = STYLES_L[LANG];
    var mot = h('input', { type: 'text', autocomplete: 'off', maxlength: '20' });
    var st = h('select');
    Object.keys(S).forEach(function (k) { st.appendChild(h('option', { value: k }, S[k].nom)); });
    st.value = 'gamer';
    var zone = h('ul', { 'class': 'pseudos', 'aria-live': 'polite' }), msg = h('div', { 'class': 'message', role: 'status' });
    var go = h('button', { type: 'button', 'class': 'principal' }, T.genBtn);
    racine.appendChild(h('div', { 'class': 'grille' }, champ(T.genMot, mot, T.genMotAide), champ(T.genStyle, st)));
    racine.appendChild(h('div', { 'class': 'boutons' }, go));
    racine.appendChild(zone); racine.appendChild(msg);
    function generer() {
      vider(zone); vider(msg);
      genererPseudos(mot.value, st.value, null, 12, LANG).forEach(function (p) {
        var b = h('button', { type: 'button', 'class': 'mini', 'aria-label': T.copierAria(p) }, T.copier);
        b.addEventListener('click', function () {
          var fin = function (ok) { msg.textContent = ok ? T.copie(p) : T.copieKo; };
          try { navigator.clipboard.writeText(p).then(function () { fin(true); }, function () { fin(false); }); } catch (e) { fin(false); }
        });
        zone.appendChild(h('li', null, h('span', { 'class': 'nom' }, p), b));
      });
      msg.textContent = T.genMsg;
    }
    go.addEventListener('click', generer);
    generer();
  };

  function monter() {
    var secs = document.querySelectorAll('section.outil[data-outil]');
    for (var i = 0; i < secs.length; i++) {
      var f = OUTILS[secs[i].getAttribute('data-outil')];
      if (f) { try { f(secs[i]); } catch (e) { secs[i].textContent = T.erreur; } }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', monter); else monter();
})();
