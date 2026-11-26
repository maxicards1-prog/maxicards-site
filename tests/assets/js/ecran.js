/* Test de l'écran : fréquence de rafraîchissement mesurée, dégradés, uniformité. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$, T = TP.t;
  var verdict = $('eVerdict'), btn = $('eMesurer'), bloc = $('eBloc'), tHz = $('eHz'), tProche = $('eProche'), tImages = $('eImages');
  var mesure = false;
  function mesurer() {
    if (mesure) { return; }
    mesure = true; btn.disabled = true;
    TP.verdict(verdict, 'attente', T('Mesure en cours (3 secondes)…'), T('Gardez cet onglet au premier plan, sans bouger la souris ni changer de fenêtre.'));
    var t = [], d0 = performance.now(), prec = 0, deltas = [], x = 0, pos = 0;
    function image(now) {
      if (prec) { deltas.push(now - prec); }
      prec = now; t.push(now);
      pos = (pos + 4) % 100; bloc.style.transform = 'translateX(' + pos * 3 + '%)';
      if (now - t[0] < 3000) { requestAnimationFrame(image); } else { fin(); }
    }
    function fin() {
      mesure = false; btn.disabled = false; bloc.style.transform = 'none';
      // On ignore les 10 premières images (démarrage) et les images très longues (changement d'onglet)
      var utiles = deltas.slice(10).filter(function (v) { return v < 100; });
      var hz = TP.hzDepuisIntervalles(utiles);
      if (!isFinite(hz)) {
        TP.verdict(verdict, 'ko', T('Mesure impossible'), T('Pas assez d’images mesurées (onglet en arrière-plan ou économie d’énergie ?). Recommencez avec cet onglet au premier plan.'));
        return;
      }
      var std = TP.hzStandard(hz);
      tHz.textContent = TP.nf(hz, 1) + ' Hz'; tProche.textContent = std ? std + ' Hz' : T('non standard'); tImages.textContent = utiles.length;
      TP.verdict(verdict, 'ok', std ? T('Votre écran affiche environ {n} images par seconde', { n: std }) : T('Votre écran affiche {n} images par seconde', { n: TP.nf(hz, 0) }), T('Mesure : {hz} Hz sur {n} images. Cette mesure donne ce que le navigateur envoie à l’écran ; elle peut rester sous la vraie fréquence de l’écran si le navigateur ou le mode économie d’énergie la limite. Si elle est trop basse, vérifiez la fréquence dans les réglages d’affichage du système.', { hz: TP.nf(hz, 1), n: utiles.length }), null, '/depannage/ecran-144-hz/', T('Savoir si mon écran est en 144 Hz'));
    }
    requestAnimationFrame(image);
  }
  btn.addEventListener('click', mesurer);
  var NIVEAUX = [
    { nom: T('Noir'), hex: '#000000' }, { nom: T('Gris très foncé'), hex: '#202020' }, { nom: T('Gris foncé'), hex: '#404040' },
    { nom: T('Gris moyen'), hex: '#808080' }, { nom: T('Gris clair'), hex: '#c0c0c0' }, { nom: T('Gris très clair'), hex: '#e0e0e0' }, { nom: T('Blanc'), hex: '#ffffff' }
  ];
  $('eUniforme').addEventListener('click', function () { TP.plein(NIVEAUX, 0); });
  $('eUniformeN').addEventListener('click', function () { TP.plein(NIVEAUX, 3); });
  $('eInfo').textContent = T('{w} × {h} px (facteur d’échelle {echelle}, profondeur de couleur {bits} bits)', { w: screen.width, h: screen.height, echelle: window.devicePixelRatio || 1, bits: screen.colorDepth || '?' });
}());
