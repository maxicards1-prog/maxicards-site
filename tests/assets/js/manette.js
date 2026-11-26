/* Test de la manette (API Gamepad) : boutons, gâchettes, sticks, zone morte, dérive, vibration. Rien n'est envoyé. */
(function () {
  'use strict';
  var TP = window.TP, $ = TP.$;
  var verdict = $('mVerdict'), info = $('mInfo'), selPad = $('mPad'), selFam = $('mFamille'), zm = $('mZm'), zmTxt = $('mZmTxt');
  var gBoutons = $('mBoutons'), cG = $('mStickG'), cD = $('mStickD'), tG = $('mTxtG'), tD = $('mTxtD'), btnRepos = $('mRepos'), btnVib = $('mVibrer');
  var SEUIL_DERIVE = 0.10;
  var padIndex = -1, raf = 0, famille = 'xbox', famAuto = true, mesure = null, vus = {};
  var cases = [];

  function pads() { var l = navigator.getGamepads ? navigator.getGamepads() : []; var o = []; for (var i = 0; i < l.length; i++) { if (l[i]) { o.push(l[i]); } } return o; }
  function construireBoutons(n) {
    TP.vider(gBoutons); cases = [];
    for (var i = 0; i < n; i++) {
      var c = TP.creer('div', 'm-btn'); c.appendChild(TP.creer('span', 'm-nom', '')); var j = TP.creer('span', 'm-val', '0'); c.appendChild(j);
      gBoutons.appendChild(c); cases.push(c);
    }
    etiqueter();
  }
  function etiqueter() { cases.forEach(function (c, i) { c.firstChild.textContent = TP.libelleBouton(famille, i); }); }
  function stick(canvas, x, y) {
    var g = canvas.getContext('2d'), w = canvas.width, h = canvas.height, r = w / 2 - 6, dz = +zm.value / 100;
    var s = getComputedStyle(canvas);
    var fond = (s.getPropertyValue('--s-fond') || '').trim() || '#eef1f8', ligne = (s.getPropertyValue('--s-ligne') || '').trim() || '#8a90b4', accent = (s.getPropertyValue('--s-accent') || '').trim() || '#4f46e5';
    g.clearRect(0, 0, w, h);
    g.fillStyle = fond; g.beginPath(); g.arc(w / 2, h / 2, r, 0, 6.2832); g.fill();
    g.strokeStyle = ligne; g.lineWidth = 1.5; g.beginPath(); g.arc(w / 2, h / 2, r, 0, 6.2832); g.stroke();
    g.beginPath(); g.moveTo(6, h / 2); g.lineTo(w - 6, h / 2); g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); g.stroke();
    g.setLineDash([4, 4]); g.beginPath(); g.arc(w / 2, h / 2, Math.max(1, r * dz), 0, 6.2832); g.stroke(); g.setLineDash([]);
    var c = TP.zoneMorte(x, y, dz);
    g.strokeStyle = accent; g.lineWidth = 2; g.beginPath(); g.arc(w / 2 + x * r, h / 2 + y * r, 6, 0, 6.2832); g.stroke();
    g.fillStyle = accent; g.beginPath(); g.arc(w / 2 + c[0] * r, h / 2 + c[1] * r, 4, 0, 6.2832); g.fill();
  }
  function boucle() {
    raf = requestAnimationFrame(boucle);
    var l = pads(); var p = l.filter(function (x) { return x.index === padIndex; })[0] || l[0];
    if (!p) { return; }
    if (p.index !== padIndex) { choisir(p); }
    for (var i = 0; i < p.buttons.length && i < cases.length; i++) {
      var b = p.buttons[i], v = typeof b === 'object' ? b.value : (b ? 1 : 0), pr = typeof b === 'object' ? b.pressed : !!b;
      cases[i].classList.toggle('on', pr || v > 0.5);
      if (pr) { vus[i] = true; cases[i].classList.add('vu'); }
      cases[i].lastChild.textContent = TP.nf(v, 2);
      cases[i].style.setProperty('--niv', Math.round(v * 100) + '%');
    }
    var a = p.axes, ax = [a[0] || 0, a[1] || 0, a[2] || 0, a[3] || 0];
    stick(cG, ax[0], ax[1]); stick(cD, ax[2], ax[3]);
    tG.textContent = 'X ' + TP.nf(ax[0], 2) + ' · Y ' + TP.nf(ax[1], 2); tD.textContent = 'X ' + TP.nf(ax[2], 2) + ' · Y ' + TP.nf(ax[3], 2);
    if (mesure) {
      mesure.g.push([ax[0], ax[1]]); mesure.d.push([ax[2], ax[3]]);
      if (performance.now() - mesure.t0 >= 3000) { finirRepos(); }
    }
  }
  function choisir(p) {
    padIndex = p.index;
    info.textContent = p.id + (p.mapping ? ' · disposition « ' + p.mapping + ' »' : ' · disposition non standard : les noms des boutons peuvent être faux');
    construireBoutons(p.buttons.length);
    if (famAuto) { famille = TP.familleDepuisId(p.id); selFam.value = famille; etiqueter(); }
    TP.verdict(verdict, 'ok', 'Ça marche : manette détectée', 'Appuyez sur chaque bouton, poussez les sticks, enfoncez les gâchettes : tout doit réagir. Pour tester la dérive, lâchez les sticks et cliquez sur « Mesurer le repos ».');
    remplirListe();
  }
  function remplirListe() {
    var l = pads(); TP.vider(selPad);
    l.forEach(function (p) { var o = TP.creer('option', '', 'Manette ' + (p.index + 1) + ' : ' + p.id.slice(0, 40)); o.value = p.index; selPad.appendChild(o); });
    if (padIndex >= 0) { selPad.value = padIndex; }
    selPad.parentNode.hidden = l.length < 2;
  }
  function aucune() {
    if (pads().length) { return; }
    padIndex = -1; info.textContent = 'Aucune manette détectée.';
    TP.verdict(verdict, 'attente', 'Aucune manette détectée pour l’instant', 'Branchez ou connectez la manette, puis appuyez sur un de ses boutons : le navigateur ne la montre qu’après un premier appui.',
      ['Branchez la manette (câble USB) ou associez-la en Bluetooth dans les réglages du système.', 'Appuyez sur un bouton de la manette, avec cette page au premier plan.', 'Fermez les autres onglets ou applications qui utilisent la manette (Steam, jeux).', 'Essayez un autre câble ou un autre port USB.'],
      '/depannage/manette-ps5-sur-pc/', 'Manette PS5 sur PC : la solution');
  }
  function finirRepos() {
    var m = mesure; mesure = null; btnRepos.disabled = false;
    var g = TP.analyserRepos(m.g, SEUIL_DERIVE), d = TP.analyserRepos(m.d, SEUIL_DERIVE);
    var pc = function (v) { return TP.nf(v * 100, 1) + ' %'; };
    var detail = 'Stick gauche : écart moyen au centre ' + pc(g.moyenne) + ' (max ' + pc(g.max) + '). Stick droit : ' + pc(d.moyenne) + ' (max ' + pc(d.max) + ').';
    if (g.etat === 'derive' || d.etat === 'derive') {
      var qui = (g.etat === 'derive' && d.etat === 'derive') ? 'les deux sticks' : (g.etat === 'derive' ? 'le stick gauche' : 'le stick droit');
      TP.verdict(verdict, 'ko', 'Dérive probable : ' + qui + ' bouge tout seul', detail + ' Au repos, un stick devrait rester très près de zéro (seuil de ce test : ' + pc(SEUIL_DERIVE) + ', choisi par nous).',
        ['Vérifiez que vous aviez bien lâché les sticks pendant les 3 secondes, puis refaites la mesure.', 'Augmentez la zone morte dans le jeu (ou avec le curseur ci-dessus pour voir l’effet) : cela masque une petite dérive.', 'Nettoyez autour de la base du stick avec de l’air sec, sans liquide dans la manette.', 'Si la dérive reste forte, la pièce est usée : regardez la garantie du fabricant ou faites réparer ou remplacer la manette.'],
        '/depannage/drift-manette-stick-qui-bouge/', 'Drift : la solution complète');
    } else if (g.etat === 'instable' || d.etat === 'instable') {
      TP.verdict(verdict, 'info', 'Mesure instable : le stick a été touché', detail + ' Une valeur a dépassé le seuil sans que la moyenne le fasse : vous avez probablement effleuré un stick. Refaites la mesure sans toucher la manette.');
    } else {
      TP.verdict(verdict, 'ok', 'Ça marche : pas de dérive détectée', detail);
    }
  }
  function repos() {
    if (padIndex < 0) { TP.verdict(verdict, 'ko', 'Aucune manette à mesurer', 'Connectez la manette et appuyez sur un bouton, puis recommencez.'); return; }
    mesure = { g: [], d: [], t0: performance.now() }; btnRepos.disabled = true;
    TP.verdict(verdict, 'attente', 'Mesure en cours : lâchez les sticks (3 s)', 'Posez la manette ou tenez-la sans toucher les sticks.');
  }
  function vibrer() {
    var l = pads(), p = l.filter(function (x) { return x.index === padIndex; })[0];
    if (!p) { TP.verdict(verdict, 'ko', 'Aucune manette connectée', 'Appuyez d’abord sur un bouton de la manette.'); return; }
    var act = p.vibrationActuator;
    if (act && act.playEffect) {
      act.playEffect('dual-rumble', { startDelay: 0, duration: 700, weakMagnitude: 0.8, strongMagnitude: 0.8 }).then(function () {
        TP.verdict(verdict, 'info', 'Vibration envoyée', 'Si vous avez senti la manette vibrer, les moteurs fonctionnent. Sinon, vérifiez que la vibration est activée dans les réglages de la manette ou du système.');
      }, function () { TP.verdict(verdict, 'ko', 'Vibration refusée', 'Le navigateur n’a pas pu faire vibrer cette manette. Essayez en USB, ou avec Chrome ou Edge.'); });
    } else if (p.hapticActuators && p.hapticActuators[0] && p.hapticActuators[0].pulse) {
      p.hapticActuators[0].pulse(0.8, 700); TP.verdict(verdict, 'info', 'Vibration envoyée', 'Si la manette n’a pas vibré, ce navigateur ne la pilote pas.');
    } else {
      TP.verdict(verdict, 'info', 'Vibration non disponible ici', 'Ce navigateur ou cette manette ne permet pas de la tester depuis une page web. Cela ne veut pas dire qu’elle est en panne : essayez avec Chrome ou Edge.');
    }
  }
  window.addEventListener('gamepadconnected', function () { if (!raf) { raf = requestAnimationFrame(boucle); } });
  window.addEventListener('gamepaddisconnected', function () { padIndex = -1; setTimeout(aucune, 50); });
  selPad.addEventListener('change', function () { var l = pads().filter(function (x) { return String(x.index) === selPad.value; }); if (l[0]) { choisir(l[0]); } });
  selFam.addEventListener('change', function () { famille = selFam.value; famAuto = false; etiqueter(); });
  zm.addEventListener('input', function () { zmTxt.textContent = zm.value + ' %'; });
  btnRepos.addEventListener('click', repos);
  btnVib.addEventListener('click', vibrer);
  window.addEventListener('pagehide', function () { cancelAnimationFrame(raf); raf = 0; });
  if (!navigator.getGamepads) {
    TP.verdict(verdict, 'ko', 'Navigateur non compatible', 'Ce navigateur ne propose pas l’API des manettes. Essayez Chrome, Edge ou Firefox récents.');
  } else {
    raf = requestAnimationFrame(boucle);
    construireBoutons(17);
    setTimeout(aucune, 300);
    setInterval(function () { if (!pads().length && padIndex < 0) { aucune(); } }, 3000);
  }
  zmTxt.textContent = zm.value + ' %';
}());
