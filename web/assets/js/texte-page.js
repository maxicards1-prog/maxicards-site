/* Faux texte : page de l'outil. Tout se fait dans le navigateur ; rien n'est envoyé, rien n'est écrit dans l'adresse. */
(function () {
  'use strict';
  var FT = window.FT;
  var section = document.querySelector('.outil[data-langue]');
  if (!FT || !section) { return; }

  function $(id) { return document.getElementById(id); }
  var typeEl = $('tType'), nombreEl = $('tNombre'), langueEl = $('tLangue'), formatEl = $('tFormat'),
    pppEl = $('tPpp'), loremEl = $('tLorem'), sortieEl = $('tSortie'), msgEl = $('tMessage'),
    aideEl = $('tAide'), motsEl = $('tMots'), carEl = $('tCar');
  if (!typeEl || !nombreEl || !langueEl || !sortieEl) { return; }

  var DEFAUTS = { paragraphes: 3, phrases: 5, mots: 50, liste: 5 };
  var UNITES = { paragraphes: 'paragraphes', phrases: 'phrases', mots: 'mots', liste: 'éléments' };
  var graine = 1;
  var derniere = '';
  var minuteur = null;

  function nouvelleGraine() {
    try {
      var t = new Uint32Array(1);
      window.crypto.getRandomValues(t);
      graine = t[0] || 1;
    } catch (e) {
      graine = Math.floor(Math.random() * 4294967295) + 1;
    }
  }

  function majAide() {
    var t = typeEl.value;
    if (!FT.PLAFONDS[t]) { t = 'paragraphes'; }
    aideEl.textContent = 'De 1 à ' + FT.PLAFONDS[t] + ' ' + UNITES[t] + '.';
    var estLiaison = (t === 'paragraphes');
    var champPpp = pppEl && pppEl.parentNode;
    if (champPpp) { champPpp.hidden = !estLiaison; }
    var ligneLorem = loremEl && loremEl.parentNode;
    if (ligneLorem) { ligneLorem.hidden = (langueEl.value === 'francais'); }
  }

  function afficheMessage(texte) {
    msgEl.textContent = texte;
    if (minuteur) { clearTimeout(minuteur); }
    if (texte) { minuteur = setTimeout(function () { msgEl.textContent = ''; }, 4000); }
  }

  function genere() {
    var t = typeEl.value;
    var r = FT.generer({
      type: t,
      nombre: nombreEl.value,
      parParagraphe: pppEl ? pppEl.value : 5,
      langue: langueEl.value === 'francais' ? 'fr' : 'la',
      lorem: !!(loremEl && loremEl.checked),
      html: formatEl.value === 'html',
      graine: graine
    });
    derniere = r.sortie;
    sortieEl.textContent = r.sortie;
    sortieEl.classList.toggle('code', formatEl.value === 'html');
    motsEl.textContent = String(r.mots);
    carEl.textContent = String(r.caracteres);
    if (r.plafonne) {
      afficheMessage('Le maximum est de ' + FT.PLAFONDS[r.type] + ' ' + UNITES[r.type] + ' : le texte a été limité.');
    }
  }

  function selectionneSortie() {
    try {
      var sel = window.getSelection();
      var plage = document.createRange();
      plage.selectNodeContents(sortieEl);
      sel.removeAllRanges();
      sel.addRange(plage);
    } catch (e) { /* rien */ }
  }

  function copie() {
    if (!derniere) { return; }
    var repli = function () {
      selectionneSortie();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      afficheMessage(ok ? 'Texte copié.' : 'Le texte est sélectionné : faites Ctrl + C (ou « Copier » du menu) pour le copier.');
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(derniere).then(function () { afficheMessage('Texte copié.'); }, repli);
    } else {
      repli();
    }
  }

  // Changer le type remet un nombre de départ adapté ; le reste recalcule avec la même graine (texte stable).
  typeEl.addEventListener('change', function () {
    var t = typeEl.value;
    nombreEl.value = String(DEFAUTS[t] || 3);
    majAide();
    genere();
  });
  [nombreEl, pppEl, formatEl, loremEl].forEach(function (el) {
    if (!el) { return; }
    el.addEventListener('input', genere);
    el.addEventListener('change', genere);
  });
  langueEl.addEventListener('change', function () { majAide(); genere(); });
  $('tAutre').addEventListener('click', function () { nouvelleGraine(); genere(); });
  $('tCopier').addEventListener('click', copie);

  // Langue ouverte d'office selon la page (data-langue de la section).
  var dl = section.getAttribute('data-langue');
  langueEl.value = (dl === 'francais') ? 'francais' : 'latin';
  nouvelleGraine();
  majAide();
  genere();
}());
