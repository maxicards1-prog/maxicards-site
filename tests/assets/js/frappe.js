/* Test de frappe en français : mots par minute et précision. Textes écrits pour ce site (libres de droits). Rien n'est envoyé. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$;
  var TEXTES = [
    { nom: 'Court (environ 30 mots)', texte: "Le matin, la ville s'éveille doucement. Les boulangers sortent le pain chaud, les volets s'ouvrent et un vélo passe sur le pont. Tout est calme, et la journée peut commencer." },
    { nom: 'Moyen (environ 50 mots)', texte: "Écrire vite sans faire d'erreurs demande surtout de la régularité. Il vaut mieux garder un rythme tranquille que de se précipiter puis de corriger sans cesse. Regardez l'écran plutôt que le clavier, laissez les doigts retrouver leur place, et la vitesse viendra toute seule au fil des jours." },
    { nom: 'Long (environ 90 mots)', texte: "Au bord du lac, une petite barque attendait depuis l'automne. Personne ne savait à qui elle appartenait, mais chaque été, quelqu'un la repeignait en bleu pendant la nuit. Les enfants du village avaient parié sur un vieux pêcheur, sur la factrice ou sur le maire lui-même. Un matin de juillet, ils se levèrent plus tôt que d'habitude et découvrirent la vérité : c'était l'institutrice, pinceau à la main, qui souriait en leur disant que le secret valait bien un peu de peinture." },
    { nom: 'Chiffres et ponctuation', texte: "Mercredi, nous avons rangé 24 cartons dans la cave : 8 de livres, 6 de vaisselle et 10 de vêtements. Il restait encore 3 étagères à monter ; heureusement, il y avait assez de vis, de colle et de bonne humeur." }
  ];
  var sel = $('fTexte'), cible = $('fCible'), saisie = $('fSaisie'), res = $('fResultat'), btnRaz = $('fRecommencer'), eMpm = $('fMpm'), ePrec = $('fPrec'), eTemps = $('fTemps'), eAide = $('fAide');
  var texte = '', t0 = 0, fini = false, justes = 0, frappes = 0, prec = '', iv = 0, spans = [];
  TEXTES.forEach(function (t, i) { var o = TP.creer('option', '', t.nom); o.value = i; sel.appendChild(o); });

  function construire() {
    TP.vider(cible); spans = [];
    for (var i = 0; i < texte.length; i++) { var s = TP.creer('span', '', texte.charAt(i)); cible.appendChild(s); spans.push(s); }
  }
  function colorer(v) {
    for (var i = 0; i < spans.length; i++) {
      var c = '';
      if (i < v.length) { c = v.charAt(i) === texte.charAt(i) ? 'ok' : 'faux'; } else if (i === v.length) { c = 'cur'; }
      if (spans[i].className !== c) { spans[i].className = c; }
    }
  }
  function reinit() {
    clearInterval(iv); texte = TEXTES[+sel.value].texte; construire();
    t0 = 0; fini = false; justes = 0; frappes = 0; prec = '';
    saisie.value = ''; saisie.disabled = false; colorer('');
    eMpm.textContent = '–'; ePrec.textContent = '–'; eTemps.textContent = '0,0 s'; res.textContent = ''; eAide.textContent = 'Le chrono démarre à la première touche.';
  }
  function maj() {
    var s = (performance.now() - t0) / 1000, v = saisie.value;
    eTemps.textContent = TP.nf(s, 1) + ' s';
    eMpm.textContent = TP.nf(TP.motsParMinute(TP.compterCorrects(texte, v), s), 0);
    ePrec.textContent = TP.nf(TP.precision(justes, frappes), 0) + ' %';
  }
  function finir() {
    fini = true; clearInterval(iv); saisie.disabled = true;
    var s = (performance.now() - t0) / 1000, v = saisie.value;
    var mpm = TP.motsParMinute(TP.compterCorrects(texte, v), s), pr = TP.precision(justes, frappes);
    eTemps.textContent = TP.nf(s, 1) + ' s'; eMpm.textContent = TP.nf(mpm, 0); ePrec.textContent = TP.nf(pr, 0) + ' %';
    res.textContent = TP.nf(mpm, 0) + ' mots par minute, précision ' + TP.nf(pr, 0) + ' % (' + TP.nf(s, 1) + ' secondes).';
    eAide.textContent = 'Terminé. Cliquez sur « Recommencer » pour un nouvel essai.';
  }
  saisie.addEventListener('input', function () {
    if (fini) { return; }
    var v = saisie.value;
    if (!t0 && v.length) { t0 = performance.now(); iv = setInterval(maj, 100); }
    if (v.length === prec.length + 1 && v.indexOf(prec) === 0) { frappes++; if (v.charAt(v.length - 1) === texte.charAt(v.length - 1)) { justes++; } }
    prec = v; colorer(v); maj();
    if (v.length >= texte.length) { finir(); }
  });
  saisie.addEventListener('paste', function (e) { e.preventDefault(); });
  saisie.addEventListener('drop', function (e) { e.preventDefault(); });
  sel.addEventListener('change', reinit);
  btnRaz.addEventListener('click', function () { reinit(); saisie.focus(); });
  reinit();
}());
