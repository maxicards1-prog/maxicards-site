/* Prénoms : aides communes aux outils (chargement des données, adresse, courbe SVG, listes).
   Aucune donnée n'est envoyée : tout est calculé dans le navigateur. Jamais de HTML construit avec une donnée : textContent et createElement(NS) seulement. */
(function () {
  'use strict';
  var PR = window.PR;
  var NS = 'http://www.w3.org/2000/svg';
  var PARAMS_OK = ['p', 'a', 'b', 'l', 's', 'max', 'i', 'min', 'fin', 'hausse', 'v', 'tri'];   // seuls paramètres lus ou écrits dans l'adresse
  // Paramètres « prénom » : écrits dans l'adresse SEULEMENT si le prénom existe dans le fichier INSEE (jamais un nom de
  // famille ni autre chose tapé par la personne). Au chargement, la garde en ligne (build.py) les a mis de côté dans PR_NOMS.
  var NOMS_URL = ['p', 'a', 'b'];
  var cache = {};
  var fins = null;    // terminaisons (1 à 6 lettres, sans accent) des prénoms de idees.json, une fois chargé
  var lettres = {};   // lettres déjà chargées (lecture synchrone pour vérifier un prénom avant de l'écrire dans l'adresse)
  function anneesOk(d) { return d.a0 >= 1800 && d.a1 <= 2100 && d.a0 <= d.a1; }

  function base() {
    var b = document.documentElement.getAttribute('data-base') || '';
    return /^\/[a-z0-9\-]*$/.test(b) ? b : '';
  }
  function el(id) { return document.getElementById(id); }
  function vider(n) { while (n && n.firstChild) { n.removeChild(n.firstChild); } }
  function creer(tag, classe, texte) {
    var n = document.createElement(tag);
    if (classe) { n.className = classe; }
    if (texte !== undefined && texte !== null) { n.textContent = texte; }
    return n;
  }
  function svg(tag, attrs, texte) {
    var n = document.createElementNS(NS, tag);
    if (attrs) { Object.keys(attrs).forEach(function (k) { n.setAttribute(k, String(attrs[k])); }); }
    if (texte !== undefined && texte !== null) { n.textContent = texte; }
    return n;
  }
  function attente(fn, ms) {
    var t = null;
    return function () { var a = arguments, ctx = this; clearTimeout(t); t = setTimeout(function () { fn.apply(ctx, a); }, ms); };
  }
  function texte(id, valeur) { var n = el(id); if (n) { n.textContent = valeur; } }
  function montrer(id, oui) { var n = el(id); if (n) { n.hidden = !oui; } }
  // Message d'état ; erreur = true pour une erreur (rôle alerte).
  function etat(msg, erreur) {
    var n = el('etat');
    if (!n) { return; }
    n.textContent = msg || '';
    n.hidden = !msg;
    n.className = 'message' + (erreur ? ' erreur' : '');
    n.setAttribute('role', erreur ? 'alert' : 'status');
  }

  // ---------- chargement des données (cache en mémoire) ----------
  function charger(chemin) {
    if (!cache[chemin]) {
      cache[chemin] = fetch(base() + chemin, { credentials: 'omit' }).then(function (r) {
        if (!r.ok) { throw new Error('http ' + r.status); }
        return r.json();
      }).then(function (d) {
        if (!d || typeof d !== 'object') { throw new Error('format'); }
        return d;
      });
      cache[chemin].catch(function () { delete cache[chemin]; });   // une erreur n'est pas gardée : on peut réessayer
    }
    return cache[chemin];
  }
  function chargerLettre(l) {
    if (!/^[a-z_]$/.test(l)) { return Promise.reject(new Error('lettre')); }
    // aucun prénom du fichier ne commence par autre chose qu'une lettre : pas de fichier « _ », réponse vide
    if (l === '_') {
      return chargerLettre('a').then(function (d) { return { a0: d.a0, a1: d.a1, n: {} }; });
    }
    return charger('/assets/data/lettres/' + l + '.json').then(function (d) {
      // années bornées : une boucle par année ne doit jamais dépendre d'un nombre démesuré lu dans un fichier
      if (!d.n || typeof d.n !== 'object' || !isFinite(d.a0) || !isFinite(d.a1) || !anneesOk(d)) { throw new Error('format'); }
      lettres[l] = d;
      setTimeout(ecrireAdresse, 0);   // un prénom saisi avant le chargement peut maintenant être vérifié
      return d;
    });
  }
  function chargerIdees() {
    return charger('/assets/data/idees.json').then(function (d) {
      if (!Array.isArray(d.n) || (d.a1 !== undefined && !(anneesOk(d) && d.mi >= d.a0 && d.mi <= d.a1))) { throw new Error('format'); }
      fins = {};
      d.n.slice(0, 50000).forEach(function (x) {
        if (!Array.isArray(x) || typeof x[0] !== 'string') { return; }
        var b = PR.sansAccent(x[0]).toLowerCase();
        for (var k = 1; k <= 6 && k <= b.length; k++) { fins[b.slice(-k)] = true; }
      });
      setTimeout(ecrireAdresse, 0);
      return d;
    });
  }
  // Ensemble des slugs qui ont une page /prenom/<slug>/ ; vide si la liste est introuvable (alors aucun lien).
  function chargerPages() {
    return charger('/assets/data/pages.json').then(function (d) {
      var liste = Array.isArray(d) ? d : (Array.isArray(d.pages) ? d.pages : []);
      var s = {};
      liste.slice(0, 5000).forEach(function (x) { if (typeof x === 'string' && /^[a-z0-9\-]{1,60}$/.test(x)) { s[x] = true; } });
      return s;
    }).catch(function () { return {}; });
  }
  var MSG_ERREUR = 'Impossible de charger les données pour le moment. Vérifiez votre connexion, puis réessayez.';

  // Nom (ou lien vers sa page s'il en a une) : jamais de HTML.
  function nomLien(nom, pages) {
    var s = PR.slug(nom), t = PR.joli(nom);
    if (pages && pages[s]) {
      var a = creer('a', 'nom-prenom', t);
      a.setAttribute('href', base() + '/prenom/' + s + '/');
      return a;
    }
    return creer('span', 'nom-prenom', t);
  }

  // ---------- adresse : paramètres autorisés seulement ----------
  function propre(elt, brut) {
    var v = String(brut === undefined || brut === null ? '' : brut).slice(0, 200);
    if (elt.getAttribute('inputmode') === 'numeric') {
      v = v.replace(/[^0-9]/g, '').slice(0, 4);
      if (v === '') { return ''; }
      var n = Number(v), mn = Number(elt.getAttribute('min')) || 0, mx = Number(elt.getAttribute('max')) || 9999;
      return String(Math.max(mn, Math.min(mx, n)));
    }
    v = v.replace(/[‘’ʼ`´]/g, "'").replace(/[^\p{L} '\-]/gu, '').replace(/\s+/g, ' ');
    return v.slice(0, Math.min(40, elt.maxLength > 0 ? elt.maxLength : 40));
  }
  function champsPartage() {
    return Array.prototype.slice.call(document.querySelectorAll('[data-p]')).filter(function (e) {
      return PARAMS_OK.indexOf(e.getAttribute('data-p')) >= 0;
    });
  }
  // Prénom du fichier INSEE correspondant à la saisie (forme exacte ou même forme sans accent), sinon '' : rien d'autre
  // que ce qui a été tapé n'est recopié, et seulement si c'est un prénom connu.
  function nomVerifie(v) {
    if (!v) { return ''; }
    var d = lettres[PR.lettre(v)];
    if (!d) { return ''; }
    var r = PR.chercher(v, d);
    return (r.type === 'exact' || r.type === 'variantes') && r.noms.length ? PR.joli(r.noms[0]) : '';
  }
  function lireAdresse() {
    var params;
    try { params = new URLSearchParams(window.location.search); } catch (e) { return; }
    champsPartage().forEach(function (e) {
      var cle = e.getAttribute('data-p');
      var nomsGardes = window.PR_NOMS && typeof window.PR_NOMS === 'object' ? window.PR_NOMS : null;
      var brut = null;
      if (NOMS_URL.indexOf(cle) >= 0 && nomsGardes && Object.prototype.hasOwnProperty.call(nomsGardes, cle)) { brut = nomsGardes[cle]; }
      else if (params.has(cle)) { brut = params.get(cle); }
      if (brut === null || brut === undefined) { return; }
      var v = String(brut).slice(0, 200);
      if (e.type === 'checkbox') { e.checked = v === '1'; return; }
      if (e.tagName === 'SELECT') {
        var ok = Array.prototype.some.call(e.options, function (o) { return o.value === v; });
        if (ok) { e.value = v; }
        return;
      }
      e.value = propre(e, v);
    });
  }
  function adresse() {
    var q = new URLSearchParams();
    champsPartage().forEach(function (e) {
      var cle = e.getAttribute('data-p');
      if (e.type === 'checkbox') { if (e.checked) { q.set(cle, '1'); } return; }
      var v = propre(e, e.value);
      if (NOMS_URL.indexOf(cle) >= 0) { v = nomVerifie(v); }
      // terminaison : écrite seulement si au moins un prénom du fichier finit ainsi (jamais un mot quelconque)
      if (cle === 'fin' && v !== '' && !(fins && Object.prototype.hasOwnProperty.call(fins, PR.sansAccent(v).toLowerCase()))) { v = ''; }
      if (v !== '') { q.set(cle, v); }
    });
    var s = q.toString();
    return window.location.pathname + (s ? '?' + s : '');
  }
  function ecrireAdresse() {
    try { window.history.replaceState(null, '', adresse()); } catch (e) { /* rien */ }
  }
  // Lit l'adresse dans les champs, puis garde l'adresse à jour et branche « Copier le lien ».
  function initPartage(apresLecture) {
    lireAdresse();
    var ecrire = attente(ecrireAdresse, 400);
    champsPartage().forEach(function (e) { e.addEventListener('input', ecrire); e.addEventListener('change', ecrire); });
    var bouton = el('copierLien');
    if (bouton) {
      bouton.addEventListener('click', function () {
        ecrireAdresse();
        var lien = window.location.origin + adresse();
        var fini = function (m) { texte('etatLien', m); };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lien).then(function () { fini('Lien copié : il rouvre cette page avec vos réglages.'); },
            function () { fini("Copiez l'adresse de la page : elle contient vos réglages."); });
        } else { fini("Copiez l'adresse de la page : elle contient vos réglages."); }
      });
    }
    if (typeof apresLecture === 'function') { apresLecture(); }
    return { ecrire: ecrireAdresse };
  }

  // ---------- suggestions (boutons) ----------
  function suggestions(ul, noms, choisir, titre) {
    if (!ul) { return; }
    vider(ul);
    ul.hidden = !noms.length;
    noms.slice(0, 8).forEach(function (nom) {
      var li = creer('li');
      var b = creer('button', 'suggestion', PR.joli(nom));
      b.type = 'button';
      if (titre) { b.title = titre; }
      b.addEventListener('click', function () { choisir(nom); });
      li.appendChild(b);
      ul.appendChild(li);
    });
  }

  // ---------- liste bornée avec « Afficher plus » ----------
  // 200 éléments d'abord, puis 100 de plus à chaque clic, 2000 au plus.
  function listeBornee(conteneur, boutonPlus, items, rendu, premier, pas, plafond) {
    var debut = premier || 200, p = pas || 100, max = plafond || 2000;
    var affiches = 0;
    vider(conteneur);
    function ajouter(n) {
      var fin = Math.min(items.length, max, affiches + n);
      var frag = document.createDocumentFragment();
      for (var i = affiches; i < fin; i++) { frag.appendChild(rendu(items[i], i)); }
      conteneur.appendChild(frag);
      affiches = fin;
      boutonPlus.hidden = affiches >= Math.min(items.length, max);
    }
    boutonPlus.onclick = function () { ajouter(p); };
    ajouter(debut);
  }

  // ---------- courbe SVG ----------
  // opts : conteneur, legende, info, entete, corps (tableau), a0, a1, lignes [{libelle, cls, serie{debut,valeurs}}], resume
  var dernierTrace = null;
  function tracer(opts) {
    dernierTrace = opts;
    var cont = opts.conteneur;
    vider(cont);
    opts.largeurVue = cont.clientWidth;
    var W = Math.max(280, Math.min(900, cont.clientWidth || 600));
    var H = Math.round(Math.max(230, Math.min(380, W * 0.55)));
    var geo = PR.courbe(opts.lignes.map(function (l) { return l.serie; }), opts.a0, opts.a1, W, H);
    var z = geo.zone;
    var s = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', height: H, role: 'img', 'aria-label': opts.resume,
      'class': 'svg-courbe', focusable: 'false' });
    var g = svg('g', { 'class': 'axes', 'aria-hidden': 'true' });
    geo.axeY.forEach(function (t) {
      g.appendChild(svg('line', { x1: z.x0, x2: z.x1, y1: t.y, y2: t.y, 'class': t.valeur === 0 ? 'axe-base' : 'axe-grille' }));
      g.appendChild(svg('text', { x: z.x0 - 6, y: t.y + 4, 'text-anchor': 'end', 'class': 'axe-texte' }, t.label));
    });
    geo.axeX.forEach(function (t) {
      g.appendChild(svg('line', { x1: t.x, x2: t.x, y1: z.y0, y2: z.y0 + 4, 'class': 'axe-base' }));
      g.appendChild(svg('text', { x: t.x, y: z.y0 + 18, 'text-anchor': 'middle', 'class': 'axe-texte' }, t.label));
    });
    s.appendChild(g);
    opts.lignes.forEach(function (l, i) {
      s.appendChild(svg('path', { d: geo.chemins[i], 'class': 'courbe ' + l.cls, fill: 'none' }));
    });
    var curseur = svg('line', { x1: 0, x2: 0, y1: z.y1, y2: z.y0, 'class': 'curseur', visibility: 'hidden' });
    s.appendChild(curseur);
    var points = opts.lignes.map(function (l) {
      var c = svg('circle', { r: 4.5, cx: 0, cy: 0, 'class': 'point ' + l.cls, visibility: 'hidden' });
      s.appendChild(c);
      return c;
    });
    var zone = svg('rect', { x: z.x0, y: z.y1, width: z.x1 - z.x0, height: z.y0 - z.y1, fill: 'transparent', 'class': 'zone-survol' });
    s.appendChild(zone);
    cont.appendChild(s);

    var courant = -1;
    function aller(an) {
      an = Math.max(geo.a0, Math.min(geo.a1, an));
      courant = an;
      var x = geo.xDe(an);
      curseur.setAttribute('x1', x); curseur.setAttribute('x2', x); curseur.setAttribute('visibility', 'visible');
      var morceaux = [];
      opts.lignes.forEach(function (l, i) {
        var v = PR.valeurAnnee(l.serie, an);
        points[i].setAttribute('cx', x); points[i].setAttribute('cy', geo.yDe(v)); points[i].setAttribute('visibility', 'visible');
        morceaux.push(l.libelle + ' : ' + PR.format(v));
      });
      if (opts.info) { opts.info.textContent = an + ' · ' + morceaux.join(' · ') + ' naissances'; }
    }
    function surPointeur(ev) {
      var r = s.getBoundingClientRect();
      if (!r.width) { return; }
      var x = (ev.clientX - r.left) * (W / r.width);
      aller(Math.round(geo.a0 + (x - z.x0) / (z.x1 - z.x0) * (geo.a1 - geo.a0)));
    }
    zone.addEventListener('pointermove', surPointeur);
    zone.addEventListener('pointerdown', surPointeur);
    zone.addEventListener('pointerleave', function (ev) {
      if (ev.pointerType === 'mouse') {
        curseur.setAttribute('visibility', 'hidden');
        points.forEach(function (p) { p.setAttribute('visibility', 'hidden'); });
        courant = -1;
        if (opts.info) { opts.info.textContent = 'Passez la souris ou touchez la courbe pour lire une année.'; }
      }
    });
    cont.onkeydown = function (ev) {
      var pas = ev.shiftKey ? 10 : 1;
      if (ev.key === 'ArrowLeft') { aller((courant < 0 ? geo.a1 : courant) - pas); ev.preventDefault(); }
      else if (ev.key === 'ArrowRight') { aller((courant < 0 ? geo.a1 : courant) + pas); ev.preventDefault(); }
      else if (ev.key === 'Home') { aller(geo.a0); ev.preventDefault(); }
      else if (ev.key === 'End') { aller(geo.a1); ev.preventDefault(); }
    };

    // légende : un trait (style différent par courbe) + le nom, jamais la couleur seule
    if (opts.legende) {
      vider(opts.legende);
      opts.lignes.forEach(function (l) {
        var li = creer('li');
        var m = svg('svg', { width: 34, height: 10, viewBox: '0 0 34 10', 'aria-hidden': 'true', 'class': 'trait' });
        m.appendChild(svg('line', { x1: 1, x2: 33, y1: 5, y2: 5, 'class': 'courbe ' + l.cls }));
        li.appendChild(m);
        li.appendChild(creer('span', null, l.libelle));
        opts.legende.appendChild(li);
      });
    }

    // tableau repliable : mêmes valeurs en texte (de la 1re année non nulle à la dernière, 140 lignes au plus)
    if (opts.entete && opts.corps) {
      vider(opts.entete); vider(opts.corps);
      var tr = creer('tr');
      var th = creer('th', null, 'Année'); th.scope = 'col'; tr.appendChild(th);
      opts.lignes.forEach(function (l) { var h = creer('th', 'nombre', l.libelle); h.scope = 'col'; tr.appendChild(h); });
      opts.entete.appendChild(tr);
      var premiere = geo.a1;
      for (var y = geo.a0; y <= geo.a1; y++) {
        if (opts.lignes.some(function (l) { return PR.valeurAnnee(l.serie, y) > 0; })) { premiere = y; break; }
      }
      var frag = document.createDocumentFragment(), n = 0;
      for (var an = premiere; an <= geo.a1 && n < 140; an++, n++) {
        var r = creer('tr');
        var td0 = creer('th', null, String(an)); td0.scope = 'row'; r.appendChild(td0);
        opts.lignes.forEach(function (l) { r.appendChild(creer('td', 'nombre', PR.format(PR.valeurAnnee(l.serie, an)))); });
        frag.appendChild(r);
      }
      opts.corps.appendChild(frag);
    }
  }
  var redessin = attente(function () {
    if (dernierTrace && dernierTrace.conteneur && dernierTrace.conteneur.firstChild &&
        Math.abs((dernierTrace.conteneur.clientWidth || 0) - (dernierTrace.largeurVue || 0)) > 8) {
      dernierTrace.largeurVue = dernierTrace.conteneur.clientWidth;
      tracer(dernierTrace);
    }
  }, 200);
  window.addEventListener('resize', redessin);

  window.CP = {
    base: base, el: el, vider: vider, creer: creer, svg: svg, attente: attente, texte: texte, montrer: montrer, etat: etat,
    charger: charger, chargerLettre: chargerLettre, chargerIdees: chargerIdees, chargerPages: chargerPages,
    MSG_ERREUR: MSG_ERREUR, nomLien: nomLien, initPartage: initPartage, suggestions: suggestions,
    listeBornee: listeBornee, tracer: tracer, entier: PR.format
  };
}());
