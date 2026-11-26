/* Caractères spéciaux : recherche, familles, copie en un clic, fiche des raccourcis. Texte posé avec textContent seulement. */
(function () {
  'use strict';
  var CQ = window.CQ;
  if (!CQ) { return; }
  var cherche = CQ.el('cs-cherche'), onglets = CQ.el('cs-onglets'), groupes = CQ.el('cs-groupes');
  var fiche = CQ.el('cs-fiche'), texte = CQ.el('cs-texte'), msg = CQ.el('cs-msg');
  if (!groupes || !onglets || !fiche || !texte) { return; }
  var blocs = Array.prototype.slice.call(groupes.querySelectorAll('.groupe-car'));
  var boutonsCat = Array.prototype.slice.call(onglets.querySelectorAll('button'));
  var tous = Array.prototype.slice.call(groupes.querySelectorAll('button.car'));
  var courant = boutonsCat.length ? boutonsCat[0].getAttribute('data-cat') : '';
  var MAX = 5000;

  function plat(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  tous.forEach(function (b) { b.setAttribute('data-cle', plat(b.getAttribute('data-n') + ' ' + b.getAttribute('data-c'))); });

  function montrerCat(cat) {
    courant = cat;
    boutonsCat.forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-cat') === cat ? 'true' : 'false'); });
    blocs.forEach(function (g) { g.hidden = g.getAttribute('data-cat') !== cat; });
    tous.forEach(function (b) { b.hidden = false; });
    msg.textContent = '';
  }

  function chercher() {
    var q = plat(cherche.value).trim().slice(0, 40);
    if (!q) { montrerCat(courant); return; }
    var mots = q.split(/\s+/).slice(0, 6), total = 0;
    boutonsCat.forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    blocs.forEach(function (g) {
      var vus = 0;
      Array.prototype.forEach.call(g.querySelectorAll('button.car'), function (b) {
        var cle = b.getAttribute('data-cle');
        var ok = b.getAttribute('data-dbl') !== '1' && mots.every(function (m) { return cle.indexOf(m) >= 0; });
        b.hidden = !ok;
        if (ok) { vus++; }
      });
      g.hidden = vus === 0;
      total += vus;
    });
    msg.textContent = total ? total + (total > 1 ? ' caractères trouvés' : ' caractère trouvé')
      : 'Aucun caractère trouvé : essayez un autre mot (euro, flèche, cœur, guillemet…).';
  }

  var LIGNES = [['alt', 'Windows (pavé numérique)'], ['w', 'Word'], ['az', 'Clavier AZERTY'], ['mac', 'Mac'], ['h', 'HTML'], ['u', 'Unicode']];
  function montrerFiche(b) {
    CQ.vider(fiche);
    var espace = b.classList.contains('mot');
    var tete = CQ.cree('div', 'fiche-tete');
    tete.appendChild(CQ.cree('span', 'fiche-car', espace ? '␣' : b.getAttribute('data-c')));
    tete.appendChild(CQ.cree('strong', 'fiche-nom', b.getAttribute('data-n')));
    fiche.appendChild(tete);
    var dl = CQ.cree('dl', 'fiche-codes');
    LIGNES.forEach(function (l) {
      var v = b.getAttribute('data-' + l[0]);
      if (!v && l[0] === 'alt') { v = 'pas de code Alt : touche Windows + . (point), puis cherchez-le'; }
      if (!v) { return; }
      dl.appendChild(CQ.cree('dt', null, l[1]));
      dl.appendChild(CQ.cree('dd', null, v));
    });
    fiche.appendChild(dl);
  }

  function inserer(c) {
    var v = texte.value, d = texte.selectionStart, f = texte.selectionEnd;
    if (typeof d !== 'number' || typeof f !== 'number') { d = f = v.length; }
    if (v.length - (f - d) + c.length > MAX) { CQ.annonce('Votre texte est trop long'); return; }
    texte.value = v.slice(0, d) + c + v.slice(f);
    var p = d + c.length;
    try { texte.setSelectionRange(p, p); } catch (e) { /* champ non sélectionnable : rien à faire */ }
  }

  groupes.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button.car') : null;
    if (!b) { return; }
    var c = b.getAttribute('data-c') || '';
    inserer(c);
    CQ.copier(c, 'Copié : ' + (b.classList.contains('mot') ? b.getAttribute('data-n') : c));
    montrerFiche(b);
    tous.forEach(function (x) { x.classList.remove('choisi'); });
    b.classList.add('choisi');
  });
  onglets.addEventListener('click', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('button[data-cat]') : null;
    if (!b) { return; }
    cherche.value = '';
    montrerCat(b.getAttribute('data-cat'));
  });
  cherche.addEventListener('input', chercher);
  CQ.el('cs-copier').addEventListener('click', function () { CQ.copier(texte.value, 'Texte copié'); });
  CQ.el('cs-effacer').addEventListener('click', function () { texte.value = ''; texte.focus(); });
}());
