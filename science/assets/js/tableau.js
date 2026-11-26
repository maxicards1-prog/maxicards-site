/* Tableau périodique interactif : filtre par famille, recherche, fiche rapide au clic. Aucun HTML injecté (textContent). */
(function () {
  'use strict';
  var SC = window.SC;
  var D = window.SC_DATA;
  if (!SC || !D) { return; }
  var cases = Array.prototype.slice.call(document.querySelectorAll('.tp a.el'));
  var lignesListe = Array.prototype.slice.call(document.querySelectorAll('#tpListe li'));
  var boutons = Array.prototype.slice.call(document.querySelectorAll('.legende-familles button'));
  var recherche = document.getElementById('tpRecherche');
  var etat = document.getElementById('tpEtat');
  var fiche = document.getElementById('fiche');
  var FAMILLES = D.familles || {};
  var famille = '';
  var choisi = 0;

  function el(tag, classe, texte) {
    var x = document.createElement(tag);
    if (classe) { x.className = classe; }
    if (texte != null) { x.textContent = texte; }
    return x;
  }

  function nombreFr(t) { return String(t).replace('.', ','); }

  function afficherFiche(z) {
    var e = SC.element(+z);
    if (!e || !fiche) { return; }
    choisi = e.z;
    cases.forEach(function (c) { c.classList.toggle('choisi', +c.getAttribute('data-z') === e.z); });
    while (fiche.firstChild) { fiche.removeChild(fiche.firstChild); }
    var f = FAMILLES[e.famille] || { nom: e.famille };
    var tuile = el('div', 'fiche-tuile f-' + e.famille);
    tuile.appendChild(el('span', 'z', String(e.z)));
    tuile.appendChild(el('span', 's', e.symbole));
    tuile.appendChild(el('span', 'm', e.masse_type === 'isotope' ? '[' + e.masse + ']' : nombreFr(e.masse)));
    fiche.appendChild(tuile);
    var corps = el('div', 'fiche-corps');
    corps.appendChild(el('p', 'fiche-nom', e.nom + ' (' + e.symbole + ')'));
    var dl = el('dl', 'fiche-dl');
    function ligne(t, v) { dl.appendChild(el('dt', null, t)); dl.appendChild(el('dd', null, v)); }
    ligne('Numéro atomique', String(e.z));
    ligne(e.masse_type === 'isotope' ? 'Masse (isotope le plus stable)' : 'Masse atomique', e.masse_type === 'isotope' ? '[' + e.masse + ']' : nombreFr(e.masse));
    ligne('Famille', f.nom + (e.famille_prevue ? ' (prévue)' : ''));
    ligne('Configuration', SC.configExposants(e.config));
    ligne('État à 25 °C', e.etat === 'inconnu' ? 'inconnu' : e.etat);
    corps.appendChild(dl);
    var lien = el('a', 'fiche-lien', 'Voir la fiche complète ' + (e.article === "l'" ? "de l'" : 'du ') + e.nom.toLowerCase() + ' →');
    var cible = document.querySelector('.tp a.el[data-z="' + e.z + '"]');
    lien.href = cible ? cible.getAttribute('href') : '#';
    corps.appendChild(lien);
    fiche.appendChild(corps);
    fiche.classList.add('pleine');
  }

  function appliquer() {
    var q = recherche ? recherche.value : '';
    var trouves = q.trim() ? SC.rechercher(q) : null;
    var garde = {};
    if (trouves) { trouves.forEach(function (z) { garde[z] = true; }); }
    var n = 0;
    function visible(z, fam) {
      var ok = (!famille || fam === famille) && (!trouves || garde[z]);
      if (ok) { n++; }
      return ok;
    }
    cases.forEach(function (c) {
      var z = +c.getAttribute('data-z');
      c.classList.toggle('eteint', !visible(z, c.getAttribute('data-f')));
    });
    var vus = n;
    n = 0;
    lignesListe.forEach(function (li) {
      var z = +li.getAttribute('data-z');
      li.hidden = !visible(z, li.getAttribute('data-f'));
    });
    var msg = '';
    if (trouves && !trouves.length) {
      msg = 'Aucun élément ne correspond à « ' + q.trim().slice(0, 40) + ' ».';
    } else if (trouves || famille) {
      msg = vus + ' élément' + (vus > 1 ? 's' : '') + ' affiché' + (vus > 1 ? 's' : '') + (famille && FAMILLES[famille] ? ' : ' + FAMILLES[famille].nom.toLowerCase() : '') + '.';
    }
    if (etat) { etat.textContent = msg; }
    if (trouves && trouves.length === 1 && trouves[0] !== choisi) { afficherFiche(trouves[0]); }
  }

  boutons.forEach(function (b) {
    b.addEventListener('click', function () {
      var f = b.getAttribute('data-famille') || '';
      famille = famille === f ? '' : f;
      boutons.forEach(function (x) { x.setAttribute('aria-pressed', String((x.getAttribute('data-famille') || '') === famille)); });
      appliquer();
    });
  });
  if (recherche) { recherche.addEventListener('input', appliquer); }

  cases.forEach(function (c) {
    c.addEventListener('click', function (ev) {
      if (ev.ctrlKey || ev.metaKey || ev.shiftKey || ev.button !== 0) { return; }
      ev.preventDefault();
      afficherFiche(c.getAttribute('data-z'));
      if (fiche && window.matchMedia && !window.matchMedia('(min-width: 1040px)').matches && fiche.scrollIntoView) {
        fiche.scrollIntoView({ block: 'nearest' });
      }
    });
  });

  // Fiche rapide : dans le trou du tableau sur grand écran, sous le tableau (qui défile) sur téléphone.
  var grilleTp = document.querySelector('.tp');
  var defile = document.querySelector('.tp-defile');
  var mq = window.matchMedia ? window.matchMedia('(min-width: 1040px)') : null;
  function placerFiche() {
    if (!fiche || !grilleTp || !defile || !defile.parentNode) { return; }
    var large = !mq || mq.matches;
    if (large && fiche.parentNode !== grilleTp) {
      grilleTp.appendChild(fiche);
    } else if (!large && fiche.parentNode === grilleTp) {
      defile.parentNode.insertBefore(fiche, defile.nextSibling);
    }
    fiche.classList.toggle('dans-grille', large);
  }
  if (mq) {
    if (mq.addEventListener) { mq.addEventListener('change', placerFiche); } else if (mq.addListener) { mq.addListener(placerFiche); }
  }
  placerFiche();

  // Vue tableau ou liste
  var vues = Array.prototype.slice.call(document.querySelectorAll('[data-vue]'));
  var zone = document.getElementById('tpZone');
  var liste = document.getElementById('tpListe');
  vues.forEach(function (b) {
    b.addEventListener('click', function () {
      var v = b.getAttribute('data-vue');
      vues.forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      if (zone) { zone.hidden = v === 'liste'; }
      if (liste) { liste.hidden = v !== 'liste'; }
    });
  });
  // Lien partagé : la recherche passe dans l'adresse (commun.js), puis le tableau se filtre.
  if (window.CQ && window.CQ.initPartage) { window.CQ.initPartage(appliquer); } else { appliquer(); }
}());
