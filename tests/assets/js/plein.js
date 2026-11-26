/* Écran plein en couleurs unies (pixel mort, uniformité). Couleurs fixes, changées seulement par l'utilisateur : aucun clignotement automatique. */
(function () {
  'use strict';
  var TP = window.TP;
  var el = null, liste = [], i = 0, ouvreur = null, cache = 0;
  function appliquer() {
    var c = liste[i];
    el.style.backgroundColor = c.hex;
    el.setAttribute('aria-label', 'Écran plein : ' + c.nom + ' (' + (i + 1) + ' sur ' + liste.length + ')');
    el._aide.textContent = c.nom + ' · ' + (i + 1) + '/' + liste.length + ' · flèches ou clic : changer · Échap : quitter · I : afficher ou cacher ce texte';
  }
  function montrerAide() { el._aide.hidden = false; clearTimeout(cache); cache = setTimeout(function () { if (el) { el._aide.hidden = true; } }, 3000); }
  function suivant(d) { i = (i + d + liste.length) % liste.length; appliquer(); }
  function touche(ev) {
    if (!el) { return; }
    var k = ev.key;
    if (k === 'Escape') { ev.preventDefault(); fermer(); }
    else if (k === 'ArrowRight' || k === ' ' || k === 'Enter' || k === 'ArrowDown' || k === 'PageDown') { ev.preventDefault(); suivant(1); }
    else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') { ev.preventDefault(); suivant(-1); }
    else if (k === 'i' || k === 'I') { ev.preventDefault(); if (el._aide.hidden) { montrerAide(); } else { clearTimeout(cache); el._aide.hidden = true; } }
  }
  function fermer() {
    if (!el) { return; }
    clearTimeout(cache);
    document.removeEventListener('keydown', touche, true);
    document.removeEventListener('fullscreenchange', sortiePlein);
    document.body.classList.remove('plein-actif');
    var e = el; el = null;
    e.parentNode.removeChild(e);
    if (document.fullscreenElement && document.exitFullscreen) { document.exitFullscreen().catch(function () { /* ok */ }); }
    if (ouvreur && ouvreur.focus) { ouvreur.focus(); }
  }
  function sortiePlein() { if (!document.fullscreenElement && el) { fermer(); } }
  // couleurs : [{nom, hex}], depart : indice de la couleur de départ
  TP.plein = function (couleurs, depart) {
    if (el) { fermer(); }
    liste = couleurs; i = depart || 0; ouvreur = document.activeElement;
    el = TP.creer('div', 'plein'); el.tabIndex = -1; el.setAttribute('role', 'dialog');
    el._aide = TP.creer('div', 'plein-aide');
    el.appendChild(el._aide);
    el.addEventListener('click', function () { suivant(1); });
    document.body.appendChild(el); document.body.classList.add('plein-actif');
    document.addEventListener('keydown', touche, true);
    appliquer(); montrerAide(); el.focus();
    if (el.requestFullscreen) { el.requestFullscreen().then(function () { document.addEventListener('fullscreenchange', sortiePlein); }, function () { /* plein écran refusé : la page reste plein cadre */ }); }
  };
  TP.pleinFermer = fermer;
}());
